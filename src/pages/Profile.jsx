import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import ProfileSummary from '../components/profile/ProfileSummary.jsx'
import DailyLogHub from '../components/profile/DailyLogHub.jsx'
import PlansTab from '../components/community/PlansTab.jsx'
import { Sheet } from '../components/ui/Sheet.jsx'
import BubbleHeader from '../components/ui/BubbleHeader.jsx'
import PillTabs from '../components/ui/PillTabs.jsx'
import { SPLIT_TYPES } from '../lib/splits.js'
import { api } from '../lib/api.js'

const TABS = ['my profile', 'my plans', 'check-in']
const TAB_LABELS = { 'my profile': 'Profile', 'my plans': 'Plans', 'check-in': 'Check-in' }

// Profile detail fields live behind the "Edit profile" sheet on the Athlete Card.
// The Gear menu holds only account/administrative controls. Daily habits, split,
// goal, nutrition phase and supplements are handled by the Daily Log Hub instead.
// `visibility` mirrors the server: 'public' fields are in BASE_USER_COLUMNS
// (shown on the Athlete Card); 'private' fields are research-only and never
// exposed on a public profile. Used to render the per-field privacy badge.
const EDIT_GROUPS = [
  {
    title: 'About you',
    fields: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['woman', 'man', 'prefer_not_to_say'], visibility: 'public' },
      { key: 'date_of_birth', label: 'Date of birth', type: 'date', visibility: 'private', note: 'Only your age range is shown publicly.' },
      { key: 'training_started_at', label: 'Training start date', type: 'date', visibility: 'public' },
      { key: 'enhancement_status', label: 'Enhancement status', type: 'select', options: ['natural', 'enhanced', 'previously_enhanced', 'prefer_not_to_say'], visibility: 'public' },
      { key: 'experience_level', label: 'Experience level', type: 'select', options: ['beginner', 'intermediate', 'advanced'], visibility: 'public' },
      { key: 'height_cm', label: 'Height cm', type: 'number', step: '0.1', visibility: 'private' },
      { key: 'country_region', label: 'Country / region', type: 'text', visibility: 'private' },
      { key: 'ethnic_background_json', label: 'Ethnic background JSON', type: 'text', visibility: 'private' },
    ],
  },
  {
    title: 'Training context',
    fields: [
      { key: 'split_type', label: 'Training split', type: 'select', options: SPLIT_TYPES, visibility: 'public' },
      { key: 'gym_type', label: 'Gym type', type: 'select', options: ['commercial', 'home', 'outdoor'], visibility: 'private' },
    ],
  },
  {
    title: 'Work & sport',
    fields: [
      { key: 'job_title', label: 'Job / role', type: 'text', visibility: 'private' },
      { key: 'physical_labor_level', label: 'Physical labor at work', type: 'select', options: ['sedentary', 'light', 'moderate', 'heavy'], visibility: 'private' },
      { key: 'sport_primary', label: 'Primary sport', type: 'select', options: ['running', 'cycling', 'swimming', 'team_sport', 'none'], visibility: 'public' },
      { key: 'sport_sessions_per_week', label: 'Sport sessions / week', type: 'number', step: '1', visibility: 'private' },
      { key: 'race_distance', label: 'Race distance', type: 'text', visibility: 'private' },
      { key: 'vo2_max', label: 'VO2 max', type: 'number', step: '0.1', visibility: 'private' },
      { key: 'avg_daily_steps', label: 'Average daily steps', type: 'number', step: '1', visibility: 'private' },
    ],
  },
  {
    title: 'Health notes',
    fields: [
      { key: 'injury_limitations', label: 'Injury limitations', type: 'textarea', visibility: 'private' },
    ],
  },
]

