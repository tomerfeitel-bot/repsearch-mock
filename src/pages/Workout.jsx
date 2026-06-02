import StartScreen from '../components/workout/StartScreen.jsx'
import ActiveWorkout from '../components/workout/ActiveWorkout.jsx'
import { useWorkout } from '../hooks/useWorkout.jsx'
import { Spinner } from '../components/ui/Spinner.jsx'

export default function Workout() {
  const { workout, startWorkout, loading, restoreError } = useWorkout()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  }

  if (!workout) return <StartScreen onStart={startWorkout} restoreError={restoreError} />

  return <ActiveWorkout />
}
