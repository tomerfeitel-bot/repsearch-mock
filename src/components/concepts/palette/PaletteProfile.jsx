import { useState } from 'react'
import { IconTrophy, IconActivity, IconMore } from '../cohesive/_shared.jsx'

const MOCK_USER = {
  username: 'igor_volkov',
  displayName: 'Igor Volkov',
  bio: 'Competitive powerlifter · 5 years training · S/B/D 200/140/230',
  followers: 312,
  following: 87,
  streak: 18,
  age: 28,
  totalSessions: 284,
  currentProgram: 'GZCLP Intermediate',
}

const TOP_LIFTS = [
  { name: 'Squat', weight: '200', unit: 'kg', delta: '+12.5' },
  { name: 'Bench', weight: '140', unit: 'kg', delta: '+7.5' },
  { name: 'Deadlift', weight: '230', unit: 'kg', delta: '+15' },
  { name: 'OHP', weight: '85', unit: 'kg', delta: '+5' },
]

const RECENT_SESSIONS = [
  { name: 'Push A', date: 'Today', sets: 18, volume: '4,820 kg', split: 'Push' },
  { name: 'Pull A', date: 'Yesterday', sets: 15, volume: '3,960 kg', split: 'Pull' },
  { name: 'Leg A', date: '2d ago', sets: 14, volume: '6,200 kg', split: 'Legs' },
  { name: 'Push B', date: '4d ago', sets: 16, volume: '4,440 kg', split: 'Push' },
]

const SPLIT_COLORS = { Push: '#c4633a', Pull: '#4a8fa6', Legs: '#6a9a55' }

const TABS = ['Profile', 'Plans', 'Check-in']

export default function PaletteProfile({ P }) {
  const [tab, setTab] = useState('Profile')
  const r = P.radius
  const isMarine = P.tags.includes('navy')
  const isEmber = P.tags.includes('amber')
  const isGrove = P.tags.includes('earthy')
  const isQuartz = P.tags.includes('lavender')

  const cardStyle = {
    background: P.surface,
    border: isQuartz ? 'none' : `1px solid ${P.border}`,
    borderRadius: r,
    boxShadow: isQuartz ? '0 2px 10px rgba(109,40,217,0.08),0 1px 2px rgba(0,0,0,0.04)'
      : isEmber ? `0 4px 24px rgba(217,124,30,0.08)` : 'none',
  }

  if (P.style === 'strava') {
    return (
      <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
        <header className="px-4 pt-5 pb-3">
          <div className="overflow-hidden" style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: r }}>
            <div className="h-28" style={{ background: `linear-gradient(135deg, ${P.chartFill}, ${P.surfaceAlt})` }} />
            <div className="px-4 pb-4 -mt-8">
              <div className="flex items-end gap-3">
                <Avatar P={P} r={r} size={68} />
                <div className="pb-1"><h1 className="text-xl font-black">{MOCK_USER.displayName}</h1><p className="text-xs font-mono" style={{ color: P.textMuted }}>u/{MOCK_USER.username}</p></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[['followers', MOCK_USER.followers], ['sessions', MOCK_USER.totalSessions], ['streak', MOCK_USER.streak]].map(([l, v]) => <div key={l}><div className="font-black font-mono">{v}</div><div className="text-[10px]" style={{ color: P.textMuted }}>{l}</div></div>)}
              </div>
            </div>
          </div>
          <ProfileTabs P={P} r={r} tab={tab} setTab={setTab} />
        </header>
        <ProfileBody tab={tab} P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} isMarine={isMarine} />
      </div>
    )
  }

  if (P.style === 'reddit') {
    return (
      <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-2">
            <Avatar P={P} r={r} size={40} />
            <div className="min-w-0 flex-1"><h1 className="text-lg font-black">u/{MOCK_USER.username}</h1><p className="text-[11px]" style={{ color: P.textMuted }}>{MOCK_USER.followers} followers · {MOCK_USER.totalSessions} sessions</p></div>
            <button style={{ color: P.textMuted }}><IconMore size={20} /></button>
          </div>
          <ProfileTabs P={P} r={r} tab={tab} setTab={setTab} />
        </header>
        <ProfileBody tab={tab} P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} isMarine={isMarine} compact />
      </div>
    )
  }

  if (P.style === 'signal') {
    return (
      <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
        <header className="px-4 pt-5 pb-3">
          <div className="p-3" style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: r }}>
            <div className="rounded-2xl p-4 flex items-end gap-3" style={{ background: `linear-gradient(135deg, ${P.surfaceAlt}, ${P.heroFade || 'rgba(143,216,78,0.18)'})` }}>
              <Avatar P={P} r={r} size={70} />
              <div className="min-w-0 flex-1"><div className="text-xs font-bold" style={{ color: P.accent }}>ATHLETE CARD</div><h1 className="text-2xl font-black truncate">{MOCK_USER.displayName}</h1><p className="text-xs" style={{ color: P.textMuted }}>{MOCK_USER.bio}</p></div>
            </div>
          </div>
          <ProfileTabs P={P} r={r} tab={tab} setTab={setTab} />
        </header>
        <ProfileBody tab={tab} P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} isMarine={isMarine} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{
        background: P.bg,
        borderBottom: isEmber ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
      }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className={`text-2xl font-bold tracking-tight ${isMarine ? 'font-mono' : ''}`}>Profile</h1>
          <button style={{ color: P.textMuted }}><IconMore size={20} /></button>
        </div>
        <div className="flex gap-1 p-1" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r + 2 }}>
          {TABS.map(t => {
            const on = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} aria-pressed={on}
                className="flex-1 h-8 text-xs font-semibold transition-colors"
                style={{ borderRadius: r, background: on ? P.accent : 'transparent', color: on ? P.accentInk : P.textMuted }}>
                {t}
              </button>
            )
          })}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {tab === 'Profile' && <ProfileTab P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} isMarine={isMarine} />}
        {tab === 'Plans' && <PlansTab P={P} r={r} cardStyle={cardStyle} />}
        {tab === 'Check-in' && <CheckInTab P={P} r={r} cardStyle={cardStyle} />}
      </div>
    </div>
  )
}

