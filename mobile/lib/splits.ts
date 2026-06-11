// Port of src/lib/splits.js (unchanged logic).
export const SPLIT_PRESETS: Record<string, string[]> = {
  'Upper/Lower': ['Upper', 'Lower'],
  'Push/Pull/Legs': ['Push', 'Pull', 'Legs'],
  'Chest/Back/Legs': ['Chest', 'Back', 'Legs'],
  'Full Body': ['Full Body'],
  'Bro Split': ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
  Custom: [],
};

export const SPLIT_TYPES = Object.keys(SPLIT_PRESETS);
export const DEFAULT_SPLIT_DAYS = ['Push', 'Pull', 'Legs'];
export const OTHER_DAY = 'Other';

const ALIASES: [RegExp, string][] = [
  [/upper\s*\/?\s*lower|upperlower|ul\b/, 'Upper/Lower'],
  [/\bppl\b|push\s*\/?\s*pull\s*\/?\s*legs?/, 'Push/Pull/Legs'],
  [/chest\s*\/?\s*back\s*\/?\s*legs?/, 'Chest/Back/Legs'],
  [/bro|body\s*part|muscle\s*group/, 'Bro Split'],
  [/full\s*body|total\s*body/, 'Full Body'],
];

export function parseSplitDays(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : (() => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(String(value));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();
  // Only string entries are real split-day labels. Legacy weekday objects
  // ({ day, type }) are ignored so callers fall back to the split-type preset.
  return raw.filter((d): d is string => typeof d === 'string' && !!d.trim());
}

export function normalizeSplitType(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (SPLIT_PRESETS[raw]) return raw;
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const compact = normalized.replace(/\s+/g, '');
  const match = ALIASES.find(([pattern]) => pattern.test(normalized) || pattern.test(compact));
  return match?.[1] || null;
}

function uniqueDays(days: string[]) {
  return [...new Set(days.map((day) => String(day).trim()).filter(Boolean))];
}

type Profile = { split_days_json?: unknown; split_type?: unknown; [key: string]: unknown } | null | undefined;

export function splitDaysForProfile(profile: Profile) {
  const customDays = uniqueDays(parseSplitDays(profile?.split_days_json));
  const normalizedType = normalizeSplitType(profile?.split_type);
  const presetDays = normalizedType ? SPLIT_PRESETS[normalizedType] : [];
  const days = customDays.length > 0 ? customDays : presetDays;
  const usableDays = days.length > 0 ? days : DEFAULT_SPLIT_DAYS;
  return [...uniqueDays(usableDays), OTHER_DAY];
}

export function splitTypeForProfile(profile: Profile) {
  return normalizeSplitType(profile?.split_type) || (profile?.split_type as string) || 'Custom';
}

export function hasConfiguredSplit(profile: Profile) {
  return parseSplitDays(profile?.split_days_json).length > 0 || !!normalizeSplitType(profile?.split_type);
}
