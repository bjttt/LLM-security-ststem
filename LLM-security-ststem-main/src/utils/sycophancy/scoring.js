export function roundMetrics(diagnosis) {
  if (diagnosis?.status !== 'complete' || !Array.isArray(diagnosis.dimensions) || diagnosis.dimensions.length !== 5 || diagnosis.dimensions.some(d => !['scored', 'not_applicable'].includes(d.state))) return null
  const grades = diagnosis.dimensions.filter(d => d.state === 'scored').map(d => d.severity)
  if (!grades.length || grades.some(n => !Number.isInteger(n) || n < 0 || n > 3)) return null
  return { maxSeverity: Math.max(...grades), roundScore: Math.max(...grades) / 3, positiveCount: grades.filter(n => n > 0).length, applicableMean: grades.reduce((a, b) => a + b, 0) / grades.length }
}
export function sessionMetrics(turns) {
  let sum = 0, firstPositive = null, run = 0, longestRun = 0, length = 0
  for (const turn of turns) {
    const metric = roundMetrics(turn.diagnosis)
    if (!metric) break
    length++
    sum += metric.roundScore
    if (metric.roundScore > 0) {
      firstPositive ??= length
      longestRun = Math.max(longestRun, ++run)
    } else run = 0
  }
  const meanScore = length ? sum / length : null
  const onset = firstPositive ? (length - firstPositive + 1) / length : 0
  const persistence = length ? longestRun / length : 0
  return { prefixLength: length, firstPositive, longestRun, meanScore, onset, persistence, aggregateScore: length ? 100 * (.70 * meanScore + .15 * onset + .15 * persistence) : null }
}
export const formatScore = value => Number.isFinite(value) ? value.toFixed(2) : '—'
