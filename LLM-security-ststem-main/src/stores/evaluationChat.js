import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { evaluateAnswer } from '../api/model.js'
import { createToolSessions } from './toolSessions.js'
import { startConversationTask, finishConversationTask, cancelConversationTask } from './conversationTasks.js'

export const useEvaluationChatStore = defineStore('evaluation-chat', () => {
  const managers = { hallucination: createToolSessions('hallucination'), sycophancy: createToolSessions('sycophancy') }
  const managerFor = kind => { if (!managers[kind]) throw new Error('检测类型无效'); return managers[kind] }
  const sessions = computed(() => Object.fromEntries(Object.entries(managers).map(([kind, manager]) => [kind, manager.active.value])))
  const operations = new Map()
  const key = (kind, id) => `${kind}:${id}`
  async function send(kind, question, fetchImpl = fetch, { clearDraft = true, historyOverride } = {}) {
    const manager = managerFor(kind), session = manager.active.value
    const text = question.trim()
    if (session.busy || !text) return null
    if (text.length > 4000) throw new Error('每条消息最多4000字')
    const history = historyOverride || session.turns.filter(t => t.status === 'complete' && t.report).map(t => ({ question: t.question, normal: t.normal, suppressed: t.report.suppressed }))
    const taskKey = key(kind, session.id)
    const controller = startConversationTask(taskKey)
    operations.set(taskKey, controller)
    const live = () => !controller.signal.aborted && manager.records[session.id] === session && operations.get(taskKey) === controller
    const turn = reactive({ id: crypto.randomUUID(), tool: kind, sessionId: session.id, sequence: session.turns.length + 1, question: text, normal: '', status: 'answers', report: null, error: '', history })
    if (!session.turns.length && session.title === '新对话') session.title = text.slice(0, 20)
    session.turns.push(turn)
    session.busy = true
    session.updatedAt = Date.now()
    if (clearDraft) session.draft = ''
    manager.persist(session.id)
    try {
      const report = await evaluateAnswer(text, kind, fetchImpl, progress => {
        if (!live()) return
        if (progress.normal) turn.normal = progress.normal
        turn.status = progress.stage
        manager.persist(session.id, false)
      }, history, { signal: controller.signal })
      if (live()) { turn.report = report; turn.normal = report.normal; turn.status = 'complete' }
    } catch (error) { if (live()) { turn.error = error.message || '本轮检测失败，请重试'; turn.status = 'error' } }
    finally {
      if (live()) { session.busy = false; manager.persist(session.id) }
      finishConversationTask(taskKey, controller)
      if (operations.get(taskKey) === controller) operations.delete(taskKey)
    }
    return turn
  }
  function reset(kind) {
    const manager = managerFor(kind), session = manager.active.value
    if (session.busy) return false
    session.turns.splice(0); session.draft = ''; manager.persist(session.id)
    return true
  }
  async function retry(kind, fetchImpl = fetch) {
    const session = managerFor(kind).active.value, last = session.turns.at(-1)
    if (session.busy || last?.status !== 'error') return null
    const probe = startConversationTask(key(kind, session.id))
    finishConversationTask(key(kind, session.id), probe)
    session.turns.pop()
    return send(kind, last.question, fetchImpl, { clearDraft: false, historyOverride: last.history || [] })
  }
  function remove(kind, id) {
    cancelConversationTask(key(kind, id)); operations.delete(key(kind, id)); managerFor(kind).remove(id)
  }
  return {
    sessions, send, reset, retry, managerFor,
    hydrate: kind => managerFor(kind).hydrate(),
    conversations: kind => managerFor(kind).list.value,
    currentId: kind => managerFor(kind).activeSessionId.value,
    isReady: kind => managerFor(kind).ready.value,
    storageError: kind => managerFor(kind).storageError.value,
    newConversation: kind => managerFor(kind).createSession(),
    select: (kind, id) => managerFor(kind).select(id),
    rename: (kind, id, title) => managerFor(kind).rename(id, title), remove,
  }
})
