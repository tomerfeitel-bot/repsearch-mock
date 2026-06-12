const express = require('express');
const { getAll, getOne } = require('../db');
const { authRequired } = require('../auth');

const router = express.Router();

const SET_TYPES = ['working', 'backoff', 'drop', 'amrap', 'rest_pause', 'cluster'];
const GROUPS = ['session', 'week', 'month'];
const METRICS = ['top_set', 'reps', 'reps_at_weight', 'estimated_1rm', 'volume', 'hard_sets', 'measurement'];
const BODY_METRICS = ['bodyweight_kg', 'arm_cm', 'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm'];
const SPLITS = ['Push', 'Pull', 'Legs', 'Other'];
const CORE_PIN_CANDIDATES = ['bench_barbell', 'squat_barbell', 'deadlift', 'press_ohp'];

const MUSCLE_TO_SPLIT = {
  Chest: 'Push', 'Upper Chest': 'Push', 'Mid Chest': 'Push', 'Lower Chest': 'Push',
  Shoulders: 'Push', 'Front Delts': 'Push', 'Side Delts': 'Push', Triceps: 'Push',
  Back: 'Pull', Lats: 'Pull', 'Upper Back': 'Pull', 'Lower Back': 'Pull', Traps: 'Pull',
  'Rear Delts': 'Pull', Biceps: 'Pull', Forearms: 'Pull',
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs', Adductors: 'Legs', Abductors: 'Legs'
};

function splitOf(muscle) {
  return MUSCLE_TO_SPLIT[muscle] || 'Other';
}

function dateOnly(value) {
  return String(value || '').slice(0, 10);
}

