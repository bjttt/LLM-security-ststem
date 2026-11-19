<script setup>
import { computed } from 'vue'
import { buildSessionExport } from '../../utils/sycophancy/export.js'
import { formatScore } from '../../utils/sycophancy/scoring.js'
import { dimensions } from '../../utils/sycophancy/diagnosis.js'
import { ElMessage } from 'element-plus'
const props = defineProps({ modelValue: Boolean, session: Object })
const emit = defineEmits(['update:modelValue'])
const report = computed(() => props.modelValue ? buildSessionExport(props.session) : null)
function printReport() {
  const popup = window.open('', '_blank')
  if (!popup) { ElMessage.error('请允许弹出窗口后再打印'); return }
  popup.opener = null
  const doc = popup.document
  doc.title = props.session.title + ' 检测报告'
  const style = doc.createElement('style')
  style.textContent = 'body{font-family:Microsoft YaHei,Arial,sans-serif;margin:35px;color:#33445c;font-size:12px;line-height:1.9}h1{font-size:22px}h2{font-size:16px;margin-top:28px}h3{font-size:13px}p{white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #ddd;padding:8px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}blockquote{color:#7e6b46;border-left:2px solid #d9bd80;padding-left:12px}small{color:#8d9bad}@page{margin:20mm}'
  doc.head.append(style)
  const add = (tag, text, parent = doc.body) => { const el = doc.createElement(tag); el.textContent = text; parent.append(el); return el }
  add('h1', '谄媚检测会话报告')
  add('p', props.session.title)
  add('small', `生成时间 ${new Date().toLocaleString('zh-CN')}`)
  add('h2', `综合谄媚得分 ${formatScore(report.value.metrics.aggregateScore)}`)
  for (const [i, t] of report.value.turns.entries()) {
    add('h2', `第 ${i + 1} 轮`); add('h3', '问题'); add('p', t.question)
    add('h3', '原始回答'); add('p', t.normal.text)
    add('h3', '客观回答'); add('p', t.objective.text || '尚未生成完整结果')
    add('p', `本轮谄媚得分 ${t.roundMetrics ? formatScore(t.roundMetrics.roundScore) : '分析尚未完成'}`)
    if (t.diagnosis.status === 'complete') {
      add('p', t.diagnosis.summary)
      const table = add('table', ''), head = add('thead', '', table), row = add('tr', '', head)
      for (const label of ['维度', '严重度', '判断依据']) add('th', label, row)
      const body = add('tbody', '', table)
      for (const d of t.diagnosis.dimensions.filter(d => d.state === 'scored')) {
        const tr = add('tr', '', body)
        for (const value of [dimensions.find(v => v.code === d.code).name, `${d.severity} / 3`, d.reason]) add('td', value, tr)
      }
      for (const e of t.diagnosis.evidence) add('blockquote', e.quote)
    }
    add('small', `模型 ${t.model || '沿用服务配置'} · 上下文 ${t.contextSnapshot.normal.length} 组历史问答`)
  }
  popup.focus(); popup.print()
}
</script>
<template>
  <el-dialog :model-value="modelValue" title="会话报告" width="min(860px, 95vw)" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="report" class="report-preview"><h2>{{ session.title }}</h2><p class="report-meta">{{ new Date(report.generatedAt).toLocaleString('zh-CN') }}</p><div class="report-aggregate">综合谄媚得分 <strong>{{ formatScore(report.metrics.aggregateScore) }}</strong></div><article v-for="(t,i) in report.turns" :key="t.id"><h3>第 {{ i + 1 }} 轮 <span>本轮谄媚得分 {{ t.roundMetrics ? formatScore(t.roundMetrics.roundScore) : '—' }}</span></h3><h4>问题</h4><p>{{ t.question }}</p><h4>原始回答</h4><p>{{ t.normal.text }}</p><h4>客观回答</h4><p>{{ t.objective.text || '尚未生成完整结果' }}</p><template v-if="t.diagnosis.status === 'complete'"><h4>诊断结果</h4><p>{{ t.diagnosis.summary }}</p><dl><template v-for="d in t.diagnosis.dimensions.filter(d => d.state === 'scored')" :key="d.code"><dt>{{ dimensions.find(v => v.code === d.code).name }} · {{ d.severity }} / 3</dt><dd>{{ d.reason }}</dd></template></dl><blockquote v-for="e in t.diagnosis.evidence" :key="e.id">{{ e.quote }}</blockquote></template><p v-else>分析尚未完成</p></article></div>
    <template #footer><button class="syco-button" @click="printReport">打印 / 保存为 PDF</button></template>
  </el-dialog>
</template>
<style scoped>
.report-preview{color:#657c9b;line-height:1.9;font-size:12px;max-height:65vh;overflow:auto;padding:0 10px}.report-preview h2{font-size:19px;color:#476083}.report-meta{font-size:10px;color:#9aacbf}.report-aggregate{padding:14px 18px;background:#f3f7fe;border-radius:8px;font-size:12px;display:flex;align-items:center;justify-content:space-between}.report-aggregate strong{font-size:26px;font-weight:500}.report-preview article{border-bottom:1px solid #e5ebf4;padding:20px 0}.report-preview h3{font-size:13px;display:flex;justify-content:space-between;gap:10px}.report-preview h3 span{font-weight:400;font-size:11px}.report-preview h4{font-size:11px;color:#8da0bb;margin:18px 0 5px}.report-preview p{white-space:pre-wrap;overflow-wrap:anywhere}.report-preview dt{font-size:11px;font-weight:600}.report-preview dd{margin:3px 0 10px}.report-preview blockquote{margin:8px 0;padding:5px 12px;border-left:2px solid #d8c28f;background:#fffcf4;font-size:11px}
</style>
