import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { SEED_EXERCISES } from '../../lib/exercises.js'
import { timeAgo } from '../../lib/timeAgo.js'

const LIFT_TARGETS = [
  { label: 'Bench', ids: ['bench_barbell', 'bench_dumbbell', 'smith_bench'] },
  { label: 'Squat', ids: ['squat_barbell', 'squat_front', 'smith_squat', 'hack_squat'] },
  { label: 'Deadlift', ids: ['deadlift', 'deadlift_sumo'] },
  { label: 'OHP', ids: ['press_ohp', 'press_dumbbell_shoulder', 'shoulder_press_machine', 'smith_ohp'] },
]

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

export default function ProfileSummary({ data, loading, privateView = false, onFollow, followBusy = false, onEditProfile }) {
  if (loading) return <ProfileSkeleton />
  if (!data) {
    return <EmptyState copy="Profile not found." />
  }

  const { user, stats = {}, top_prs = [], recent_workouts = [], published_programs = [], shared_templates = [], viewer = {} } = data

  if (privateView) {
    return (
      <div className="p-4">
        <Card className="text-center py-8">
          <Avatar username={user?.username} size="xl" className="mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">{user?.username}</h2>
          <p className="mt-2 text-sm text-gray-400">Profile is private.</p>
          {!viewer.is_self && (
            <button
              onClick={onFollow}
              disabled={followBusy}
              className="mt-5 min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 text-sm font-semibold text-white transition"
            >
              {viewer.follows_them ? 'Following' : 'Follow'}
            </button>
          )}
        </Card>
      </div>
    )
  }

  const topLifts = LIFT_TARGETS.map(target => {
    const liftPrs = top_prs.filter(p => target.ids.includes(p.exercise_id))
    const best = liftPrs.reduce((acc, p) => Number(p.weight_kg) > Number(acc?.weight_kg || 0) ? p : acc, null)
    return { ...target, pr: best }
  })

  return (
    <div className="p-4 space-y-4">
      <IdentityCard user={user} stats={stats} viewer={viewer} onFollow={onFollow} followBusy={followBusy} onEditProfile={onEditProfile} />
      <StatsHero stats={stats} trainingAge={user?.training_age_years} />
      <WidgetGrid user={user} />
      <TopLifts lifts={topLifts} />
      <CurrentProgram />
      <PublishedPlans programs={published_programs} templates={shared_templates} />
      <RecentWorkouts workouts={recent_workouts} username={user?.username} />
    </div>
  )
}

