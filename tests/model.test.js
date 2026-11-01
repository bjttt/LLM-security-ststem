import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h as createElement } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createModelMiddleware, modelGateway } from '../server/model-gateway.js'
import { detectMultimodal, evaluateAnswer, getModelConfig, imageToDataUrl, parseModelJson, riskCategories } from '../src/api/model.js'

// Exercise the browser workflow through the real gateway, replacing only the
// paid upstream. No actual model requests or persistent servers are started.
test('gateway installs in the actual Vite lifecycle without opening a listening server', async () => {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    plugins: [modelGateway({ MIMO_API_KEY: 'test-secret' })],
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  })
  try {
    assert.equal(server.httpServer, null)
    assert.ok(server.middlewares.stack.some(layer => typeof layer.handle === 'function'))
  } finally {
    await server.close()
  }
})

function harness(outputs = [], env = { MIMO_API_KEY: 'test-secret', MIMO_MODEL: 'mimo-v2.6-flash' }) {
  const calls = []
  const middleware = createModelMiddleware(env, async (url, options) => {
    calls.push({ url, ...options, payload: JSON.parse(options.body) })
    const output = outputs.shift()
    if (output instanceof Error) throw output
    if (output instanceof Response) return output
    assert.notEqual(output, undefined, 'unexpected extra model call')
    return Response.json({ choices: [{ message: { content: output } }] })
  })
  const dispatch = async (url, options = {}, headers = {}) => {
    const req = Readable.from(options.body ? [Buffer.from(options.body)] : [])
    req.url = url
    req.method = options.method || 'GET'
    req.headers = { host: 'localhost:5173', ...headers }
    let status, responseHeaders, headersSent = false
    const chunks = []
    let nextCalled = false
    await middleware(req, {
      get headersSent() { return headersSent },
      writeHead(code, values) { status = code; responseHeaders = values; headersSent = true },
      write(value) { chunks.push(Buffer.from(value)); return true },
      end(value) { if (value) chunks.push(Buffer.from(value)) },
    }, () => { nextCalled = true })
    return nextCalled ? null : new Response(Buffer.concat(chunks), { status, headers: responseHeaders })
  }
  return { calls, dispatch }
}

test('hallucination executes three calls; a score of 1 means 99% risk', async () => {
  const h = harness(['original', 'careful', '```json\n{"score":1,"reason":"uncertain facts"}\n```'])
  const result = await evaluateAnswer('question', 'hallucination', h.dispatch)
  const { timings, suspectSpans, ...report } = result
  assert.deepEqual(suspectSpans, [])
  assert.deepEqual(report, { normal: 'original', suppressed: 'careful', score: 99, reason: 'uncertain facts' })
  assert.ok(Number.isFinite(timings.first_token_ms))
  assert.ok(Number.isFinite(timings.total_ms))
  assert.equal(h.calls.length, 3)
  assert.equal(h.calls[0].payload.model, 'mimo-v2.6-flash')
  assert.equal(h.calls[0].payload.messages[0].role, 'system')
  assert.match(h.calls[0].payload.messages[0].content, /必须回答/)
  assert.match(h.calls[0].payload.messages[0].content, /允许出现一定程度的幻觉/)
  assert.match(h.calls[0].payload.messages[0].content, /使用肯定、直接的陈述句/)
  assert.match(h.calls[0].payload.messages[0].content, /禁止出现“我不能百分之百确定”/)
  assert.deepEqual(h.calls[0].payload.messages[1], { role: 'user', content: 'question' })
  assert.match(h.calls[1].payload.messages[0].content, /无法确认/)
  assert.match(h.calls[2].payload.messages[1].content, /original[\s\S]*careful/)
  assert.match(h.calls[2].payload.messages[0].content, /reason 字段必须使用纯文本/)
  for (const call of h.calls.slice(0, 2)) {
    assert.equal(call.payload.messages[0].role, 'system')
    assert.match(call.payload.messages[0].content, /仅使用纯文本/)
    assert.match(call.payload.messages[0].content, /不要使用 Markdown/)
  }
  assert.equal(h.calls[0].headers['api-key'], 'test-secret')
  assert.equal(h.calls[0].url, 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions')
  assert.deepEqual(h.calls[0].payload.thinking, { type: 'disabled' })
  assert.deepEqual(h.calls.map(call => call.payload.max_completion_tokens), [1024, 1024, 1024])
  assert.deepEqual(h.calls.map(call => call.payload.stream), [true, false, false])
})

test('original answer is delivered incrementally before generation finishes', async () => {
  let streamController, firstChunkShown
  const firstChunk = new Promise(resolve => { firstChunkShown = resolve })
  const progress = []
  let calls = 0
  const fakeFetch = async () => {
    calls++
    if (calls === 1) return new Response(new ReadableStream({ start(controller) { streamController = controller } }), { headers: { 'Content-Type': 'text/event-stream' } })
    return Response.json({ content: calls === 2 ? 'careful' : '{"score":90,"reason":"assessment"}' })
  }
  const evaluation = evaluateAnswer('question', 'hallucination', fakeFetch, update => {
    progress.push(update)
    if (update.stage === 'normal_stream') firstChunkShown()
  })
  const encoder = new TextEncoder()
  const first = encoder.encode('data: {"choices":[{"delta":{"content":"直接"}}]}\n\n')
  // Split the bytes in the middle of a Chinese character.
  const split = first.indexOf(0xe7) + 1
  streamController.enqueue(first.slice(0, split))
  streamController.enqueue(first.slice(split))
  await firstChunk
  assert.equal(progress.at(-1).normal, '直接')
  assert.equal(calls, 2, 'the score request has not started')
  streamController.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"回答"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'))
  streamController.close()
  const result = await evaluation
  assert.equal(result.normal, '直接回答')
  assert.equal(calls, 3)
  assert.ok(result.timings.first_token_ms <= result.timings.normal_ms)
})

test('gateway forwards the upstream SSE stream without converting it into a buffered JSON answer', async () => {
  const stream = new Response('data: {"choices":[{"delta":{"content":"answer"}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
  const h = harness([stream, 'careful', '{"score":90,"reason":"assessment"}'])
  const result = await evaluateAnswer('question', 'hallucination', h.dispatch)
  assert.equal(result.normal, 'answer')
  assert.equal(h.calls[0].payload.stream, true)
})

test('the DONE event completes the answer even if the upstream stream stays open', async () => {
  let calls = 0, cancelled = false
  const fakeFetch = async () => {
    if (++calls !== 1) return Response.json({ content: calls === 2 ? 'careful' : '{"score":90,"reason":"assessment"}' })
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"answer"}}]}\n\ndata: [DONE]\n\n')) },
      cancel() { cancelled = true },
    }), { headers: { 'Content-Type': 'text/event-stream' } })
  }
  assert.equal((await evaluateAnswer('question', 'hallucination', fakeFetch)).normal, 'answer')
  assert.equal(cancelled, true)
})

