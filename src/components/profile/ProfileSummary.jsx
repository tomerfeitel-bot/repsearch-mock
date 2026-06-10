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
  if (!data) return <EmptyState copy="Profile not found." />

  const { user, stats = {}, top_prs = [], recent_workouts = [], published_programs = [], shared_templates = [], viewer = {} } = data

  if (privateView) {
    return (
      <div className="px-4 py-8 text-center">
        <section className="border-y border-[var(--border)] py-8">
          <Avatar username={user?.username} size="xl" className="mx-auto mb-4" />
          <h2 className="text-head font-extrabold text-[var(--text)]">{user?.username}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Profile is private.</p>
          {!viewer.is_self && (
            <button
              onClick={onFollow}
              disabled={followBusy}
              className="mt-5 min-h-11 px-5 rounded-full bg-[var(--emerald)] text-[var(--on-emerald)] active:scale-[0.98] disabled:opacity-60 text-sm font-bold transition"
            >
              {viewer.follows_them ? 'Following' : 'Follow'}
            </button>
          )}
        </section>
      </div>
    )
  }

  const topLifts = LIFT_TARGETS.map(target => {
    const liftPrs = top_prs.filter(p => target.ids.includes(p.exercise_id))
    const best = liftPrs.reduce((acc, p) => Number(p.weight_kg) > Number(acc?.weight_kg || 0) ? p : acc, null)
    return { ...target, pr: best }
  })

  return (
    <div className="space-y-6 pt-2">
      <IdentityCard user={user} stats={stats} viewer={viewer} onFollow={onFollow} followBusy={followBusy} onEditProfile={onEditProfile} />
      <div className="px-4 space-y-6">
        <StatsHero stats={stats} trainingAge={user?.training_age_years} />
        <WidgetGrid user={user} />
      </div>
      <TopLifts lifts={topLifts} />
      <CurrentProgram />
      <PublishedPlans programs={published_programs} templates={shared_templates} />
      <RecentWorkouts workouts={recent_workouts} username={user?.username} />
    </div>
  )
}

function IdentityCard({ user, stats, viewer, onFollow, followBusy, onEditProfile }) {
  return (
    <article className="px-4 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start gap-4">
        <Avatar username={user?.username} size="xl" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lead font-extrabold text-[var(--text)] truncate">{user?.username}</h2>
            {user?.is_private ? <span className="text-micro font-bold px-2 py-0.5 rounded-full bg-[var(--surface-alt)] text-[var(--text-muted)]">Private</span> : null}
          </div>
          <p className="mt-1.5 text-body text-[var(--text-muted)] leading-relaxed">{user?.bio || 'No bio yet.'}</p>
          <div className="mt-4 flex gap-5 text-caption text-[var(--text-muted)]">
            <span><b className="text-[var(--text)] font-mono tabular-nums">{stats.followers || 0}</b> followers</span>
            <span><b className="text-[var(--text)] font-mono tabular-nums">{stats.following || 0}</b> following</span>
          </div>
          {viewer?.is_self && onEditProfile && (
            <button
              onClick={onEditProfile}
              className="mt-4 min-h-10 px-4 rounded-full border border-[var(--border)] text-[var(--text)] active:scale-[0.98] text-sm font-bold transition hover:border-[var(--border-strong)]"
            >
              Edit profile
            </button>
          )}
        </div>
        {!viewer?.is_self && onFollow && (
          <button
            onClick={onFollow}
            disabled={followBusy}
            className={'min-h-10 px-4 rounded-full text-xs font-bold transition active:scale-[0.98] disabled:opacity-60 ' + (viewer?.follows_them ? 'border border-[var(--border)] text-[var(--text)]' : 'bg-[var(--emerald)] text-[var(--on-emerald)]')}
          >
            {viewer?.follows_them ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </article>
  )
}

function parseArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || !raw) return []
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : [] } catch { return [] }
}

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
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
      {hasSleep && (
        <Widget label="Sleep">
          <div className="font-mono tabular-nums text-2xl font-extrabold text-[var(--text)]">{Number(sleep).toFixed(2).replace(/\.?0+$/, '')}<span className="text-sm text-[var(--text-muted)]">h</span></div>
        </Widget>
      )}
      {hasNutrition && (
        <Widget label="Nutrition">
          {user.latest_calories != null && <div className="font-mono tabular-nums text-lg font-extrabold text-[var(--text)]">{user.latest_calories}<span className="text-xs text-[var(--text-muted)]"> kcal</span></div>}
          {user.protein_g_per_kg != null && <div className="text-xs text-[var(--text-muted)] font-mono">{user.protein_g_per_kg} g/kg protein</div>}
          {user.nutrition_phase && <div className="text-[11px] text-[var(--text-muted)] capitalize">{user.nutrition_phase}</div>}
          {supplements.length > 0 && <div className="mt-1 text-[11px] text-[var(--ink-soft)] truncate">{supplements.map(s => s.replaceAll('_', ' ')).join(', ')}</div>}
        </Widget>
      )}
      {hasMeasurements && (
        <Widget label="Measurements">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {measurements.map(m => (
              <div key={m.key} className="flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">{m.label}</span>
                <span className="font-mono tabular-nums text-xs text-[var(--text)]">{user[m.key]}</span>
              </div>
            ))}
          </div>
        </Widget>
      )}
      {hasSplit && (
        <Widget label="Split">
          <div className="text-lg font-extrabold text-[var(--text)]">{user.split_type}</div>
          {user.derived_weekly_frequency != null && (
            <div className="mt-0.5 text-xs text-[var(--text-muted)] font-mono tabular-nums">~{user.derived_weekly_frequency}x/week</div>
          )}
        </Widget>
      )}
    </div>
  )
}

