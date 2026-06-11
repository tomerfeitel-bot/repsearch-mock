const express = require('express');
const { db, runQuery, getOne, getAll } = require('../db');
const { authRequired } = require('../auth');
const { nanoid, nowIso, safeStr, safeInt, safeEnum } = require('../util');

const router = express.Router();

const VISIBILITY = ['private', 'public'];
const STATUS = ['draft', 'final'];
const STRICTNESS = ['written', 'adapt', 'inspiration'];
const SORTS = ['for_you', 'following', 'enrolled', 'progression'];
const TIMING_PRESETS = ['next_day', 'after_1_rest_day', 'after_2_rest_days', 'two_to_three_days', 'any_time_this_week', 'optional_bonus', 'advanced'];
const TIMING_DEFAULTS = {
  next_day: { min: 18, ideal: 24, max: 36 },
  after_1_rest_day: { min: 36, ideal: 48, max: 72 },
  after_2_rest_days: { min: 60, ideal: 72, max: 96 },
  two_to_three_days: { min: 48, ideal: 72, max: 96 },
  any_time_this_week: { min: 0, ideal: 72, max: 168 },
  optional_bonus: { min: 0, ideal: 0, max: 168 },
  advanced: { min: 36, ideal: 48, max: 72 }
};

function timingWindow(session = {}) {
  const preset = TIMING_PRESETS.includes(session.timing_preset) ? session.timing_preset : 'after_1_rest_day';
  const fallback = TIMING_DEFAULTS[preset] || TIMING_DEFAULTS.after_1_rest_day;
  return {
    preset,
    min: Number.isFinite(Number(session.timing_min_hours)) ? Number(session.timing_min_hours) : fallback.min,
    ideal: Number.isFinite(Number(session.timing_ideal_hours)) ? Number(session.timing_ideal_hours) : fallback.ideal,
    max: Number.isFinite(Number(session.timing_max_hours)) ? Number(session.timing_max_hours) : fallback.max
  };
}

function addHours(iso, hours) {
  return new Date(new Date(iso).getTime() + (Number(hours) || 0) * 60 * 60 * 1000).toISOString();
}

function buildProof({ enrollments = 0, active = 0, workouts = 0, exact = 0, adapted = 0, avg_progression = null, progress_n = 0 } = {}) {
  let hero = 'Not enough data';
  let status = 'not_enough_data';
  if (active > 0) {
    hero = `${active} active`;
    status = 'early_signal';
  }
  if (workouts >= 6 && enrollments > 0) {
    hero = `${Math.round(workouts / enrollments)} sessions avg`;
    status = enrollments >= 10 ? 'based_on_lifters' : 'early_signal';
  }
  if (progress_n >= 10 && avg_progression != null) {
    hero = `+${(avg_progression * 100).toFixed(1)}%/wk`;
    status = 'based_on_lifters';
  }
  return {
    starts: enrollments,
    active_users: active,
    logged_workouts: workouts,
    exact_runs: exact,
    adapted_runs: adapted,
    avg_progression,
    progress_sample_size: progress_n,
    hero,
    status
  };
}

async function proofSummaries(programIds) {
  const ids = [...new Set(programIds)].filter(Boolean);
  const proofs = new Map(ids.map((id) => [id, buildProof()]));
  if (!ids.length) return proofs;
  const ph = ids.map(() => '?').join(',');

  for (const r of await getAll(
    `SELECT program_id,
            COUNT(*) AS enrollments,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM program_enrollments
      WHERE program_id IN (${ph})
      GROUP BY program_id`,
    ids
  )) {
    proofs.set(r.program_id, { ...proofs.get(r.program_id), enrollments: r.enrollments, active: r.active || 0 });
  }
  for (const r of await getAll(
    `SELECT program_id,
            COUNT(*) AS workouts,
            SUM(CASE WHEN run_classification = 'exact' THEN 1 ELSE 0 END) AS exact,
            SUM(CASE WHEN run_classification IN ('adapted', 'derived') THEN 1 ELSE 0 END) AS adapted
       FROM workouts
      WHERE program_id IN (${ph})
      GROUP BY program_id`,
    ids
  )) {
    proofs.set(r.program_id, { ...proofs.get(r.program_id), workouts: r.workouts, exact: r.exact || 0, adapted: r.adapted || 0 });
  }
  for (const r of await getAll(
    `SELECT pe.program_id, AVG(uep.progression_rate) AS avg_progression, COUNT(DISTINCT uep.user_id) AS progress_n
       FROM program_enrollments pe
       JOIN user_exercise_profile uep ON uep.user_id = pe.user_id
      WHERE pe.program_id IN (${ph}) AND uep.progression_rate IS NOT NULL
      GROUP BY pe.program_id`,
    ids
  )) {
    proofs.set(r.program_id, { ...proofs.get(r.program_id), avg_progression: r.avg_progression, progress_n: r.progress_n || 0 });
  }
  return new Map([...proofs].map(([id, proof]) => [id, buildProof(proof)]));
}

