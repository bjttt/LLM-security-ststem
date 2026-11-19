// The API key stays in the Vite Node process; the browser only posts text and thresholds.
export async function analyzeWithAgent(text, { history = [], thresholds, fetchImpl = fetch } = {}) {
  let response
  try {
    response = await fetchImpl('/guard-api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, history, thresholds }),
      signal: AbortSignal.timeout(75_000),
    })
  } catch (error) {
    throw new Error(['TimeoutError', 'AbortError'].includes(error.name)
      ? '检测 Agent 响应超时，请重试'
      : '检测 Agent 请求失败，请确认前端服务正在运行')
  }
  let data
  try { data = await response.json() } catch { throw new Error('检测 Agent 返回了无效响应') }
  if (!response.ok) throw new Error(data.message || `检测 Agent 失败（HTTP ${response.status}）`)
  if (!data.analysis) throw new Error('检测 Agent 没有返回分析结果')
  return data.analysis
}

export async function getGuardAgentConfig(fetchImpl = fetch) {
  try {
    const response = await fetchImpl('/guard-api/config', { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return { configured: false }
    return await response.json()
  } catch {
    return { configured: false }
  }
}
