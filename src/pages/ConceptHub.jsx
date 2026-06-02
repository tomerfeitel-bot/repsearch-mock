import { Link } from 'react-router-dom'
import { STYLES, MODERN, modernGradient } from '../lib/conceptStyles.js'

const HUB_BG = '#0d0d0d'
const HUB_SURFACE = '#161616'
const HUB_BORDER = '#252525'
const HUB_TEXT = '#e8e8e8'
const HUB_MUTED = '#666666'
const HUB_DIM = '#333333'

const PAGES = [
  {
    path: '/concepts/workout',
    label: 'Workout Tracker',
    description: 'Active set logging, rest timer, exercise management.',
    concepts: [
      { n: 1, name: 'Field Notes', palette: ['#3d4a2a', '#4a5a32', '#c4841a'], tags: ['earthy', 'logbook', 'table'] },
      { n: 2, name: 'Command', palette: ['#0d1921', '#72d0c0', '#0a141a'], tags: ['teal', 'terminal', 'mono'] },
      { n: 3, name: 'Focus Mode', palette: ['#0d0d0d', '#1a1a1a', '#4a8fa0'], tags: ['minimal', 'one exercise'] },
    ],
  },
  {
    path: '/concepts/community',
    label: 'Community Feed',
    description: 'Post feed, voting, filtering, and compose.',
    concepts: [
      { n: 1, name: 'The Board', palette: ['#f0f4f6', '#ffffff', '#4a8fa0'], tags: ['light', 'reddit', 'cards'] },
      { n: 2, name: 'The Digest', palette: ['#17160f', '#211f16', '#c4841a'], tags: ['dark', 'editorial', 'featured'] },
      { n: 3, name: 'Stream', palette: ['#0a0a0a', '#141414', '#7aaa70'], tags: ['dark', 'social', 'avatar'] },
    ],
  },
]

export default function ConceptHub() {
  return (
    <div className="min-h-screen pb-16" style={{ background: HUB_BG, color: HUB_TEXT }}>
      <header className="px-5 pt-12 pb-8">
        <div className="text-xs font-mono mb-2" style={{ color: HUB_MUTED }}>concept exploration</div>
        <h1 className="text-3xl font-bold tracking-tight">UI Concepts</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: HUB_MUTED }}>
          Three visual directions per page. Interactions are fully wired. Pick a concept, mix parts, or start a direction.
        </p>
      </header>

      {/* Spotlight: the modern Reddit-shaped community concept */}
      <div className="px-5 mb-10">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Spotlight</h2>
          <p className="text-xs mt-0.5" style={{ color: HUB_MUTED }}>
            A ground-up Community layout — media cards, vote pill, FAB — with the teal/green palette as one faded, mixed accent.
          </p>
        </div>
        <Link
          to="/concepts/community-modern"
          className="block rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
          style={{ border: `1px solid ${HUB_BORDER}`, background: HUB_SURFACE }}
        >
          <div className="h-24 relative" style={{ background: modernGradient(120) }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-extrabold tracking-tight" style={{ color: MODERN.onAccent }}>Pulse</span>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold leading-tight">Community · Modern</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {MODERN.tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: HUB_DIM, color: HUB_MUTED }}>{t}</span>
                ))}
              </div>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: HUB_TEXT, border: `1px solid ${HUB_BORDER}` }}>Open →</span>
          </div>
        </Link>
      </div>

      {/* Cohesive styles: one aesthetic shown across two different page types */}
      <div className="px-5 mb-10">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Cohesive Styles</h2>
          <p className="text-xs mt-0.5" style={{ color: HUB_MUTED }}>
            Three aesthetics, each shown on both Progress and Community. Open one to flip between the two pages and judge whether the style holds across them.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map(s => (
            <Link
              key={s.id}
              to={`/concepts/cohesive?style=${s.id}`}
              className="block rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5"
              style={{ border: `1px solid ${HUB_BORDER}`, background: HUB_SURFACE }}
            >
              <div className="h-16 flex">
                {s.swatch.map((c, i) => (
                  <div key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="px-2.5 py-2.5">
                <div className="text-[11px] font-bold leading-tight">{s.id}. {s.name}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.tags.map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: HUB_DIM, color: HUB_MUTED }}>{t}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-8">
        {PAGES.map(page => (
          <div key={page.path}>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold">{page.label}</h2>
                <p className="text-xs mt-0.5" style={{ color: HUB_MUTED }}>{page.description}</p>
              </div>
              <Link
                to={page.path}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: HUB_TEXT, border: `1px solid ${HUB_BORDER}` }}
              >
                Open →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {page.concepts.map(concept => (
                <Link
                  key={concept.n}
                  to={page.path}
                  className="block rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{ border: `1px solid ${HUB_BORDER}`, background: HUB_SURFACE }}
                >
                  {/* Color preview */}
                  <div className="h-16 flex">
                    {concept.palette.map((c, i) => (
                      <div key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  {/* Label */}
                  <div className="px-2.5 py-2.5">
                    <div className="text-[11px] font-bold leading-tight">{concept.n}. {concept.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {concept.tags.map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: HUB_DIM, color: HUB_MUTED }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 mt-10 pt-6" style={{ borderTop: `1px solid ${HUB_BORDER}` }}>
        <p className="text-xs" style={{ color: HUB_DIM }}>
          These are isolated concept pages. The production app routes remain unchanged at /workout and /community.
        </p>
      </div>
    </div>
  )
}
