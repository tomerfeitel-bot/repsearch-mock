import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/community', label: 'Community', icon: CommunityIcon },
  { to: '/study', label: 'Study', icon: StudyIcon },
  { to: '/progress', label: 'Progress', icon: ProgressIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
      <div className="relative max-w-md mx-auto grid grid-cols-5">
        {/* Community, Study */}
        {tabs.slice(0, 2).map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}

        {/* Center workout button — pops out of the bar */}
        <div className="flex justify-center">
          <NavLink
            to="/workout"
            aria-label="Workout"
            className="absolute -top-6 flex flex-col items-center"
          >
            {({ isActive }) => (
              <>
                <span
                  className={
                    'flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-white shadow-lg shadow-black/40 ring-4 ring-gray-950 transition-transform active:scale-95 ' +
                    (isActive ? 'outline outline-2 outline-amber-500' : '')
                  }
                >
                  <WorkoutIcon active />
                </span>
                <span
                  className={
                    'mt-1 text-[11px] font-medium ' +
                    (isActive ? 'text-indigo-400' : 'text-gray-500')
                  }
                >
                  Workout
                </span>
              </>
            )}
          </NavLink>
        </div>

        {/* Progress, Profile */}
        {tabs.slice(2).map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  )
}

function Tab({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors ' +
        (isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300')
      }
    >
      {({ isActive }) => (
        <>
          <Icon active={isActive} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function CommunityIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
  )
}
function WorkoutIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M4 8l4-4 4 4M16 16l4 4M8 12l8-8M12 16l8-8" />
    </svg>
  )
}
function ProgressIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M14 7h7v7" />
    </svg>
  )
}
function StudyIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
    </svg>
  )
}
function ProfileIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
