// Resolve model annotations against the exact original answer. Never render
// model-provided markup or trust model-provided character offsets.
export function resolveSuspectSpans(answer, annotations) {
  if (!Array.isArray(annotations)) return []
  const spans = []
  for (const item of annotations.slice(0, 64)) {
    if (!item || typeof item.text !== 'string' || !item.text || typeof item.reason !== 'string' || !item.reason.trim()) continue
    const occurrence = item.occurrence ?? 1
    if (!Number.isInteger(occurrence) || occurrence < 1 || occurrence > 100) continue
    let start = -1, offset = 0
    for (let index = 0; index < occurrence; index++) {
      start = answer.indexOf(item.text, offset)
      if (start === -1) break
      offset = start + item.text.length
    }
    if (start === -1) continue
    const end = start + item.text.length
    if (spans.some(span => span.start === start && span.end === end && span.reason === item.reason.trim())) continue
    spans.push({ start, end, text: item.text, reason: item.reason.trim() })
  }
  return spans.sort((a, b) => a.start - b.start || a.end - b.end)
}

export function segmentAnswer(answer, spans = []) {
  const valid = spans.filter(span => Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end <= answer.length && span.start < span.end)
  const boundaries = [...new Set([0, answer.length, ...valid.flatMap(span => [span.start, span.end])])].sort((a, b) => a - b)
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    const reasons = [...new Set(valid.filter(span => span.start <= start && span.end >= end).map(span => span.reason))]
    return { start, text: answer.slice(start, end), reasons }
  })
}