function Widget({ label, children }) {
  return (
    <div className="border-t border-[var(--border)] pt-3">
      <div className="text-caption font-semibold text-[var(--text-muted)]">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function StatsHero({ stats, trainingAge }) {
  return (
    <div className="grid grid-cols-3 gap-x-4">
      <Stat label="Workouts" value={stats.workouts || 0} />
      <Stat label="Streak" value={stats.current_streak || 0} suffix="d" />
      <Stat label="Training age" value={trainingAge ?? '-'} suffix={trainingAge || trainingAge === 0 ? 'y' : ''} />
    </div>
  )
}

function Stat({ label, value, suffix = '' }) {
  return (
    <div className="border-t border-[var(--border)] pt-3">
      <div className="font-mono tabular-nums text-2xl font-extrabold text-[var(--text)]">{value}<span className="text-sm text-[var(--text-muted)]">{suffix}</span></div>
      <div className="mt-1 text-caption font-semibold text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

function TopLifts({ lifts }) {
  return (
    <section className="px-4">
      <SectionTitle>Top lifts</SectionTitle>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {lifts.map(lift => (
          <div key={lift.label} className="border-t border-[var(--border)] pt-3">
            <div className="text-caption font-semibold text-[var(--text-muted)]">{lift.label}</div>
            {lift.pr ? (
              <>
                <div className="mt-2 font-mono tabular-nums text-2xl font-extrabold text-[var(--text)]">{lift.pr.weight_kg}<span className="text-sm text-[var(--text-muted)]">kg x {lift.pr.reps}</span></div>
                <div className="mt-1 text-[11px] text-[var(--ink-soft)] truncate">{lift.pr.exercise_name || exerciseById.get(lift.pr.exercise_id)?.name || lift.pr.exercise_id}</div>
              </>
            ) : (
              <div className="mt-4 text-sm text-[var(--text-muted)]">No PR yet.</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function CurrentProgram() {
  return (
    <section className="px-4">
      <SectionTitle>Currently running</SectionTitle>
      <div className="min-h-14 border-y border-[var(--border)] py-3">
        <div className="text-sm font-bold text-[var(--text)]">No active program</div>
        <p className="mt-1 text-caption text-[var(--text-muted)]">Start a plan from Community when you are ready to track a full block.</p>
      </div>
    </section>
  )
}

function PublishedPlans({ programs, templates }) {
  if (!programs.length && !templates.length) return null
  return (
    <section>
      <SectionTitle className="px-4">Plans shared</SectionTitle>
      <div>
        {programs.map(p => (
          <PlanRow key={`p_${p.id}`} title={p.name} meta={`${p.weeks || 1} weeks - ${p.enrollment_count || 0} started`} kind="Program" />
        ))}
        {templates.map(t => (
          <PlanRow key={`t_${t.id}`} title={t.name} meta={`${t.workout_day || 'Workout'} - used ${t.usage_count || 0}x`} kind="Template" muted />
        ))}
      </div>
    </section>
  )
}

function PlanRow({ title, meta, kind, muted = false }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[var(--text)] truncate">{title}</div>
        <div className="text-caption text-[var(--text-muted)]">{meta}</div>
      </div>
      <span className={'rounded-full px-2 py-0.5 text-micro font-bold ' + (muted ? 'bg-[var(--surface-alt)] text-[var(--text-muted)]' : 'bg-[var(--emerald)] text-[var(--on-emerald)]')}>{kind}</span>
    </div>
  )
}

function RecentWorkouts({ workouts, username }) {
  return (
    <section>
      <SectionTitle className="px-4">Recent public workouts</SectionTitle>
      {workouts.length === 0 ? (
        <EmptyState copy="No public workouts yet." compact />
      ) : (
        <div>
          {workouts.map(w => (
            <Link
              key={w.id}
              to={`/user/${username}/workout/${w.id}`}
              className="flex min-h-16 items-center gap-3 px-4 py-3 active:opacity-75 transition"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono tabular-nums text-2xl font-extrabold text-[var(--text)]">{w.duration_min || 0}<span className="text-sm text-[var(--text-muted)]"> min</span></div>
                <div className="mt-0.5 text-sm text-[var(--text-muted)] truncate">{w.workout_day || w.workout_split_type || 'Workout'}</div>
              </div>
              <div className="text-[11px] text-[var(--ink-soft)] font-mono">{w.date ? timeAgo(`${w.date}T12:00:00.000Z`) : ''}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function SectionTitle({ children, className = '' }) {
  return <h3 className={'mb-2 text-title font-extrabold text-[var(--text)] ' + className}>{children}</h3>
}

function EmptyState({ copy, compact = false }) {
  return (
    <div className={'mx-4 border-y border-[var(--border)] text-center text-sm text-[var(--text-muted)] ' + (compact ? 'py-4' : 'py-8')}>
      {copy}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <div className="mx-4 h-32 border-y border-[var(--border)] bg-white/5 animate-pulse" />
      <div className="grid grid-cols-3 gap-x-4 px-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 border-t border-[var(--border)] bg-white/5 animate-pulse" />)}
      </div>
      <div className="mx-4 h-44 border-y border-[var(--border)] bg-white/5 animate-pulse" />
    </div>
  )
}
