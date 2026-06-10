const express = require('express');
const { db, getAll, runQuery: dbRunQuery } = require('../db');
const { authRequired } = require('../auth');
const { runQuery, previewQuery, GROUP_AXES, MEASURES, evidenceStatus } = require('../research/queryEngine');
const { runWeeklyBatch } = require('../batch');
const { runFindingsBatch } = require('../findingsBatch');
const { nanoid, nowIso } = require('../util');

const router = express.Router();

router.post('/query', authRequired, async (req, res) => {
  const result = await runQuery(db, {
    filters: req.body?.filters,
    groupBy: req.body?.groupBy,
    measure: req.body?.measure,
    exerciseId: req.body?.exerciseId,
    muscle: req.body?.muscle,
    minCohort: req.body?.minCohort
  });
  if (result.error) return res.status(400).json({ error: result.error, detail: result.detail });
  res.json({ ...result, query: req.body });
});

router.post('/compare-cohorts', authRequired, async (req, res) => {
  const { cohortA, cohortB, groupBy, measure, exerciseId, muscle, minCohort } = req.body || {};
  if (!cohortA || !cohortB) return res.status(400).json({ error: 'cohortA and cohortB required' });
  const a = await runQuery(db, { filters: cohortA.filters || [], groupBy, measure, exerciseId, muscle, minCohort });
  const b = await runQuery(db, { filters: cohortB.filters || [], groupBy, measure, exerciseId, muscle, minCohort });
  if (a.error) return res.status(400).json({ error: `cohortA: ${a.error}`, detail: a.detail });
  if (b.error) return res.status(400).json({ error: `cohortB: ${b.error}`, detail: b.detail });
  res.json({
    cohortA: { label: cohortA.label || 'A', ...a },
    cohortB: { label: cohortB.label || 'B', ...b },
    query: req.body
  });
});

router.post('/scan', authRequired, async (req, res) => {
  const {
    filters,
    groupBys,
    measure = 'progression_rate',
    exerciseId,
    muscle,
    minCohort
  } = req.body || {};
  const axes = Array.isArray(groupBys) ? groupBys : [];
  if (!axes.length) return res.status(400).json({ error: 'groupBys required' });
  if (axes.length > 24) return res.status(400).json({ error: 'Too many groupBys' });
  if (!MEASURES[measure]) return res.status(400).json({ error: `measure not allowed: ${measure}` });

  const results = [];
  for (const groupBy of axes) {
    if (!GROUP_AXES[groupBy]) {
      results.push({ groupBy, available: false, error: `groupBy not allowed: ${groupBy}` });
      continue;
    }
    const result = await runQuery(db, {
      filters,
      groupBy,
      measure,
      exerciseId,
      muscle,
      minCohort
    });
    if (result.error) {
      results.push({ groupBy, available: false, error: result.error, detail: result.detail });
      continue;
    }
    const spread = effectSpread(result.buckets);
    results.push({
      groupBy,
      available: (result.buckets || []).length >= 2,
      totalCohortSize: result.totalCohortSize,
      buckets: result.buckets || [],
      strength: spread.strength,
      effect: spread.effect,
      bestBucket: spread.bestBucket,
      worstBucket: spread.worstBucket,
      evidenceStatus: evidenceStatus(result.totalCohortSize)
    });
  }

  res.json({
    query: { filters, groupBys: axes, measure, exerciseId, muscle, minCohort },
    results: results.sort((a, b) => (b.strength || 0) - (a.strength || 0))
  });
});

