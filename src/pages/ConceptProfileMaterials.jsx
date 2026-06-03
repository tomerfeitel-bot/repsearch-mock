import { Link } from 'react-router-dom'
import PaletteProfile from '../components/concepts/palette/PaletteProfile.jsx'

const HUB_BG = '#0d0d0d'
const HUB_BORDER = '#252525'
const HUB_TEXT = '#e8e8e8'
const HUB_MUTED = '#777777'

const PREVIEWS = [
  {
    id: 'iron-hazel',
    name: 'Iron Hazel',
    note: 'Rack metal, graphite, hazel heat.',
    P: {
      name: 'Iron Hazel',
      mode: 'light',
      style: 'signal',
      bg: '#f6f7f2',
      surface: '#ffffff',
      surfaceAlt: '#e8ece4',
      border: '#d2dbcd',
      borderStrong: '#aeb9a7',
      text: '#171b18',
      textMuted: '#596457',
      accent: '#465140',
      accentInk: '#ffffff',
      accentSoft: 'rgba(70,81,64,0.13)',
      positive: '#465140',
      negative: '#9c463f',
      chartA: '#465140',
      chartB: '#9a6840',
      chartFill: 'rgba(177,111,62,0.16)',
      heroFade: 'rgba(177,111,62,0.22)',
      radius: 18,
      density: 'compact',
      swatch: ['#f6f7f2', '#465140', '#b16f3e'],
      tags: ['light', 'iron', 'hazel'],
    },
  },
  {
    id: 'chalk-rust',
    name: 'Chalk + Rust',
    note: 'Chalk dust, old plates, garage warmth.',
    P: {
      name: 'Chalk + Rust',
      mode: 'light',
      style: 'signal',
      bg: '#f8f6f0',
      surface: '#ffffff',
      surfaceAlt: '#eee9df',
      border: '#ded5c7',
      borderStrong: '#bdaea0',
      text: '#1e1915',
      textMuted: '#675d52',
      accent: '#8f4d32',
      accentInk: '#ffffff',
      accentSoft: 'rgba(143,77,50,0.13)',
      positive: '#566b45',
      negative: '#9d3f3b',
      chartA: '#8f4d32',
      chartB: '#566b45',
      chartFill: 'rgba(201,130,69,0.17)',
      heroFade: 'rgba(201,130,69,0.24)',
      radius: 18,
      density: 'compact',
      swatch: ['#f8f6f0', '#8f4d32', '#c98245'],
      tags: ['light', 'chalk', 'rust'],
    },
  },
  {
    id: 'rubber-brass',
    name: 'Rubber + Brass',
    note: 'Rubber mat, black hardware, brass warmth.',
    P: {
      name: 'Rubber + Brass',
      mode: 'light',
      style: 'signal',
      bg: '#f7f8f4',
      surface: '#ffffff',
      surfaceAlt: '#e9ece6',
      border: '#d5dcd2',
      borderStrong: '#b0bab0',
      text: '#151817',
      textMuted: '#58615b',
      accent: '#242825',
      accentInk: '#ffffff',
      accentSoft: 'rgba(36,40,37,0.11)',
      positive: '#506343',
      negative: '#9b463d',
      chartA: '#242825',
      chartB: '#a77b3f',
      chartFill: 'rgba(167,123,63,0.16)',
      heroFade: 'rgba(167,123,63,0.23)',
      radius: 18,
      density: 'compact',
      swatch: ['#f7f8f4', '#242825', '#a77b3f'],
      tags: ['light', 'rubber', 'brass'],
    },
  },
]

export default function ConceptProfileMaterials() {
  return (
    <div className="min-h-screen pb-12" style={{ background: HUB_BG, color: HUB_TEXT }}>
      <header className="px-5 pt-10 pb-6">
        <Link to="/concepts" className="text-xs font-medium" style={{ color: HUB_MUTED }}>
          Back to concepts
        </Link>
        <h1 className="mt-4 text-2xl font-black tracking-tight">Profile Materials</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: HUB_MUTED }}>
          Three gym-material palettes on the same profile screen.
        </p>
      </header>

      <div className="space-y-8 px-4">
        {PREVIEWS.map(preview => (
          <section key={preview.id}>
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-base font-bold">{preview.name}</h2>
                <p className="mt-0.5 text-xs" style={{ color: HUB_MUTED }}>{preview.note}</p>
              </div>
              <div className="flex h-7 w-24 overflow-hidden rounded-lg" style={{ border: `1px solid ${HUB_BORDER}` }}>
                {preview.P.swatch.map(c => (
                  <span key={c} className="flex-1" style={{ background: c }} />
                ))}
              </div>
            </div>

            <div
              className="mx-auto w-full max-w-[412px] overflow-hidden rounded-[28px]"
              style={{
                border: `1px solid ${HUB_BORDER}`,
                background: preview.P.bg,
                boxShadow: '0 20px 60px rgba(0,0,0,0.32)',
              }}
            >
              <PaletteProfile P={preview.P} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
