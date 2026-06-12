const express = require('express');
// Express 4 does not forward rejected async handlers to the error middleware;
// without this patch any awaited DB failure inside a route kills the process.
require('express-async-errors');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const cron = require('node-cron');
const { getOne } = require('./db');
const { runWeeklyBatch } = require('./batch');
const { runFindingsBatch } = require('./findingsBatch');

const app = express();
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map((s) => s.trim()).filter(Boolean) } : undefined));
app.use(express.json({ limit: '2mb' }));

// Generous flood guard, not a quota: the app's chattiest flow (autosave) stays
// far below this. Behind a reverse proxy set TRUST_PROXY=1 so req.ip is the
// client, not the proxy (otherwise all users share one bucket).
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
}));

app.get('/api/health', async (_req, res) => {
  const exCount = (await getOne('SELECT COUNT(*) as n FROM exercises')).n;
  res.json({ ok: true, exercises: exCount });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/active-workout', require('./routes/activeWorkout'));
app.use('/api/prs', require('./routes/prs'));
app.use('/api/daily-log', require('./routes/dailyLog'));
app.use('/api/body-metrics', require('./routes/bodyMetrics'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/activity-log', require('./routes/activityLog'));
app.use('/api/custom-exercises', require('./routes/customExercises'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/social', require('./routes/social'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/public', require('./routes/public'));
app.use('/api/research', require('./routes/research'));
app.use('/api/moderation', require('./routes/moderation'));

app.use((err, _req, res, next) => {
  void next;
  console.error('[api]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Weekly batch: Mondays at 03:00 server time
cron.schedule('0 3 * * 1', () => {
  console.log('[cron] Running weekly batch...');
  Promise.resolve()
    .then(() => runWeeklyBatch())
    .then(() => runFindingsBatch())
    .catch((err) => console.error('[cron]', err));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`RepSearch v2 server running on port ${PORT}`));
