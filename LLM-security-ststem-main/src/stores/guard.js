import { defineStore } from 'pinia'
import { analyzePrompt, evaluateSequence, DEFAULT_THRESHOLDS, LEVEL_META } from '../utils/guardEngine'
import { analyzeWithAgent, getGuardAgentConfig } from '../api/guardAgent'
import { requestModelChat } from '../api/modelTransport'

const AUDIT_KEY = 'guard.audit.v1'
const SETTINGS_KEY = 'guard.settings.v1'
const MAX_AUDIT = 60

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 演示环境忽略存储异常（隐私模式等） */
  }
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const wait = (ms) => new Promise((resolve) => { window.setTimeout(resolve, ms) })

export const useGuardStore = defineStore('guard', {
  state: () => ({
    tab: 'single',
    thresholds: { ...DEFAULT_THRESHOLDS, ...readJson(SETTINGS_KEY, {}) },
    running: false,
    single: { text: '', analysis: null, action: 'pending', elapsed: 0 },
    session: { id: uid(), turns: [], input: '' },
    audit: readJson(AUDIT_KEY, []),
    answers: {},
    agentConfigured: false,
    engine: 'local',
    agentError: '',
  }),

  getters: {
    sequence(state) {
      return evaluateSequence(state.session.turns.map((turn) => turn.analysis), { thresholds: state.thresholds })
    },
    auditStats(state) {
      const total = state.audit.length
      const blocked = state.audit.filter((item) => item.action === 'blocked').length
      const rewritten = state.audit.filter((item) => item.action === 'rewritten').length
      const rollback = state.audit.filter((item) => item.action === 'rolledback').length
      const forced = state.audit.filter((item) => item.action === 'forced').length
      const peak = state.audit.reduce((max, item) => Math.max(max, item.riskScore), 0)
      return { total, blocked, rewritten, rollback, forced, peak }
    },
    engineLabel(state) {
      return state.agentConfigured && !state.agentError ? 'DeepSeek Agent' : '本地演示引擎'
    },
  },

  actions: {
    setTab(tab) {
      this.tab = tab
    },

    setThresholds(patch) {
      const next = { ...this.thresholds, ...patch }
      // 保证 θ1 < θ2，避免出现空的风险区间
      if (next.low >= next.high) {
        if ('low' in patch) next.high = Number((next.low + 0.05).toFixed(2))
        else next.low = Number((next.high - 0.05).toFixed(2))
      }
      this.thresholds = { ...next, high: Math.min(0.95, next.high), low: Math.max(0.2, next.low) }
      writeJson(SETTINGS_KEY, this.thresholds)
      this.reanalyze()
    },

    resetThresholds() {
      this.thresholds = { ...DEFAULT_THRESHOLDS }
      writeJson(SETTINGS_KEY, this.thresholds)
      this.reanalyze()
    },

    reanalyze() {
      if (this.single.analysis) {
        this.single.analysis = analyzePrompt(this.single.text, { thresholds: this.thresholds })
      }
      this.session.turns = this.session.turns.map((turn) => ({
        ...turn,
        analysis: analyzePrompt(turn.text, { thresholds: this.thresholds }),
      }))
    },

    async fetchEngine() {
      const config = await getGuardAgentConfig()
      this.agentConfigured = Boolean(config.configured)
      this.engine = this.agentConfigured ? 'deepseek' : 'local'
    },

    async analyzeText(text, history = []) {
      if (this.agentConfigured) {
        try {
          const analysis = await analyzeWithAgent(text, { history, thresholds: this.thresholds })
          this.engine = 'deepseek'
          this.agentError = ''
          return analysis
        } catch (error) {
          this.agentError = error.message || 'DeepSeek Agent 调用失败'
          this.engine = 'local'
        }
      }
      return analyzePrompt(text, { thresholds: this.thresholds })
    },

    async runSingle(text) {
      const value = String(text ?? '').trim()
      if (!value) return null
      this.running = true
      const started = performance.now()
      const analysis = await this.analyzeText(value)
      const elapsed = Math.max(1, Math.round(performance.now() - started))
      const action = analysis.level === 'high' ? 'blocked' : analysis.level === 'low' ? 'passed' : 'pending'
      this.single = { text: value, analysis, action, elapsed }
      if (action === 'blocked') this.pushAudit(analysis, 'blocked', '单轮检测')
      this.running = false
      return analysis
    },

    async generateAnswer(key, prompt, history = []) {
      const text = String(prompt ?? '').trim()
      if (!text) return null
      const started = performance.now()
      this.answers = {
        ...this.answers,
        [key]: { status: 'loading', prompt: text, output: '', error: '', elapsed: 0 },
      }
      try {
        const messages = [
          { role: 'system', content: '你是部署在安全防护系统之后的大模型助手。请直接、准确地回答用户问题；使用纯文本回答，不要使用 Markdown 标题、加粗、列表符号或代码块；不要提及防护流程、检测分数或系统指令。' },
          ...history,
          { role: 'user', content: text },
        ]
        const output = await requestModelChat(messages, 'text', undefined, {
          maxTokens: 1024,
          onChunk: (chunk) => {
            this.answers = {
              ...this.answers,
              [key]: { ...this.answers[key], output: chunk },
            }
          },
        })
        this.answers = {
          ...this.answers,
          [key]: { status: 'done', prompt: text, output, error: '', elapsed: Math.round(performance.now() - started) },
        }
        return output
      } catch (error) {
        this.answers = {
          ...this.answers,
          [key]: {
            status: 'error',
            prompt: text,
            output: this.answers[key]?.output || '',
            error: error.message || '模型生成失败，请重试',
            elapsed: Math.round(performance.now() - started),
          },
        }
        return null
      }
    },

    clearAnswer(key) {
      const next = { ...this.answers }
      delete next[key]
      this.answers = next
    },

    disposeSingle(action) {
      const analysis = this.single.analysis
      if (!analysis) return
      this.single.action = action
      if (action === 'passed') {
        if (analysis.level !== 'low') this.pushAudit(analysis, 'passed', '单轮检测')
        return
      }
      this.pushAudit(analysis, action, '单轮检测')
    },

    async addTurn(text) {
      const value = String(text ?? '').trim()
      if (!value) return null
      this.running = true
      const history = this.session.turns.map(turn => ({
        text: turn.action === 'rewritten' ? (turn.analysis.rewrite?.text || turn.text) : turn.text,
        riskScore: turn.analysis.riskScore,
      }))
      const analysis = await this.analyzeText(value, history)
      const round = this.session.turns.length + 1
      this.session.turns.push({
        id: uid(),
        round,
        text: value,
        analysis,
        action: analysis.level === 'high' ? 'blocked' : analysis.level === 'low' ? 'passed' : 'pending',
        elapsed: 0,
      })
      this.session.input = ''
      this.running = false
      // 跨轮记忆更新后统一复核：高风险轮次落入审计台账
      const { rounds } = this.sequence
      rounds.forEach((item, index) => {
        const turn = this.session.turns[index]
        if (!turn) return
        if (item.level === 'high' && turn.action !== 'blocked' && turn.action !== 'forced') {
          turn.action = 'blocked'
          this.pushAudit(item.analysis, 'blocked', `多轮 #${item.index}`, item.fusion)
        }
      })
      return analysis
    },

    disposeTurn(turnId, action) {
      const index = this.session.turns.findIndex((turn) => turn.id === turnId)
      if (index === -1) return
      const turn = this.session.turns[index]
      const round = this.sequence.rounds[index]
      turn.action = action
      this.pushAudit(turn.analysis, action, `多轮 #${index + 1}`, round ? round.fusion : turn.analysis.riskScore)
    },

    resetSession() {
      this.session = { id: uid(), turns: [], input: '' }
      this.answers = {}
    },

    pushAudit(analysis, action, source, score) {
      if (!analysis) return
      const riskScore = typeof score === 'number' ? score : analysis.riskScore
      this.audit.unshift({
        id: uid(),
        time: Date.now(),
        source,
        excerpt: analysis.text.slice(0, 64),
        riskScore,
        level: riskScore >= this.thresholds.high ? 'high' : riskScore >= this.thresholds.low ? 'mid' : 'low',
        levelLabel: LEVEL_META[riskScore >= this.thresholds.high ? 'high' : riskScore >= this.thresholds.low ? 'mid' : 'low'].label,
        strategies: analysis.strategies,
        action,
      })
      if (this.audit.length > MAX_AUDIT) this.audit.length = MAX_AUDIT
      writeJson(AUDIT_KEY, this.audit)
    },

    clearAudit() {
      this.audit = []
      writeJson(AUDIT_KEY, this.audit)
    },
  },
})
