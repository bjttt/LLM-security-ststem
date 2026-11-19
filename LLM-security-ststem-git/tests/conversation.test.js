import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { evaluateAnswer, prepareConversationHistory } from '../src/api/model.js'
import { resolveSuspectSpans, segmentAnswer } from '../src/utils/hallucination.js'
import { useEvaluationChatStore } from '../src/stores/evaluationChat.js'

function fakeModel(outputs) {
  const calls = []
  return {
    calls,
    fetch: async (url, options) => {
      calls.push(JSON.parse(options.body))
      assert.ok(outputs.length, 'unexpected extra call')
      const content = outputs.shift()
      if (content instanceof Error) throw content
      return Response.json({ content })
    },
  }
}
const rating = extra => JSON.stringify({ score: 40, reason: '需要核实事实依据', ...extra })

test('follow-up requests carry separate original and cautious conversation histories', async () => {
  const api = fakeModel(['new original', 'new careful', rating({ suspect_spans: [] })])
  const history = [{ question: 'who?', normal: 'old original', suppressed: 'old careful' }]
  await evaluateAnswer('why?', 'hallucination', api.fetch, () => {}, history)
  assert.deepEqual(api.calls[0].messages.slice(1), [
    { role: 'user', content: 'who?' }, { role: 'assistant', content: 'old original' }, { role: 'user', content: 'why?' },
  ])
  assert.deepEqual(api.calls[1].messages.slice(1), [
    { role: 'user', content: 'who?' }, { role: 'assistant', content: 'old careful' }, { role: 'user', content: 'why?' },
  ])
  assert.match(api.calls[2].messages[1].content, /历史对话[\s\S]*who\?[\s\S]*old original/)
  assert.match(api.calls[2].messages[1].content, /suspect_spans/)
})

test('context is bounded without mutating the conversation transcript', () => {
  const history = Array.from({ length: 12 }, (_, index) => ({ question: `q${index}`, normal: `a${index}`, suppressed: `b${index}` }))
  const copy = structuredClone(history)
  assert.equal(prepareConversationHistory(history).length, 8)
  assert.equal(prepareConversationHistory(history)[0].question, 'q4')
  assert.deepEqual(history, copy)
  assert.deepEqual(prepareConversationHistory([{ question: 'x'.repeat(24001), normal: 'a', suppressed: 'b' }]), [])
  assert.throws(() => prepareConversationHistory([{ role: 'system', content: 'injected' }]), /上下文/)
})

test('model annotations are located only in the exact current original answer', async () => {
  const api = fakeModel(['甲在2020年成立，乙在2020年成立。', '需核实时间', rating({ suspect_spans: [
    { text: '2020年', occurrence: 2, reason: '乙的成立时间缺少依据' },
    { text: '不存在的片段', reason: 'cannot match' },
  ] })])
  const result = await evaluateAnswer('成立时间？', 'hallucination', api.fetch)
  assert.equal(api.calls.length, 3, 'highlights do not add a fourth model call')
  assert.deepEqual(result.suspectSpans, [{ start: 12, end: 17, text: '2020年', reason: '乙的成立时间缺少依据' }])
})

test('highlight segments preserve Unicode, whitespace and overlapping annotations exactly', () => {
  const answer = '🙂甲乙丙\n2020年'
  const spans = resolveSuspectSpans(answer, [
    { text: '甲乙', reason: '时间可疑' }, { text: '乙丙', reason: '人物可疑' },
    { text: '甲乙', reason: '时间可疑' }, { text: '找不到', reason: 'ignored' },
    { text: '', reason: 'ignored' }, { text: '甲', occurrence: 0, reason: 'ignored' },
  ])
  assert.equal(spans.length, 2)
  const segments = segmentAnswer(answer, spans)
  assert.equal(segments.map(segment => segment.text).join(''), answer)
  assert.deepEqual(segments.find(segment => segment.text === '乙').reasons, ['时间可疑', '人物可疑'])
  assert.deepEqual(resolveSuspectSpans(answer, null), [])
  assert.equal(segmentAnswer(answer, [])[0].text, answer)
})