function IdentityCard({ user, stats, viewer, onFollow, followBusy, onEditProfile }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar username={user?.username} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white truncate">{user?.username}</h2>
            {user?.is_private ? <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">Private</span> : null}
          </div>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{user?.bio || 'No bio yet.'}</p>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span><b className="text-gray-200 font-mono">{stats.followers || 0}</b> followers</span>
            <span><b className="text-gray-200 font-mono">{stats.following || 0}</b> following</span>
          </div>
          {viewer?.is_self && onEditProfile && (
            <button
              onClick={onEditProfile}
              className="mt-4 min-h-10 px-4 rounded-xl border border-gray-800 text-gray-300 hover:bg-gray-900 hover:text-white active:scale-[0.98] text-sm font-semibold transition"
            >
              Edit profile
            </button>
          )}
        </div>
        {!viewer?.is_self && onFollow && (
          <button
            onClick={onFollow}
            disabled={followBusy}
            className={'min-h-10 px-3 rounded-xl text-xs font-semibold transition active:scale-[0.98] disabled:opacity-60 ' + (viewer?.follows_them ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-500')}
          >
            {viewer?.follows_them ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </Card>
  )
}

function parseArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || !raw) return []
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : [] } catch { return [] }
}

// Widgets render only when the backing data is present. The server already
// strips fields not opted into public_fields_json, so presence is the gate.
function WidgetGrid({ user }) {
  if (!user) return null
  const sleep = user.latest_sleep_duration ?? user.sleep_hours
  const hasSleep = sleep != null
  const hasNutrition = user.latest_calories != null || user.protein_g_per_kg != null || parseArray(user.supplements_json).length > 0 || user.nutrition_phase
  const measurements = [
    { key: 'arm_cm', label: 'Arms' },
    { key: 'chest_cm', label: 'Chest' },
    { key: 'waist_cm', label: 'Waist' },
    { key: 'thigh_cm', label: 'Thighs' },
    { key: 'calf_cm', label: 'Calves' },
  ].filter(m => user[m.key] != null)
  const hasMeasurements = measurements.length > 0
  const hasSplit = !!user.split_type

  if (!hasSleep && !hasNutrition && !hasMeasurements && !hasSplit) return null

  const supplements = parseArray(user.supplements_json).map(s => (typeof s === 'string' ? s : s?.key)).filter(Boolean)

  return (
    <div className="grid grid-cols-2 gap-2">
      {hasSleep && (
        <Widget icon="🌙" label="Sleep">
          <div className="font-mono tabular-nums text-2xl font-bold text-white">{Number(sleep).toFixed(2).replace(/\.?0+$/, '')}<span className="text-sm text-gray-500">h</span></div>
        </Widget>
      )}
      {hasNutrition && (
        <Widget icon="🍽️" label="Nutrition">
          {user.latest_calories != null && <div className="font-mono tabular-nums text-lg font-bold text-white">{user.latest_calories}<span className="text-xs text-gray-500"> kcal</span></div>}
          {user.protein_g_per_kg != null && <div className="text-xs text-gray-400 font-mono">{user.protein_g_per_kg} g/kg protein</div>}
          {user.nutrition_phase && <div className="text-[11px] text-gray-500 capitalize">{user.nutrition_phase}</div>}
          {supplements.length > 0 && <div className="mt-1 text-[11px] text-gray-500 truncate">{supplements.map(s => s.replaceAll('_', ' ')).join(', ')}</div>}
        </Widget>
      )}
      {hasMeasurements && (
        <Widget icon="📐" label="Measurements">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {measurements.map(m => (
              <div key={m.key} className="flex items-baseline justify-between">
                <span className="text-[11px] text-gray-500">{m.label}</span>
                <span className="font-mono tabular-nums text-xs text-gray-200">{user[m.key]}</span>
              </div>
            ))}
          </div>
        </Widget>
      )}
      {hasSplit && (
        <Widget icon="🗓️" label="Split">
          <div className="text-lg font-bold text-white">{user.split_type}</div>
          {user.derived_weekly_frequency != null && (
            <div className="mt-0.5 text-xs text-gray-400 font-mono">~{user.derived_weekly_frequency}x/week</div>
          )}
        </Widget>
      )}
    </div>
  )
}

function Widget({ icon, label, children }) {
  return (
    <Card>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500">
        <span aria-hidden>{icon}</span>{label}
      </div>
      <div className="mt-2">{children}</div>
    </Card>
  )
}

function StatsHero({ stats, trainingAge }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Workouts" value={stats.workouts || 0} />
      <Stat label="Streak" value={stats.current_streak || 0} suffix="d" />
      <Stat label="Training age" value={trainingAge ?? '-'} suffix={trainingAge || trainingAge === 0 ? 'y' : ''} />
    </div>
  )
}

function Stat({ label, value, suffix = '' }) {
  return (
    <Card className="text-center">
      <div className="font-mono tabular-nums text-2xl font-bold text-white">{value}<span className="text-sm text-gray-500">{suffix}</span></div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
    </Card>
  )
}

function TopLifts({ lifts }) {
  return (
    <section>
      <SectionTitle>Top lifts</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {lifts.map(lift => (
          <Card key={lift.label}>
            <div className="text-xs uppercase tracking-wider text-gray-500">{lift.label}</div>
            {lift.pr ? (
              <>
                <div className="mt-2 font-mono tabular-nums text-2xl font-bold text-white">{lift.pr.weight_kg}<span className="text-sm text-gray-500">kg × {lift.pr.reps}</span></div>
                <div className="mt-1 text-[11px] text-gray-500 truncate">{lift.pr.exercise_name || exerciseById.get(lift.pr.exercise_id)?.name || lift.pr.exercise_id}</div>
              </>
            ) : (
              <div className="mt-4 text-sm text-gray-500">No PR yet.</div>
            )}
          </Card>
        ))}
      </div>
    </section>
  )
}

function CurrentProgram() {
  return (
    <section>
      <SectionTitle>Currently running</SectionTitle>
      <Card>
        <div className="text-sm font-medium text-gray-200">No active program</div>
        <p className="mt-1 text-xs text-gray-500">Start a plan from Community when you are ready to track a full block.</p>
      </Card>
    </section>
  )
}

function PublishedPlans({ programs, templates }) {
  if (!programs.length && !templates.length) return null
  return (
    <section>
      <SectionTitle>Plans shared</SectionTitle>
      <div className="space-y-2">
        {programs.map(p => (
          <Card key={`p_${p.id}`}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-100 truncate">{p.name}</div>
                <div className="text-xs text-gray-500">{p.weeks || 1} weeks · {p.enrollment_count || 0} started</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-indigo-300">Program</span>
            </div>
          </Card>
        ))}
        {templates.map(t => (
          <Card key={`t_${t.id}`}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-100 truncate">{t.name}</div>
                <div className="text-xs text-gray-500">{t.workout_day || 'Workout'} · used {t.usage_count || 0}x</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Template</span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function RecentWorkouts({ workouts, username }) {
  return (
    <section>
      <SectionTitle>Recent public workouts</SectionTitle>
      {workouts.length === 0 ? (
        <EmptyState copy="No public workouts yet." compact />
      ) : (
        <div className="space-y-2">
          {workouts.map(w => (
            <Link
              key={w.id}
              to={`/user/${username}/workout/${w.id}`}
              className="block rounded-2xl bg-gray-900 border border-gray-800 p-4 hover:border-gray-700 active:scale-[0.99] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono tabular-nums text-3xl font-bold text-white">{w.duration_min || 0}<span className="text-sm text-gray-500"> min</span></div>
                  <div className="mt-1 text-sm text-gray-400">{w.workout_day || w.workout_split_type || 'Workout'}</div>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">{w.date ? timeAgo(`${w.date}T12:00:00.000Z`) : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function SectionTitle({ children }) {
  return <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">{children}</h3>
}

function Card({ children, className = '' }) {
  return <div className={'rounded-2xl bg-gray-900 border border-gray-800 p-4 ' + className}>{children}</div>
}

function EmptyState({ copy, compact = false }) {
  return (
    <div className={'rounded-2xl bg-gray-900/60 border border-gray-800 text-center text-sm text-gray-500 ' + (compact ? 'p-4' : 'p-8')}>
      {copy}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-36 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />)}
      </div>
      <div className="h-48 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
    </div>
  )
}
