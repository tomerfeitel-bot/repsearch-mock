export function formatWeight(kg, units = 'kg') {
  if (units === 'lbs') return `${Math.round(kg * 2.20462 * 10) / 10} lbs`
  return `${kg} kg`
}

export function parseWeightToKg(value, units = 'kg') {
  const n = parseFloat(value)
  if (isNaN(n)) return 0
  return units === 'lbs' ? Math.round(n / 2.20462 * 100) / 100 : n
}
