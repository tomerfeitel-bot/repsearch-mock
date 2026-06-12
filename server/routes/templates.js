const express = require('express');
const { runQuery, getOne, getAll, tx } = require('../db');
const { authRequired } = require('../auth');
const { notBlockedSql } = require('../moderation');
const { nanoid, nowIso, safeStr, safeEnum, safeNum, safeInt } = require('../util');

const router = express.Router();

const VISIBILITY = ['private', 'public'];
const STRICTNESS = ['written', 'adapt', 'inspiration'];
const STATUS = ['draft', 'final'];

async function loadTemplateFull(id) {
  const t = await getOne(
    `SELECT t.*, u.username AS creator_username
       FROM workout_templates t
       JOIN users u ON u.id = t.user_id
      WHERE t.id = ?`,
    [id]
  );
  if (!t) return null;
  const exercises = await getAll(
    'SELECT * FROM template_exercises WHERE template_id = ? ORDER BY sort_order ASC',
    [id]
  );
  const exIds = exercises.map((e) => e.id);
  let setsByEx = {};
  if (exIds.length) {
    const placeholders = exIds.map(() => '?').join(',');
    const sets = await getAll(
      `SELECT * FROM template_sets WHERE template_exercise_id IN (${placeholders})`,
      exIds
    );
    setsByEx = sets.reduce((acc, s) => {(acc[s.template_exercise_id] ||= []).push(s);return acc;}, {});
  }
  return {
    ...t,
    exercises: exercises.map((e) => ({ ...e, sets: setsByEx[e.id] || [] }))
  };
}

router.get('/', authRequired, async (req, res) => {
  const includeDrafts = req.query.status === 'draft';
  const uid = req.user.id;
  const where = includeDrafts ?
  "t.user_id = ? AND t.status = 'draft'" :
  `(t.status IS NULL OR t.status = 'final') AND (t.user_id = ? OR (t.visibility = 'public' AND u.banned = 0)) AND ${notBlockedSql('t.user_id')}`;
  const params = includeDrafts ? [uid] : [uid, uid, uid];
  const rows = await getAll(
    `SELECT t.*, u.username AS creator_username
       FROM workout_templates t
       JOIN users u ON u.id = t.user_id
      WHERE ${where}
      ORDER BY (t.user_id = ?) DESC, t.usage_count DESC, t.created_at DESC
      LIMIT 100`,
    [...params, uid]
  );
  res.json({ templates: rows });
});

router.get('/start-suggestions', authRequired, async (req, res) => {
  // The most-used templates of the user, plus 3 popular public templates as fallback
  const mine = await getAll(
    `SELECT * FROM workout_templates WHERE user_id = ? AND (status IS NULL OR status = 'final')
       ORDER BY usage_count DESC, created_at DESC LIMIT 5`,
    [req.user.id]
  );
  const popular = await getAll(
    `SELECT * FROM workout_templates WHERE visibility = 'public' AND user_id != ? AND (status IS NULL OR status = 'final')
       AND ${notBlockedSql('user_id')}
       AND NOT EXISTS (SELECT 1 FROM users bu WHERE bu.id = user_id AND bu.banned = 1)
       ORDER BY usage_count DESC, created_at DESC LIMIT 5`,
    [req.user.id, req.user.id, req.user.id]
  );
  res.json({ mine, popular });
});

router.get('/:id', authRequired, async (req, res) => {
  const t = await loadTemplateFull(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const isOwner = t.user_id === req.user.id;
  const isPublic = t.visibility === 'public';
  const viaEnrollment = !isOwner && !isPublic && !!(await getOne(
    `SELECT 1 FROM program_enrollments pe
       JOIN program_workouts pw ON pw.program_id = pe.program_id
      WHERE pw.template_id = ? AND pe.user_id = ?`,
    [req.params.id, req.user.id]
  ));
  if (!isOwner && !isPublic && !viaEnrollment) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ template: t });
});

function setValue(s, key, fallback = null) {
  return s[key] !== undefined ? s[key] : fallback;
}