router.post('/compare-scan', authRequired, async (req, res) => {
  const { cohortA, cohortB, groupBys, measure = 'progression_rate', exerciseId, muscle, minCohort } = req.body || {};
  const axes = Array.isArray(groupBys) ? groupBys : [];
  if (!cohortA || !cohortB) return res.status(400).json({ error: 'cohortA and cohortB required' });
  if (!axes.length) return res.status(400).json({ error: 'groupBys required' });
  if (axes.length > 24) return res.status(400).json({ error: 'Too many groupBys' });
  if (!MEASURES[measure]) return res.status(400).json({ error: `measure not allowed: ${measure}` });

  const results = [];
  for (const groupBy of axes) {
    if (!GROUP_AXES[groupBy]) {
      results.push({ groupBy, available: false, error: `groupBy not allowed: ${groupBy}` });
      continue;
    }
    const a = await runQuery(db, { filters: cohortA.filters || [], groupBy, measure, exerciseId, muscle, minCohort });
    const b = await runQuery(db, { filters: cohortB.filters || [], groupBy, measure, exerciseId, muscle, minCohort });
    if (a.error || b.error) {
      results.push({
        groupBy,
        available: false,
        error: a.error ? `cohortA: ${a.error}` : `cohortB: ${b.error}`,
        detail: a.detail || b.detail
      });
      continue;
    }
    const spreadA = effectSpread(a.buckets);
    const spreadB = effectSpread(b.buckets);
    const matched = Math.min(a.totalCohortSize || 0, b.totalCohortSize || 0);
    results.push({
      groupBy,
      available: (a.buckets || []).length >= 2 && (b.buckets || []).length >= 2,
      cohortA: { label: cohortA.label || 'A', ...a, ...spreadA },
      cohortB: { label: cohortB.label || 'B', ...b, ...spreadB },
      totalCohortSize: matched,
      evidenceStatus: evidenceStatus(matched),
      strength: Math.max(spreadA.strength || 0, spreadB.strength || 0)
    });
  }

  res.json({
    query: { cohortA, cohortB, groupBys: axes, measure, exerciseId, muscle, minCohort },
    results: results.sort((a, b) => (b.strength || 0) - (a.strength || 0))
  });
});

router.post('/preview', authRequired, async (req, res) => {
  const result = await previewQuery(db, {
    filters: req.body?.filters,
    groupBys: req.body?.groupBys,
    measure: req.body?.measure,
    exerciseId: req.body?.exerciseId,
    muscle: req.body?.muscle,
    minCohort: req.body?.minCohort
  });
  if (result.error) return res.status(400).json({ error: result.error, detail: result.detail });
  res.json({ ...result, query: req.body });
});

const FEATURED_QUESTIONS = [
{
  id: 'split_progression',
  title: 'Which split builds the most muscle?',
  subtitle: 'Average progression rate by split type',
  type: 'query',
  query: { groupBy: 'split_type', measure: 'progression_rate', minCohort: 10 }
},
{
  id: 'sleep_strength',
  title: 'Does sleep affect strength?',
  subtitle: 'Bench progression by sleep quality',
  type: 'query',
  query: { groupBy: 'sleep_quality_quartile', measure: 'progression_rate', exerciseId: 'bench_barbell', minCohort: 10 }
},
{
  id: 'running_lifting',
  title: 'How does running affect lifting?',
  subtitle: 'Squat progression: runners vs non-runners',
  type: 'compare',
  query: {
    cohortA: { label: 'Runners', filters: [{ field: 'users.sport_primary', op: '=', value: 'running' }] },
    cohortB: { label: 'Non-runners', filters: [{ field: 'users.sport_primary', op: 'IS NULL' }] },
    groupBy: 'frequency_bucket', measure: 'progression_rate', exerciseId: 'squat_barbell', minCohort: 10
  }
},
{
  id: 'hypertrophy_freq',
  title: 'Best frequency for hypertrophy',
  subtitle: 'Bench progression for hypertrophy-focused lifters',
  type: 'query',
  query: { filters: [{ field: 'users.goal', op: '=', value: 'hypertrophy' }], groupBy: 'frequency_bucket', measure: 'progression_rate', exerciseId: 'bench_barbell', minCohort: 10 }
},
{
  id: 'failure_matter',
  title: 'Does training to failure matter?',
  subtitle: 'Progression by RIR logging discipline',
  type: 'query',
  query: { groupBy: 'rir_use', measure: 'progression_rate', minCohort: 10 }
},
{
  id: 'machine_vs_free',
  title: 'Machine vs free weight progression',
  subtitle: 'Progression rate by equipment type',
  type: 'query',
  query: { groupBy: 'equipment_type', measure: 'progression_rate', minCohort: 10 }
},
{
  id: 'bilateral_glutes',
  title: 'Bilateral vs unilateral for glutes',
  subtitle: 'Glute progression: two legs vs one',
  type: 'query',
  query: { groupBy: 'bilateral', measure: 'progression_rate', muscle: 'Glutes', minCohort: 10 }
},
{
  id: 'natural_vs_enhanced',
  title: 'Natural vs enhanced progression rates',
  subtitle: 'How much faster do enhanced lifters progress?',
  type: 'query',
  query: { groupBy: 'enhancement_status', measure: 'progression_rate', minCohort: 10 }
}];


