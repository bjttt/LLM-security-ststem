import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useConversationUi(viewport, composer, send) {
  const followBottom = ref(true)
  async function scrollToLatest() {
    await nextTick()
    if (viewport.value && followBottom.value) viewport.value.scrollTop = viewport.value.scrollHeight
  }
  function trackScroll() {
    const el = viewport.value
    if (el) followBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 90
  }
  function onKeydown(event) {
    if (event.isComposing || event.keyCode === 229) return
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) { event.preventDefault(); send() }
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); ElMessage.success('已复制') }
    catch { ElMessage.error('复制失败，请手动选择文本复制') }
  }
  const focus = () => nextTick(() => composer.value?.focus())
  return { followBottom, scrollToLatest, trackScroll, onKeydown, copy, focus }
}