async function replaceTemplateExercises(t, templateId, exercises) {
  await t.runQuery('DELETE FROM template_exercises WHERE template_id = ?', [templateId]);
  for (const [i, ex] of (Array.isArray(exercises) ? exercises : []).entries()) {
    const exerciseId = safeStr(ex.exercise_id || ex.exerciseId, 64);
    // One malformed entry must not silently drop every exercise after it.
    if (!exerciseId) continue;
    const teId = nanoid();
    await t.runQuery(
      `INSERT INTO template_exercises (id, template_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)`,
      [teId, templateId, exerciseId, i]
    );
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    for (const s of sets) {
      await t.runQuery(
        `INSERT INTO template_sets (
           id, template_exercise_id, target_reps, target_weight_kg, target_rir,
           target_rep_range, set_type, rom_category, tempo_tag,
           rest_seconds, failure
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nanoid(), teId,
        safeStr(setValue(s, 'target_reps', setValue(s, 'reps')), 24),
        safeNum(setValue(s, 'target_weight_kg', setValue(s, 'weight_kg')), { min: 0, max: 1500 }),
        safeInt(setValue(s, 'target_rir', setValue(s, 'rir')), { min: 0, max: 10 }),
        safeStr(setValue(s, 'target_rep_range', setValue(s, 'rep_range')), 32),
        safeStr(s.set_type, 24) ?? 'working',
        safeStr(s.rom_category, 32),
        safeStr(s.tempo_tag, 32),
        safeInt(s.rest_seconds, { min: 0, max: 3600 }),
        s.failure ? 1 : 0]
      );
    }
  }
}

async function createTemplateShell(t, req, overrides = {}) {
  const body = req.body || {};
  const id = nanoid();
  const now = nowIso();
  const status = safeEnum(overrides.status ?? body.status, STATUS) ?? 'final';
  const name = safeStr(overrides.name ?? body.name, 80) || (status === 'draft' ? 'Untitled template' : '');
  if (!name) return { error: 'name required' };
  await t.runQuery(
    `INSERT INTO workout_templates (
       id, user_id, name, description, visibility, status, source_workout_id,
       workout_split_type, workout_day, strictness, source_template_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.id, name,
    safeStr(overrides.description ?? body.description, 1000) ?? '',
    status === 'draft' ? 'private' : safeEnum(overrides.visibility ?? body.visibility, VISIBILITY) ?? 'private',
    status,
    safeStr(overrides.source_workout_id ?? body.source_workout_id, 32),
    safeStr(overrides.workout_split_type ?? body.workout_split_type, 40),
    safeStr(overrides.workout_day ?? body.workout_day, 40),
    safeEnum(overrides.strictness ?? body.strictness, STRICTNESS) ?? 'adapt',
    safeStr(overrides.source_template_id ?? body.source_template_id, 32),
    now]
  );
  return { id };
}

router.post('/', authRequired, async (req, res) => {
  try {
    const created = await tx(async (t) => {
      const shell = await createTemplateShell(t, req);
      if (shell.error) return shell;
      await replaceTemplateExercises(t, shell.id, req.body?.exercises);
      return shell;
    });
    if (created.error) return res.status(400).json({ error: created.error });
    res.json({ template: await loadTemplateFull(created.id) });
  } catch (err) {
    console.error('Template create failed:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.post('/drafts', authRequired, async (req, res) => {
  try {
    const created = await tx(async (t) => {
      const shell = await createTemplateShell(t, req, { status: 'draft', name: req.body?.name || 'Untitled template' });
      await replaceTemplateExercises(t, shell.id, req.body?.exercises);
      return shell;
    });
    res.json({ template: await loadTemplateFull(created.id) });
  } catch (err) {
    console.error('Template draft create failed:', err);
    res.status(500).json({ error: 'Failed to create template draft' });
  }
});

async function canReadWorkout(workout, userId) {
  if (!workout) return false;
  if (workout.user_id === userId) return true;
  if (workout.visibility === 'public') return true;
  if (workout.visibility === 'followers') {
    return !!(await getOne('SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?', [userId, workout.user_id]));
  }
  return false;
}

async function workoutToExercises(workoutId) {
  const sets = await getAll(
    'SELECT * FROM sets WHERE workout_id = ? ORDER BY session_position, set_number',
    [workoutId]
  );
  const byExercise = new Map();
  for (const s of sets) {
    if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
    byExercise.get(s.exercise_id).push(s);
  }
  return [...byExercise.entries()].map(([exercise_id, exSets]) => ({
    exercise_id,
    sets: exSets.map((s) => ({
      target_reps: s.reps != null ? String(s.reps) : '',
      target_weight_kg: s.weight_kg,
      target_rir: s.rir,
      set_type: s.set_type ?? 'working',
      rom_category: s.rom_category,
      tempo_tag: s.tempo_tag,
      rest_seconds: s.rest_seconds,
      failure: !!s.failure
    }))
  }));
}

router.post('/drafts/from-workout/:wid', authRequired, async (req, res) => {
  const workout = await getOne('SELECT * FROM workouts WHERE id = ?', [req.params.wid]);
  if (!(await canReadWorkout(workout, req.user.id))) return res.status(workout ? 403 : 404).json({ error: workout ? 'Forbidden' : 'Workout not found' });
  try {
    const exercises = await workoutToExercises(req.params.wid);
    const created = await tx(async (t) => {
      const shell = await createTemplateShell(t, req, {
        status: 'draft',
        name: req.body?.name || `${workout.workout_day || 'Workout'} template draft`,
        source_workout_id: req.params.wid,
        workout_split_type: workout.workout_split_type,
        workout_day: workout.workout_day,
        strictness: req.body?.strictness || 'adapt'
      });
      await replaceTemplateExercises(t, shell.id, exercises);
      return shell;
    });
    res.json({ template: await loadTemplateFull(created.id) });
  } catch (err) {
    console.error('Template draft from workout failed:', err);
    res.status(500).json({ error: 'Failed to create template draft' });
  }
});

router.patch('/:id', authRequired, async (req, res) => {
  const current = await getOne('SELECT * FROM workout_templates WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Template not found' });
  if (current.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const requestedStatus = safeEnum(body.status, STATUS) ?? current.status ?? 'final';
  const nextStatus = current.status === 'final' && requestedStatus === 'draft' ? 'final' : requestedStatus;
  const name = safeStr(body.name, 80) || current.name;
  if (nextStatus === 'final' && !name.trim()) return res.status(400).json({ error: 'name required' });
  try {
    await tx(async (t) => {
      await t.runQuery(
        `UPDATE workout_templates
            SET name = ?, description = ?, visibility = ?, status = ?,
                workout_split_type = ?, workout_day = ?, strictness = ?
          WHERE id = ?`,
        [name,
        safeStr(body.description, 1000) ?? current.description ?? '',
        nextStatus === 'draft' ? 'private' : safeEnum(body.visibility, VISIBILITY) ?? current.visibility ?? 'private',
        nextStatus,
        safeStr(body.workout_split_type, 40) ?? current.workout_split_type,
        safeStr(body.workout_day, 40) ?? current.workout_day,
        safeEnum(body.strictness, STRICTNESS) ?? current.strictness ?? 'adapt',
        req.params.id]
      );
      if (Array.isArray(body.exercises)) await replaceTemplateExercises(t, req.params.id, body.exercises);
    });
    res.json({ template: await loadTemplateFull(req.params.id) });
  } catch (err) {
    console.error('Template update failed:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  const current = await getOne('SELECT * FROM workout_templates WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Template not found' });
  if (current.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const programUse = await getOne(
    `SELECT 1 AS x
       FROM program_workouts pw
       JOIN programs p ON p.id = pw.program_id
      WHERE pw.template_id = ?
      LIMIT 1`,
    [req.params.id]
  );
  if (programUse && current.status !== 'draft') {
    return res.status(409).json({ error: 'This template is used in a program. Remove it from the program first.' });
  }
  try {
    await runQuery('DELETE FROM workout_templates WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Template delete failed:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

router.post('/from-workout/:wid', authRequired, async (req, res) => {
  const workout = await getOne('SELECT * FROM workouts WHERE id = ?', [req.params.wid]);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  if (workout.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const sets = await getAll(
    'SELECT * FROM sets WHERE workout_id = ? ORDER BY session_position, set_number',
    [req.params.wid]
  );
  const byExercise = new Map();
  for (const s of sets) {
    if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
    byExercise.get(s.exercise_id).push(s);
  }

  const name = safeStr(req.body?.name, 80) || `Template from ${workout.date}`;
  const id = nanoid();
  const now = nowIso();
  try {
    await tx(async (t) => {
      await t.runQuery(
        `INSERT INTO workout_templates (
           id, user_id, name, description, visibility, status, source_workout_id,
           workout_split_type, workout_day, strictness, source_template_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, name, safeStr(req.body?.description, 1000) ?? '',
        safeEnum(req.body?.visibility, VISIBILITY) ?? 'private',
        'final',
        req.params.wid, workout.workout_split_type, workout.workout_day,
        safeEnum(req.body?.strictness, STRICTNESS) ?? 'adapt',
        safeStr(req.body?.source_template_id, 32),
        now]
      );
      let sort = 0;
      for (const [exerciseId, exSets] of byExercise) {
        const teId = nanoid();
        await t.runQuery(
          `INSERT INTO template_exercises (id, template_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)`,
          [teId, id, exerciseId, sort++]
        );
        for (const s of exSets) {
          if (s.set_type === 'warmup') continue;
          await t.runQuery(
            `INSERT INTO template_sets (
               id, template_exercise_id, target_reps, target_weight_kg, target_rir,
               set_type, rom_category, tempo_tag, rest_seconds, failure
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nanoid(), teId, String(s.reps ?? ''), s.weight_kg, s.rir, s.set_type ?? 'working',
            s.rom_category, s.tempo_tag, s.rest_seconds, s.failure ? 1 : 0]
          );
        }
      }
    });
    res.json({ template: await loadTemplateFull(id) });
  } catch (err) {
    console.error('Template-from-workout failed:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

module.exports = router;
