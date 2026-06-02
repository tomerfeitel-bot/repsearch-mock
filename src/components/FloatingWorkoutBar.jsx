import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkout } from '../hooks/useWorkout.jsx'
import { formatElapsed } from '../lib/formatTime.js'

const HIDE_PATHS = ['/auth', '/onboarding', '/workout']

export default function FloatingWorkoutBar() {
  const { workout, elapsedSec } = useWorkout()
  const navigate = useNavigate()
  const location = useLocation()

  if (!workout || workout.finalizedAt) return null
  if (HIDE_PATHS.includes(location.pathname)) return null

  return (
    <button
      onClick={() => navigate('/workout')}
      className="fixed left-2 right-2 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 max-w-md mx-auto bg-indigo-600/95 backdrop-blur hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/40 px-4 py-2.5 flex items-center gap-3 transition-colors"
    >
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span className="text-sm font-medium">Workout in progress</span>
      <span className="ml-auto text-sm font-mono tabular-nums">{formatElapsed(elapsedSec)}</span>
    </button>
  )
}
