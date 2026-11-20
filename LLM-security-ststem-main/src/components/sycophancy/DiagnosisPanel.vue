<script setup>
import { computed } from 'vue'
import PlatformIcon from '../ui/PlatformIcon.vue'
import { dimensions, severityNames } from '../../utils/sycophancy/diagnosis.js'
import { roundMetrics, formatScore } from '../../utils/sycophancy/scoring.js'
const props = defineProps({ turn: Object, busy: Boolean, selectedEvidence: String })
const emit = defineEmits(['locate', 'retry'])
const metric = computed(() => roundMetrics(props.turn?.diagnosis))
const visibleDimensions = computed(() => props.turn?.diagnosis?.status === 'complete' ? dimensions.map(d => ({ ...d, ...props.turn.diagnosis.dimensions.find(v => v.code === d.code) })).filter(d => d.state === 'scored') : [])
const evidenceFor = d => (props.turn?.diagnosis.evidence || []).filter(e => d.evidenceIds.includes(e.id))
const names = { premise: '关键前提', dependent_conclusion: '关联结论', emotion: '用户感受', overreach: '越界判断', endorsement: '评价背书', request: '核心请求', coverage: '实际回应', previous_judgment: '先前判断', current_judgment: '本轮判断' }
</script>
<template>
  <aside class="diagnosis-panel" aria-label="本轮五维诊断">
    <header><span class="diagnosis-symbol"><PlatformIcon name="scan" /></span><div><h3>五维行为诊断</h3><p>{{ turn ? '查看当前回答的判断依据' : '发送消息后展示诊断结果' }}</p></div></header>
    <template v-if="metric">
      <div class="diagnosis-score"><span>本轮谄媚得分</span><strong>{{ formatScore(metric.roundScore) }}</strong><small>最高严重度 {{ metric.maxSeverity }} / 3</small></div>
      <p class="diagnosis-summary">{{ turn.diagnosis.summary }}</p>
      <p v-if="!metric.positiveCount" class="no-findings"><PlatformIcon name="check" />未检出明确谄媚表现</p>
      <div class="dimension-list">
        <details v-for="d in visibleDimensions" :key="d.code" class="dimension-card" :class="{ positive: d.severity > 0 }" :open="d.severity > 0">
          <summary><span class="dimension-code">{{ d.code }}</span><span>{{ d.name }}</span><b>{{ d.severity }} / 3</b><PlatformIcon name="chevron" /></summary>
          <div class="dimension-body"><span class="dimension-level">{{ severityNames[d.severity] }}</span><p>{{ d.reason }}</p><button v-for="e in evidenceFor(d)" :key="e.id" class="evidence-quote" :class="{ selected: selectedEvidence === e.id }" @click="emit('locate', e)"><small>{{ names[e.purpose] || '原文依据' }}<PlatformIcon name="arrow" /></small><span>“{{ e.quote }}”</span></button></div>
        </details>
      </div>
      <p class="diagnosis-method">依据当前对话进行模型辅助分析。</p>
    </template>
    <div v-else class="diagnosis-empty">
      <PlatformIcon :name="turn?.diagnosis?.status === 'running' ? 'activity' : 'shield'" />
      <h4>{{ turn?.diagnosis?.status === 'running' ? '正在分析回答' : turn?.diagnosis?.status === 'error' ? '分析暂未完成' : '让每一次判断有据可查' }}</h4>
      <p>{{ turn?.diagnosis?.status === 'running' ? '正在识别行为类别并定位原文依据…' : turn?.diagnosis?.status === 'error' ? '回答已保留，可以单独重试分析。' : '诊断将结合问题与历史，分析回答的独立性及其具体表现。' }}</p>
      <button v-if="turn?.diagnosis?.status === 'error'" class="syco-button" :disabled="busy" @click="emit('retry')">重试分析</button>
    </div>
  </aside>
</template>
<style scoped>
.diagnosis-panel{background:white;border:1px solid #e0e7f1;border-radius:14px;padding:20px;min-width:0;align-self:start}.diagnosis-panel>header{display:flex;gap:10px;align-items:center;padding-bottom:17px;border-bottom:1px solid #edf0f6}.diagnosis-symbol{display:grid;place-items:center;background:#edf3ff;border-radius:9px;width:34px;height:34px;color:#688bc7}.platform-icon{width:16px;height:16px}h3{font-size:13px;color:#4c6384;margin:0 0 5px}header p{font-size:10px;color:#9aa8ba;margin:0}.diagnosis-score{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:20px 0 15px}.diagnosis-score>span{font-size:11px;color:#7b8ea7}.diagnosis-score strong{font-size:31px;font-weight:500;color:#527ec5;grid-row:span 2;font-variant-numeric:tabular-nums}.diagnosis-score small{font-size:10px;color:#9aa9be}.diagnosis-summary{font-size:11px;color:#71839d;line-height:1.9;margin:0 0 18px}.dimension-list{display:grid;gap:8px}.dimension-card{padding:0;background:white;border:1px solid #e7ecf4;border-radius:8px;overflow:hidden}.dimension-card summary{display:flex;align-items:center;gap:6px;font-size:11px;padding:11px 9px;color:#6f839e;list-style:none;cursor:pointer}.dimension-card summary::-webkit-details-marker{display:none}.dimension-code{font-size:9px;color:#9caec8}.dimension-card summary b{font-size:10px;font-weight:500;margin-left:auto;white-space:nowrap}.dimension-card summary .platform-icon{width:12px;height:12px;flex-shrink:0}.positive{border-color:#eadbc2}.positive summary{color:#a28352;background:#fffcf7}.dimension-body{padding:0 11px 12px;font-size:10px;color:#8090a6;line-height:1.9}.dimension-level{font-size:9px;color:#9b8a6e}.dimension-body p{margin:7px 0}.evidence-quote{width:100%;border:1px solid #e6eaf1;background:#f9fbfe;border-radius:6px;text-align:left;margin-top:6px;padding:8px;font:inherit;color:#7387a3;cursor:pointer}.evidence-quote small{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#98a8bf}.evidence-quote small .platform-icon{width:11px;height:11px}.evidence-quote>span{display:block;margin-top:4px;overflow-wrap:anywhere}.evidence-quote.selected{border-color:#cbaa68;background:#fff9ed}.diagnosis-method{font-size:9px;color:#a0adbf;margin:18px 0 0}.diagnosis-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;text-align:center;padding:22px 8px}.diagnosis-empty>.platform-icon{width:34px;height:34px;color:#b1c2dd;margin-bottom:18px}.diagnosis-empty h4{font-size:12px;font-weight:500;color:#8196b5;margin:0 0 12px}.diagnosis-empty p{font-size:10px;line-height:1.9;color:#9aa9be}.no-findings{display:flex;align-items:center;gap:6px;font-size:10px;color:#819e8c;padding:10px;background:#f5faf7;border-radius:6px}
</style>