test('broken or truncated SSE never produces a successful report', async () => {
  for (const [stream, message] of [
    ['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', /中断/],
    ['data: {"choices":[{"finish_reason":"length"}]}\n\ndata: [DONE]\n\n', /长度限制/],
    ['data: {"error":{"message":"stream failed"}}\n\n', /stream failed/],
    ['data: invalid json\n\n', /格式无效/],
  ]) {
    const h = harness([new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }), 'careful'])
    await assert.rejects(evaluateAnswer('question', 'hallucination', h.dispatch), message)
    assert.equal(h.calls.length, 2)
  }
})

test('independent answers run concurrently and the original answer appears before scoring', async () => {
  const calls = []
  const pending = []
  const progress = []
  let normalShown
  const normalAvailable = new Promise(resolve => { normalShown = resolve })
  const fakeFetch = async (url, options) => {
    calls.push(JSON.parse(options.body))
    if (calls.length <= 2) return new Promise(resolve => pending.push(content => resolve(Response.json({ content }))))
    return Response.json({ content: '{"score":90,"reason":"assessment"}' })
  }
  const evaluation = evaluateAnswer('question', 'hallucination', fakeFetch, update => {
    progress.push(update)
    if (update.stage === 'normal') normalShown()
  })
  assert.equal(calls.length, 2, 'both generation requests start before either returns')
  pending[0]('original')
  await normalAvailable
  assert.equal(progress.at(-1).normal, 'original')
  assert.equal(calls.length, 2, 'scoring waits for the second answer')
  pending[1]('careful')
  const result = await evaluation
  assert.equal(result.score, 10)
  assert.equal(calls.length, 3)
  assert.match(calls[2].messages[1].content, /original[\s\S]*careful/)
  assert.equal(progress.at(-1).stage, 'scoring')
})

test('deep thinking can be explicitly re-enabled', async () => {
  const h = harness(['original', 'careful', '{"score":90,"reason":"assessment"}'], {
    MIMO_API_KEY: 'test-secret', MIMO_THINKING: 'enabled',
  })
  await evaluateAnswer('question', 'hallucination', h.dispatch)
  assert.ok(h.calls.every(call => call.payload.thinking.type === 'enabled'))
})

test('truncated upstream answers fail explicitly rather than producing a partial report', async () => {
  const truncated = () => Response.json({ choices: [{ finish_reason: 'length', message: { content: 'partial answer' } }] })
  const h = harness([truncated(), truncated()])
  await assert.rejects(evaluateAnswer('question', 'hallucination', h.dispatch), /长度限制/)
})

