// Unit tests for the pure server logic that guards data integrity:
// placeholder rewriting, input validators, and the research engine's
// whitelist + cohort-minimum enforcement. Run with `npm test` (node --test).
// No database needed — the engine tests use a stub that records SQL.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

const test = require('node:test');
const assert = require('node:assert/strict');

const { sqlWithPgPlaceholders } = require('../db');
const { safeDateStr, safeInt, safeNum, safeStr, isoWeek } = require('../util');
const { runQuery, previewQuery, effectiveMinCohort, evidenceStatus, FIELD_TABLE } = require('../research/queryEngine');

test('sqlWithPgPlaceholders numbers placeholders and skips quoted text', () => {
  assert.equal(sqlWithPgPlaceholders('SELECT ? WHERE a = ?'), 'SELECT $1 WHERE a = $2');
  assert.equal(
    sqlWithPgPlaceholders("SELECT '?' AS q, ? AS real"),
    "SELECT '?' AS q, $1 AS real"
  );
  assert.equal(
    sqlWithPgPlaceholders('SELECT "col?name", ?'),
    'SELECT "col?name", $1'
  );
});

test('safeDateStr accepts only real YYYY-MM-DD dates', () => {
  assert.equal(safeDateStr('2026-06-12'), '2026-06-12');
  assert.equal(safeDateStr('2026-6-12'), null);
  assert.equal(safeDateStr('garbage'), null);
  assert.equal(safeDateStr('2026-13-45'), null);
  assert.equal(safeDateStr(''), null);
  assert.equal(safeDateStr(null), null);
});

test('safe numeric validators clamp out-of-range values to null', () => {
  assert.equal(safeInt('7', { min: 1, max: 10 }), 7);
  assert.equal(safeInt(11, { min: 1, max: 10 }), null);
  assert.equal(safeNum('abc'), null);
  assert.equal(safeNum(Infinity), null);
  assert.equal(safeStr('  x  ', 10), 'x');
  assert.equal(safeStr('a'.repeat(20), 5), 'aaaaa');
});

test('isoWeek is stable across a year boundary', () => {
  assert.equal(isoWeek('2026-01-01'), '2026-W01');
  assert.equal(isoWeek('2025-12-29'), '2026-W01');
  assert.equal(isoWeek('not a date'), null);
});

test('effectiveMinCohort never drops below the floor', () => {
  assert.equal(effectiveMinCohort(1, { groupBy: 'goal' }), 10);
  assert.equal(effectiveMinCohort(0, { groupBy: 'goal' }), 10);
  assert.equal(effectiveMinCohort(undefined, { groupBy: 'goal' }), 10);
  assert.equal(effectiveMinCohort(50, { groupBy: 'goal' }), 50);
  // lifestyle axes require 30 even when the client asks for less
  assert.equal(effectiveMinCohort(5, { groupBy: 'sleep_quality_quartile' }), 30);
  assert.equal(effectiveMinCohort(5, { groupBy: 'creatine_use' }), 30);
  // usp-backed filters force 30 too
  assert.equal(
    effectiveMinCohort(5, { groupBy: 'goal', expressions: ['usp.avg_sleep_duration'] }),
    30
  );
});

test('evidenceStatus tiers', () => {
  assert.equal(evidenceStatus(150), 'Strong');
  assert.equal(evidenceStatus(40), 'Good');
  assert.equal(evidenceStatus(12), 'Sparse');
  assert.equal(evidenceStatus(3), 'Not enough');
});

function stubDb(rows = [{ n: 0 }]) {
  const calls = [];
  return {
    calls,
    appQuery: async (sql, params) => {
      calls.push({ sql, params });
      return { rows };
    },
  };
}

test('runQuery rejects non-whitelisted fields, groupBys, and measures', async () => {
  const db = stubDb();
  const badField = await runQuery(db, {
    filters: [{ field: 'users.email', op: '=', value: 'x' }],
    groupBy: 'goal',
    measure: 'progression_rate',
  });
  assert.match(badField.error, /Field not allowed/);

  const badGroup = await runQuery(db, { groupBy: 'users.email; DROP TABLE users', measure: 'progression_rate' });
  assert.match(badGroup.error, /groupBy not allowed/);

  const badMeasure = await runQuery(db, { groupBy: 'goal', measure: 'pg_sleep(10)' });
  assert.match(badMeasure.error, /measure not allowed/);

  const badOp = await runQuery(db, {
    filters: [{ field: 'users.goal', op: 'LIKE', value: '%x%' }],
    groupBy: 'goal',
    measure: 'progression_rate',
  });
  assert.match(badOp.error, /Operator not allowed/);

  assert.equal(db.calls.length, 0, 'no SQL may run for rejected queries');
});

test('runQuery enforces the cohort minimum in the HAVING bind', async () => {
  const db = stubDb([{ n: 0 }]);
  const result = await runQuery(db, {
    groupBy: 'sleep_quality_quartile',
    measure: 'progression_rate',
    minCohort: 2, // hostile client asking for tiny cohorts
  });
  assert.equal(result.error, undefined);
  assert.equal(result.minCohort, 30);
  const groupCall = db.calls[0];
  assert.match(groupCall.sql, /HAVING COUNT\(DISTINCT u\.id\) >= \?/);
  assert.equal(groupCall.params[groupCall.params.length - 1], 30);
  assert.match(groupCall.sql, /u\.research_opt_in = 1/);
});

test('runQuery only interpolates whitelisted column SQL', async () => {
  const db = stubDb([{ n: 0 }]);
  await runQuery(db, {
    filters: [{ field: 'users.goal', op: '=', value: "x'; DROP TABLE users; --" }],
    groupBy: 'goal',
    measure: 'progression_rate',
  });
  const sql = db.calls[0].sql;
  assert.ok(!sql.includes('DROP TABLE'), 'filter values must be bound, not spliced');
  assert.ok(db.calls[0].params.includes("x'; DROP TABLE users; --"));
  assert.ok(sql.includes(FIELD_TABLE['users.goal']));
});

test('previewQuery caps and dedupes groupBys', async () => {
  const db = stubDb([{ n: 0 }]);
  const flood = Array.from({ length: 5000 }, () => 'goal');
  const result = await previewQuery(db, {
    groupBys: flood,
    measure: 'progression_rate',
  });
  assert.equal(result.error, undefined);
  assert.equal(result.variables.length, 1, 'duplicates collapse to one axis');
  // 1 base count + 2 queries for the single axis = bounded work
  assert.ok(db.calls.length <= 3, `expected <= 3 queries, got ${db.calls.length}`);
});