function ProfileTabs({ P, r, tab, setTab }) {
  return (
    <div className="mt-3 flex gap-1 p-1" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r + 2 }}>
      {TABS.map(t => {
        const on = tab === t
        return (
          <button key={t} onClick={() => setTab(t)} aria-pressed={on}
            className="flex-1 h-8 text-xs font-semibold transition-colors"
            style={{ borderRadius: r, background: on ? P.accent : 'transparent', color: on ? P.accentInk : P.textMuted }}>
            {t}
          </button>
        )
      })}
    </div>
  )
}

function ProfileBody({ tab, P, r, cardStyle, isGrove, isMarine, compact }) {
  return (
    <div className={`${compact ? 'px-2 pt-2 space-y-2' : 'px-4 pt-4 space-y-3'}`}>
      {tab === 'Profile' && <ProfileTab P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} isMarine={isMarine} />}
      {tab === 'Plans' && <PlansTab P={P} r={r} cardStyle={cardStyle} />}
      {tab === 'Check-in' && <CheckInTab P={P} r={r} cardStyle={cardStyle} />}
    </div>
  )
}

function SectionLabel({ P, isGrove, children }) {
  return (
    <div className={`text-xs font-semibold mb-2 ${isGrove ? 'uppercase tracking-widest' : 'uppercase tracking-wide'}`}
      style={{ color: P.textMuted }}>{children}</div>
  )
}

function Avatar({ P, size = 64 }) {
  const isQuartz = P.tags.includes('lavender')
  return (
    <div className="flex items-center justify-center font-bold text-xl shrink-0"
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: isQuartz ? 'linear-gradient(135deg,#6d28d9,#4c1d95)' : P.accent,
        color: P.accentInk,
        boxShadow: isQuartz ? '0 4px 12px rgba(109,40,217,0.30)' : 'none',
      }}>
      IV
    </div>
  )
}

