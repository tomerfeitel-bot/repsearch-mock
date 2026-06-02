import { FIELD_OPTIONS, FIELD_BY_VALUE, OPERATORS, STUDY_BORDER, STUDY_BORDER_STRONG, STUDY_TEXT, STUDY_MUTED, STUDY_CARD } from '../../lib/researchTheme.js'

const SELECT_CLS = 'min-w-0 flex-1 text-xs font-mono px-2 py-1.5 rounded bg-transparent focus:outline-none'

export default function FilterRow({ filter, onChange, onRemove }) {
  const fieldMeta = FIELD_BY_VALUE[filter.field]
  const opMeta = OPERATORS.find(o => o.value === filter.op)
  const needsValue = opMeta?.needsValue !== false

  function update(patch) {
    onChange({ ...filter, ...patch })
  }

  function setField(field) {
    const meta = FIELD_BY_VALUE[field]
    // If switching field types, clear value so we don't carry stale data.
    const next = { ...filter, field, value: meta?.enum ? meta.enum[0] : '' }
    // If current op was numeric-only but the new field has an enum, fall back to '='
    if (opMeta?.numeric && meta?.enum) next.op = '='
    onChange(next)
  }

  return (
    <div
      className="flex items-stretch gap-1 rounded-lg p-1"
      style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}
    >
      <select
        value={filter.field}
        onChange={e => setField(e.target.value)}
        className={SELECT_CLS}
        style={{ color: STUDY_TEXT, maxWidth: '40%' }}
      >
        {FIELD_OPTIONS.map(g => (
          <optgroup key={g.group} label={g.group}>
            {g.fields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </optgroup>
        ))}
      </select>

      <select
        value={filter.op}
        onChange={e => update({ op: e.target.value })}
        className={SELECT_CLS}
        style={{ color: STUDY_TEXT, maxWidth: 72 }}
      >
        {OPERATORS
          .filter(o => !o.numeric || !fieldMeta?.enum)
          .map(o => <option key={o.value} value={o.value}>{o.label}</option>)
        }
      </select>

      {needsValue ? (
        fieldMeta?.enum ? (
          <select
            value={filter.value ?? ''}
            onChange={e => update({ value: e.target.value })}
            className={SELECT_CLS}
            style={{ color: STUDY_TEXT }}
          >
            {fieldMeta.enum.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </select>
        ) : (
          <input
            type={fieldMeta?.type === 'number' ? 'number' : 'text'}
            value={filter.value ?? ''}
            onChange={e => update({ value: fieldMeta?.type === 'number' ? Number(e.target.value) : e.target.value })}
            className={SELECT_CLS + ' min-w-0'}
            style={{ color: STUDY_TEXT, borderLeft: `1px solid ${STUDY_BORDER_STRONG}` }}
            placeholder="value"
          />
        )
      ) : (
        <div className="flex-1 text-xs flex items-center px-2" style={{ color: STUDY_MUTED }}>—</div>
      )}

      <button
        onClick={onRemove}
        className="px-2 text-sm transition-colors"
        style={{ color: STUDY_MUTED }}
        aria-label="Remove filter"
        onMouseEnter={e => { e.currentTarget.style.color = STUDY_TEXT }}
        onMouseLeave={e => { e.currentTarget.style.color = STUDY_MUTED }}
      >
        ×
      </button>
    </div>
  )
}
