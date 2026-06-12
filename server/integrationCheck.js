// End-to-end check of the critical write paths (autosave upsert, workout save
// transaction incl. 5+ RIR and PR detection, delete cascade, research cohort
// clamp, account deletion). Creates a throwaway user and removes it again.
// Run with the server up: `npm run check:integration`
// (point INTEGRATION_API_URL elsewhere to test a deployed server).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.env.INTEGRATION_API_URL || 'http://localhost:3002/api';
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = fs.readFileSync(path.join(__dirname, '../mobile/.env'), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — ' + JSON.stringify(detail)}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const stamp = Date.now().toString(36);
  const email = `hardening.test.${stamp}@example.com`;
  const password = `Tt!${stamp}aB9x`;
  const username = `hardtest_${stamp}`.slice(0, 24);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  check('create auth user', !createErr && created?.user?.id, createErr?.message);
  const uid = created.user.id;

  try {
    const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({ email, password });
    check('sign in', !signinErr && signin?.session?.access_token, signinErr?.message);
    const token = signin.session.access_token;

    const prof = await api('POST', '/auth/profile', token, { username });
    check('create profile row', prof.status === 201, prof);

    // autosave upsert: two writes, second must update not crash
    const s1 = await api('PUT', '/active-workout', token, { state: { v: 1, exercises: [] } });
    const s2 = await api('PUT', '/active-workout', token, { state: { v: 2, exercises: [] } });
    check('autosave upsert', s1.status === 200 && s2.status === 200, { s1, s2 });
    const restored = await api('GET', '/active-workout', token);
    check('autosave restore round-trip', restored.data?.state?.v === 2, restored.data);

    // workout save in one transaction, with the '5+' RIR tier and a PR
    const save = await api('POST', '/workouts', token, {
      date: '2026-06-12',
      duration_min: 45,
      sets: [
        { exercise_id: 'bench_barbell', set_number: 1, weight_kg: 100, reps: 5, rir: '5+', client_ts: 1 },
        { exercise_id: 'bench_barbell', set_number: 2, weight_kg: 102.5, reps: 3, rir: 2, client_ts: 2 },
        { exercise_id: 'squat_barbell', set_number: 1, weight_kg: 140, reps: 5, rir: 1, client_ts: 3 },
      ],
    });
    check('workout save (tx + 5+ RIR)', save.status === 200 && save.data?.workout?.sets?.length === 3, save);
    check('5+ RIR stored as 5', save.data?.workout?.sets?.some((s) => s.rir === 5), save.data?.workout?.sets);
    check('PRs detected in same tx', Array.isArray(save.data?.prsHit) && save.data.prsHit.length === 3, save.data?.prsHit);
    const workoutId = save.data.workout.id;

    const list = await api('GET', '/workouts?limit=5', token);
    check('workout list', list.data?.workouts?.some((w) => w.id === workoutId), list.data?.total);

    const invalidDate = await api('POST', '/daily-log', token, { date: 'garbage-date', sleep_quality: 4 });
    check('daily-log garbage date falls back to today', invalidDate.status === 200 && /^\d{4}-\d{2}-\d{2}$/.test(invalidDate.data?.log?.date || ''), invalidDate.data);

    const del = await api('DELETE', `/workouts/${workoutId}`, token);
    check('workout delete (tx)', del.status === 200 && del.data?.ok, del);

    const research = await api('POST', '/research/query', token, { groupBy: 'goal', measure: 'progression_rate', minCohort: 1 });
    check('research minCohort clamped to 10', research.status === 200 && research.data?.minCohort === 10, research.data);

    const acctDel = await api('DELETE', '/profile', token);
    check('account delete (tx + auth)', acctDel.status === 200 && acctDel.data?.ok, acctDel);

    const { data: gone, error: goneErr } = await admin.auth.admin.getUserById(uid);
    check('auth user removed', !!goneErr || !gone?.user, gone);
  } finally {
    // belt-and-braces cleanup if anything above failed before account delete
    await admin.auth.admin.deleteUser(uid).catch(() => {});
  }
})().catch((e) => {
  console.error('INTEGRATION ERROR:', e.message);
  process.exit(1);
});
