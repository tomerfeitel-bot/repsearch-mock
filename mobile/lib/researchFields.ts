// Port of src/components/workout/researchFields.js (shared by the workout
// logger now and the template builder in Session 4).
export type ResearchField = {
  key: string;
  label: string;
  type: 'rir' | 'select' | 'rest' | 'boolean' | 'text';
  options?: string[];
  placeholder?: string;
  help: string;
};

export const RESEARCH_FIELDS: ResearchField[] = [
  { key: 'rir', label: 'RIR', type: 'rir', help: 'Reps in reserve: how many more reps you likely had before failure.' },
  { key: 'set_type', label: 'Type', type: 'select', options: ['working', 'warmup', 'backoff'], help: 'The role of this set in the session: working set, warmup, or backoff.' },
  { key: 'rom_category', label: 'ROM', type: 'select', options: ['full', 'partial', 'lengthened', 'shortened'], help: 'Range of motion used for the set: full, partial, lengthened, or shortened.' },
  { key: 'tempo_tag', label: 'Tempo', type: 'select', options: ['controlled', 'explosive', '3010', '2020', 'paused'], help: 'How the reps were performed, such as controlled, explosive, paused, or a tempo code.' },
  { key: 'rest_seconds', label: 'Rest', type: 'rest', help: 'How long you rested before this set.' },
  { key: 'failure', label: 'Failure', type: 'boolean', help: 'Whether the set reached muscular failure: no more clean reps possible.' },
  { key: 'pain_flag', label: 'Pain', type: 'boolean', help: 'Marks pain during the set, not normal effort or soreness.' },
  { key: 'set_notes', label: 'Notes', type: 'text', placeholder: 'Setup, cue, issue...', help: 'Private notes about this set.' },
];

export const TEMPLATE_RESEARCH_FIELDS: ResearchField[] = [
  { key: 'target_rep_range', label: 'Rep range', type: 'text', placeholder: '8-12', help: 'The intended rep range for this planned set. Lifters still log what they actually do.' },
  ...RESEARCH_FIELDS.filter((f) => f.key !== 'pain_flag'),
];

export const RESEARCH_FIELD_LABELS = Object.fromEntries(RESEARCH_FIELDS.map((f) => [f.key, f.label]));
export const TEMPLATE_RESEARCH_FIELD_LABELS = Object.fromEntries(TEMPLATE_RESEARCH_FIELDS.map((f) => [f.key, f.label]));

const VALUE_LABELS: Record<string, Record<string, string>> = {
  set_type: {
    working: 'Working',
    warmup: 'Warmup',
    backoff: 'Backoff',
  },
  rom_category: {
    full: 'Full',
    partial: 'Partial',
    lengthened: 'Lengthened',
    shortened: 'Shortened',
  },
  tempo_tag: {
    controlled: 'Controlled',
    explosive: 'Explosive',
    '3010': '3010',
    '2020': '2020',
    paused: 'Paused',
  },
};

export function hasResearchValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

export function formatRest(seconds: unknown) {
  const n = Number(seconds) || 0;
  const minutes = Math.floor(n / 60);
  const secs = n % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatResearchValue(key: string, value: unknown): string {
  if (key === 'failure' || key === 'pain_flag') return value ? 'Yes' : 'No';
  if (key === 'target_rep_range') return String(value);
  if (key === 'rir') return String(value);
  if (key === 'rest_seconds') return formatRest(value);
  return VALUE_LABELS[key]?.[String(value)] ?? String(value);
}
