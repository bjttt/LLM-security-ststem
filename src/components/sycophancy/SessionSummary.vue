<script setup>
import { computed } from 'vue'
import { roundMetrics, formatScore } from '../../utils/sycophancy/scoring.js'
import { dimensions } from '../../utils/sycophancy/diagnosis.js'
const props = defineProps({ turns: Array, selectedId: String })
const emit = defineEmits(['select'])
const points = computed(() => props.turns.map((turn, i) => ({ id: turn.id, index: i, score: roundMetrics(turn.diagnosis)?.roundScore, x: 24 + i * (552 / Math.max(1, props.turns.length - 1)) })))
const paths = computed(() => {
  const groups = []; let current = []
  for (const p of points.value) {
    if (Number.isFinite(p.score)) current.push(`${p.x},${100 - p.score * 80}`)
    else if (current.length) { groups.push(current.join(' ')); current = [] }
  }
  if (current.length) groups.push(current.join(' '))
  return groups
})
const counts = computed(() => dimensions.map(d => ({ ...d, count: props.turns.filter(t => t.diagnosis.status === 'complete' && t.diagnosis.dimensions.some(v => v.code === d.code && v.state === 'scored' && v.severity > 0)).length })))
</script>
<template>
  <section v-if="turns.length" class="syco-summary" aria-label="得分趋势与类别分布">
    <details v-if="turns.length" class="summary-details"><summary>查看得分趋势与类别分布</summary><div class="summary-chart-grid"><div class="summary-chart"><h4>逐轮谄媚得分</h4><svg viewBox="0 0 600 130" role="img" aria-label="逐轮谄媚得分，范围0至1"><g stroke="#e7edf5" stroke-width="1"><path d="M24 20H576 M24 60H576 M24 100H576" /></g><g fill="#9cacbf" font-size="9"><text x="0" y="23">1.0</text><text x="0" y="63">0.5</text><text x="0" y="103">0.0</text></g><polyline v-for="(path, i) in paths" :key="i" :points="path" fill="none" stroke="#7b9fd9" stroke-width="2" /><template v-for="p in points" :key="p.id"><circle v-if="Number.isFinite(p.score)" :cx="p.x" :cy="100 - p.score * 80" :r="p.id === selectedId ? 5 : 3.5" fill="#5886cd" tabindex="0" role="button" :aria-label="`查看第${p.index + 1}轮，得分${formatScore(p.score)}`" @click="emit('select', p.id)" @keydown.enter="emit('select', p.id)" @keydown.space.prevent="emit('select', p.id)"><title>第{{ p.index + 1 }}轮 · {{ formatScore(p.score) }}</title></circle><text :x="p.x" y="122" text-anchor="middle" fill="#9cacbf" font-size="9">{{ p.index + 1 }}</text></template></svg></div><div class="category-bars"><h4>类别检出次数</h4><div v-for="d in counts" :key="d.code"><span>{{ d.name }}</span><i><b :style="{ width: `${d.count / Math.max(1, turns.length) * 100}%` }"></b></i><em>{{ d.count }}</em></div></div></div></details>
  </section>
</template>
<style scoped>
.syco-summary{border:1px solid #e0e8f3;border-radius:12px;background:#fff;margin-top:16px;padding:14px 20px;color:#7186a5}.summary-details summary{font-size:10px;cursor:pointer;color:#8d9fb8}.summary-chart-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:25px;margin-top:15px}.summary-chart svg{width:100%;display:block}.summary-chart h4,.category-bars h4{font-size:10px;font-weight:500;margin:0 0 12px}.category-bars>div{display:flex;align-items:center;gap:9px;font-size:9px;margin:7px 0}.category-bars span{width:77px}.category-bars i{flex:1;height:4px;border-radius:4px;background:#eaf0f8;overflow:hidden}.category-bars b{display:block;height:100%;background:#9bb5df}.category-bars em{font-style:normal;min-width:14px}@media(max-width:1000px){.summary-chart-grid{grid-template-columns:1fr}.syco-summary{padding:16px}}
</style>
