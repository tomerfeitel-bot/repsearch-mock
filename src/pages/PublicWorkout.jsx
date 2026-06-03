import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar.jsx'
import { api } from '../lib/api.js'
import { useToast } from '../components/ui/Toast.jsx'
import { SEED_EXERCISES } from '../lib/exercises.js'
import { muscleColor } from '../lib/musclePalette.js'
import { timeAgo } from '../lib/timeAgo.js'

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

export default function PublicWorkout() {
  const { id } = useParams()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setData(await api.get(`/public/workouts/${id}`))
    } catch (err) {
      toast(err.message || 'Failed to load workout', 'error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const groups = useMemo(() => {
    const map = new Map()
    for (const set of data?.sets || []) {
      if (!map.has(set.exercise_id)) map.set(set.exercise_id, [])
      map.get(set.exercise_id).push(set)
    }
    return [...map.entries()]
  }, [data])

  if (loading) return <WorkoutSkeleton />
  if (!data) {
    return (
      <div className="min-h-screen pb-24 bg-gray-950 p-4">
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-8 text-center text-sm text-gray-500">Workout not found.</div>
      </div>
    )
  }

  const { workout, owner, viewer_best = {} } = data
  const totalSets = data.sets?.length || 0

  return (
    <div className="min-h-screen pb-24 bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 safe-pt-4 pb-4">
        <Link to={`/user/${owner.username}`} className="flex items-center gap-2">
          <Avatar username={owner.username} size="sm" />
          <div>
            <div className="text-sm font-semibold text-gray-100">{owner.username}</div>
            <div className="text-[11px] text-gray-500 font-mono">{workout.created_at ? timeAgo(workout.created_at) : workout.date}</div>
          </div>
        </Link>
      </header>

      <main className="p-4 space-y-4">
        <section className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono tabular-nums text-5xl font-bold text-gray-100">{workout.duration_min || 0}<span className="text-base text-gray-500"> min</span></div>
              <div className="mt-2 text-sm text-gray-300">{workout.workout_day || workout.workout_split_type || 'Workout'} <span className="text-gray-500">· {totalSets} sets</span></div>
            </div>
            <span className="text-[11px] uppercase tracking-wider px-2 py-1 rounded-full bg-gray-800 text-gray-400">{workout.visibility}</span>
          </div>
          {workout.notes ? <p className="mt-4 text-sm text-gray-400 leading-relaxed">{workout.notes}</p> : null}
        </section>

        <section className="space-y-3">
          {groups.length === 0 ? (
            <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 text-center text-sm text-gray-500">No set data on this workout.</div>
          ) : groups.map(([exerciseId, sets]) => {
            const exercise = exerciseById.get(exerciseId)
            const best = viewer_best[exerciseId]
            return (
              <div key={exerciseId} className="rounded-2xl bg-gray-900 border border-gray-800 p-4" style={{ borderLeft: `4px solid ${muscleColor(exercise?.primary_muscle)}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-100">{exercise?.name || exerciseId}</h2>
                    <p className="text-xs text-gray-500">{exercise?.primary_muscle || 'Exercise'} · {exercise?.equipment_type || 'Equipment'}</p>
                  </div>
                  <span className="text-xs font-mono text-gray-500">{sets.length} sets</span>
                </div>
                <div className="mt-3 space-y-2">
                  {sets.map((set, idx) => (
                    <div key={set.id || idx} className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-xl bg-gray-950 border border-gray-800 px-3 py-2">
                      <span className="text-xs text-gray-500">Set {set.set_number || idx + 1}</span>
                      <span className="font-mono tabular-nums text-sm text-gray-200">{set.weight_kg ?? '-'}kg × {set.reps ?? '-'}</span>
                      <span className="text-[11px] text-gray-500">{set.set_type || 'working'}</span>
                    </div>
                  ))}
                </div>
                {best && <div className="mt-3 text-xs text-indigo-300">Your best: {best.best_kg}kg × {best.best_reps}</div>}
              </div>
            )
          })}
        </section>

        <div className="text-center text-xs text-gray-600 pt-2">Discussion lives on shared posts in the Community feed.</div>
      </main>
    </div>
  )
}

function WorkoutSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-gray-950 p-4 space-y-4">
      <div className="h-20 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
      <div className="h-32 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
      <div className="h-56 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
    </div>
  )
}
