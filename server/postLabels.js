// Curated post label set. Kept in sync with src/lib/postLabels.js (client copy).
// Posts may carry multiple labels, all drawn from this fixed list.
const POST_LABELS = [
  'Question',
  'Form check',
  'PR',
  'Program',
  'Template',
  'Study',
  'Nutrition',
  'Recovery',
  'Programming',
  'Beginner',
  'Gear',
]

const POST_LABEL_SET = new Set(POST_LABELS)

// Normalize an arbitrary input into a deduped list of valid curated labels.
function sanitizeLabels(input, max = 5) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const raw of input) {
    const label = String(raw)
    if (POST_LABEL_SET.has(label) && !out.includes(label)) out.push(label)
    if (out.length >= max) break
  }
  return out
}

module.exports = { POST_LABELS, POST_LABEL_SET, sanitizeLabels }
