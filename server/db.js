const { Pool } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Point it at local Supabase or your Supabase pooler connection string.')
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 10_000),
  // Client-side cancel: works through Supavisor/pgbouncer transaction pooling,
  // unlike a server-side statement_timeout SET which leaks across pooled sessions.
  query_timeout: Number(process.env.DATABASE_QUERY_TIMEOUT_MS || 15_000),
})

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message)
})

function sqlWithPgPlaceholders(sql) {
  let index = 0
  let out = ''
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i]
    const prev = sql[i - 1]
    if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle
    if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble
    if (ch === '?' && !inSingle && !inDouble) {
      index += 1
      out += `$${index}`
    } else {
      out += ch
    }
  }
  return out
}

async function query(sql, params = [], client = pool) {
  return client.query(sqlWithPgPlaceholders(sql), params)
}

async function runQuery(sql, params = [], client = pool) {
  return query(sql, params, client)
}

async function getOne(sql, params = [], client = pool) {
  const result = await query(sql, params, client)
  return result.rows[0] || null
}

async function getAll(sql, params = [], client = pool) {
  const result = await query(sql, params, client)
  return result.rows
}

async function tx(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const scoped = {
      client,
      query: (sql, params = []) => query(sql, params, client),
      runQuery: (sql, params = []) => runQuery(sql, params, client),
      getOne: (sql, params = []) => getOne(sql, params, client),
      getAll: (sql, params = []) => getAll(sql, params, client),
    }
    const result = await work(scoped)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* noop */ }
    throw err
  } finally {
    client.release()
  }
}

async function closePool() {
  await pool.end()
}

pool.appQuery = query

module.exports = { pool, db: pool, query, runQuery, getOne, getAll, tx, closePool, sqlWithPgPlaceholders }
