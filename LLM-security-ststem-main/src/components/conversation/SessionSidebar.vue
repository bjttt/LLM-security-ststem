<script setup>
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import PlatformIcon from '../ui/PlatformIcon.vue'
const props = defineProps({ sessions: { type: Array, required: true }, activeId: String, ready: Boolean, toolName: String, storageError: String })
const emit = defineEmits(['create', 'select', 'rename', 'remove'])
const query = ref(''), mobileOpen = ref(false)
const filtered = computed(() => props.sessions.filter(s => s.title.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())))
const time = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
async function rename(session) {
  try {
    const result = await ElMessageBox.prompt('输入会话名称', '重命名会话', { inputValue: session.title, inputValidator: value => Boolean(value?.trim()) || '名称不能为空', confirmButtonText: '保存', cancelButtonText: '取消' })
    emit('rename', session.id, result.value)
  } catch { /* cancelled */ }
}
async function remove(session) {
  try {
    await ElMessageBox.confirm('删除后无法恢复此会话，是否继续？', '删除会话', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    emit('remove', session.id)
  } catch { /* cancelled */ }
}
</script>
<template>
  <aside class="session-sidebar" :class="{ expanded: mobileOpen }" :aria-label="`${toolName}会话列表`">
    <button class="session-mobile-toggle" @click="mobileOpen = !mobileOpen"><PlatformIcon name="chat" />会话列表<PlatformIcon name="chevron" /></button>
    <div class="session-sidebar-body">
      <div class="session-sidebar-heading"><span>{{ toolName }}</span><small>对话记录</small></div>
      <button class="session-new" :disabled="!ready" @click="emit('create'); mobileOpen = false"><PlatformIcon name="plus" />新建对话</button>
      <label class="session-search"><PlatformIcon name="search" /><input v-model="query" type="search" placeholder="搜索会话" :aria-label="`搜索${toolName}会话`" /></label>
      <p v-if="!ready" class="session-empty">正在加载会话…</p>
      <div v-else class="session-list">
        <div v-for="session in filtered" :key="session.id" class="session-row" :class="{ active: session.id === activeId }">
          <button class="session-select" :aria-current="session.id === activeId ? 'true' : undefined" @click="emit('select', session.id); mobileOpen = false"><span>{{ session.title }}</span><small>{{ time(session.updatedAt) }}<i v-if="session.busy" aria-label="正在处理"></i></small></button>
          <div class="session-row-actions"><button :aria-label="`重命名 ${session.title}`" title="重命名" @click="rename(session)"><PlatformIcon name="edit" /></button><button :aria-label="`删除 ${session.title}`" title="删除" @click="remove(session)"><PlatformIcon name="close" /></button></div>
        </div>
        <p v-if="!filtered.length" class="session-empty">没有匹配的会话</p>
      </div>
      <p v-if="storageError" role="alert" class="session-storage-error">{{ storageError }}</p>
    </div>
  </aside>
</template>
<style scoped>
.session-sidebar{width:210px;min-width:0;background:#f6f8fc;border:1px solid #e1e7f0;border-radius:14px;padding:18px 12px;align-self:start;color:#405574}.session-sidebar-heading{padding:0 7px 16px;display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600}.session-sidebar-heading small{font-size:10px;font-weight:400;color:#8a9ab0}.session-sidebar button{font:inherit;cursor:pointer}.session-new{display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #cfdcf2;border-radius:8px;background:#fff;color:#4778ca;width:100%;padding:10px;font-size:12px!important}.platform-icon{width:15px;height:15px}.session-search{display:flex;align-items:center;gap:6px;background:white;border:1px solid #e0e7ef;border-radius:7px;padding:8px;margin-top:15px;color:#96a3b5}.session-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:11px}.session-list{margin-top:12px;max-height:610px;overflow:auto}.session-row{display:flex;border:1px solid transparent;border-radius:8px;margin:5px 0}.session-row.active{border-color:#d6e2f5;background:#eaf1fc}.session-select{border:0;background:transparent;text-align:left;min-width:0;flex:1;padding:10px 7px;color:#526782}.session-select>span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.session-select small{font-size:9px;color:#96a3b7;display:flex;align-items:center;gap:6px;margin-top:6px}.session-select i{width:5px;height:5px;border-radius:50%;background:#4f82dd}.session-row-actions{display:flex;flex-direction:column;justify-content:center;opacity:0}.session-row:hover .session-row-actions,.session-row:focus-within .session-row-actions{opacity:1}.session-row-actions button{border:0;background:transparent;color:#8192aa;padding:3px}.session-row-actions .platform-icon{width:12px;height:12px}.session-empty{font-size:10px;color:#96a4b8;padding:10px 5px;line-height:1.7}.session-storage-error{font-size:10px;color:#a26954;line-height:1.8;overflow-wrap:anywhere}.session-mobile-toggle{display:none}.session-new:disabled{opacity:.5;cursor:wait}@media(max-width:1100px){.session-sidebar{width:180px}}@media(max-width:760px){.session-sidebar{width:100%;padding:10px}.session-mobile-toggle{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;color:#617794;font-size:12px!important;padding:4px}.session-sidebar-body{display:none;margin-top:14px}.expanded .session-sidebar-body{display:block}.session-list{max-height:270px}.session-row-actions{opacity:1}}
</style>
