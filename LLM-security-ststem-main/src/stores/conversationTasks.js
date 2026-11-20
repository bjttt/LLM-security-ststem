const tasks = new Map()
export function startConversationTask(key) {
  if (tasks.has(key)) throw new Error('当前会话正在处理中')
  if (tasks.size >= 2) throw new Error('已有两个会话正在处理，请稍后再发送')
  const controller = new AbortController()
  tasks.set(key, controller)
  return controller
}
export function finishConversationTask(key, controller) { if (tasks.get(key) === controller) tasks.delete(key) }
export function cancelConversationTask(key) { tasks.get(key)?.abort(); tasks.delete(key) }
