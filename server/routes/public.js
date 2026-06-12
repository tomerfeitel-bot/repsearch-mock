const express = require('express');
const { getOne, getAll } = require('../db');
const { authOptional } = require('../auth');
const { userWithDerivedFields } = require('../util');
const { canViewWorkout } = require('../visibility');
const { isBlocked } = require('../moderation');

const router = express.Router();

// Always visible on a public (non-is_private) profile.
const BASE_USER_COLUMNS = [
'id', 'username', 'bio', 'created_at', 'is_private',
'experience_level', 'goal', 'split_type', 'training_age_years', 'training_started_at',
'gender', 'age_range', 'enhancement_status',
'sport_primary', 'public_fields_json',
'split_frequency_type', 'split_frequency_value', 'split_days_json'];


// Widget key -> user columns it gates. Stripped unless the key is opted into
// public_fields_json (or the viewer is the owner). 'split' columns are gated too.
const WIDGET_COLUMNS = {
  sleep: ['sleep_hours'],
  nutrition: ['protein_g_per_kg', 'nutrition_phase'],
  supplements: ['supplements_json'],
  measurements: ['arm_cm', 'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm'],
  split: ['split_frequency_type', 'split_frequency_value', 'split_days_json']
};

const SENSITIVE_COLUMNS = Object.values(WIDGET_COLUMNS).flat();
const USER_COLUMNS = [...new Set([...BASE_USER_COLUMNS, ...SENSITIVE_COLUMNS])].join(', ');