async function withProof(rows) {
  const proofs = await proofSummaries(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, proof: proofs.get(row.id) || buildProof() }));
}

async function proofSummary(programId) {
  return (await proofSummaries([programId])).get(programId) || buildProof();
}

async function loadProgramFull(programId, userId) {
  const p = await getOne(
    `SELECT p.*, u.username AS creator_username
       FROM programs p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    [programId]
  );
  if (!p) return null;
  if (p.visibility !== 'public' && p.user_id !== userId) return { forbidden: true };
  if (p.status === 'draft' && p.user_id !== userId) return { forbidden: true };
  const blocks = await getAll(
    'SELECT * FROM program_blocks WHERE program_id = ? ORDER BY sort_order',
    [programId]
  );
  const workouts = await getAll(
    `SELECT pw.*, wt.name AS template_name, wt.description AS template_description
       FROM program_workouts pw
       LEFT JOIN workout_templates wt ON wt.id = pw.template_id
      WHERE pw.program_id = ?
      ORDER BY COALESCE((SELECT sort_order FROM program_blocks WHERE id = pw.block_id), 0), pw.sort_order`,
    [programId]
  );
  const enrollment = await getOne(
    'SELECT * FROM program_enrollments WHERE program_id = ? AND user_id = ?',
    [programId, userId]
  );
  const phase = await getOne(
    'SELECT * FROM user_program_phase WHERE program_id = ? AND user_id = ?',
    [programId, userId]
  );
  return { ...p, blocks, workouts, enrollment, phase, proof: await proofSummary(programId) };
}

async function canUseTemplate(templateId, userId) {
  if (!templateId) return false;
  const t = await getOne('SELECT id, user_id, visibility, status FROM workout_templates WHERE id = ?', [templateId]);
  return !!t && t.status !== 'draft' && (t.visibility === 'public' || t.user_id === userId);
}

async function createProgramShell(userId, body = {}, status = 'draft') {
  const id = nanoid();
  const now = nowIso();
  await runQuery(
    `INSERT INTO programs (
       id, user_id, name, description, weeks, visibility, status,
       strictness, is_open_ended, checkpoint_weeks, source_program_id, creator_verified, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
    id,
    userId,
    safeStr(body.name, 100) || 'Untitled program',
    safeStr(body.description, 2000) ?? '',
    safeInt(body.weeks, { min: 1 }) ?? 1,
    status === 'draft' ? 'private' : safeEnum(body.visibility, VISIBILITY) ?? 'public',
    safeEnum(status, STATUS) ?? 'draft',
    safeEnum(body.strictness, STRICTNESS) ?? 'adapt',
    body.is_open_ended === false ? 0 : 1,
    safeInt(body.checkpoint_weeks, { min: 1 }) ?? 6,
    safeStr(body.source_program_id, 32),
    now]

  );
  return id;
}

