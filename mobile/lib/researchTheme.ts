// Partial port of src/lib/researchTheme.js — Session 2 needs the group-by /
// measure whitelists + pretty-printers for the Study post composer. Session 5
// (Study screens + charts) extends this with FIELD_OPTIONS, topic styles, the
// People-like-me matchers, etc.
export const GROUP_BY_OPTIONS = [
  { value: 'frequency_bucket', label: 'Weekly frequency' },
  { value: 'session_position_bucket', label: 'Session position' },
  { value: 'session_set_order_bucket', label: 'Session set order' },
  { value: 'rir_use', label: 'RIR discipline' },
  { value: 'equipment_type', label: 'Equipment type' },
  { value: 'movement_pattern', label: 'Movement pattern' },
  { value: 'force_vector', label: 'Force vector' },
  { value: 'bilateral', label: 'Bilateral / unilateral' },
  { value: 'experience_level', label: 'Experience level' },
  { value: 'goal', label: 'Goal' },
  { value: 'gender', label: 'Gender' },
  { value: 'age_range', label: 'Age range' },
  { value: 'split_type', label: 'Split type' },
  { value: 'enhancement_status', label: 'Enhancement status' },
  { value: 'physical_labor_level', label: 'Physical labor at work' },
  { value: 'sport_primary', label: 'Primary sport' },
  { value: 'sport_frequency_bucket', label: 'Sport frequency' },
  { value: 'protein_bucket', label: 'Protein intake' },
  { value: 'sleep_quality_quartile', label: 'Sleep quality quartile' },
  { value: 'cardio_load_quartile', label: 'Cardio load quartile' },
  { value: 'rir_bucket', label: 'Proximity to failure (RIR)' },
  { value: 'rest_period_bucket', label: 'Rest period' },
  { value: 'rep_range_bucket', label: 'Rep range' },
  { value: 'sleep_duration_bucket', label: 'Sleep duration' },
  { value: 'stress_bucket', label: 'Stress (logged)' },
  { value: 'nutrition_phase', label: 'Nutrition phase' },
  { value: 'creatine_use', label: 'Creatine use' },
  { value: 'training_age_bucket', label: 'Training age' },
];

export const MEASURE_OPTIONS = [
  { value: 'progression_rate', label: 'Weight progression', units: '%/wk' },
  { value: 'estimated_1rm', label: 'Estimated 1RM', units: 'kg' },
  { value: 'top_set_pct_change', label: 'Percent top-set increase', units: '%' },
  { value: 'logged_1rm', label: 'Logged 1RM', units: 'kg' },
  { value: 'improvement_frequency', label: 'Improvement frequency', units: 'rate' },
  { value: 'recovery_volume_tolerance', label: 'Recovery / volume tolerance', units: 'kg·reps' },
  { value: 'avg_weekly_frequency', label: 'Weekly frequency', units: 'x/wk' },
  { value: 'set_estimated_1rm', label: 'Set estimated 1RM', units: 'kg' },
  { value: 'set_volume_load', label: 'Set volume', units: 'kg x reps' },
  { value: 'set_weight_kg', label: 'Set weight', units: 'kg' },
  { value: 'set_reps', label: 'Set reps', units: 'reps' },
  { value: 'set_rir', label: 'Set RIR', units: 'RIR' },
  { value: 'set_rest_seconds', label: 'Rest before set', units: 'sec' },
  { value: 'volume_load', label: 'Volume load', units: 'kg·reps' },
];

export function prettyMeasure(value?: string): string {
  return MEASURE_OPTIONS.find((m) => m.value === value)?.label || value || '';
}

export function prettyGroupBy(value?: string): string {
  return GROUP_BY_OPTIONS.find((g) => g.value === value)?.label || value || '';
}
