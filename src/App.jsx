import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import BottomNav from './components/BottomNav.jsx'
import FloatingWorkoutBar from './components/FloatingWorkoutBar.jsx'
import RestTimerPill from './components/workout/RestTimerPill.jsx'
import Auth from './pages/Auth.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Community from './pages/Community.jsx'
import Workout from './pages/Workout.jsx'
import Progress from './pages/Progress.jsx'
import Study from './pages/Study.jsx'
import StudyConcepts from './pages/StudyConcepts.jsx'
import ConceptHub from './pages/ConceptHub.jsx'
import ConceptWorkout from './pages/ConceptWorkout.jsx'
import ConceptCommunity from './pages/ConceptCommunity.jsx'
import ConceptCohesive from './pages/ConceptCohesive.jsx'
import ConceptCommunityModern from './pages/ConceptCommunityModern.jsx'
import ConceptShowcase from './pages/ConceptShowcase.jsx'
import ConceptProfileMaterials from './pages/ConceptProfileMaterials.jsx'
import Profile from './pages/Profile.jsx'
import UserProfile from './pages/UserProfile.jsx'
import PublicWorkout from './pages/PublicWorkout.jsx'
import PostDetail from './pages/PostDetail.jsx'
import TemplateBuilder from './pages/TemplateBuilder.jsx'
import ProgramBuilder from './pages/ProgramBuilder.jsx'
import { Spinner } from './components/ui/Spinner.jsx'
import { useWorkout } from './hooks/useWorkout.jsx'

const HIDE_NAV_PATHS = ['/auth', '/onboarding', '/study-concepts', '/concepts', '/concepts/workout', '/concepts/community', '/concepts/cohesive', '/concepts/community-modern', '/concepts/profile-materials']
const FLOATING_WORKOUT_HIDDEN_PATHS = ['/auth', '/onboarding', '/workout', '/study-concepts', '/concepts', '/concepts/workout', '/concepts/community', '/concepts/cohesive', '/concepts/community-modern', '/concepts/profile-materials']

export default function App() {
  const { user, token, loading } = useAuth()
  const wo = useWorkout()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  if (user && !user.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  const isPalette = location.pathname.startsWith('/concepts/palette/')
  const hideNav = HIDE_NAV_PATHS.includes(location.pathname) || isPalette
  const showFloatingWorkoutBar = !!wo.workout && !wo.workout.finalizedAt && !FLOATING_WORKOUT_HIDDEN_PATHS.includes(location.pathname) && !isPalette

  return (
    <div className="min-h-screen">
      <main className="max-w-md mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/community" replace />} />
          <Route path="/community" element={<Community />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/templates/new" element={<TemplateBuilder />} />
          <Route path="/templates/builder/:id" element={<TemplateBuilder />} />
          <Route path="/programs/new" element={<ProgramBuilder />} />
          <Route path="/programs/builder/:id" element={<ProgramBuilder />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/study" element={<Study />} />
          <Route path="/study-concepts" element={<StudyConcepts />} />
          <Route path="/concepts" element={<ConceptHub />} />
          <Route path="/concepts/workout" element={<ConceptWorkout />} />
          <Route path="/concepts/community" element={<ConceptCommunity />} />
          <Route path="/concepts/cohesive" element={<ConceptCohesive />} />
          <Route path="/concepts/community-modern" element={<ConceptCommunityModern />} />
          <Route path="/concepts/profile-materials" element={<ConceptProfileMaterials />} />
          <Route path="/concepts/palette/:paletteId" element={<ConceptShowcase />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/user/:username/workout/:id" element={<PublicWorkout />} />
          <Route path="/auth" element={<Navigate to="/community" replace />} />
          <Route path="/onboarding" element={<Navigate to="/community" replace />} />
          <Route path="*" element={<Navigate to="/community" replace />} />
        </Routes>
      </main>
      <FloatingWorkoutBar />
      <RestTimerPill
        active={wo.restTimer.active}
        durationSec={wo.restTimer.durationSec}
        startedAt={wo.restTimer.startedAt}
        stacked={showFloatingWorkoutBar}
        onRestart={wo.startRestTimer}
        onDismiss={wo.dismissRestTimer}
      />
      {!hideNav && <BottomNav />}
    </div>
  )
}