export default function Profile() {
  const { user, logout, refresh, updateUser } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('my profile')
  const [gearOpen, setGearOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingProfile(true)
    Promise.all([
      api.get(`/public/users/${user.username}`),
      api.get('/workouts?limit=100'),
    ]).then(([data, workoutData]) => {
      if (!cancelled) setProfileData(withOwnStreak(data, workoutData.workouts || []))
    }).catch(err => toast(err.message || 'Failed to load profile', 'error'))
      .finally(() => { if (!cancelled) setLoadingProfile(false) })
    return () => { cancelled = true }
  }, [user.username, toast])

  const enriched = useMemo(() => profileData ? { ...profileData, user: { ...profileData.user, ...user } } : null, [profileData, user])

  return (
    <div className="faded-page min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <BubbleHeader
        label="Athlete card"
        title="Profile"
        floating
        action={
          <button
            onClick={() => setGearOpen(true)}
            aria-label="Settings"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-100 hover:border-gray-700 active:scale-95 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.27 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        }
      />
      <div className="px-4 pb-3">
        <PillTabs
          tabs={TABS.map(t => ({ value: t, label: TAB_LABELS[t] }))}
          value={tab}
          onChange={setTab}
          ariaLabel="Profile sections"
        />
      </div>

      {tab === 'my profile' && (
        <ProfileSummary data={enriched} loading={loadingProfile} onEditProfile={() => setEditProfileOpen(true)} />
      )}
      {tab === 'my plans' && <PlansTab />}
      {tab === 'check-in' && (
        <DailyLogHub user={user} updateUser={updateUser} refresh={refresh} toast={toast} />
      )}

      <Sheet open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit profile">
        <EditProfileMenu user={user} updateUser={updateUser} refresh={refresh} toast={toast} onClose={() => setEditProfileOpen(false)} />
      </Sheet>

      <Sheet open={gearOpen} onClose={() => setGearOpen(false)} title="Account settings">
        <GearMenu user={user} updateUser={updateUser} refresh={refresh} logout={logout} toast={toast} />
      </Sheet>
    </div>
  )
}

function EditProfileMenu({ user, updateUser, refresh, toast, onClose }) {
  const [form, setForm] = useState(() => normalizeUser(user))
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(normalizeUser(user)), [user])

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const payload = { bio: cleanValue(form.bio, 'textarea') || '' }
      for (const group of EDIT_GROUPS) {
        for (const field of group.fields) payload[field.key] = cleanValue(form[field.key], field.type)
      }
      const data = await api.patch('/profile', payload)
      updateUser(data.user)
      await refresh()
      toast('Profile updated', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Panel title="Bio">
        <Field label="Bio" type="textarea" visibility="public" value={form.bio} onChange={v => setField('bio', v)} />
      </Panel>

      {EDIT_GROUPS.map(group => (
        <Panel key={group.title} title={group.title}>
          <div className="space-y-3">
            {group.fields.map(field => {
              const { key, ...fieldProps } = field
              return (
                <Field key={key} {...fieldProps} value={form[key]} onChange={v => setField(key, v)} />
              )
            })}
          </div>
        </Panel>
      ))}

      <button disabled={saving} onClick={saveProfile} className="w-full min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60 text-sm font-semibold text-white transition">
        {saving ? 'Saving...' : 'Save profile'}
      </button>
    </div>
  )
}