router.get('/featured-questions', authRequired, (_req, res) => {
  res.json({ questions: FEATURED_QUESTIONS });
});

router.get('/findings', authRequired, async (_req, res) => {
  const rows = await getAll('SELECT * FROM findings ORDER BY discovered_at DESC LIMIT 20');
  res.json({ findings: rows.map((r) => ({ ...r, query_json: tryParse(r.query_json) })) });
});

function tryParse(json) {try {return JSON.parse(json);} catch {return null;}}

function savedQuestion(row) {
  return {
    id: row.id,
    label: row.label,
    mode: row.mode,
    query: tryParse(row.query_json) || {},
    evidenceStatus: row.evidence_status || 'Not enough',
    qualifiedUsers: row.qualified_users || 0,
    matchedUsers: row.matched_users || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function effectSpread(buckets = []) {
  const numeric = buckets.filter((b) => Number.isFinite(Number(b.avg_measure)));
  if (numeric.length < 2) return { strength: 0, effect: null, bestBucket: null, worstBucket: null };
  const sorted = [...numeric].sort((a, b) => Number(a.avg_measure) - Number(b.avg_measure));
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const effect = Math.round((Number(best.avg_measure) - Number(worst.avg_measure)) * 10000) / 10000;
  return {
    strength: Math.min(100, Math.round(Math.abs(effect) * 100)),
    effect,
    bestBucket: best.label,
    worstBucket: worst.label
  };
}

function safeSavedPayload(body = {}) {
  const label = String(body.label || 'Saved Study question').trim().slice(0, 160);
  const mode = ['single', 'compare', 'scan'].includes(body.mode) ? body.mode : 'single';
  const query = body.query && typeof body.query === 'object' ? body.query : null;
  if (!query) return { error: 'query required' };
  const evidence = body.evidence && typeof body.evidence === 'object' ? body.evidence : {};
  return {
    label: label || 'Saved Study question',
    mode,
    query,
    evidenceStatus: String(evidence.status || 'Not enough').slice(0, 40),
    qualifiedUsers: Number.isFinite(Number(evidence.qualifiedUsers)) ? Math.max(0, Math.round(Number(evidence.qualifiedUsers))) : 0,
    matchedUsers: Number.isFinite(Number(evidence.matchedUsers)) ? Math.max(0, Math.round(Number(evidence.matchedUsers))) : 0
  };
}

router.get('/saved-questions', authRequired, async (req, res) => {
  const rows = await getAll(
    'SELECT * FROM research_saved_questions WHERE user_id = ? ORDER BY updated_at DESC',
    [req.user.id]
  );
  res.json({ savedQuestions: rows.map(savedQuestion) });
});

router.post('/saved-questions', authRequired, async (req, res) => {
  const payload = safeSavedPayload(req.body);
  if (payload.error) return res.status(400).json({ error: payload.error });
  const id = nanoid();
  const now = nowIso();
  await dbRunQuery(
    `INSERT INTO research_saved_questions (
      id, user_id, label, mode, query_json, evidence_status, qualified_users, matched_users, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
    id,
    req.user.id,
    payload.label,
    payload.mode,
    JSON.stringify(payload.query),
    payload.evidenceStatus,
    payload.qualifiedUsers,
    payload.matchedUsers,
    now,
    now]

  );
  const row = (await getAll('SELECT * FROM research_saved_questions WHERE id = ? AND user_id = ?', [id, req.user.id]))[0];
  res.status(201).json({ savedQuestion: savedQuestion(row) });
});

router.delete('/saved-questions/:id', authRequired, async (req, res) => {
  await dbRunQuery('DELETE FROM research_saved_questions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ deleted: true });
});

router.post('/run-batch', authRequired, async (req, res) => {
  const expected = process.env.ADMIN_BATCH_TOKEN;
  const provided = req.get('x-admin-token');
  if (!expected || provided !== expected) {
    return res.status(403).json({ error: 'Batch runs require admin authorization' });
  }
  const summary = await runWeeklyBatch();
  const findings = await runFindingsBatch();
  res.json({ ok: true, batch: summary, findings });
});

module.exports = router;