test('sycophancy preserves the user question and uses its own suppression prompt', async () => {
  const h = harness(['original', 'objective', '{"score":85,"reason":"independent"}'])
  const result = await evaluateAnswer('my opinion', 'sycophancy', h.dispatch)
  assert.equal(result.score, 15)
  assert.deepEqual(h.calls[0].payload.messages[1], { role: 'user', content: 'my opinion' })
  assert.match(h.calls[1].payload.messages[0].content, /不许谄媚/)
  assert.match(h.calls[2].payload.messages[1].content, /0 表示完全谄媚/)
  for (const call of h.calls.slice(0, 2)) {
    assert.equal(call.payload.messages[0].role, 'system')
    assert.match(call.payload.messages[0].content, /仅使用纯文本/)
    assert.match(call.payload.messages[0].content, /不要使用 Markdown/)
    assert.ok(!call.payload.messages[0].content.includes('允许出现一定程度的幻觉'))
  }
})

test('invalid ratings never turn into a reliable report', async () => {
  for (const rating of ['not json', '{"score":null,"reason":"a"}', '{"score":true,"reason":"a"}', '{"score":101,"reason":"a"}', '{"score":-1,"reason":"a"}', '{"score":80}', '{"score":80,"reason":""}']) {
    const h = harness(['original', 'careful', rating])
    await assert.rejects(evaluateAnswer('question', 'hallucination', h.dispatch), /JSON|评分/)
  }
  for (const [confidence, risk] of [[0, 100], [100, 0], [0.5, 100]]) {
    const h = harness(['original', 'careful', JSON.stringify({ score: confidence, reason: 'reason' })])
    assert.equal((await evaluateAnswer('q', 'hallucination', h.dispatch)).score, risk)
  }
})

test('JSON parsing supports fences and surrounding explanation', () => {
  assert.deepEqual(parseModelJson('分析结果：\n```json\n{"score":80}\n```'), { score: 80 })
  assert.throws(() => parseModelJson('{not json}'), /JSON/)
})

test('configuration exposes model names and configured status, never the secret', async () => {
  const h = harness()
  const config = await getModelConfig(h.dispatch)
  assert.equal(config.llm_configured, true)
  assert.equal(config.current_model, 'mimo-v2.6-flash')
  assert.equal(config.vision_model, 'mimo-v2.6-flash')
  assert.ok(!JSON.stringify(config).includes('test-secret'))
  assert.equal(h.calls.length, 0)
})

