import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { createToolSessions } from './toolSessions.js'
import { conversationDb } from '../storage/conversationDb.js'
import { startConversationTask, finishConversationTask, cancelConversationTask } from './conversationTasks.js'
import { snapshotForTurn, generateBranch, diagnoseTurn } from '../api/sycophancy.js'
import { sessionMetrics } from '../utils/sycophancy/scoring.js'

export function createSycophancyWorkspace(repository = conversationDb) {
  const manager = createToolSessions('sycophancy', repository)
  const modelName = ref('')
  const selectedBySession = reactive({})
  const current = manager.active
  const selectedTurn = computed(() => current.value.turns.find(t => t.id === selectedBySession[current.value.id]) || current.value.turns.at(-1))
  const metrics = computed(() => sessionMetrics(current.value.turns))
  const selectedId = computed({ get: () => selectedTurn.value?.id, set: id => { selectedBySession[current.value.id] = id } })
  const key = id => `sycophancy:${id}`
  const operations = new Map()
  async function run(session, turn, stages, fetchImpl) {
    if (session.busy) return null
    const controller = startConversationTask(key(session.id))
    operations.set(session.id, controller)
    const live = () => !controller.signal.aborted && manager.records[session.id] === session && operations.get(session.id) === controller
    session.busy = true
    turn.error = ''
    const started = performance.now()
    const save = (immediate = true) => { if (live()) manager.persist(session.id, immediate) }
    const branch = async name => {
      turn[name].status = 'running'; turn[name].error = ''; turn[name].text = ''
      const branchStarted = performance.now()
      try {
        const text = await generateBranch(turn.contextSnapshot, name, fetchImpl, {
          signal: controller.signal,
          ...(name === 'normal' ? { onChunk: text => {
            if (!live()) return
            turn.timings.first_token_ms ??= Math.round(performance.now() - started)
            turn.normal.text = text
            save(false)
          } } : {}),
        })
        if (live()) { turn[name].text = text; turn[name].status = 'complete' }
      } catch (error) { if (live()) { turn[name].status = 'error'; turn[name].error = error.message } }
      finally { if (live()) { turn.timings[`${name}_ms`] = Math.round(performance.now() - branchStarted); save() } }
    }
    try {
      const branches = stages.filter(s => s === 'normal' || s === 'objective')
      turn.status = branches.length ? 'answers' : 'scoring'
      save()
      await Promise.allSettled(branches.map(branch))
      if (!live()) return null
      if (stages.includes('diagnosis') && turn.normal.status === 'complete') {
        turn.status = 'scoring'
        turn.diagnosis.status = 'running'
        const diagnosisStarted = performance.now()
        save()
        try {
          const diagnosis = await diagnoseTurn(turn.contextSnapshot, turn.normal.text, fetchImpl, {
            signal: controller.signal,
            attemptCount: turn.diagnosis.attemptCount,
            onAttempt: count => { if (live()) { turn.diagnosis.attemptCount = count; save() } },
          })
          if (live()) turn.diagnosis = diagnosis
        } catch (error) { if (live()) { turn.diagnosis.status = 'error'; turn.diagnosis.error = '分析暂未完成，请重试' } }
        if (live()) turn.timings.diagnosis_ms = Math.round(performance.now() - diagnosisStarted)
      }
      if (live()) {
        turn.status = turn.diagnosis.status === 'complete' ? 'complete' : 'error'
        turn.error = turn.normal.status === 'complete' ? '' : turn.normal.error
      }
    } finally {
      if (live()) { session.busy = false; turn.timings.total_ms = Math.round(performance.now() - started); save() }
      finishConversationTask(key(session.id), controller)
      if (operations.get(session.id) === controller) operations.delete(session.id)
    }
    return turn
  }
  async function send(text, fetchImpl = fetch) {
    await manager.hydrate()
    const session = current.value
    if (!text.trim() || session.busy) return null
    if (text.trim().length > 4000) throw new Error('每条消息最多4000字')
    const id = crypto.randomUUID()
    const contextSnapshot = snapshotForTurn(session.turns, id, text.trim())
    const branch = () => ({ text: '', status: 'idle', error: '' })
    const turn = reactive({ id, tool: 'sycophancy', sessionId: session.id, model: modelName.value, sequence: session.turns.length + 1, question: text.trim(), normal: branch(), objective: branch(), diagnosis: { status: 'idle', attemptCount: 0 }, contextSnapshot, timings: {}, status: 'answers', error: '' })
    // Acquire before mutating so a global concurrency rejection leaves no ghost turn.
    const probe = startConversationTask(key(session.id)); finishConversationTask(key(session.id), probe)
    if (!session.turns.length && session.title === '新对话') session.title = text.trim().slice(0, 20)
    session.turns.push(turn)
    session.draft = ''
    session.updatedAt = Date.now()
    selectedId.value = id
    return run(session, turn, ['normal', 'objective', 'diagnosis'], fetchImpl)
  }
  async function retry(turnId, stage, fetchImpl = fetch) {
    const session = current.value, turn = session.turns.find(t => t.id === turnId)
    if (!turn || session.busy) return null
    if (stage === 'diagnosis') {
      if (turn.normal.status !== 'complete') return null
      return run(session, turn, ['diagnosis'], fetchImpl)
    }
    if (!['normal', 'objective'].includes(stage) || turn[stage].status === 'complete') return null
    if (session.turns.some(t => t.sequence > turn.sequence && t[stage].status === 'complete')) throw new Error('后续对话已生成，请新建会话重新提问')
    const stages = [stage]
    if (stage === 'normal' || turn.diagnosis.status !== 'complete') stages.push('diagnosis')
    return run(session, turn, stages, fetchImpl)
  }
  function remove(id) {
    cancelConversationTask(key(id)); operations.delete(id)
    manager.remove(id)
  }
  return {
    current, modelName, conversations: manager.list, activeSessionId: manager.activeSessionId, ready: manager.ready, storageError: manager.storageError,
    selectedTurn, selectedId, metrics, send, retry,
    hydrate: manager.hydrate, newConversation: manager.createSession, select: manager.select, rename: manager.rename, remove,
    flush: manager.flush,
  }
}
export const useSycophancyStore = defineStore('sycophancy-workspace', () => createSycophancyWorkspace())