async function replaceProgramStructure(programId, userId, blocks = []) {
  await runQuery('DELETE FROM program_workouts WHERE program_id = ?', [programId]);
  await runQuery('DELETE FROM program_blocks WHERE program_id = ?', [programId]);
  const safeBlocks = Array.isArray(blocks) && blocks.length ? blocks : [{ name: 'Main block', sessions: [] }];
  for (const [blockIdx, block] of safeBlocks.entries()) {
    const blockId = nanoid();
    await runQuery(
      `INSERT INTO program_blocks (id, program_id, name, description, sort_order, repeat_behavior)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
      blockId,
      programId,
      safeStr(block.name, 80) || (blockIdx === 0 ? 'Main block' : `Block ${blockIdx + 1}`),
      safeStr(block.description, 1000) ?? '',
      safeInt(block.sort_order, { min: 0 }) ?? blockIdx,
      safeStr(block.repeat_behavior, 40) || 'repeat']

    );
    const sessions = Array.isArray(block.sessions) ? block.sessions : [];
    for (const [i, session] of sessions.entries()) {
      const templateId = safeStr(session.template_id, 32);
      if (!(await canUseTemplate(templateId, userId))) continue;
      const preset = safeEnum(session.timing_preset, TIMING_PRESETS) ?? 'after_1_rest_day';
      const defaults = TIMING_DEFAULTS[preset] || TIMING_DEFAULTS.after_1_rest_day;
      await runQuery(
        `INSERT INTO program_workouts (
           id, program_id, template_id, block_id, week_number, day_number, sort_order,
           session_label, session_note, optional, timing_preset,
           timing_min_hours, timing_ideal_hours, timing_max_hours
         ) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
        nanoid(),
        programId,
        templateId,
        blockId,
        safeInt(session.sort_order, { min: 0 }) ?? i,
        safeStr(session.session_label, 80),
        safeStr(session.session_note, 1000),
        session.optional ? 1 : 0,
        preset,
        safeInt(session.timing_min_hours, { min: 0, max: 24 * 30 }) ?? defaults.min,
        safeInt(session.timing_ideal_hours, { min: 0, max: 24 * 30 }) ?? defaults.ideal,
        safeInt(session.timing_max_hours, { min: 0, max: 24 * 30 }) ?? defaults.max]

      );
    }
  }
}

async function firstSession(programId) {
  return await getOne(
    `SELECT pw.*
       FROM program_workouts pw
       LEFT JOIN program_blocks pb ON pb.id = pw.block_id
      WHERE pw.program_id = ?
      ORDER BY COALESCE(pb.sort_order, 0), pw.sort_order
      LIMIT 1`,
    [programId]
  );
}

async function orderedProgramSessions(programId) {
  return await getAll(
    `SELECT pw.*, wt.name AS template_name, wt.description AS template_description,
            pb.name AS block_name, pb.sort_order AS block_sort_order
       FROM program_workouts pw
       LEFT JOIN program_blocks pb ON pb.id = pw.block_id
       LEFT JOIN workout_templates wt ON wt.id = pw.template_id
      WHERE pw.program_id = ?
      ORDER BY COALESCE(pb.sort_order, 0), pw.sort_order`,
    [programId]
  );
}

async function activeProgramNext(userId) {
  const enrollment = await getOne(
    `SELECT pe.*, p.name AS program_name, p.description AS program_description,
            p.strictness, p.is_open_ended, p.visibility, p.status
       FROM program_enrollments pe
       JOIN programs p ON p.id = pe.program_id
      WHERE pe.user_id = ? AND pe.status = 'active'
      ORDER BY pe.started_at DESC
      LIMIT 1`,
    [userId]
  );
  if (!enrollment) return null;
  const sessions = await orderedProgramSessions(enrollment.program_id);
  if (!sessions.length) return { enrollment, program: enrollment, phase: null, next_session: null };
  let phase = await getOne(
    'SELECT * FROM user_program_phase WHERE program_id = ? AND user_id = ?',
    [enrollment.program_id, userId]
  );
  if (!phase) {
    const first = sessions[0];
    const now = nowIso();
    const suggested = addHours(enrollment.started_at || now, timingWindow(first).ideal);
    const phaseId = nanoid();
    await runQuery(
      `INSERT INTO user_program_phase (
         id, user_id, program_id, week_number, block_id, sequence_position,
         next_session_id, next_suggested_at, timing_status, started_at, updated_at
       ) VALUES (?, ?, ?, 1, ?, 0, ?, ?, 'on_track', ?, ?)`,
      [phaseId, userId, enrollment.program_id, first.block_id, first.id, suggested, enrollment.started_at || now, now]
    );
    phase = await getOne('SELECT * FROM user_program_phase WHERE id = ?', [phaseId]);
  }
  const nextSession = sessions.find((s) => s.id === phase.next_session_id) || sessions[0];
  return {
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      started_at: enrollment.started_at,
      expected_minimum_weeks: enrollment.expected_minimum_weeks
    },
    program: {
      id: enrollment.program_id,
      name: enrollment.program_name,
      description: enrollment.program_description,
      strictness: enrollment.strictness,
      is_open_ended: enrollment.is_open_ended
    },
    phase,
    next_session: nextSession
  };
}

