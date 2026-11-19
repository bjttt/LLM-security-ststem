<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  tokens: { type: Array, default: () => [] },
  riskPhrases: { type: Array, default: () => [] },
  threshold: { type: Number, default: 0.35 },
})

const selected = ref(null)
const bucketOf = (p) => {
  if (p >= 0.6) return 'hot'
  if (p >= 0.4) return 'warm'
  if (p >= 0.2) return 'mild'
  return ''
}

const rendered = computed(() => props.tokens.map((token, index) => ({
  ...token,
  index,
  bucket: token.space ? '' : bucketOf(token.p),
  percent: Math.round(token.p * 100),
})))

watch(() => props.tokens, () => { selected.value = null })

const pick = (token) => {
  selected.value = selected.value?.index === token.index ? null : token
}
</script>

<template>
  <section class="report-card heat-card" aria-label="Token 级风险热力图">
    <header class="report-head">
      <div>
        <span class="micro-label">TOKEN-LEVEL RISK MAP</span>
        <h3>Token 级风险热力图</h3>
        <p>颜色越深表示恶意分 p_i 越高，p_i ≥ {{ threshold }} 的片段参与掩码改写</p>
      </div>
      <div class="heat-legend" aria-hidden="true">
        <span class="legend-swatch is-mild"></span>关注
        <span class="legend-swatch is-warm"></span>风险
        <span class="legend-swatch is-hot"></span>高风险
      </div>
    </header>

    <div class="heat-text" role="list">
      <template v-for="token in rendered" :key="token.index">
        <span v-if="token.space">{{ token.text }}</span>
        <span
          v-else
          role="listitem"
          tabindex="0"
          class="heat-token"
          :class="[token.bucket, { 'is-selected': selected?.index === token.index }]"
          :title="`${token.text} · p=${token.p.toFixed(2)} · ${token.type === '无' ? '未命中' : token.type}`"
          @click="pick(token)"
          @keydown.enter.prevent="pick(token)"
          @keydown.space.prevent="pick(token)"
        >{{ token.text }}</span>
      </template>
    </div>

    <div v-if="selected" class="heat-detail">
      <div class="heat-detail-main">
        <span class="heat-detail-char">{{ selected.text }}</span>
        <div>
          <strong>{{ selected.type === '无' ? '未命中风险词表' : `${selected.type}通道` }}</strong>
          <small>{{ selected.reason }}</small>
        </div>
      </div>
      <div class="heat-detail-score">
        <span>恶意分 p_i</span>
        <strong>{{ selected.p.toFixed(2) }}</strong>
      </div>
      <div class="heat-meter" aria-hidden="true"><i :style="{ width: `${selected.percent}%` }"></i></div>
    </div>
    <p v-else class="heat-hint">点击任意文字查看该 Token 的恶意分与命中依据</p>

    <div v-if="riskPhrases.length" class="risk-phrase-list">
      <span class="risk-phrase-label">风险片段</span>
      <span v-for="phrase in riskPhrases" :key="phrase.text" class="risk-phrase">
        {{ phrase.text }}<b>{{ phrase.p.toFixed(2) }}</b>
      </span>
    </div>
  </section>
</template>