function parsePublicFields(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function stripPrivateFields(user, isSelf) {
  if (isSelf) return user;
  const allowed = parsePublicFields(user.public_fields_json);
  for (const [key, cols] of Object.entries(WIDGET_COLUMNS)) {
    if (allowed.includes(key)) continue;
    for (const col of cols) user[col] = null;
  }
  return user;
}

router.get('/users/:username', authOptional, async (req, res) => {
  const user = userWithDerivedFields(await getOne(
    `SELECT ${USER_COLUMNS}, banned FROM users WHERE username = ?`,
    [req.params.username]
  ));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isSelf = req.user && req.user.id === user.id;
  // Banned accounts disappear from public view entirely.
  if (user.banned && !isSelf) return res.status(404).json({ error: 'User not found' });
  delete user.banned;

  // If they blocked the viewer, behave exactly like a private profile — no
  // signal. If the viewer blocked them, return a stub the UI renders as the
  // "you blocked @x" state with an Unblock action.
  if (req.user && (await isBlocked(user.id, req.user.id))) {
    return res.json({
      user: { id: user.id, username: user.username, is_private: 1 },
      private: true
    });
  }
  if (req.user && (await isBlocked(req.user.id, user.id))) {
    return res.json({
      user: { id: user.id, username: user.username },
      blocked: true,
      viewer: { is_self: false, follows_them: false, blocked: true }
    });
  }

  const followsThem = req.user ?
  !!(await getOne('SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, user.id])) :
  false;

  if (user.is_private && !isSelf && !followsThem) {
    return res.json({
      user: { id: user.id, username: user.username, is_private: 1 },
      private: true
    });
  }

  const allowed = parsePublicFields(user.public_fields_json);

  // Latest historical snapshots back the sleep/nutrition/measurements widgets.
  if (isSelf || allowed.includes('sleep') || allowed.includes('nutrition')) {
    const latestLog = await getOne(
      'SELECT sleep_duration, calories, protein_g, protein_g_per_kg, stress_level FROM daily_log WHERE user_id = ? ORDER BY date DESC LIMIT 1',
      [user.id]
    );
    if (latestLog) {
      if (isSelf || allowed.includes('sleep')) user.latest_sleep_duration = latestLog.sleep_duration;
      if (isSelf || allowed.includes('nutrition')) {
        user.latest_calories = latestLog.calories;
        if (latestLog.protein_g != null) {
          // Bodyweight isn't a public column; fetch it server-side only to derive g/kg.
          const bwRow = await getOne(
            'SELECT bodyweight_kg FROM body_metrics_history WHERE user_id = ? AND bodyweight_kg IS NOT NULL ORDER BY date DESC, created_at DESC LIMIT 1',
            [user.id]
          );
          const bw = bwRow?.bodyweight_kg ?? user.bodyweight_kg ?? null;
          user.latest_protein_g = latestLog.protein_g;
          if (bw) user.protein_g_per_kg = parseFloat((latestLog.protein_g / bw).toFixed(2));
        } else if (latestLog.protein_g_per_kg != null) {
          user.protein_g_per_kg = latestLog.protein_g_per_kg;
        }
      }
    }
  }
  if (isSelf || allowed.includes('measurements')) {
    const latestBody = await getOne(
      'SELECT bodyweight_kg, arm_cm, chest_cm, waist_cm, thigh_cm, calf_cm FROM body_metrics_history WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
      [user.id]
    );
    if (latestBody) {
      for (const col of ['arm_cm', 'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm']) {
        if (latestBody[col] != null) user[col] = latestBody[col];
      }
    }
  }

  stripPrivateFields(user, isSelf);

  const followerCount = (await getOne('SELECT COUNT(*) AS n FROM follows WHERE following_id = ?', [user.id])).n;
  const followingCount = (await getOne('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?', [user.id])).n;
  const workoutCount = (await getOne('SELECT COUNT(*) AS n FROM workouts WHERE user_id = ?', [user.id])).n;

  // Weekly training frequency derived from the last 28 days of logged workouts.
  const cutoff = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const recentWorkouts = (await getOne(
    'SELECT COUNT(*) AS n FROM workouts WHERE user_id = ? AND date >= ?',
    [user.id, cutoff]
  )).n;
  user.derived_weekly_frequency = recentWorkouts ? Math.round(recentWorkouts / 4 * 10) / 10 : null;
  const prs = await getAll(
    `SELECT p.*, e.name AS exercise_name FROM prs p
       LEFT JOIN exercises e ON e.id = p.exercise_id
      WHERE p.user_id = ? AND p.reps IN (1,3,5,8,10)
      ORDER BY p.weight_kg DESC LIMIT 8`,
    [user.id]
  );
  const recentVisibility = isSelf || followsThem ?
  "visibility IN ('public', 'followers')" :
  "visibility = 'public'";
  const recent = await getAll(
    `SELECT id, date, duration_min, workout_day, visibility FROM workouts
      WHERE user_id = ? AND ${recentVisibility}
      ORDER BY date DESC, created_at DESC LIMIT 5`,
    [user.id]
  );
  const publishedPrograms = await getAll(
    `SELECT p.*,
            (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
      FROM programs p
      WHERE p.user_id = ? AND p.visibility = 'public' AND COALESCE(p.status, 'final') = 'final'
      ORDER BY p.created_at DESC LIMIT 3`,
    [user.id]
  );
  const sharedTemplates = await getAll(
    `SELECT id, name, description, workout_day, usage_count, strictness, created_at
       FROM workout_templates
      WHERE user_id = ? AND visibility = 'public' AND (status IS NULL OR status = 'final')
      ORDER BY usage_count DESC, created_at DESC LIMIT 3`,
    [user.id]
  );
  res.json({
    user,
    stats: { followers: followerCount, following: followingCount, workouts: workoutCount },
    top_prs: prs,
    recent_workouts: recent,
    published_programs: publishedPrograms,
    shared_templates: sharedTemplates,
    viewer: { is_self: isSelf, follows_them: followsThem }
  });
});

router.get('/workouts/:id', authOptional, async (req, res) => {
  const w = await getOne('SELECT * FROM workouts WHERE id = ?', [req.params.id]);
  if (!w) return res.status(404).json({ error: 'Workout not found' });
  if (!(await canViewWorkout(w, req.user?.id))) return res.status(403).json({ error: 'Forbidden' });
  const owner = await getOne('SELECT id, username, bio FROM users WHERE id = ?', [w.user_id]);
  const sets = await getAll(
    'SELECT * FROM sets WHERE workout_id = ? ORDER BY session_position, set_number',
    [req.params.id]
  );

  // If viewer is authed and has a PR for an exercise in this workout, surface it
  let viewerBest = {};
  if (req.user) {
    const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
    if (exerciseIds.length) {
      const placeholders = exerciseIds.map(() => '?').join(',');
      const bestRows = await getAll(
        `SELECT exercise_id, MAX(weight_kg) AS best_kg, reps AS best_reps FROM prs
          WHERE user_id = ? AND exercise_id IN (${placeholders})
          GROUP BY exercise_id`,
        [req.user.id, ...exerciseIds]
      );
      viewerBest = bestRows.reduce((acc, r) => {acc[r.exercise_id] = r;return acc;}, {});
    }
  }

  res.json({ workout: w, owner, sets, viewer_best: viewerBest });
});

module.exports = router;