test('MiMo trims pasted settings and uses the same configured model for text and images', async () => {
  const h = harness([JSON.stringify({ labels: cleanLabels(), comment: 'analysis' })], {
    MIMO_API_KEY: ' test-secret ',
    MIMO_BASE_URL: ' https://token-plan-cn.xiaomimimo.com/v1/ ',
    MIMO_MODEL: ' mimo-custom ',
  })
  await detectMultimodal('text', undefined, h.dispatch)
  assert.equal(h.calls[0].url, 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions')
  assert.equal(h.calls[0].headers['api-key'], 'test-secret')
  assert.equal(h.calls[0].headers.Authorization, undefined)
  assert.equal(h.calls[0].payload.model, 'mimo-custom')
  const config = await getModelConfig(h.dispatch)
  assert.equal(config.current_model, 'mimo-custom')
  assert.equal(config.vision_model, 'mimo-custom')
})

test('old provider credentials cannot silently replace missing MiMo credentials', async () => {
  const h = harness([], { LLM_API_KEY: 'old-secret', LLM_BASE_URL: 'https://old.example/v1' })
  const config = await getModelConfig(h.dispatch)
  assert.equal(config.llm_configured, false)
  await assert.rejects(evaluateAnswer('question', 'hallucination', h.dispatch), /MIMO_API_KEY/)
  assert.equal(h.calls.length, 0)
})

test('missing credentials and upstream auth/rate/network errors are actionable', async () => {
  const missing = harness([], {})
  await assert.rejects(evaluateAnswer('question', 'hallucination', missing.dispatch), /MIMO_API_KEY/)
  assert.equal(missing.calls.length, 0)
  for (const [response, pattern] of [
    [new Response('provider details', { status: 401 }), /认证失败/],
    [new Response('provider details', { status: 429 }), /额度/],
    [new TypeError('network error'), /无法连接/],
    [Object.assign(new Error('timeout'), { name: 'TimeoutError' }), /超时/],
  ]) {
    const h = harness([response, response instanceof Response ? response.clone() : response])
    await assert.rejects(evaluateAnswer('question', 'hallucination', h.dispatch), pattern)
    assert.equal(h.calls.length, 2)
  }
})

test('gateway rejects cross-site access, unsupported routes and invalid bodies', async () => {
  const h = harness()
  assert.equal((await h.dispatch('/model-api/config', {}, { origin: 'https://unrelated.example' })).status, 403)
  assert.equal((await h.dispatch('/model-api/config', {}, { origin: 'http://localhost:5173' })).status, 200)
  assert.equal((await h.dispatch('/model-api/chat/completions')).status, 405)
  assert.equal((await h.dispatch('/model-api/other')).status, 404)
  assert.equal((await h.dispatch('/model-api/chat/completions', { method: 'POST', body: 'bad json' })).status, 400)
  assert.equal((await h.dispatch('/model-api/chat/completions', { method: 'POST', body: JSON.stringify({ model: 'arbitrary', messages: [] }) })).status, 400)
  assert.equal(await h.dispatch('/api/kb/'), null, 'legacy endpoints pass through unchanged')
  assert.equal(h.calls.length, 0)
})

const cleanLabels = () => Object.fromEntries(riskCategories.map(c => [c.key, 0]))

test('AIGC is evaluated in text-only, image-only and combined detection', async () => {
  const image = new Blob(['image'], { type: 'image/png' })
  for (const [text, file] of [['text', undefined], ['', image], ['text', image]]) {
    for (const value of [0, 1]) {
      const h = harness([JSON.stringify({ labels: { ...cleanLabels(), aigc: value }, comment: 'AIGC assessment with uncertainty' })])
      const result = await detectMultimodal(text, file, h.dispatch)
      assert.equal(result.labels.aigc, value)
      assert.match(h.calls[0].payload.messages[0].content, /aigc AIGC检测/)
      assert.match(h.calls[0].payload.messages[0].content, /不要把 AI 生成本身等同于违规/)
    }
  }
})

test('missing or invalid AIGC labels fail instead of appearing as a clean detection', async () => {
  for (const value of [undefined, null, 2, 'unknown']) {
    const h = harness([JSON.stringify({ labels: { ...cleanLabels(), aigc: value }, comment: 'analysis' })])
    await assert.rejects(detectMultimodal('text', undefined, h.dispatch), /标签不完整/)
  }
})

test('the rendered report includes AIGC as the seventeenth item without labeling it a violation', async () => {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    plugins: [vue()],
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  })
  try {
    const { default: Report } = await server.ssrLoadModule('/src/components/MultimodalResults.vue')
    for (const detected of [true, false]) {
      const app = createSSRApp({ render: () => createElement(Report, {
        categories: riskCategories,
        results: { ...cleanLabels(), aigc: detected },
      }) })
      const html = await renderToString(app)
      assert.match(html, /<strong>17<\/strong>检测维度/)
      assert.match(html, /AIGC检测/)
      assert.ok(html.includes(detected ? '疑似 AI 生成' : '未发现明显生成迹象'))
      assert.ok(!html.includes('违规'))
    }
  } finally {
    await server.close()
  }
})

test('multimodal sends image data and text to the vision model and normalizes labels', async () => {
  const labels = { ...cleanLabels(), advertising: '1', privacy_leak: true }
  const h = harness([JSON.stringify({ labels, comment: 'analysis' })])
  const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
  const result = await detectMultimodal('text', image, h.dispatch)
  assert.equal(result.labels.advertising, 1)
  assert.equal(result.labels.privacy_leak, 1)
  assert.equal(h.calls[0].payload.model, 'mimo-v2.6-flash')
  assert.deepEqual(h.calls[0].payload.messages[1].content, [
    { type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } }, { type: 'text', text: 'text' },
  ])
})

test('text-only and image-only requests work; incomplete labels fail', async () => {
  for (const [text, image] of [['text', undefined], ['', new Blob(['x'], { type: 'image/jpeg' })]]) {
    const h = harness([JSON.stringify({ labels: cleanLabels(), comment: 'analysis' })])
    assert.equal((await detectMultimodal(text, image, h.dispatch)).comment, 'analysis')
  }
  const h = harness(['{"labels":{},"comment":"analysis"}'])
  await assert.rejects(detectMultimodal('text', undefined, h.dispatch), /标签不完整/)
})

test('invalid inputs fail before any paid call', async () => {
  const h = harness()
  await assert.rejects(evaluateAnswer(' ', 'hallucination', h.dispatch), /初始问题/)
  await assert.rejects(evaluateAnswer('q', 'unknown', h.dispatch), /检测类型/)
  await assert.rejects(detectMultimodal('', undefined, h.dispatch), /输入文本/)
  await assert.rejects(imageToDataUrl(new Blob(['x'], { type: 'text/plain' })), /图片/)
  await assert.rejects(imageToDataUrl({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), /10MB/)
  assert.equal(h.calls.length, 0)
})
