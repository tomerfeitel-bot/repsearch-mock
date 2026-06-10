const { db, getAll, getOne, runQuery } = require('./db');
const { nanoid, nowIso, isoWeek, estimate1RM } = require('./util');

function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sq = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(sq);
}

function linearSlope(points) {
  // points: [{x:number, y:number}, ...]
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

async function runExerciseProfileForUser(userId) {
  // For each (user, exercise, week) compute aggregates over weeks ending at that point.
  const sets = await getAll(
    `SELECT s.*, w.date FROM sets s JOIN workouts w ON w.id = s.workout_id
      WHERE s.user_id = ? AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL AND s.set_type != 'warmup'
      ORDER BY w.date ASC, s.session_position, s.set_number`,
    [userId]
  );
  if (!sets.length) return;

  const byExercise = new Map();
  for (const s of sets) {
    const arr = byExercise.get(s.exercise_id) || [];
    arr.push(s);
    byExercise.set(s.exercise_id, arr);
  }

  for (const [exerciseId, exSets] of byExercise) {
    const byWeek = new Map();
    for (const s of exSets) {
      const wk = isoWeek(s.date);
      if (!wk) continue;
      const arr = byWeek.get(wk) || [];
      arr.push(s);
      byWeek.set(wk, arr);
    }
    const weeks = [...byWeek.keys()].sort();
    const e1rmPerWeek = new Map();
    const volumePerWeek = new Map();
    let bestLoggedSingle = null;
    weeks.forEach(async (w, i) => {
      const wkSets = byWeek.get(w);
      const sessions = new Set(wkSets.map((s) => s.workout_id)).size;
      const avgReps = wkSets.reduce((a, s) => a + s.reps, 0) / wkSets.length;
      const avgWeight = wkSets.reduce((a, s) => a + s.weight_kg, 0) / wkSets.length;
      const e1rms = wkSets.map((s) => estimate1RM(s.weight_kg, s.reps)).filter(Boolean);
      const e1rm = e1rms.length ? Math.max(...e1rms) : null;
      e1rmPerWeek.set(w, e1rm);
      volumePerWeek.set(w, wkSets.reduce((a, s) => a + s.weight_kg * s.reps, 0));

      // True single (reps == 1) → weight is the logged 1RM. Carry the running best.
      const weekSingles = wkSets.filter((s) => s.reps === 1 && s.weight_kg != null).map((s) => s.weight_kg);
      if (weekSingles.length) {
        const weekMax = Math.max(...weekSingles);
        if (bestLoggedSingle == null || weekMax > bestLoggedSingle) bestLoggedSingle = weekMax;
      }
      const loggedOneRm = bestLoggedSingle;

      const avgSessionPos = wkSets.reduce((a, s) => a + (s.session_position || 1), 0) / wkSets.length;
      const rirRate = wkSets.filter((s) => s.rir !== null && s.rir !== undefined).length / wkSets.length;
      const typicalEquipment = (() => {
        const counts = wkSets.reduce((acc, s) => {if (s.equipment_type) acc[s.equipment_type] = (acc[s.equipment_type] || 0) + 1;return acc;}, {});
        let best = null,bestN = 0;
        for (const [k, n] of Object.entries(counts)) if (n > bestN) {best = k;bestN = n;}
        return best;
      })();
      const weeksOfData = i + 1;
      const weeklyFrequency = sessions;

      const past = weeks.slice(0, i + 1).
      map((w2, j) => ({ x: j, y: e1rmPerWeek.get(w2) })).
      filter((p) => p.y != null);
      const slope = past.length >= 2 ? linearSlope(past) : null;
      const progressionRate = slope != null && past[0].y ? slope / past[0].y : null;

      // Percent change of the top-set e1RM trend, first qualifying week to now.
      const topSetPctChange = past.length >= 2 && past[0].y ?
      (past[past.length - 1].y - past[0].y) / past[0].y * 100 :
      null;

      // Share of week-to-week transitions where the top-set e1RM rose.
      let improvements = 0;
      for (let k = 1; k < past.length; k++) if (past[k].y > past[k - 1].y) improvements += 1;
      const improvementFrequency = past.length >= 2 ? improvements / (past.length - 1) : null;

      // Mean weekly volume in weeks where e1RM held or rose ("sustained" volume).
      const mean = (arr) => arr.length ? arr.reduce((a, v) => a + v, 0) / arr.length : null;
      const sustainedVolumes = [];
      const allVolumes = [];
      let prevE1rm = null;
      for (const w2 of weeks.slice(0, i + 1)) {
        const vol = volumePerWeek.get(w2);
        if (vol != null) allVolumes.push(vol);
        const e = e1rmPerWeek.get(w2);
        if (e == null) continue;
        if ((prevE1rm == null || e >= prevE1rm) && vol != null) sustainedVolumes.push(vol);
        prevE1rm = e;
      }
      const recoveryVolumeTolerance = sustainedVolumes.length >= 2 ? mean(sustainedVolumes) : mean(allVolumes);

      const rowId = nanoid();
      const existing = await getOne('SELECT id FROM user_exercise_profile WHERE user_id = ? AND exercise_id = ? AND week = ?', [userId, exerciseId, w]);
      const cols = [
      sessions, weeksOfData, weeklyFrequency, avgSessionPos, avgReps, avgWeight, e1rm,
      progressionRate, rirRate, typicalEquipment, weeksOfData >= 4 && sessions >= 1 ? 1 : 0,
      topSetPctChange, loggedOneRm, improvementFrequency, recoveryVolumeTolerance, nowIso()];

      if (existing) {
        await runQuery(
          `UPDATE user_exercise_profile SET
             total_sessions = ?, weeks_of_data = ?, avg_weekly_frequency = ?, avg_session_position = ?,
             avg_reps = ?, avg_weight_kg = ?, estimated_1rm = ?, progression_rate = ?,
             rir_logging_rate = ?, typical_equipment = ?, qualified = ?,
             top_set_pct_change = ?, logged_1rm = ?, improvement_frequency = ?, recovery_volume_tolerance = ?,
             updated_at = ?
           WHERE id = ?`,
          [...cols, existing.id]
        );
      } else {
        await runQuery(
          `INSERT INTO user_exercise_profile (
             id, user_id, exercise_id, week,
             total_sessions, weeks_of_data, avg_weekly_frequency, avg_session_position,
             avg_reps, avg_weight_kg, estimated_1rm, progression_rate,
             rir_logging_rate, typical_equipment, qualified,
             top_set_pct_change, logged_1rm, improvement_frequency, recovery_volume_tolerance, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [rowId, userId, exerciseId, w, ...cols]
        );
      }
    });
  }
}

async function runSystemicProfileForUser(userId) {
  const dailyRows = await getAll('SELECT * FROM daily_log WHERE user_id = ? ORDER BY date ASC', [userId]);
  const activityRows = await getAll('SELECT * FROM activity_log WHERE user_id = ? ORDER BY date ASC', [userId]);
  const workoutRows = await getAll('SELECT date FROM workouts WHERE user_id = ? ORDER BY date ASC', [userId]);

  const byWeek = new Map();
  const ensure = (w) => {if (!byWeek.has(w)) byWeek.set(w, { sleep: [], nut: [], stress: [], bw: [], cardio: { all: 0, run: 0, cyc: 0, swm: 0, oth: 0, min: 0 }, sessions: 0 });return byWeek.get(w);};

  for (const d of dailyRows) {
    const w = isoWeek(d.date);if (!w) continue;
    const b = ensure(w);
    if (d.sleep_duration != null) b.sleep.push(d.sleep_duration);
    if (d.sleep_quality != null) b.sleep.push(d.sleep_quality);
    if (d.nutrition_quality != null) b.nut.push(d.nutrition_quality);
    if (d.stress_level != null) b.stress.push(d.stress_level);
    if (d.bodyweight_kg != null) b.bw.push({ x: new Date(d.date).getTime(), y: d.bodyweight_kg });
  }
  for (const a of activityRows) {
    const w = isoWeek(a.date);if (!w) continue;
    const b = ensure(w);
    const load = (a.duration_min || 0) * (a.intensity || 2);
    b.cardio.all += load;
    b.cardio.min += a.duration_min || 0;
    if (a.activity_type === 'running') b.cardio.run += load;else
    if (a.activity_type === 'cycling') b.cardio.cyc += load;else
    if (a.activity_type === 'swimming') b.cardio.swm += load;else
    b.cardio.oth += load;
  }
  for (const wk of workoutRows) {
    const w = isoWeek(wk.date);if (!w) continue;
    ensure(w).sessions += 1;
  }

  for (const [week, b] of byWeek) {
    const avgSleepDur = b.sleep.length ? b.sleep.reduce((a, v) => a + v, 0) / b.sleep.length : null;
    const sleepVariance = b.sleep.length >= 2 ? stddev(b.sleep) : null;
    const avgSleepQuality = (() => {
      const vals = dailyRows.filter((d) => isoWeek(d.date) === week && d.sleep_quality != null).map((d) => d.sleep_quality);
      return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
    })();
    const avgNut = (() => {
      const vals = dailyRows.filter((d) => isoWeek(d.date) === week && d.nutrition_quality != null).map((d) => d.nutrition_quality);
      return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
    })();
    const avgStress = b.stress.length ? b.stress.reduce((a, v) => a + v, 0) / b.stress.length : null;
    const bwTrend = b.bw.length >= 2 ? linearSlope(b.bw.map((p, i) => ({ x: i, y: p.y }))) : null;
    const dataCompleteness = (() => {
      const haveSleep = b.sleep.length ? 1 : 0;
      const haveStress = b.stress.length ? 1 : 0;
      const haveBw = b.bw.length ? 1 : 0;
      const haveSession = b.sessions ? 1 : 0;
      return (haveSleep + haveStress + haveBw + haveSession) / 4;
    })();
    const trainingConsistency = b.sessions / 7;

    const existing = await getOne('SELECT id FROM user_systemic_profile WHERE user_id = ? AND week = ?', [userId, week]);
    const cols = [
    avgSleepDur, avgSleepQuality, sleepVariance, avgNut, avgStress,
    b.cardio.min, b.cardio.all, b.cardio.run, b.cardio.cyc, b.cardio.swm, b.cardio.oth,
    bwTrend, dataCompleteness, trainingConsistency, nowIso()];

    if (existing) {
      await runQuery(
        `UPDATE user_systemic_profile SET
           avg_sleep_duration = ?, avg_sleep_quality = ?, sleep_variance = ?,
           avg_nutrition_quality = ?, avg_stress = ?,
           total_cardio_minutes = ?, total_cardio_load = ?,
           running_load = ?, cycling_load = ?, swimming_load = ?, other_cardio_load = ?,
           bodyweight_trend = ?, data_completeness_score = ?, training_consistency = ?, updated_at = ?
         WHERE id = ?`,
        [...cols, existing.id]
      );
    } else {
      await runQuery(
        `INSERT INTO user_systemic_profile (
           id, user_id, week,
           avg_sleep_duration, avg_sleep_quality, sleep_variance,
           avg_nutrition_quality, avg_stress,
           total_cardio_minutes, total_cardio_load,
           running_load, cycling_load, swimming_load, other_cardio_load,
           bodyweight_trend, data_completeness_score, training_consistency, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nanoid(), userId, week, ...cols]
      );
    }
  }
}

async function runWeeklyBatch() {
  const start = Date.now();
  const users = await getAll('SELECT id FROM users');
  await db.exec('BEGIN');
  try {
    for (const u of users) {
      try {await runExerciseProfileForUser(u.id);} catch (e) {console.error('uep failed for', u.id, e.message);}
      try {await runSystemicProfileForUser(u.id);} catch (e) {console.error('usp failed for', u.id, e.message);}
    }
    await db.exec('COMMIT');
  } catch (err) {
    try {await db.exec('ROLLBACK');} catch {/* noop */}
    throw err;
  }
  const ms = Date.now() - start;
  console.log(`[batch] Recomputed profiles for ${users.length} users in ${ms}ms`);
  return { users: users.length, ms };
}

module.exports = { runWeeklyBatch, runExerciseProfileForUser, runSystemicProfileForUser };
