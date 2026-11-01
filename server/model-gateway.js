// Runs inside Vite's Node process, never in the browser bundle.
import { once } from 'node:events'

const MAX_BODY_BYTES = 15 * 1024 * 1024

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('请求内容过大'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('请求不是有效的 JSON'), { status: 400 })
  }
}

export function createModelMiddleware(env, fetchImpl = fetch) {
  const apiKey = env.MIMO_API_KEY?.trim()
  const model = env.MIMO_MODEL?.trim() || 'mimo-v2.6-flash'
  const thinking = env.MIMO_THINKING?.trim() === 'enabled' ? 'enabled' : 'disabled'
  const baseUrl = (env.MIMO_BASE_URL?.trim() || 'https://token-plan-cn.xiaomimimo.com/v1').replace(/\/+$/, '')

  return async (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (!path?.startsWith('/model-api/')) return next()
    // A local gateway must not accept requests from arbitrary websites.
    if (req.headers.origin) {
      let origin
      try { origin = new URL(req.headers.origin) } catch { return send(res, 403, { message: '请求来源无效' }) }
      if (origin.host !== req.headers.host) return send(res, 403, { message: '不允许跨站调用本地模型服务' })
    }
    if (path === '/model-api/config' && req.method === 'GET') {
      return send(res, 200, {
        llm_configured: Boolean(apiKey),
        current_model: model,
        vision_model: model,
      })
    }
    if (path !== '/model-api/chat/completions') return send(res, 404, { message: '接口不存在' })
    if (req.method !== 'POST') return send(res, 405, { message: '请使用 POST 请求' })
    if (!apiKey) return send(res, 503, { message: '请在 demov2/.env.local 配置 MIMO_API_KEY，然后重启前端' })

    const disconnected = new AbortController()
    const onClose = () => disconnected.abort()
    res.once?.('close', onClose)
    try {
      const body = await readBody(req)
      if (!body || !['text', 'vision'].includes(body.model) || !Array.isArray(body.messages) || !body.messages.length) {
        return send(res, 400, { message: '模型请求参数无效' })
      }
      const maxTokens = body.max_completion_tokens ?? 4096
      if (!Number.isInteger(maxTokens) || maxTokens < 128 || maxTokens > 4096) return send(res, 400, { message: '输出长度参数无效' })
      const started = performance.now()
      const upstream = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify({ model, messages: body.messages, stream: body.stream === true, thinking: { type: thinking }, max_completion_tokens: maxTokens }),
        signal: AbortSignal.any([AbortSignal.timeout(120_000), disconnected.signal]),
      })
      if (!upstream.ok) {
        await upstream.body?.cancel()
        const message = [401, 403].includes(upstream.status) ? '模型认证失败，请检查 MIMO_API_KEY 和模型访问权限'
          : upstream.status === 429 ? '模型请求过于频繁或额度不足，请稍后重试并检查账户额度'
            : `模型服务请求失败（HTTP ${upstream.status}）`
        return send(res, 502, { message })
      }
      const headersMs = Math.round(performance.now() - started)
      if (body.stream === true && upstream.headers.get('content-type')?.includes('text/event-stream')) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no', 'Server-Timing': `upstream_headers;dur=${headersMs}`,
        })
        for await (const chunk of upstream.body) {
          if (!res.write(chunk)) await once(res, 'drain')
        }
        return res.end()
      }
      const data = await upstream.json()
      if (data.choices?.[0]?.finish_reason === 'length') return send(res, 502, { message: '模型回答达到长度限制，请缩短问题后重试' })
      const content = data.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) return send(res, 502, { message: '模型没有返回有效内容，请重试' })
      res.setHeader?.('Server-Timing', `upstream_headers;dur=${headersMs}, upstream_total;dur=${Math.round(performance.now() - started)}`)
      return send(res, 200, { content })
    } catch (error) {
      if (res.destroyed) return
      const message = error.status ? error.message
        : ['TimeoutError', 'AbortError'].includes(error.name) ? '模型响应超时，请稍后重试'
          : '无法连接模型服务，请检查网络和 MIMO_BASE_URL'
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`)
        return res.end()
      }
      return send(res, error.status || 502, { message })
    } finally {
      res.off?.('close', onClose)
    }
  }
}

export function modelGateway(env) {
  const install = server => {
    server.middlewares.use(createModelMiddleware(env))
  }
  return { name: 'local-model-gateway', configureServer: install, configurePreviewServer: install }
}
