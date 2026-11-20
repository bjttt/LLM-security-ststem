import { computed, reactive, ref, watch } from 'vue'
import { assertTool, conversationDb } from '../storage/conversationDb.js'

export function createToolSessions(tool, repository = conversationDb) {
  assertTool(tool)
  const records = reactive({})
  const activeSessionId = ref('')
  const storageError = ref('')
  const ready = ref(false)
  const tombstones = new Set(), timers = new Map()
  let hydration, queue = Promise.resolve()
  function enqueue(operation) {
    const next = queue.then(operation)
    queue = next.catch(error => { storageError.value = '会话记录保存失败，请稍后重试。' })
    return queue
  }
  function createSession() {
    const now = Date.now()
    const item = reactive({ tool, id: crypto.randomUUID(), title: '新对话', createdAt: now, updatedAt: now, draft: '', busy: false, turns: [] })
    records[item.id] = item
    activeSessionId.value = item.id
    if (ready.value) { persist(item.id); enqueue(() => repository.setActive(tool, item.id)) }
    return item
  }
  createSession()
  const active = computed(() => records[activeSessionId.value])
  const list = computed(() => Object.values(records).sort((a, b) => b.updatedAt - a.updatedAt))
  function persist(id, immediate = true) {
    clearTimeout(timers.get(id))
    if (!ready.value || !records[id] || tombstones.has(id)) return
    const save = () => {
      timers.delete(id)
      if (!records[id] || tombstones.has(id)) return
      const snapshot = JSON.parse(JSON.stringify(records[id]))
      enqueue(() => tombstones.has(id) ? undefined : repository.saveSnapshot(tool, snapshot))
    }
    if (immediate) save()
    else timers.set(id, setTimeout(save, 500))
  }
  function select(id) {
    if (!records[id] || records[id].tool !== tool) return false
    activeSessionId.value = id
    if (ready.value) enqueue(() => repository.setActive(tool, id))
    return true
  }
  function rename(id, title) {
    if (!records[id] || !title.trim()) return false
    records[id].title = title.trim().slice(0, 80)
    records[id].updatedAt = Date.now()
    persist(id)
    return true
  }
  function remove(id) {
    if (!records[id]) return
    tombstones.add(id)
    clearTimeout(timers.get(id)); timers.delete(id)
    delete records[id]
    enqueue(() => repository.deleteSession(tool, id))
    if (activeSessionId.value === id) {
      if (list.value.length) select(list.value[0].id)
      else createSession()
    }
  }
  function hydrate() {
    if (hydration) return hydration
    hydration = (async () => {
      try {
        const saved = await repository.listSessions(tool)
        const restored = []
        for (const item of saved) {
          if (item.tool !== tool || typeof item.id !== 'string') continue
          const turns = await repository.loadTurns(tool, item.id)
          for (const turn of turns) {
            if (turn.tool !== tool && turn.tool !== undefined) throw new Error('会话记录工具不匹配')
            if (!['complete', 'error'].includes(turn.status)) { turn.status = 'error'; turn.error = '上次处理已中断，请重试' }
            for (const name of ['normal', 'objective', 'diagnosis']) {
              if (turn[name]?.status === 'running') { turn[name].status = 'error'; turn[name].error = '上次处理已中断，请重试' }
            }
          }
          restored.push({ ...item, busy: false, turns })
        }
        const current = active.value
        const pristine = Object.keys(records).length === 1 && !current.turns.length && !current.draft && !current.busy
        if (restored.length && pristine) {
          // Read metadata before replacing reactive state; never yield while
          // activeSessionId points to an entry which has already been removed.
          const last = await repository.getActive(tool)
          for (const item of restored) records[item.id] = item
          activeSessionId.value = restored.some(s => s.id === last) ? last : restored.sort((a, b) => b.updatedAt - a.updatedAt)[0].id
          if (!restored.some(s => s.id === current.id)) delete records[current.id]
        }
      } catch (error) { storageError.value = '会话记录暂时无法加载，请稍后重试。' }
      finally {
        ready.value = true
        for (const id of Object.keys(records)) persist(id)
        enqueue(() => repository.setActive(tool, activeSessionId.value))
      }
    })()
    return hydration
  }
  watch(() => active.value?.draft, () => { if (active.value) persist(active.value.id, false) })
  return { tool, records, activeSessionId, active, list, ready, storageError, createSession, select, rename, remove, persist, hydrate, flush: () => queue }
}