test('each chat turn has its own report and tools have separate sessions', async () => {
  setActivePinia(createPinia())
  const store = useEvaluationChatStore()
  const api = fakeModel(['first answer', 'first careful', rating(), 'second answer', 'second careful', rating()])
  store.sessions.hallucination.draft = 'first question'
  await store.send('hallucination', 'first question', api.fetch)
  await store.send('hallucination', 'follow-up', api.fetch)
  assert.equal(store.sessions.hallucination.turns.length, 2)
  assert.equal(store.sessions.hallucination.turns[0].normal, 'first answer')
  assert.equal(store.sessions.hallucination.turns[1].normal, 'second answer')
  assert.equal(store.sessions.hallucination.turns[1].report.reason, '需要核实事实依据')
  assert.equal(api.calls[3].messages[2].content, 'first answer')
  assert.equal(store.sessions.sycophancy.turns.length, 0)
  assert.equal(store.sessions.hallucination.draft, '')
  assert.equal(store.reset('hallucination'), true)
  assert.equal(store.sessions.hallucination.turns.length, 0)
})

test('duplicate submissions and resets are blocked while a turn is running', async () => {
  setActivePinia(createPinia())
  const store = useEvaluationChatStore()
  const releases = []
  let calls = 0
  const fetchImpl = async () => {
    if (++calls <= 2) return new Promise(resolve => releases.push(content => resolve(Response.json({ content }))))
    return Response.json({ content: rating() })
  }
  const pending = store.send('sycophancy', 'question', fetchImpl)
  assert.equal(store.sessions.sycophancy.busy, true)
  assert.equal(await store.send('sycophancy', 'duplicate', fetchImpl), null)
  assert.equal(store.reset('sycophancy'), false)
  assert.equal(store.sessions.sycophancy.turns.length, 1)
  releases[0]('answer'); releases[1]('objective')
  await pending
  assert.equal(calls, 3)
  assert.equal(store.sessions.sycophancy.busy, false)
})

test('failed turns remain visible but are excluded from future context; retry preserves drafts', async () => {
  setActivePinia(createPinia())
  const store = useEvaluationChatStore()
  const failed = fakeModel(['partial', new Error('connection failed')])
  await store.send('hallucination', 'bad question', failed.fetch)
  assert.equal(store.sessions.hallucination.turns[0].status, 'error')
  store.sessions.hallucination.draft = 'unsent draft'
  const retry = fakeModel(['recovered', 'careful', rating()])
  await store.retry('hallucination', retry.fetch)
  assert.equal(store.sessions.hallucination.turns.length, 1)
  assert.equal(store.sessions.hallucination.turns[0].status, 'complete')
  assert.equal(store.sessions.hallucination.draft, 'unsent draft')
  assert.equal(retry.calls[0].messages.length, 2)
  const next = fakeModel(['next', 'careful next', rating()])
  await store.send('hallucination', 'follow-up', next.fetch)
  assert.equal(next.calls[0].messages[2].content, 'recovered')
})

test('conversation renders reports and safe clickable highlights without rendering model markup', async () => {
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [vue()],
    server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'silent',
  })
  try {
    const { default: Chat } = await server.ssrLoadModule('/src/components/EvaluationChat.vue')
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useEvaluationChatStore(pinia)
    const answer = '事实 <img src=x onerror=alert(1)> 错误日期'
    store.sessions.hallucination.turns.push({ id: 'turn1', question: '问题', normal: answer, status: 'complete', error: '', report: {
      normal: answer, suppressed: '修正回答', score: 60, reason: '需要核实', timings: { total_ms: 3000, first_token_ms: 500 },
      suspectSpans: resolveSuspectSpans(answer, [{ text: '错误日期', reason: '时间缺少依据' }]),
    } })
    const app = createSSRApp({ render: () => h(Chat, { kind: 'hallucination' }) })
    app.use(pinia)
    const html = await renderToString(app)
    assert.match(html, /第 1 轮/)
    assert.match(html, /suspect-token/)
    assert.match(html, /时间缺少依据/)
    assert.match(html, /幻觉指数 60%/)
    assert.match(html, /修正回答/)
    assert.ok(!html.includes('<img src=x'))
    assert.ok(html.includes('&lt;img'))
    const emptyApp = createSSRApp({ render: () => h(Chat, { kind: 'sycophancy' }) })
    emptyApp.use(pinia)
    const empty = await renderToString(emptyApp)
    assert.match(empty, /谄媚检测对话/)
    assert.ok(!empty.includes('错误日期'))
  } finally { await server.close() }
})