async function completedProgramLanding(userId) {
  const enrollment = await getOne(
    `SELECT pe.*, p.name AS program_name, p.description AS program_description,
            p.strictness, p.is_open_ended
       FROM program_enrollments pe
       JOIN programs p ON p.id = pe.program_id
      WHERE pe.user_id = ? AND pe.status = 'completed'
      ORDER BY pe.completed_at DESC
      LIMIT 1`,
    [userId]
  );
  if (!enrollment) return null;
  const phase = await getOne(
    'SELECT * FROM user_program_phase WHERE program_id = ? AND user_id = ?',
    [enrollment.program_id, userId]
  );
  return {
    completed: true,
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      started_at: enrollment.started_at,
      completed_at: enrollment.completed_at,
      expected_minimum_weeks: enrollment.expected_minimum_weeks
    },
    program: {
      id: enrollment.program_id,
      name: enrollment.program_name,
      description: enrollment.program_description,
      strictness: enrollment.strictness,
      is_open_ended: enrollment.is_open_ended
    },
    phase,
    next_session: null
  };
}

router.get('/active/next', authRequired, async (req, res) => {
  res.json((await activeProgramNext(req.user.id)) || (await completedProgramLanding(req.user.id)) || { program: null, phase: null, next_session: null });
});

router.get('/', authRequired, async (req, res) => {
  const status = safeEnum(req.query.status, STATUS);
  const sort = safeEnum(req.query.sort, SORTS) ?? 'enrolled';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
  const userId = req.user.id;

  if (status === 'draft') {
    const rows = await getAll(
      `SELECT p.*, u.username AS creator_username, 0 AS enrollment_count
         FROM programs p
         JOIN users u ON u.id = p.user_id
        WHERE p.user_id = ? AND p.status = 'draft'
        ORDER BY p.created_at DESC
        LIMIT ?`,
      [userId, limit]
    );
    return res.json({ programs: await withProof(rows), sort, status });
  }

  let rows;
  const finalPublic = `p.visibility = 'public' AND COALESCE(p.status, 'final') = 'final'`;
  if (sort === 'following') {
    rows = await getAll(
      `SELECT p.*, u.username AS creator_username,
              (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
         FROM programs p
         JOIN users u ON u.id = p.user_id
         JOIN follows f ON f.following_id = p.user_id
        WHERE f.follower_id = ? AND ${finalPublic}
        ORDER BY p.created_at DESC
        LIMIT ?`,
      [userId, limit]
    );
  } else if (sort === 'progression') {
    rows = await getAll(
      `SELECT p.*, u.username AS creator_username,
              (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count,
              (SELECT AVG(uep.progression_rate)
                 FROM program_enrollments pe
                 JOIN user_exercise_profile uep ON uep.user_id = pe.user_id
                WHERE pe.program_id = p.id AND uep.progression_rate IS NOT NULL) AS avg_progression
         FROM programs p
         JOIN users u ON u.id = p.user_id
        WHERE ${finalPublic} AND u.is_private = 0
        ORDER BY avg_progression DESC NULLS LAST
        LIMIT ?`,
      [limit]
    );
  } else if (sort === 'for_you') {
    rows = await getAll(
      `SELECT p.*, u.username AS creator_username,
              (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
         FROM programs p
         JOIN users u ON u.id = p.user_id
        WHERE ${finalPublic}
          AND (u.is_private = 0 OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?))
        ORDER BY (p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)) DESC,
                 enrollment_count DESC, p.created_at DESC
        LIMIT ?`,
      [userId, userId, limit]
    );
  } else {
    rows = await getAll(
      `SELECT p.*, u.username AS creator_username,
              (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
         FROM programs p
         JOIN users u ON u.id = p.user_id
        WHERE ${finalPublic} AND u.is_private = 0
        ORDER BY enrollment_count DESC, p.created_at DESC
        LIMIT ?`,
      [limit]
    );
  }
  res.json({ programs: await withProof(rows), sort });
});

router.get('/:id', authRequired, async (req, res) => {
  const program = await loadProgramFull(req.params.id, req.user.id);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  if (program.forbidden) return res.status(403).json({ error: 'Forbidden' });
  res.json({ program });
});

router.post('/drafts', authRequired, async (req, res) => {
  const id = await createProgramShell(req.user.id, req.body || {}, 'draft');
  if (!(await getAll('SELECT id FROM program_blocks WHERE program_id = ?', [id])).length) {
    await replaceProgramStructure(id, req.user.id, [{ name: 'Main block', sessions: [] }]);
  }
  res.json({ program: await loadProgramFull(id, req.user.id) });
});

