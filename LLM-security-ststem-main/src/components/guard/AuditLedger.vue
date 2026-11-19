<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useGuardStore } from '../../stores/guard'
import { actionLabel } from '../../utils/guardEngine'

const store = useGuardStore()
const stats = computed(() => store.auditStats)

const formatTime = (value) => new Date(value).toLocaleString('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

const actionTone = (action) => ({
  blocked: 'is-danger',
  passed: 'is-warning',
  rewritten: 'is-safe',
  rolledback: 'is-warning',
  forced: 'is-danger',
}[action] || 'is-quiet')

const exportJson = () => {
  if (!store.audit.length) {
    ElMessage.warning('暂无审计记录可导出')
    return
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    note: '输入端内容防护 · 审计台账（仅包含摘要、特征标签与处置结果，不含完整对话原文）',
    entries: store.audit,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `guard-audit-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('审计台账已导出')
}

const clearAll = async () => {
  try {
    await ElMessageBox.confirm('清空后审计记录不可恢复，确认继续？', '清空审计台账', {
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    store.clearAudit()
    ElMessage.success('审计台账已清空')
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <div class="guard-audit">
    <div class="audit-stats">
      <article class="audit-stat"><span class="micro-label">BLOCKED</span><strong>{{ stats.blocked }}</strong><p>高风险阻断</p></article>
      <article class="audit-stat"><span class="micro-label">REWRITTEN</span><strong>{{ stats.rewritten }}</strong><p>改写留痕</p></article>
      <article class="audit-stat"><span class="micro-label">ROLLBACK</span><strong>{{ stats.rollback + stats.forced }}</strong><p>回退 / 强制放行</p></article>
      <article class="audit-stat"><span class="micro-label">PEAK RISK</span><strong>{{ stats.peak.toFixed(2) }}</strong><p>记录中的最高风险分</p></article>
    </div>

    <el-card class="audit-card" shadow="never">
      <template #header>
        <div class="guard-card-header">
          <span class="title"><span class="panel-step">03</span>审计台账</span>
          <div class="audit-toolbar">
            <button type="button" class="text-button" @click="exportJson"><PlatformIcon name="upload" />导出 JSON</button>
            <button type="button" class="text-button" :disabled="!store.audit.length" @click="clearAll">清空</button>
          </div>
        </div>
      </template>

      <div v-if="!store.audit.length" class="audit-empty">
        <PlatformIcon name="shield" />
        <h3>暂无审计记录</h3>
        <p>高风险阻断、人工改写与强制放行都会在这里留下摘要与特征标签。</p>
        <button type="button" class="text-button" @click="store.setTab('single')">前往单轮检测 <PlatformIcon name="arrow" /></button>
      </div>

      <div v-else class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr><th>时间</th><th>来源</th><th>内容摘要</th><th>风险分</th><th>命中策略</th><th>处置</th></tr>
          </thead>
          <tbody>
            <tr v-for="entry in store.audit" :key="entry.id">
              <td class="audit-time">{{ formatTime(entry.time) }}</td>
              <td><span class="audit-source">{{ entry.source }}</span></td>
              <td class="audit-excerpt" :title="entry.excerpt">{{ entry.excerpt }}</td>
              <td><span class="audit-score" :class="`is-${entry.level}`">{{ entry.riskScore.toFixed(2) }}</span></td>
              <td><div class="audit-tags"><span v-for="name in entry.strategies" :key="name">{{ name }}</span></div></td>
              <td><span class="audit-action" :class="actionTone(entry.action)">{{ actionLabel(entry.action) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="audit-note"><PlatformIcon name="shield" />隐私保护：记忆模块不保存原始对话文本，台账仅保留前 64 字摘要、224 维特征标签与处置结果。</p>
    </el-card>
  </div>
</template>