function GearMenu({ user, updateUser, refresh, logout, toast }) {
  const [form, setForm] = useState(() => normalizeUser(user))
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => setForm(normalizeUser(user)), [user])

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const payload = {
        preferred_units: form.preferred_units,
        is_private: form.is_private ? 1 : 0,
      }
      const data = await api.patch('/profile', payload)
      updateUser(data.user)
      await refresh()
      toast('Settings saved', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      await api.del('/profile', { password: deletePassword })
      toast('Account deleted', 'success')
      logout()
    } catch (err) {
      toast(err.message || 'Failed to delete account', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Panel title="Account">
        <ReadOnly label="Email" value={user.email} />
        <ReadOnly label="Username" value={user.username} />
        <button onClick={logout} className="mt-4 min-h-11 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-[0.98] text-sm font-semibold text-gray-100 transition">Sign out</button>
      </Panel>

      <Panel title="Preferences">
        <Segmented label="Units" value={form.preferred_units} options={['kg', 'lbs']} onChange={v => setField('preferred_units', v)} />
        <Toggle label="Private profile" checked={!!form.is_private} onChange={v => setField('is_private', v)} />
        <button disabled={saving} onClick={saveProfile} className="mt-4 w-full min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60 text-sm font-semibold text-white transition">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </Panel>

      <Panel title="Danger zone">
        <p className="text-sm text-gray-400">Deleting your account removes your workouts, comments, PRs, templates, and research rows from this device.</p>
        <button onClick={() => setDeleteOpen(true)} className="mt-4 min-h-11 px-4 rounded-xl bg-red-950 border border-red-800 hover:bg-red-900 active:scale-[0.98] text-sm font-semibold text-red-100 transition">Delete account</button>
      </Panel>

      {deleteOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 px-4 flex items-center justify-center" onClick={() => setDeleteOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-gray-950 border border-gray-800 p-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-100">Delete account?</h2>
            <p className="mt-2 text-sm text-gray-400">Enter your password to confirm. This cannot be undone.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="mt-4 w-full min-h-11 rounded-xl bg-gray-900 border border-gray-800 px-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-700"
              placeholder="Password"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setDeleteOpen(false)} className="min-h-11 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-100">Cancel</button>
              <button disabled={deleting || !deletePassword} onClick={deleteAccount} className="min-h-11 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-60 text-sm font-semibold text-white">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ReadOnly({ label, value }) {
  return (
    <div className="py-2 border-b border-gray-800 last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-200">{value || '-'}</div>
    </div>
  )
}

function VisibilityBadge({ visibility }) {
  const isPublic = visibility === 'public'
  return (
    <span
      title={isPublic ? 'Shown on your public profile' : 'Private — used for research only, never shown publicly'}
      className={'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ' + (isPublic ? 'bg-indigo-600/20 text-indigo-300' : 'bg-gray-800 text-gray-500')}
    >
      {isPublic ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )}
      {isPublic ? 'Public' : 'Private'}
    </span>
  )
}

function Field({ label, type = 'text', value, onChange, options, step, visibility, note }) {
  const base = 'w-full min-h-11 rounded-xl bg-gray-950 border border-gray-800 px-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
        {visibility && <VisibilityBadge visibility={visibility} />}
      </span>
      {note && <span className="block mt-0.5 text-[11px] text-gray-600">{note}</span>}
      {type === 'select' ? (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={base + ' mt-1'}>
          <option value="">Prefer not to say</option>
          {options.map(o => <option key={o} value={o}>{human(o)}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3} className={base + ' mt-1 py-3 resize-none'} />
      ) : (
        <input type={type} step={step} value={value ?? ''} onChange={e => onChange(e.target.value)} className={base + ' mt-1'} />
      )}
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full min-h-11 flex items-center justify-between border-b border-gray-800 last:border-b-0 text-left">
      <span className="text-sm text-gray-200">{label}</span>
      <span className={'w-11 h-6 rounded-full p-0.5 transition-colors ' + (checked ? 'bg-indigo-600' : 'bg-gray-700')}>
        <span className={'block w-5 h-5 rounded-full bg-white transition-transform ' + (checked ? 'translate-x-5' : '')} />
      </span>
    </button>
  )
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-950 border border-gray-800 p-1">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)} className={'min-h-10 rounded-lg text-sm font-semibold transition ' + (value === o ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function normalizeUser(user) {
  const out = { ...user }
  for (const key of ['split_days_json', 'supplements_json', 'ethnic_background_json']) {
    if (typeof out[key] === 'string') {
      try { out[key] = JSON.stringify(JSON.parse(out[key])) } catch { /* keep source text */ }
    }
  }
  out.is_private = !!Number(out.is_private)
  out.research_opt_in = !!Number(out.research_opt_in)
  return out
}

function cleanValue(value, type) {
  if (type === 'number') return value === '' || value === null || value === undefined ? null : Number(value)
  if (value === '') return null
  return value
}

function human(value) {
  return String(value).replaceAll('_', ' ')
}

function withOwnStreak(data, workouts) {
  const dates = new Set((workouts || []).map(w => w.date).filter(Boolean))
  let current_streak = 0
  const d = new Date()
  while (dates.has(d.toISOString().slice(0, 10))) {
    current_streak += 1
    d.setDate(d.getDate() - 1)
    if (current_streak > 365) break
  }
  return {
    ...data,
    stats: { ...(data.stats || {}), current_streak },
  }
}
