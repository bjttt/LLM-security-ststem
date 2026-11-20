const TOOLS = new Set(['sycophancy', 'hallucination'])
export function assertTool(tool) { if (!TOOLS.has(tool)) throw new Error('检测工具无效') }
const plain = value => JSON.parse(JSON.stringify(value))
const requestResult = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })

export function createConversationDb(factory = globalThis.indexedDB) {
  let opened
  function open() {
    if (!factory) return Promise.reject(new Error('当前环境无法使用本地存储'))
    if (!opened) opened = new Promise((resolve, reject) => {
      const request = factory.open('detection-conversations', 1)
      request.onupgradeneeded = () => {
        const db = request.result
        const sessions = db.createObjectStore('sessions', { keyPath: ['tool', 'id'] })
        sessions.createIndex('byTool', 'tool')
        const turns = db.createObjectStore('turns', { keyPath: ['tool', 'sessionId', 'id'] })
        turns.createIndex('bySession', ['tool', 'sessionId'])
        db.createObjectStore('meta', { keyPath: ['tool', 'key'] })
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => { db.close(); opened = null }
        resolve(db)
      }
      request.onerror = () => { opened = null; reject(request.error) }
      request.onblocked = () => { opened = null; reject(new Error('本地存储被其他页面占用，请关闭旧页面后重试')) }
    })
    return opened
  }
  async function transaction(names, mode, work) {
    const db = await open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, mode)
      let result
      tx.oncomplete = () => resolve(result)
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('本地保存失败'))
      try { result = work(tx) } catch (error) { tx.abort(); reject(error) }
    })
  }
  return {
    async listSessions(tool) {
      assertTool(tool)
      const db = await open()
      return requestResult(db.transaction('sessions').objectStore('sessions').index('byTool').getAll(tool))
    },
    async loadTurns(tool, sessionId) {
      assertTool(tool)
      const db = await open()
      const turns = await requestResult(db.transaction('turns').objectStore('turns').index('bySession').getAll([tool, sessionId]))
      return turns.sort((a, b) => a.sequence - b.sequence)
    },
    async saveSnapshot(tool, session) {
      assertTool(tool)
      if (session.tool !== tool || session.turns.some(turn => (turn.tool && turn.tool !== tool) || (turn.sessionId && turn.sessionId !== session.id))) throw new Error('会话工具或归属不匹配')
      const snapshot = plain(session)
      const turns = snapshot.turns.map((turn, index) => ({ ...turn, tool, sessionId: session.id, sequence: index + 1 }))
      delete snapshot.turns
      snapshot.busy = false
      snapshot.turnIds = turns.map(turn => turn.id)
      await transaction(['sessions', 'turns'], 'readwrite', tx => {
        tx.objectStore('sessions').put(snapshot)
        const target = tx.objectStore('turns')
        const oldKeys = target.index('bySession').getAllKeys([tool, session.id])
        oldKeys.onsuccess = () => {
          const ids = new Set(turns.map(turn => turn.id))
          for (const key of oldKeys.result) if (!ids.has(key[2])) target.delete(key)
          for (const turn of turns) target.put(turn)
        }
      })
    },
    async deleteSession(tool, sessionId) {
      assertTool(tool)
      await transaction(['sessions', 'turns', 'meta'], 'readwrite', tx => {
        tx.objectStore('sessions').delete([tool, sessionId])
        const target = tx.objectStore('turns')
        const keys = target.index('bySession').getAllKeys([tool, sessionId])
        keys.onsuccess = () => { for (const key of keys.result) target.delete(key) }
        const meta = tx.objectStore('meta')
        const current = meta.get([tool, 'activeSessionId'])
        current.onsuccess = () => { if (current.result?.value === sessionId) meta.delete([tool, 'activeSessionId']) }
      })
    },
    async getActive(tool) {
      assertTool(tool)
      const db = await open()
      return (await requestResult(db.transaction('meta').objectStore('meta').get([tool, 'activeSessionId'])))?.value
    },
    async setActive(tool, value) {
      assertTool(tool)
      await transaction(['meta'], 'readwrite', tx => tx.objectStore('meta').put({ tool, key: 'activeSessionId', value }))
    },
  }
}

// Deterministic repository for automated checks; never used as a browser fixture.
export function createMemoryConversationDb() {
  const sessions = new Map(), active = new Map()
  const key = (tool, id) => { assertTool(tool); return `${tool}:${id}` }
  return {
    async listSessions(tool) { assertTool(tool); return [...sessions.values()].filter(s => s.tool === tool).map(({ turns, ...s }) => plain(s)) },
    async loadTurns(tool, id) { return plain(sessions.get(key(tool, id))?.turns || []) },
    async saveSnapshot(tool, session) { if (session.tool !== tool) throw new Error('会话工具不匹配'); sessions.set(key(tool, session.id), plain(session)) },
    async deleteSession(tool, id) { sessions.delete(key(tool, id)) },
    async getActive(tool) { assertTool(tool); return active.get(tool) },
    async setActive(tool, id) { assertTool(tool); active.set(tool, id) },
  }
}
export const conversationDb = createConversationDb()