router.post('/', authRequired, async (req, res) => {
  const body = req.body || {};
  const name = safeStr(body.name, 100);
  if (!name) return res.status(400).json({ error: 'name required' });
  await db.exec('BEGIN');
  try {
    const id = await createProgramShell(req.user.id, body, 'final');
    await replaceProgramStructure(id, req.user.id, body.blocks || legacyBlocks(body.workouts));
    await db.exec('COMMIT');
    res.json({ program: await loadProgramFull(id, req.user.id) });
  } catch (err) {
    try {await db.exec('ROLLBACK');} catch {/* noop */}
    console.error('Program create failed:', err);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

router.patch('/:id', authRequired, async (req, res) => {
  const current = await getOne('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Program not found' });
  if (current.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const requestedStatus = safeEnum(body.status, STATUS);
  const status = current.status === 'final' && requestedStatus === 'draft' ? 'final' : requestedStatus || current.status || 'draft';
  await db.exec('BEGIN');
  try {
    await runQuery(
      `UPDATE programs
          SET name = ?, description = ?, visibility = ?, status = ?, strictness = ?,
              is_open_ended = ?, checkpoint_weeks = ?, source_program_id = ?, weeks = ?
        WHERE id = ?`,
      [
      safeStr(body.name, 100) || current.name,
      safeStr(body.description, 2000) ?? '',
      status === 'draft' ? 'private' : safeEnum(body.visibility, VISIBILITY) ?? current.visibility,
      status,
      safeEnum(body.strictness, STRICTNESS) ?? current.strictness,
      body.is_open_ended === false ? 0 : 1,
      safeInt(body.checkpoint_weeks, { min: 1 }) ?? current.checkpoint_weeks ?? 6,
      safeStr(body.source_program_id, 32) ?? current.source_program_id,
      safeInt(body.weeks, { min: 1 }) ?? current.weeks ?? 1,
      req.params.id]

    );
    if (Array.isArray(body.blocks)) await replaceProgramStructure(req.params.id, req.user.id, body.blocks);
    await db.exec('COMMIT');
    res.json({ program: await loadProgramFull(req.params.id, req.user.id) });
  } catch (err) {
    try {await db.exec('ROLLBACK');} catch {/* noop */}
    console.error('Program update failed:', err);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  const current = await getOne('SELECT id, user_id FROM programs WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Program not found' });
  if (current.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await runQuery('DELETE FROM programs WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/:id/start', authRequired, async (req, res) => {
  const program = await getOne('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  if (program.visibility !== 'public' && program.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (program.status === 'draft') return res.status(400).json({ error: 'Draft programs cannot be started' });
  if (req.body?.accepted_minimum_weeks !== true) {
    return res.status(400).json({ error: 'Confirm the 6-week minimum expectation to start this program.' });
  }
  const session = await firstSession(req.params.id);
  if (!session) return res.status(400).json({ error: 'Program has no sessions' });
  const startDate = safeStr(req.body?.start_date, 40);
  const startIso = startDate ? new Date(`${startDate}T12:00:00.000Z`).toISOString() : nowIso();
  const window = timingWindow({ timing_preset: 'next_day', timing_min_hours: 0, timing_ideal_hours: 0, timing_max_hours: 24 });
  const now = nowIso();
  const existing = await getOne(
    'SELECT id FROM program_enrollments WHERE program_id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  let enrollmentId;
  if (existing) {
    enrollmentId = existing.id;
    await runQuery(
      `UPDATE program_enrollments
          SET status = 'active', started_at = ?, completed_at = NULL,
              minimum_weeks_ack = 1, expected_minimum_weeks = 6
        WHERE id = ?`,
      [startIso, enrollmentId]
    );
  } else {
    enrollmentId = nanoid();
    await runQuery(
      `INSERT INTO program_enrollments (
         id, user_id, program_id, status, started_at, minimum_weeks_ack, expected_minimum_weeks
       ) VALUES (?, ?, ?, 'active', ?, 1, 6)`,
      [enrollmentId, req.user.id, req.params.id, startIso]
    );
  }
  const phaseExisting = await getOne(
    'SELECT id FROM user_program_phase WHERE program_id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  const suggested = addHours(startIso, window.ideal);
  if (phaseExisting) {
    await runQuery(
      `UPDATE user_program_phase
          SET week_number = 1, block_id = ?, sequence_position = 0, next_session_id = ?,
              next_suggested_at = ?, timing_status = 'on_track', adaptation_decision = NULL,
              started_at = ?, updated_at = ?
        WHERE id = ?`,
      [session.block_id, session.id, suggested, startIso, now, phaseExisting.id]
    );
  } else {
    await runQuery(
      `INSERT INTO user_program_phase (
         id, user_id, program_id, week_number, block_id, sequence_position,
         next_session_id, next_suggested_at, timing_status, started_at, updated_at
       ) VALUES (?, ?, ?, 1, ?, 0, ?, ?, 'on_track', ?, ?)`,
      [nanoid(), req.user.id, req.params.id, session.block_id, session.id, suggested, startIso, now]
    );
  }
  res.json({
    enrollment_id: enrollmentId,
    next_session_id: session.id,
    template_id: session.template_id,
    next_suggested_at: suggested
  });
});

router.post('/:id/phase-decision', authRequired, async (req, res) => {
  const decision = safeEnum(req.body?.decision, ['continue', 'shift', 'skip_adapt']) || 'continue';
  const phase = await getOne(
    'SELECT * FROM user_program_phase WHERE program_id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!phase) return res.status(404).json({ error: 'Program is not active' });
  await runQuery(
    `UPDATE user_program_phase
        SET timing_status = ?, adaptation_decision = ?, updated_at = ?
      WHERE id = ?`,
    [decision === 'skip_adapt' ? 'adapted' : 'on_track', decision, nowIso(), phase.id]
  );
  res.json({ phase: await getOne('SELECT * FROM user_program_phase WHERE id = ?', [phase.id]) });
});

router.get('/:id/results', authRequired, async (req, res) => {
  const program = await getOne('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  if (program.visibility !== 'public' && program.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rows = await getAll(
    `SELECT uep.exercise_id, e.name AS exercise_name, e.primary_muscle,
            AVG(uep.progression_rate) AS avg_progression_rate,
            AVG(uep.estimated_1rm) AS avg_estimated_1rm,
            COUNT(DISTINCT uep.user_id) AS n_users
       FROM program_enrollments pe
       JOIN user_exercise_profile uep ON uep.user_id = pe.user_id
       LEFT JOIN exercises e ON e.id = uep.exercise_id
      WHERE pe.program_id = ?
      GROUP BY uep.exercise_id, e.name, e.primary_muscle
      HAVING COUNT(DISTINCT uep.user_id) >= 3
      ORDER BY avg_progression_rate DESC`,
    [req.params.id]
  );
  const enrollCount = (await getOne(
    'SELECT COUNT(*) AS n FROM program_enrollments WHERE program_id = ?',
    [req.params.id]
  )).n;
  res.json({
    program_id: req.params.id,
    enrollments: enrollCount,
    exercise_results: rows
  });
});

router.get('/:id/evidence', authRequired, async (req, res) => {
  const program = await getOne('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  if (program.visibility !== 'public' && program.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const proof = await proofSummary(req.params.id);
  const exactUsers = (await getOne(
    `SELECT COUNT(DISTINCT user_id) AS n FROM workouts WHERE program_id = ? AND run_classification = 'exact'`,
    [req.params.id]
  )).n;
  const adaptedUsers = (await getOne(
    `SELECT COUNT(DISTINCT user_id) AS n FROM workouts WHERE program_id = ? AND run_classification IN ('adapted', 'derived')`,
    [req.params.id]
  )).n;
  res.json({
    program_id: req.params.id,
    proof,
    cohorts: {
      running_this: proof.starts,
      exact_users: exactUsers,
      adapting_this: adaptedUsers,
      matched_lifters: null
    },
    language: proof.status === 'based_on_lifters' ?
    `Associated with ${proof.hero} based on ${proof.progress_sample_size || proof.starts} lifters.` :
    'Not enough data yet. Early usage can show adherence before progress is reliable.'
  });
});

function legacyBlocks(workouts = []) {
  return [{
    name: 'Main block',
    repeat_behavior: 'repeat',
    sessions: (Array.isArray(workouts) ? workouts : []).map((w, i) => ({
      template_id: w.template_id,
      sort_order: i,
      timing_preset: 'after_1_rest_day'
    }))
  }];
}

module.exports = router;
