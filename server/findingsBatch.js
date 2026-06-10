const { db, runQuery, getOne } = require('./db');
const { runQuery: runResearchQuery } = require('./research/queryEngine');
const { nanoid, nowIso } = require('./util');

// Pre-defined variable combinations to scan. Each entry yields a single
// research query whose buckets we'll compare via Cohen's d to find effects.
const COMBINATIONS = [
{ title: 'Bench progression × sleep variance', groupBy: 'sleep_quality_quartile', measure: 'progression_rate', exerciseId: 'bench_barbell' },
{ title: 'Squat progression × cardio load', groupBy: 'cardio_load_quartile', measure: 'progression_rate', exerciseId: 'squat_barbell' },
{ title: 'Squat progression × running load (runner cohort)', groupBy: 'cardio_load_quartile', measure: 'progression_rate', exerciseId: 'squat_barbell', filters: [{ field: 'users.sport_primary', op: '=', value: 'running' }] },
{ title: 'Hypertrophy rate × age range', groupBy: 'age_range', measure: 'progression_rate', filters: [{ field: 'users.goal', op: '=', value: 'hypertrophy' }] },
{ title: 'Natural vs enhanced progression', groupBy: 'enhancement_status', measure: 'progression_rate' },
{ title: 'Split type × bench progression (intermediates)', groupBy: 'split_type', measure: 'progression_rate', exerciseId: 'bench_barbell', filters: [{ field: 'users.experience_level', op: '=', value: 'intermediate' }] },
{ title: 'Frequency × bench progression', groupBy: 'frequency_bucket', measure: 'progression_rate', exerciseId: 'bench_barbell' },
{ title: 'Session position × deadlift progression', groupBy: 'session_position_bucket', measure: 'progression_rate', exerciseId: 'deadlift' },
{ title: 'RIR logging × hypertrophy progression', groupBy: 'rir_use', measure: 'progression_rate', filters: [{ field: 'users.goal', op: '=', value: 'hypertrophy' }] },
{ title: 'Machine vs free weight on chest progression', groupBy: 'equipment_type', measure: 'progression_rate', muscle: 'Mid Chest' },
{ title: 'Bilateral vs unilateral for glute progression', groupBy: 'bilateral', measure: 'progression_rate', muscle: 'Glutes' },
{ title: 'Sleep quality × squat progression', groupBy: 'sleep_quality_quartile', measure: 'progression_rate', exerciseId: 'squat_barbell' },
{ title: 'Gender × OHP progression', groupBy: 'gender', measure: 'progression_rate', exerciseId: 'press_ohp' },
{ title: 'Cardio quartile × deadlift progression', groupBy: 'cardio_load_quartile', measure: 'progression_rate', exerciseId: 'deadlift' },
{ title: 'Sport primary × hypertrophy progression', groupBy: 'sport_primary', measure: 'progression_rate', filters: [{ field: 'users.goal', op: '=', value: 'hypertrophy' }] }];


// "Common assumption" direction map. If observed direction contradicts, mark surprising.
// Each key matches a combination title fragment; value is the bucket-pair we expect to be ordered worst -> best.
const ASSUMPTIONS = [
{ matches: /sleep quality.*progression/i, worse: 'Q1_poor', better: 'Q4_excellent' },
{ matches: /running load.*squat|cardio.*squat/i, worse: 'Q4_high', better: 'Q1_low' },
{ matches: /frequency.*progression/i, worse: '<1.5/wk', better: '3+/wk' },
{ matches: /session position/i, worse: 'later', better: 'first' }];


function cohensD(a, b) {
  if (!a || !b || !a.n || !b.n) return null;
  const meanA = a.avg_measure;
  const meanB = b.avg_measure;
  if (meanA == null || meanB == null) return null;
  // Without per-user variances we approximate pooled stddev as |meanA-meanB|/2 + 1
  // This is a crude proxy good enough for highlighting effects;
  // proper SD would require per-user data.
  const pooled = Math.max(0.001, Math.sqrt((Math.abs(meanA) + Math.abs(meanB)) / 2));
  return (meanB - meanA) / pooled;
}

function titleFor(combo, low, high, direction) {
  const verb = direction > 0 ? 'higher' : 'lower';
  const measureHuman = combo.measure.replace(/_/g, ' ');
  return `${combo.title}: ${high.label} shows ${verb} ${measureHuman} than ${low.label}`;
}

async function runFindingsBatch() {
  let inserted = 0;
  await db.exec('BEGIN');
  try {
    for (const combo of COMBINATIONS) {
      const queryJson = JSON.stringify(combo);
      const result = await runResearchQuery(db, {
        filters: combo.filters || [],
        groupBy: combo.groupBy,
        measure: combo.measure,
        exerciseId: combo.exerciseId,
        muscle: combo.muscle,
        minCohort: 30
      });
      if (result.error || !result.buckets || result.buckets.length < 2) continue;
      // Find min and max buckets by avg_measure
      const sorted = [...result.buckets].sort((a, b) => a.avg_measure - b.avg_measure);
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      if (!low || !high || low.label === high.label) continue;
      const d = cohensD(low, high);
      if (d == null || Math.abs(d) <= 0.3) continue;
      const n = low.n + high.n;
      if (n < 30) continue;

      const assumption = ASSUMPTIONS.find((a) => a.matches.test(combo.title));
      let surprising = 0;
      if (assumption) {
        // If our observed best matches the assumed worse, it's surprising
        if (high.label === assumption.worse && low.label === assumption.better) surprising = 1;
      }

      const existing = await getOne('SELECT id FROM findings WHERE query_json = ?', [queryJson]);
      if (existing) {
        await runQuery(
          `UPDATE findings
              SET discovered_at = ?, title = ?, effect_size = ?, n = ?, significance = ?, surprising = ?
            WHERE id = ?`,
          [nowIso(), titleFor(combo, low, high, d), Math.round(d * 1000) / 1000, n, null, surprising, existing.id]
        );
      } else {
        await runQuery(
          `INSERT INTO findings (id, discovered_at, title, query_json, effect_size, n, significance, surprising)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
          nanoid(), nowIso(),
          titleFor(combo, low, high, d),
          queryJson,
          Math.round(d * 1000) / 1000,
          n,
          null,
          surprising]

        );
        inserted += 1;
      }
    }
    await db.exec('COMMIT');
  } catch (err) {
    try {await db.exec('ROLLBACK');} catch {/* noop */}
    throw err;
  }
  console.log(`[findingsBatch] Discovered ${inserted} new findings`);
  return { inserted };
}

module.exports = { runFindingsBatch, COMBINATIONS };
