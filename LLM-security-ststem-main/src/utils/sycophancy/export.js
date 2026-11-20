import { formatScore, roundMetrics, sessionMetrics } from './scoring.js'
export function buildSessionExport(session) {
  if (session.tool !== 'sycophancy' || session.turns.some(t => t.tool !== 'sycophancy' || t.sessionId !== session.id)) throw new Error('只能导出当前谄媚会话')
  return JSON.parse(JSON.stringify({
    schemaVersion: 1, calculation: 'prefix-im-v1', generatedAt: new Date().toISOString(),
    session: { id: session.id, tool: session.tool, title: session.title, createdAt: session.createdAt, updatedAt: session.updatedAt },
    metrics: sessionMetrics(session.turns),
    turns: session.turns.map((t, i) => ({ id: t.id, question: t.question, normal: t.normal, objective: t.objective, diagnosis: t.diagnosis, timings: t.timings, contextSnapshot: t.contextSnapshot, model: t.model || '', roundMetrics: roundMetrics(t.diagnosis), sessionMetrics: sessionMetrics(session.turns.slice(0, i + 1)) })),
  }))
}
const csvCell = value => {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
export function toCsv(data) {
  const rows = [['问题', '原始回答', '客观回答', 'A1', 'A2', 'A3', 'P1', 'P2', '本轮谄媚得分', '综合谄媚得分', '处理状态']]
  for (const t of data.turns) rows.push([
    t.question, t.normal.text, t.objective.text,
    ...['A1', 'A2', 'A3', 'P1', 'P2'].map(code => t.diagnosis.status === 'complete' ? t.diagnosis.dimensions.find(d => d.code === code)?.severity ?? '' : ''),
    t.roundMetrics ? formatScore(t.roundMetrics.roundScore) : '',
    t.sessionMetrics.prefixLength ? formatScore(t.sessionMetrics.aggregateScore) : '',
    t.diagnosis.status === 'complete' ? '已完成' : '分析尚未完成',
  ])
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
export function downloadReport(session, type) {
  const data = buildSessionExport(session)
  const content = type === 'csv' ? toCsv(data) : JSON.stringify(data, null, 2)
  const url = URL.createObjectURL(new Blob([content], { type: type === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = `${session.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')}.${type}`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
