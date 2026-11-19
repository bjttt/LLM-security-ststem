async function request(path, options, fetchImpl, consume) {
  let response
  try {
    response = await fetchImpl(`/model-api/${path}`, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(125_000)]) : AbortSignal.timeout(125_000) })
  } catch (error) {
    throw new Error(['TimeoutError', 'AbortError'].includes(error.name)
      ? '模型响应超时，请重试' : '请求失败，请检查网络及前端服务是否正在运行')
  }
  if (response.ok && consume) return consume(response)
  let data
  try { data = await response.json() } catch { throw new Error('模型转发服务不可用，请使用 npm run dev 或 npm run preview') }
  if (!response.ok) throw new Error(data.message || `模型请求失败（HTTP ${response.status}）`)
  return data
}

export function getModelConfig(fetchImpl = fetch) {
  return request('config', { method: 'GET' }, fetchImpl)
}

async function consumeAnswerStream(response, onChunk) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const data = await response.json()
    if (data.content) onChunk(data.content)
    return data
  }
  if (!response.body) throw new Error('模型响应流不可用，请重试')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', content = '', completed = false
  const line = value => {
    if (!value.startsWith('data:')) return
    const payload = value.slice(5).trim()
    if (!payload) return
    if (payload === '[DONE]') { completed = true; return }
    let event
    try { event = JSON.parse(payload) } catch { throw new Error('模型响应流格式无效，请重新检测') }
    if (event.error) throw new Error(event.error.message || '模型生成失败，请重试')
    if (event.choices?.[0]?.finish_reason === 'length') throw new Error('模型回答达到长度限制，请缩短问题后重试')
    const delta = event.choices?.[0]?.delta?.content
    if (typeof delta === 'string' && delta) { content += delta; onChunk(content) }
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const value of lines) line(value.trimEnd())
      if (completed) break
      if (done) { if (buffer) line(buffer.trimEnd()); break }
    }
  } catch (error) {
    if (['TimeoutError', 'AbortError'].includes(error.name)) throw new Error('模型响应超时，请重试')
    throw error
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  if (!completed) throw new Error('模型响应中断，尚未生成完整回答，请重试')
  return { content }
}

export async function requestModelChat(messages, model, fetchImpl, { maxTokens = 4096, onChunk, signal } = {}) {
  const data = await request('chat/completions', {
    signal, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, stream: Boolean(onChunk), max_completion_tokens: maxTokens }),
  }, fetchImpl, onChunk ? response => consumeAnswerStream(response, onChunk) : undefined)
  if (typeof data.content !== 'string' || !data.content.trim()) throw new Error('模型返回了空回答，请重试')
  return data.content
}
