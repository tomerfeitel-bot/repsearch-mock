// Pure chart-label helpers — no Skia imports, safe to load in Expo Go.

// "2026-06-11" → "Jun 11"; leaves non-ISO labels (week labels etc.) alone.
export function shortDateLabel(label: any): string {
  const s = String(label ?? '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(`${s.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return s;
}
