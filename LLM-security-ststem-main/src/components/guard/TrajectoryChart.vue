<script setup>
import { computed } from 'vue'

const props = defineProps({
  rounds: { type: Array, default: () => [] },
  thresholds: { type: Object, required: true },
})

const W = 720
const H = 220
const PAD = { left: 38, right: 18, top: 18, bottom: 30 }

const x = (index) => {
  const count = props.rounds.length
  if (count <= 1) return PAD.left + (W - PAD.left - PAD.right) / 2
  return PAD.left + (index * (W - PAD.left - PAD.right)) / (count - 1)
}
const y = (value) => PAD.top + (1 - Math.max(0, Math.min(1, value))) * (H - PAD.top - PAD.bottom)

const pointList = (key) => props.rounds.map((round, index) => `${x(index).toFixed(1)},${y(round[key]).toFixed(1)}`).join(' ')
const areaPath = computed(() => {
  if (!props.rounds.length) return ''
  const points = props.rounds.map((round, index) => `${x(index).toFixed(1)},${y(round.fusion).toFixed(1)}`)
  return `M ${x(0).toFixed(1)} ${y(0)} L ${points.join(' L ')} L ${x(props.rounds.length - 1).toFixed(1)} ${y(0)} Z`
})

const gridLines = [0, 0.25, 0.5, 0.75, 1].map((value) => ({ value, y: y(value) }))
const showEvery = computed(() => (props.rounds.length > 7 ? 2 : 1))
</script>

<template>
  <div class="trajectory">
    <svg v-if="rounds.length" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="跨轮风险轨迹">
      <defs>
        <linearGradient id="fusion-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c96a6a" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#c96a6a" stop-opacity="0" />
        </linearGradient>
      </defs>

      <line v-for="line in gridLines" :key="line.value" :x1="PAD.left" :x2="W - PAD.right" :y1="line.y" :y2="line.y" class="traj-grid" />
      <text v-for="line in gridLines" :key="`label-${line.value}`" :x="PAD.left - 8" :y="line.y + 3" class="traj-axis" text-anchor="end">{{ line.value.toFixed(2) }}</text>

      <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(thresholds.high)" :y2="y(thresholds.high)" class="traj-threshold is-high" />
      <text :x="W - PAD.right" :y="y(thresholds.high) - 5" class="traj-threshold-label is-high" text-anchor="end">θ2 {{ thresholds.high }}</text>
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(thresholds.low)" :y2="y(thresholds.low)" class="traj-threshold is-low" />
      <text :x="W - PAD.right" :y="y(thresholds.low) - 5" class="traj-threshold-label is-low" text-anchor="end">θ1 {{ thresholds.low }}</text>

      <path :d="areaPath" fill="url(#fusion-fill)" />
      <polyline :points="pointList('drift')" class="traj-line is-drift" />
      <polyline :points="pointList('singleRisk')" class="traj-line is-single" />
      <polyline :points="pointList('fusion')" class="traj-line is-fusion" />

      <g v-for="(round, index) in rounds" :key="round.index">
        <circle :cx="x(index)" :cy="y(round.fusion)" :r="round.level === 'high' ? 5.5 : 4" class="traj-dot" :class="`is-${round.level}`">
          <title>第 {{ round.index }} 轮 · 融合 {{ round.fusion.toFixed(2) }} · {{ round.levelLabel }}</title>
        </circle>
        <text v-if="index % showEvery === 0" :x="x(index)" :y="H - 9" class="traj-axis" text-anchor="middle">第{{ round.index }}轮</text>
      </g>
    </svg>
    <div v-else class="trajectory-empty">
      <PlatformIcon name="activity" />
      <p>至少进行 2 轮对话，轨迹会记录意图漂移、实体累积与融合风险的收敛过程。</p>
    </div>

    <div class="trajectory-legend">
      <span><i class="is-fusion"></i>融合风险 max(单轮, 多轮)</span>
      <span><i class="is-single"></i>单轮风险</span>
      <span><i class="is-drift"></i>意图漂移 D_t</span>
    </div>
  </div>
</template>
