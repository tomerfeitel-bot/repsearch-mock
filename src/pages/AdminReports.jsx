import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { ConfirmSheet } from '../components/ui/ConfirmSheet.jsx'
import UnderlineTabs from '../components/ui/UnderlineTabs.jsx'
import { api } from '../lib/api.js'
import { timeAgo } from '../lib/timeAgo.js'

// Moderation review queue (web only — the fastest safe admin tool). Access is
// enforced server-side by ADMIN_EMAILS; the client gate only shapes the UI.
const STATUS_TABS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]

const REASON_LABELS = {
  spam: 'Spam',
  harassment: 'Harassment or bullying',
  inappropriate: 'Inappropriate content',
  misinformation: 'Dangerous misinformation',
  other: 'Other',
}

const TARGET_COLORS = { post: '#0B7A43', comment: '#2D6DA5', user: '#AB4477' }

export default function AdminReports() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  // confirm: { report, action: 'remove' | 'ban', title, message }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/moderation/admin/reports?status=${status}`)
      setReports(data.reports || [])
    } catch (err) {
      toast(err.message || 'Failed to load reports', 'error')
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [status, toast])

  useEffect(() => { if (user?.is_admin) load() }, [user?.is_admin, load])

  async function resolve(report, body, successMsg) {
    setBusy(true)
    try {
      await api.post(`/moderation/admin/reports/${report.id}/resolve`, body)
      toast(successMsg, 'success')
      await load()
    } catch (err) {
      toast(err.message || 'Action failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function unban(report) {
    setBusy(true)
    try {
      await api.post(`/moderation/admin/users/${report.target_user_id}/unban`)
      toast(`Unbanned ${report.target_username || 'user'}`, 'success')
      await load()
    } catch (err) {
      toast(err.message || 'Unban failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  function runConfirmed() {
    const c = confirm
    setConfirm(null)
    if (!c) return
    if (c.action === 'remove') {
      resolve(c.report, { status: 'resolved', remove_content: true }, 'Content removed')
    } else if (c.action === 'ban') {
      resolve(c.report, { status: 'resolved', ban_user: true }, `Banned ${c.report.target_username || 'user'}`)
    }
  }

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen p-4 pt-12 text-center" style={{ background: 'var(--bg)' }}>
        <h1 className="text-xl font-extrabold text-[var(--text)]">Moderation</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          This page is for moderators. Your account isn't listed in ADMIN_EMAILS on the server.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="px-4 safe-pt-4 pb-1 flex items-baseline justify-between">
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Moderation</h1>
          <span className="text-caption font-mono text-[var(--text-muted)]">{reports.length} {status}</span>
        </div>
        <UnderlineTabs
          tabs={STATUS_TABS}
          value={status}
          onChange={setStatus}
          accent="var(--emerald-ink)"
          activeColor="var(--emerald-ink)"
          inactiveColor="var(--text-muted)"
          borderColor="var(--border)"
          ariaLabel="Report status filter"
        />
      </header>

      {loading && <p className="px-4 pt-6 text-sm text-[var(--text-muted)]">Loading...</p>}
      {!loading && reports.length === 0 && (
        <p className="px-4 pt-10 text-center text-sm text-[var(--text-muted)]">
          {status === 'open' ? 'No open reports. All clear.' : `No ${status} reports.`}
        </p>
      )}

      <ul>
        {reports.map(r => (
          <li key={r.id} className="px-4 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-white" style={{ background: TARGET_COLORS[r.target_type] || '#555' }}>
                {r.target_type}
              </span>
              <span className="text-sm font-bold text-[var(--text)]">{REASON_LABELS[r.reason] || r.reason}</span>
              <span className="ml-auto text-caption font-mono text-[var(--text-muted)]">{timeAgo(r.created_at)}</span>
            </div>

            <p className="mt-2 text-caption text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text)]">{r.reporter_username || 'deleted account'}</span> reported{' '}
              <span className="font-semibold text-[var(--text)]">{r.target_username || 'deleted account'}</span>
              {r.target_banned ? <span className="ml-1.5 text-micro font-bold px-1.5 py-0.5 rounded-full bg-red-900/60 text-red-200">BANNED</span> : null}
            </p>

            {/* Live content if it still exists; the report-time excerpt otherwise. */}
            <blockquote className="mt-2 border-l-2 pl-2.5 text-sm text-[var(--text)] whitespace-pre-wrap" style={{ borderColor: 'var(--border-strong)' }}>
              {r.content && !r.content.exists
                ? <span className="italic text-[var(--text-muted)]">Content already removed. Reported as: “{r.excerpt || '—'}”</span>
                : (r.content?.title || r.content?.body || r.excerpt || '—')}
            </blockquote>
            {r.details && (
              <p className="mt-1.5 text-caption text-[var(--text-muted)]">Reporter's note: {r.details}</p>
            )}
            {r.resolution_note && (
              <p className="mt-1.5 text-caption text-[var(--text-muted)]">Resolution note: {r.resolution_note}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {r.target_type === 'post' && r.content?.exists && (
                <ActionButton onClick={() => navigate(`/post/${r.target_id}`)}>View post</ActionButton>
              )}
              {r.target_type === 'comment' && r.content?.exists && r.content.post_id && (
                <ActionButton onClick={() => navigate(`/post/${r.content.post_id}`)}>View thread</ActionButton>
              )}
              {r.target_username && (
                <ActionButton onClick={() => navigate(`/user/${r.target_username}`)}>View profile</ActionButton>
              )}
              {r.status === 'open' && (
                <>
                  <ActionButton disabled={busy} onClick={() => resolve(r, { status: 'dismissed' }, 'Report dismissed')}>Dismiss</ActionButton>
                  {r.target_type !== 'user' && r.content?.exists && (
                    <ActionButton
                      danger
                      disabled={busy}
                      onClick={() => setConfirm({
                        report: r,
                        action: 'remove',
                        title: `Remove this ${r.target_type}?`,
                        message: 'The content is removed for everyone and the report is marked resolved. This cannot be undone.',
                      })}
                    >
                      Remove content
                    </ActionButton>
                  )}
                  {r.target_user_id && !r.target_banned && (
                    <ActionButton
                      danger
                      disabled={busy}
                      onClick={() => setConfirm({
                        report: r,
                        action: 'ban',
                        title: `Ban ${r.target_username || 'this user'}?`,
                        message: 'They are locked out of the app immediately and their public content stops appearing in global feeds. You can unban later from a resolved report.',
                      })}
                    >
                      Ban user
                    </ActionButton>
                  )}
                </>
              )}
              {r.status !== 'open' && !!r.target_banned && !!r.target_user_id && (
                <ActionButton disabled={busy} onClick={() => unban(r)}>Unban user</ActionButton>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirmed}
        title={confirm?.title || ''}
        message={confirm?.message}
        confirmLabel={confirm?.action === 'ban' ? 'Ban' : 'Remove'}
        danger
      />
    </div>
  )
}

function ActionButton({ children, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-9 px-3 rounded-full border text-caption font-semibold transition disabled:opacity-50"
      style={danger
        ? { borderColor: 'var(--negative)', color: '#fca5a5', background: 'transparent' }
        : { borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface-alt)' }}
    >
      {children}
    </button>
  )
}