function ProfileTab({ P, r, cardStyle, isGrove, isMarine }) {
  return (
    <div className="space-y-3">
      {/* Identity card */}
      <div className="p-4" style={cardStyle}>
        <div className="flex items-start gap-3">
          <Avatar P={P} r={r} size={60} />
          <div className="flex-1 min-w-0">
            <div className="font-bold">{MOCK_USER.displayName}</div>
            <div className="text-xs font-mono" style={{ color: P.textMuted }}>u/{MOCK_USER.username}</div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: P.textMuted }}>{MOCK_USER.bio}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-4 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
          {[['Followers', MOCK_USER.followers], ['Following', MOCK_USER.following]].map(([l, v]) => (
            <div key={l}>
              <div className={`text-lg font-bold font-mono ${isMarine ? 'tabular-nums' : ''}`}>{v}</div>
              <div className="text-xs" style={{ color: P.textMuted }}>{l}</div>
            </div>
          ))}
          <button className="ml-auto h-8 px-4 text-xs font-semibold"
            style={{ background: P.accent, color: P.accentInk, borderRadius: r }}>
            Edit profile
          </button>
        </div>
      </div>

      {/* Stats hero */}
      <div className="grid grid-cols-3 gap-2">
        {[['🔥', MOCK_USER.streak, 'day streak'], ['📅', MOCK_USER.age, 'years old'], ['💪', MOCK_USER.totalSessions, 'sessions']].map(([icon, v, l]) => (
          <div key={l} className="p-3 text-center" style={cardStyle}>
            <div className="text-lg">{icon}</div>
            <div className="font-bold font-mono">{v}</div>
            <div className="text-[10px]" style={{ color: P.textMuted }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Top lifts */}
      <div>
        <SectionLabel P={P} isGrove={isGrove}>Top lifts</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {TOP_LIFTS.map(lift => (
            <div key={lift.name} className="p-3 flex items-center gap-2.5" style={cardStyle}>
              <IconTrophy size={16} style={{ color: P.chartB, flexShrink: 0 }} />
              <div className="min-w-0">
                <div className="text-xs" style={{ color: P.textMuted }}>{lift.name}</div>
                <div className="font-bold font-mono">{lift.weight}<span className="text-xs font-normal" style={{ color: P.textMuted }}>{lift.unit}</span></div>
              </div>
              <span className="ml-auto text-xs font-mono font-semibold" style={{ color: P.positive }}>+{lift.delta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current program */}
      <div className="p-3.5 flex items-center gap-3" style={cardStyle}>
        <IconActivity size={18} style={{ color: P.accent, flexShrink: 0 }} />
        <div className="min-w-0">
          <div className="text-xs" style={{ color: P.textMuted }}>Current program</div>
          <div className="text-sm font-semibold truncate">{MOCK_USER.currentProgram}</div>
        </div>
        <span className="text-xs px-2 py-0.5 font-semibold ml-auto"
          style={{ background: P.accentSoft, color: P.accent, borderRadius: r - 6, whiteSpace: 'nowrap' }}>
          Week 4
        </span>
      </div>

      {/* Recent sessions */}
      <div>
        <SectionLabel P={P} isGrove={isGrove}>Recent sessions</SectionLabel>
        <div className="space-y-1.5">
          {RECENT_SESSIONS.map(s => {
            const c = SPLIT_COLORS[s.split] || P.textMuted
            return (
              <div key={s.name} className="flex items-center gap-2.5 py-2.5 px-3" style={cardStyle}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs" style={{ color: P.textMuted }}>{s.date} · {s.sets} sets</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold">{s.volume}</div>
                  <div className="text-[10px]" style={{ color: P.textMuted }}>volume</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlansTab({ P, r, cardStyle }) {
  const plans = [
    { name: 'GZCLP Intermediate', type: 'Program', uses: 847, weeks: 12 },
    { name: 'Hypertrophy Upper A', type: 'Template', uses: 312, exercises: 6 },
    { name: 'Max Strength Lower', type: 'Template', uses: 201, exercises: 5 },
  ]
  return (
    <div className="space-y-2.5">
      <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: P.textMuted }}>
        Published plans ({plans.length})
      </div>
      {plans.map(p => (
        <div key={p.name} className="p-4" style={cardStyle}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-bold">{p.name}</div>
              <div className="text-xs mt-0.5" style={{ color: P.textMuted }}>
                {p.type} · {p.weeks ? `${p.weeks} weeks` : `${p.exercises} exercises`}
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 font-semibold shrink-0"
              style={{ background: P.accentSoft, color: P.accent, borderRadius: r - 6 }}>
              {p.uses} uses
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CheckInTab({ P, r, cardStyle }) {
  const fields = [
    { label: 'Bodyweight', value: '84.2 kg', type: 'number' },
    { label: 'Sleep hours', value: '7.5h', type: 'number' },
    { label: 'Fatigue (1–10)', value: '4', type: 'number' },
    { label: 'Mood', value: 'Good', type: 'select' },
  ]
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: P.textMuted }}>
        Today's check-in
      </div>
      <div className="p-4 space-y-3" style={cardStyle}>
        {fields.map(f => (
          <div key={f.label} className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: P.textMuted }}>{f.label}</span>
            <input
              readOnly
              value={f.value}
              className="h-9 px-3 text-sm font-mono text-right bg-transparent outline-none w-28"
              style={{ border: `1px solid ${P.border}`, borderRadius: r - 4, color: P.text, background: P.surfaceAlt }}
            />
          </div>
        ))}
        <button className="w-full h-10 text-sm font-semibold mt-1"
          style={{ background: P.accent, color: P.accentInk, borderRadius: r - 2 }}>
          Save check-in
        </button>
      </div>
    </div>
  )
}
