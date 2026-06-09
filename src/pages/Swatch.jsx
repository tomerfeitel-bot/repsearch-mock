// Throwaway preview page for the "Dark Jewel" expressive palette (DESIGN.md).
// Renders the six hues (fill + ink + tint) as pills, chart bars, topic dots and a
// sample post "poster" over the new #08090a ground, so the palette can be signed
// off on screen BEFORE any real tokens change. Route: /concepts/swatch.

const BG = '#08090a'
const SURFACE = '#141615'
const BORDER = '#363c37'
const TEXT = '#f3f5f1'
const MUTED = '#aab3ab'

const HUES = [
  { key: 'Brass / aged gold', fill: '#d59a3a', ink: '#e8c074' },
  { key: 'Rust / clay',       fill: '#d3623a', ink: '#ea9670' },
  { key: 'Moss / green',      fill: '#74ab47', ink: '#abd283' },
  { key: 'Pine / teal',       fill: '#2ba395', ink: '#6fcab8' },
  { key: 'Steel / azure',     fill: '#3f93cc', ink: '#87bce8' },
  { key: 'Amethyst / plum',   fill: '#9a64b8', ink: '#c6a0e0' },
]

const tint = (hex, a = 0.15) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Light->dark sequential ramp from one hue (brass), for quantitative data.
const BRASS_RAMP = ['#f3d9a4', '#e8c074', '#d59a3a', '#a4742a', '#71501c']

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 className="text-micro font-bold uppercase tracking-wide" style={{ color: MUTED, marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function Swatch() {
  const barVals = [38, 64, 52, 88, 47, 71]
  const maxBar = Math.max(...barVals)

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT }} className="px-4 py-6">
      <h1 className="text-display font-extrabold" style={{ marginBottom: 4 }}>Dark Jewel</h1>
      <p className="text-xs" style={{ color: MUTED, marginBottom: 24 }}>
        Expressive palette preview over <code>#08090a</code> ground. fill = bars/dots/tints · ink = text on black.
      </p>

      {/* Ground + surface */}
      <Section title="Ground & surface">
        <div className="flex gap-2">
          {[['#08090a', '--bg'], ['#141615', '--surface'], ['#1e221f', '--surface-alt'], ['#363c37', '--border']].map(([hex, label]) => (
            <div key={label} className="flex-1">
              <div style={{ background: hex, border: `1px solid ${BORDER}`, height: 56, borderRadius: 10 }} />
              <div className="text-micro font-mono" style={{ color: MUTED, marginTop: 4 }}>{label}<br />{hex}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Per-hue: fill block, ink text, tint w/ ink, pill, dot */}
      <Section title="Hues — fill / ink / tint">
        <div className="space-y-2.5">
          {HUES.map(h => (
            <div key={h.key} className="flex items-center gap-3">
              <div style={{ background: h.fill, width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ width: 150, flexShrink: 0 }}>
                <div className="text-sm font-bold" style={{ color: h.ink }}>{h.key}</div>
                <div className="text-micro font-mono" style={{ color: MUTED }}>{h.fill} · {h.ink}</div>
              </div>
              {/* topic dot + label (the "notifier" marker) */}
              <div className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: 99, background: h.fill, display: 'inline-block' }} />
                <span className="text-xs font-bold" style={{ color: h.ink }}>Topic</span>
              </div>
              {/* pill on tint */}
              <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: tint(h.fill), color: h.ink }}>
                label
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Categorical chart bars */}
      <Section title="Categorical chart (six hues)">
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <div className="flex items-end gap-3" style={{ height: 140 }}>
            {HUES.map((h, i) => (
              <div key={h.key} className="flex-1 flex flex-col items-center justify-end gap-1.5" style={{ height: '100%' }}>
                <span className="text-micro font-mono" style={{ color: h.ink }}>{barVals[i]}</span>
                <div style={{ background: h.fill, width: '100%', height: `${(barVals[i] / maxBar) * 100}%`, borderRadius: '4px 4px 0 0' }} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Sequential ramp */}
      <Section title="Sequential ramp (one hue, for a quantity)">
        <div className="flex gap-1.5">
          {BRASS_RAMP.map(c => (
            <div key={c} className="flex-1">
              <div style={{ background: c, height: 40, borderRadius: 8 }} />
              <div className="text-micro font-mono text-center" style={{ color: MUTED, marginTop: 3 }}>{c}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Sample post "poster" — graph is the color hero */}
      <Section title="Sample post poster (data is the color hero)">
        <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '16px 0' }}>
          <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: HUES[3].fill, display: 'inline-block' }} />
            <span className="text-micro font-bold uppercase tracking-wide" style={{ color: HUES[3].ink }}>Recovery</span>
            <span className="text-micro font-mono" style={{ color: MUTED }}>· 3h</span>
          </div>
          <h3 className="text-title font-extrabold" style={{ marginBottom: 10 }}>How sleep affects squat progression</h3>
          <div style={{ background: SURFACE, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div className="flex items-end gap-2" style={{ height: 96 }}>
              {[40, 55, 70, 88].map((v, i) => (
                <div key={i} className="flex-1" style={{ background: i === 3 ? HUES[3].fill : tint(HUES[3].fill, 0.4), height: `${v}%`, borderRadius: '4px 4px 0 0' }} />
              ))}
            </div>
          </div>
          <p className="text-sm" style={{ color: MUTED, marginBottom: 12 }}>
            7–8h sleepers progressed <span style={{ color: HUES[3].ink, fontWeight: 700 }}>23% faster</span> across 1,240 lifters.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
            <span style={{ width: 22, height: 22, borderRadius: 99, background: BORDER, display: 'inline-block' }} />
            <span className="font-bold" style={{ color: TEXT }}>tomerf</span>
            <span className="ml-auto">♡ 48</span>
            <span>💬 12</span>
            <span>⤓</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
