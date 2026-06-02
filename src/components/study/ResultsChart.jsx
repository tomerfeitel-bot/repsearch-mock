import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts'
import {
  STUDY_CARD, STUDY_BORDER, STUDY_TEXT, STUDY_MUTED, STUDY_ACCENT, STUDY_ACCENT_DIM,
  STUDY_COMPARE_A, STUDY_COMPARE_B, MEASURE_OPTIONS, PERSONAL_BUCKET_FROM_USER, prettyBucket,
} from '../../lib/researchTheme.js'

const AXIS_TICK = { fontSize: 10, fill: STUDY_MUTED, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }
const TOOLTIP_STYLE = {
  background: STUDY_CARD,
  border: `1px solid ${STUDY_BORDER}`,
  borderRadius: 6,
  fontSize: 12,
  color: STUDY_TEXT,
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
}

function measureUnits(measure) {
  return MEASURE_OPTIONS.find(m => m.value === measure)?.units || ''
}

export function SingleResultChart({ buckets, measure, groupBy, totalCohortSize, user, showPersonal }) {
  const data = useMemo(() => buckets.map(b => ({
    bucket: prettyBucket(b.label),
    rawLabel: b.label,
    value: b.avg_measure,
    n: b.n,
  })), [buckets])

  const personalBucket = useMemo(() => {
    if (!showPersonal || !user) return null
    const fn = PERSONAL_BUCKET_FROM_USER[groupBy]
    if (!fn) return null
    const raw = fn(user)
    return raw == null ? null : String(raw)
  }, [showPersonal, user, groupBy])

  if (!data.length) {
    return <NotEnoughData />
  }

  return (
    <div className="space-y-3">
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, left: -12, bottom: 4 }}>
            <XAxis dataKey="bucket" tick={AXIS_TICK} axisLine={{ stroke: STUDY_BORDER }} tickLine={false} interval={0} />
            <YAxis tick={AXIS_TICK} axisLine={{ stroke: STUDY_BORDER }} tickLine={false} width={40} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'rgba(124, 169, 130, 0.08)' }}
              formatter={(v, _n, p) => [`${Number(v).toFixed(3)} ${measureUnits(measure)} · n=${p.payload.n}`, '']}
              labelStyle={{ color: STUDY_TEXT, marginBottom: 4 }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive>
              {data.map(d => (
                <Cell
                  key={d.rawLabel}
                  fill={personalBucket && d.rawLabel === personalBucket ? STUDY_ACCENT : STUDY_ACCENT_DIM}
                  stroke={personalBucket && d.rawLabel === personalBucket ? STUDY_TEXT : 'none'}
                  strokeWidth={personalBucket && d.rawLabel === personalBucket ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <CohortCaption totalCohortSize={totalCohortSize} buckets={data.length} measure={measure} personalBucket={personalBucket} />
    </div>
  )
}

export function CompareResultChart({ cohortA, cohortB, measure, groupBy, user, showPersonal }) {
  const { data, hasA, hasB } = useMemo(() => {
    const byBucket = new Map()
    for (const b of cohortA?.buckets || []) {
      byBucket.set(b.label, { bucket: prettyBucket(b.label), rawLabel: b.label, a: b.avg_measure, aN: b.n })
    }
    for (const b of cohortB?.buckets || []) {
      const cur = byBucket.get(b.label) || { bucket: prettyBucket(b.label), rawLabel: b.label }
      cur.b = b.avg_measure
      cur.bN = b.n
      byBucket.set(b.label, cur)
    }
    return {
      data: [...byBucket.values()].sort((x, y) => x.bucket.localeCompare(y.bucket)),
      hasA: !!cohortA?.buckets?.length,
      hasB: !!cohortB?.buckets?.length,
    }
  }, [cohortA, cohortB])

  const personalBucket = useMemo(() => {
    if (!showPersonal || !user) return null
    const fn = PERSONAL_BUCKET_FROM_USER[groupBy]
    if (!fn) return null
    const raw = fn(user)
    return raw == null ? null : String(raw)
  }, [showPersonal, user, groupBy])

  if (!data.length) return <NotEnoughData />

  return (
    <div className="space-y-3">
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, left: -12, bottom: 4 }}>
            <XAxis dataKey="bucket" tick={AXIS_TICK} axisLine={{ stroke: STUDY_BORDER }} tickLine={false} interval={0} />
            <YAxis tick={AXIS_TICK} axisLine={{ stroke: STUDY_BORDER }} tickLine={false} width={40} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(v, _n, p) => {
                if (v == null) return ['—', '']
                const isA = p.dataKey === 'a'
                const n = isA ? p.payload.aN : p.payload.bN
                return [`${Number(v).toFixed(3)} ${measureUnits(measure)} · n=${n}`, '']
              }}
              labelStyle={{ color: STUDY_TEXT, marginBottom: 4 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: STUDY_MUTED }} />
            {hasA && (
              <Bar dataKey="a" name={cohortA?.label || 'A'} fill={STUDY_COMPARE_A} radius={[3, 3, 0, 0]} />
            )}
            {hasB && (
              <Bar dataKey="b" name={cohortB?.label || 'B'} fill={STUDY_COMPARE_B} radius={[3, 3, 0, 0]} />
            )}
            {personalBucket && (
              <ReferenceLine x={prettyBucket(personalBucket)} stroke={STUDY_TEXT} strokeDasharray="2 3" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-[11px] font-mono" style={{ color: STUDY_MUTED }}>
        <span>{cohortA?.label || 'A'}: n={cohortA?.totalCohortSize ?? 0}</span>
        <span>{cohortB?.label || 'B'}: n={cohortB?.totalCohortSize ?? 0}</span>
      </div>
      {personalBucket && (
        <div className="text-[11px] font-mono" style={{ color: STUDY_ACCENT }}>
          ▍ your bucket: {prettyBucket(personalBucket)}
        </div>
      )}
    </div>
  )
}

function CohortCaption({ totalCohortSize, buckets, measure, personalBucket }) {
  return (
    <div className="flex justify-between items-center text-[11px] font-mono" style={{ color: STUDY_MUTED }}>
      <span>n={totalCohortSize} · {buckets} buckets · {measureUnits(measure)}</span>
      {personalBucket && (
        <span style={{ color: STUDY_ACCENT }}>● your bucket: {prettyBucket(personalBucket)}</span>
      )}
    </div>
  )
}

function NotEnoughData() {
  return (
    <div className="rounded-lg p-8 text-center text-sm font-mono" style={{ background: STUDY_CARD, border: `1px dashed ${STUDY_BORDER}`, color: STUDY_MUTED }}>
      Not enough data. No buckets met the minimum cohort size.
    </div>
  )
}