function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekKey(date) {
  const d = new Date(`${dateOnly(date)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateOnly(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return isoLocal(d);
}

function monthKey(date) {
  return dateOnly(date).slice(0, 7);
}

function groupKey(row, groupBy) {
  if (groupBy === 'week') return weekKey(row.date);
  if (groupBy === 'month') return monthKey(row.date);
  return dateOnly(row.date);
}

function estimate1rm(weight, reps) {
  return Number(weight) * (1 + Number(reps) / 30);
}

function parseJsonParam(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function cleanGroup(value) {
  return GROUPS.includes(value) ? value : 'session';
}

function cleanMetric(value) {
  return METRICS.includes(value) ? value : 'top_set';
}

function liftRowsWhere(userId, query = {}) {
  const wheres = ['w.user_id = ?', 'e.id IS NOT NULL'];
  const params = [userId];
  if (query.from) {wheres.push('w.date >= ?');params.push(String(query.from));}
  if (query.to) {wheres.push('w.date <= ?');params.push(String(query.to));}
  if (query.exercise_id) {wheres.push('s.exercise_id = ?');params.push(String(query.exercise_id));}
  if (query.equipment_type) {wheres.push('COALESCE(s.equipment_type, e.equipment_type) = ?');params.push(String(query.equipment_type));}
  if (query.rom_category) {wheres.push('s.rom_category = ?');params.push(String(query.rom_category));}
  if (query.split && SPLITS.includes(query.split)) {
    const muscles = Object.entries(MUSCLE_TO_SPLIT).filter(([, split]) => split === query.split).map(([muscle]) => muscle);
    if (query.split === 'Other') {
      wheres.push(`e.primary_muscle NOT IN (${Object.keys(MUSCLE_TO_SPLIT).map(() => '?').join(',')})`);
      params.push(...Object.keys(MUSCLE_TO_SPLIT));
    } else {
      wheres.push(`e.primary_muscle IN (${muscles.map(() => '?').join(',')})`);
      params.push(...muscles);
    }
  }
  if (query.primary_muscle) {wheres.push('e.primary_muscle = ?');params.push(String(query.primary_muscle));}
  if (query.set_type) {wheres.push('s.set_type = ?');params.push(String(query.set_type));} else
  {
    wheres.push(`COALESCE(s.set_type, 'working') IN (${SET_TYPES.map(() => '?').join(',')})`);
    params.push(...SET_TYPES);
  }
  wheres.push('s.weight_kg IS NOT NULL', 's.reps IS NOT NULL');
  return { wheres, params };
}

async function rowsForUser(userId, query = {}) {
  const { wheres, params } = liftRowsWhere(userId, query);
  return await getAll(
    `SELECT w.id AS workout_id, w.date, w.created_at, w.workout_day, w.duration_min,
            w.program_id, w.template_id, w.session_effort, w.feel_rating, w.run_classification,
            s.id AS set_id, s.exercise_id, s.weight_kg, s.reps, s.set_type, s.rom_category,
            s.equipment_type AS set_equipment_type, s.pain_flag, s.session_position, s.set_number,
            e.name AS exercise_name, e.primary_muscle, e.equipment_type
       FROM sets s
       JOIN workouts w ON w.id = s.workout_id
       JOIN exercises e ON e.id = s.exercise_id
      WHERE ${wheres.join(' AND ')}
      ORDER BY w.date ASC, w.created_at ASC, s.session_position ASC, s.set_number ASC`,
    params
  );
}

// The exercise picker only needs one row per exercise — aggregating in SQL
// avoids streaming the user's entire set history just to build the list.
async function exercisesForUser(userId, query = {}) {
  const { wheres, params } = liftRowsWhere(userId, query);
  return await getAll(
    `SELECT DISTINCT s.exercise_id, e.name AS exercise_name, e.primary_muscle, e.equipment_type
       FROM sets s
       JOIN workouts w ON w.id = s.workout_id
       JOIN exercises e ON e.id = s.exercise_id
      WHERE ${wheres.join(' AND ')}`,
    params
  );
}

function buildSeries(rows, metric, groupBy, opts = {}) {
  if (metric === 'reps') {
    const repBuckets = new Map();
    for (const row of rows) {
      const weight = Number(row.weight_kg);
      const reps = Number(row.reps);
      if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue;
      const key = groupKey(row, groupBy);
      const cur = repBuckets.get(key) || { date: key, value: null, weight_kg: null, reps: null, top_weight: -Infinity, set_type: 'working', workout_ids: new Set() };
      cur.workout_ids.add(row.workout_id);
      if (weight > cur.top_weight) {
        cur.top_weight = weight;
        cur.value = reps;
        cur.weight_kg = weight;
        cur.reps = reps;
        cur.set_type = row.set_type || 'working';
      }
      repBuckets.set(key, cur);
    }
    return [...repBuckets.values()].
    filter((point) => point.value != null).
    map((point) => ({
      date: point.date,
      value: point.value,
      weight_kg: point.weight_kg,
      reps: point.reps,
      set_type: point.set_type,
      workout_count: point.workout_ids.size
    }));
  }

  const buckets = new Map();
  const targetWeight = Number(opts.target_weight);
  const hasTarget = Number.isFinite(targetWeight) && targetWeight > 0;
  const tolerance = Number.isFinite(Number(opts.tolerance_kg)) ? Number(opts.tolerance_kg) : 2.5;

  for (const row of rows) {
    const key = groupKey(row, groupBy);
    const cur = buckets.get(key) || {
      date: key,
      value: null,
      weight_kg: null,
      reps: null,
      volume: 0,
      hard_sets: 0,
      workout_ids: new Set()
    };
    const weight = Number(row.weight_kg);
    const reps = Number(row.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue;
    cur.workout_ids.add(row.workout_id);

    if (metric === 'top_set') {
      if (cur.value == null || weight > cur.value) {
        cur.value = weight;
        cur.weight_kg = weight;
        cur.reps = reps;
      }
    } else if (metric === 'reps_at_weight') {
      if (hasTarget && Math.abs(weight - targetWeight) <= tolerance && (cur.value == null || reps > cur.value)) {
        cur.value = reps;
        cur.weight_kg = weight;
        cur.reps = reps;
      }
    } else if (metric === 'estimated_1rm') {
      const estimated = estimate1rm(weight, reps);
      if (cur.value == null || estimated > cur.value) {
        cur.value = Number(estimated.toFixed(1));
        cur.weight_kg = weight;
        cur.reps = reps;
      }
    } else if (metric === 'volume') {
      cur.volume += weight * reps;
      cur.value = Number(cur.volume.toFixed(1));
    } else if (metric === 'hard_sets') {
      cur.hard_sets += 1;
      cur.value = cur.hard_sets;
    }
    buckets.set(key, cur);
  }

  return [...buckets.values()].
  filter((point) => point.value != null).
  map((point) => ({
    ...point,
    workout_count: point.workout_ids.size,
    workout_ids: undefined,
    volume: undefined,
    hard_sets: undefined
  }));
}

function summarizeSeries(series) {
  if (!series.length) return null;
  const start = series[0].value;
  const current = series[series.length - 1].value;
  return {
    start,
    current,
    gain: Number((current - start).toFixed(1)),
    start_date: series[0].date,
    current_date: series[series.length - 1].date
  };
}

async function workoutRows(userId, query = {}) {
  const wheres = ['w.user_id = ?'];
  const params = [userId];
  if (query.from) {wheres.push('w.date >= ?');params.push(String(query.from));}
  if (query.to) {wheres.push('w.date <= ?');params.push(String(query.to));}
  return await getAll(
    `SELECT w.*,
            COUNT(s.id) AS set_count,
            COUNT(DISTINCT s.exercise_id) AS exercise_count
       FROM workouts w
       LEFT JOIN sets s ON s.workout_id = w.id
      WHERE ${wheres.join(' AND ')}
      GROUP BY w.id
      ORDER BY w.date DESC, w.created_at DESC`,
    params
  );
}

async function setsForWorkoutIds(userId, ids) {
  if (!ids.length) return [];
  return await getAll(
    `SELECT s.*,
            e.name AS exercise_name,
            e.primary_muscle,
            COALESCE(s.equipment_type, e.equipment_type) AS equipment_type
       FROM sets s
       JOIN exercises e ON e.id = s.exercise_id
      WHERE s.user_id = ?
        AND s.workout_id IN (${ids.map(() => '?').join(',')})
      ORDER BY s.session_position ASC, s.set_number ASC`,
    [userId, ...ids]
  );
}

function computeWeeklySessions(workouts) {
  const buckets = new Map();
  const today = new Date();
  for (let i = 7; i >= 0; i -= 1) {
    const ref = new Date(today);
    ref.setDate(today.getDate() - i * 7);
    const start = weekKey(isoLocal(ref));
    const startDate = new Date(`${start}T00:00:00`);
    buckets.set(start, { label: `${startDate.getMonth() + 1}/${startDate.getDate()}`, date: start, count: 0 });
  }
  for (const workout of workouts) {
    const key = weekKey(workout.date);
    if (buckets.has(key)) buckets.get(key).count += 1;
  }
  return [...buckets.values()];
}

async function bodyHistory(userId, query = {}) {
  const wheres = ['user_id = ?'];
  const params = [userId];
  if (query.from) {wheres.push('date >= ?');params.push(String(query.from));}
  if (query.to) {wheres.push('date <= ?');params.push(String(query.to));}
  return await getAll(
    `SELECT * FROM body_metrics_history
      WHERE ${wheres.join(' AND ')}
      ORDER BY date DESC, created_at DESC`,
    params
  );
}

function latestBody(history, key) {
  return history.find((row) => row[key] !== null && row[key] !== undefined);
}

function bodySummary(history) {
  const ascending = [...history].sort((a, b) => `${a.date}|${a.created_at}`.localeCompare(`${b.date}|${b.created_at}`));
  const latest = {};
  const deltas = {};
  for (const key of BODY_METRICS) {
    const current = latestBody(history, key);
    if (current) latest[key] = { value: current[key], date: current.date };
    const values = ascending.filter((row) => row[key] !== null && row[key] !== undefined);
    if (values.length > 1) {
      deltas[key] = Number((values[values.length - 1][key] - values[0][key]).toFixed(1));
    }
  }
  return { latest, deltas };
}

router.get('/summary', authRequired, async (req, res) => {
  // Dates only — joining every set just to count workouts made this the most
  // expensive query on the most-visited tab.
  const workouts = await getAll(
    'SELECT date FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.user.id]
  );
  const lastWorkout = await getOne(
    `SELECT w.*,
            (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
            (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count
       FROM workouts w
      WHERE w.user_id = ?
      ORDER BY w.date DESC, w.created_at DESC LIMIT 1`,
    [req.user.id]
  );
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const weekStart = weekKey(isoLocal(now));
  const sessionsThisMonth = workouts.filter((w) => dateOnly(w.date).startsWith(month)).length;
  const trainingDaysThisWeek = new Set(workouts.filter((w) => dateOnly(w.date) >= weekStart).map((w) => w.date)).size;
  res.json({
    summary: {
      totalWorkouts: workouts.length,
      sessionsThisMonth,
      trainingDaysThisWeek,
      lastWorkout: lastWorkout || null,
      weeklySessions: computeWeeklySessions(workouts)
    }
  });
});

router.get('/history', authRequired, async (req, res) => {
  const workouts = await workoutRows(req.user.id, req.query);
  const sets = await setsForWorkoutIds(req.user.id, workouts.map((w) => w.id));
  const setsByWorkout = sets.reduce((acc, set) => {
    ;(acc[set.workout_id] ||= []).push(set);
    return acc;
  }, {});
  res.json({
    workouts: workouts.map((w) => ({ ...w, sets: setsByWorkout[w.id] || [] }))
  });
});

router.get('/lifts', authRequired, async (req, res) => {
  const metric = cleanMetric(req.query.metric);
  const groupBy = cleanGroup(req.query.group_by);
  // Without an exercise filter only the picker list is needed; skip loading
  // the user's full set history.
  const exerciseRows = req.query.exercise_id ?
  await rowsForUser(req.user.id, req.query) :
  await exercisesForUser(req.user.id, req.query);
  const exerciseMap = new Map();
  for (const row of exerciseRows) {
    exerciseMap.set(row.exercise_id, {
      id: row.exercise_id,
      name: row.exercise_name,
      primary_muscle: row.primary_muscle,
      split: splitOf(row.primary_muscle),
      equipment_type: row.equipment_type
    });
  }
  const series = req.query.exercise_id ?
  buildSeries(exerciseRows, metric, groupBy, req.query) :
  [];
  res.json({
    exercises: [...exerciseMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    metric,
    groupBy,
    series,
    stats: summarizeSeries(series)
  });
});

router.get('/body', authRequired, async (req, res) => {
  const history = await bodyHistory(req.user.id, req.query);
  res.json({ history, summary: bodySummary(history) });
});

router.get('/records', authRequired, async (req, res) => {
  const rows = await getAll(
    `SELECT p.*, e.name AS exercise_name, e.primary_muscle, e.equipment_type
       FROM prs p
       JOIN exercises e ON e.id = p.exercise_id
      WHERE p.user_id = ?
      ORDER BY p.date DESC, p.weight_kg DESC`,
    [req.user.id]
  );
  const bestByExercise = new Map();
  for (const row of rows) {
    const cur = bestByExercise.get(row.exercise_id);
    const estimated = estimate1rm(row.weight_kg, row.reps);
    if (!cur || estimated > cur.estimated_1rm) {
      bestByExercise.set(row.exercise_id, { ...row, estimated_1rm: Number(estimated.toFixed(1)) });
    }
  }
  const records = [...bestByExercise.values()].sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
  const defaultPins = CORE_PIN_CANDIDATES.filter((id) => bestByExercise.has(id));
  if (!defaultPins.length) defaultPins.push(...records.slice(0, 4).map((r) => r.exercise_id));
  res.json({ records, defaultPins });
});

router.get('/compare', authRequired, async (req, res) => {
  const definitions = parseJsonParam(req.query.series, []);
  const seriesDefs = Array.isArray(definitions) ? definitions.slice(0, 3) : [];
  const groupBy = cleanGroup(req.query.group_by);
  const results = await Promise.all(seriesDefs.map(async (definition, index) => {
    const metric = cleanMetric(definition.metric);
    const sourceType = definition.source_type || 'exercise';
    if (sourceType === 'body_metric') {
      const key = BODY_METRICS.includes(definition.source_id) ? definition.source_id : 'bodyweight_kg';
      const points = [...(await bodyHistory(req.user.id, req.query))].
      reverse().
      filter((row) => row[key] !== null && row[key] !== undefined).
      map((row) => ({ date: groupKey(row, groupBy), value: row[key] }));
      return { id: definition.id || `series_${index}`, label: definition.label || key, metric: key, source_type: sourceType, points };
    }
    const query = { ...req.query, ...definition };
    if (sourceType === 'exercise') query.exercise_id = definition.source_id;
    if (sourceType === 'muscle') query.primary_muscle = definition.source_id;
    if (sourceType === 'split') query.split = definition.source_id;
    const rows = await rowsForUser(req.user.id, query);
    return {
      id: definition.id || `series_${index}`,
      label: definition.label || definition.source_id || metric,
      metric,
      source_type: sourceType,
      points: buildSeries(rows, metric, groupBy, { ...req.query, ...definition })
    };
  }));
  res.json({ series: results });
});

module.exports = router;
