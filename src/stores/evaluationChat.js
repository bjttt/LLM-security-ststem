import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { evaluateAnswer } from '../api/model.js'

const createSession = () => ({ turns: [], draft: '', busy: false })

export const useEvaluationChatStore = defineStore('evaluation-chat', () => {
  const sessions = reactive({ hallucination: createSession(), sycophancy: createSession() })
  const sessionFor = kind => {
    if (!sessions[kind]) throw new Error('检测类型无效')
    return sessions[kind]
  }

  async function send(kind, question, fetchImpl = fetch, { clearDraft = true } = {}) {
    const session = sessionFor(kind)
    const text = question.trim()
    if (session.busy || !text) return null
    if (text.length > 4000) throw new Error('每条消息最多4000字')
    const history = session.turns.filter(turn => turn.status === 'complete').map(turn => ({ question: turn.question, normal: turn.normal, suppressed: turn.report.suppressed }))
    const turn = reactive({ id: crypto.randomUUID(), question: text, normal: '', status: 'answers', report: null, error: '' })
    session.turns.push(turn)
    session.busy = true
    if (clearDraft) session.draft = ''
    try {
      turn.report = await evaluateAnswer(text, kind, fetchImpl, progress => {
        if (progress.normal) turn.normal = progress.normal
        turn.status = progress.stage
      }, history)
      turn.normal = turn.report.normal
      turn.status = 'complete'
    } catch (error) {
      turn.error = error.message || '本轮检测失败，请重试'
      turn.status = 'error'
    } finally {
      session.busy = false
    }
    return turn
  }

  function reset(kind) {
    const session = sessionFor(kind)
    if (session.busy) return false
    session.turns.splice(0)
    session.draft = ''
    return true
  }

  async function retry(kind, fetchImpl = fetch) {
    const session = sessionFor(kind)
    const last = session.turns.at(-1)
    if (session.busy || last?.status !== 'error') return null
    session.turns.pop()
    return send(kind, last.question, fetchImpl, { clearDraft: false })
  }

  return { sessions, send, reset, retry }
})
