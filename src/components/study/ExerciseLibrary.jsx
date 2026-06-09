import { useEffect, useMemo, useRef, useState } from 'react'
import MuscleModel from './MuscleModel.jsx'
import {
  EXERCISE_VIDEO_LINKS,
  MODEL_GROUP_MUSCLES,
  MUSCLE_DESCRIPTIONS,
  SEED_EXERCISES,
} from '../../lib/exercises.js'
import {
  STUDY_ACCENT,
  STUDY_ACCENT_FAINT,
  STUDY_BG,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_TEXT,
} from '../../lib/researchTheme.js'

// The 14 tappable model groups, in display order, paired with the catalog
// exercises each one covers (via MODEL_GROUP_MUSCLES → primary_muscle).
const GROUP_ORDER = Object.keys(MODEL_GROUP_MUSCLES)

function platformLabel(url) {
  const value = String(url || '').toLowerCase()
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube'
  if (value.includes('instagram.com')) return 'Instagram'
  if (value.includes('tiktok.com')) return 'TikTok'
  return 'Video'
}

function matchesExercise(exercise, query) {
  if (!query) return true
  return [
    exercise.name,
    exercise.primary_muscle,
    exercise.secondary_muscle,
    exercise.equipment_type,
    exercise.movement_pattern,
  ].some(value => String(value || '').toLowerCase().includes(query))
}

export default function ExerciseLibrary() {
  const [query, setQuery] = useState('')
  // Groups the user has expanded — by header click or by tapping the model.
  // Multiple may be open at once; the same set drives the model highlight.
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const listRef = useRef(null)
  // Group queued to scroll to after the row has expanded (set when a muscle is
  // tapped on the model; consumed by the effect below once React has committed).
  const pendingScroll = useRef(null)

  const allGroups = useMemo(() => {
    const byMuscle = new Map()
    SEED_EXERCISES.forEach(exercise => {
      const m = exercise.primary_muscle
      if (!m) return
      if (!byMuscle.has(m)) byMuscle.set(m, [])
      byMuscle.get(m).push(exercise)
    })
    return GROUP_ORDER.map(group => {
      const exercises = (MODEL_GROUP_MUSCLES[group] || [])
        .flatMap(muscle => byMuscle.get(muscle) || [])
        .sort((a, b) => a.name.localeCompare(b.name))
      return { group, exercises }
    })
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const groups = useMemo(() => {
    return allGroups
      .map(({ group, exercises }) => ({
        group,
        exercises: exercises.filter(ex => matchesExercise(ex, normalizedQuery)),
      }))
      // While searching, hide groups with no matching exercise.
      .filter(({ exercises }) => !normalizedQuery || exercises.length > 0)
  }, [allGroups, normalizedQuery])

  const visibleCount = groups.reduce((sum, g) => sum + g.exercises.length, 0)
  const searching = normalizedQuery.length > 0

  function toggleGroup(group) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // Tapping a muscle on the model toggles its row; if it opened, queue a scroll.
  function handleSelectGroup(group) {
    const willOpen = !openGroups.has(group)
    pendingScroll.current = willOpen ? group : null
    toggleGroup(group)
  }

  // Run the queued scroll after the row has actually expanded (post-commit).
  useEffect(() => {
    const group = pendingScroll.current
    if (group && openGroups.has(group)) {
      const node = listRef.current?.querySelector(`[data-group="${CSS.escape(group)}"]`)
      node?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    pendingScroll.current = null
  }, [openGroups])

  return (
    <div className="space-y-5">
      <MuscleModel selected={[...openGroups]} onSelect={handleSelectGroup} />

      <header className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-bold leading-tight" style={{ color: STUDY_TEXT }}>
            Exercise Library
          </h2>
          <div className="shrink-0 text-right font-mono tabular-nums">
            <p className="text-lg font-bold leading-none" style={{ color: STUDY_ACCENT }}>{visibleCount}</p>
            <p className="mt-1 text-[11px]" style={{ color: STUDY_MUTED }}>of {SEED_EXERCISES.length}</p>
          </div>
        </div>

        <label
          className="flex min-h-12 items-center px-3"
          style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, borderRadius: 12 }}
        >
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search exercises, muscles, equipment"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
            style={{ color: STUDY_TEXT }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="min-h-8 shrink-0 px-1 text-base leading-none"
              style={{ color: STUDY_MUTED }}
              aria-label="Clear exercise search"
            >
              x
            </button>
          )}
        </label>
      </header>

      {groups.length === 0 ? (
        <div className="border-y py-8 text-center text-sm" style={{ borderColor: STUDY_BORDER, color: STUDY_MUTED }}>
          No exercises match this filter.
        </div>
      ) : (
        <div ref={listRef} className="overflow-hidden rounded-2xl" style={{ border: `1px solid ${STUDY_BORDER_STRONG}` }}>
          {groups.map(({ group, exercises }, index) => (
            <GroupAccordion
              key={group}
              group={group}
              exercises={exercises}
              // When searching, force matching groups open so results show.
              open={searching || openGroups.has(group)}
              onToggle={() => toggleGroup(group)}
              first={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupAccordion({ group, exercises, open, onToggle, first }) {
  return (
    <section
      data-group={group}
      style={{ borderTop: first ? 'none' : `1px solid ${STUDY_BORDER_STRONG}`, scrollMarginTop: 12 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-white/[0.03]"
        style={{ background: open ? STUDY_ACCENT_FAINT : 'transparent' }}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold leading-tight" style={{ color: STUDY_TEXT }}>{group}</span>
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: STUDY_ACCENT }}>
          {exercises.length}
        </span>
        <span
          className="shrink-0 text-sm transition-transform"
          style={{ color: STUDY_MUTED, transform: open ? 'rotate(90deg)' : 'none' }}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="max-w-[65ch] text-sm leading-6" style={{ color: STUDY_MUTED, textWrap: 'pretty' }}>
            {MUSCLE_DESCRIPTIONS[group] || 'This muscle group is used as a primary training target across the exercise catalog.'}
          </p>
          {exercises.length > 0 ? (
            <div className="mt-3 border-t" style={{ borderColor: STUDY_BORDER }}>
              {exercises.map(exercise => (
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm" style={{ color: STUDY_MUTED }}>No exercises catalogued for this group yet.</p>
          )}
        </div>
      )}
    </section>
  )
}

function ExerciseRow({ exercise }) {
  const link = EXERCISE_VIDEO_LINKS[exercise.id]?.videoUrl || ''
  const meta = [
    exercise.primary_muscle,
    exercise.equipment_type,
    exercise.movement_pattern,
    exercise.secondary_muscle ? `Secondary: ${exercise.secondary_muscle}` : null,
  ].filter(Boolean)

  return (
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t py-3 first:border-t-0" style={{ borderColor: STUDY_BORDER }}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" style={{ color: STUDY_TEXT }}>{exercise.name}</p>
        <p className="mt-1 truncate text-xs leading-5" style={{ color: STUDY_MUTED }}>{meta.join(' / ')}</p>
      </div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="min-h-10 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: STUDY_ACCENT_FAINT, border: `1px solid ${STUDY_ACCENT}`, color: STUDY_TEXT }}
        >
          {platformLabel(link)}
        </a>
      ) : (
        <span
          className="min-h-10 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}`, color: STUDY_MUTED }}
          aria-disabled="true"
        >
          Video pending
        </span>
      )}
    </div>
  )
}
