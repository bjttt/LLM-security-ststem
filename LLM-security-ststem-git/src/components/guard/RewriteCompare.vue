<script setup>
import { computed } from 'vue'

const props = defineProps({
  analysis: { type: Object, required: true },
  action: { type: String, default: 'pending' },
})
defineEmits(['accept', 'rollback'])

const maskedParts = computed(() => {
  const parts = []
  const spans = props.analysis.maskSpans || []
  const inSpan = (index) => spans.some((span) => index >= span.first && index <= span.last)
  let maskedRun = false
  props.analysis.tokens.forEach((token, index) => {
    if (token.space) {
      if (!maskedRun) parts.push({ text: token.text, masked: false })
      return
    }
    if (inSpan(index)) {
      if (!maskedRun) parts.push({ text: '§', masked: true })
      maskedRun = true
      return
    }
    maskedRun = false
    parts.push({ text: token.text, masked: false })
  })
  return parts
})

const rewrite = computed(() => props.analysis.rewrite)
</script>

<template>
  <section v-if="rewrite" class="report-card rewrite-card" aria-label="改写前后对比">
    <header class="report-head">
      <div>
        <span class="micro-label">SEMANTIC-PRESERVING REWRITE</span>
        <h3>改写前后双栏对比</h3>
        <p>仅改动高风险片段，其余 Token 保持原样，语义保持度约束 {{ rewrite.preserved }} ≥ 0.9</p>
      </div>
      <div class="rewrite-metrics">
        <span><small>语义保持 BLEURT-zh</small><strong>{{ rewrite.preserved.toFixed(2) }}</strong></span>
        <span><small>二次检测风险</small><strong :class="{ 'metric-safe': rewrite.riskScore < analysis.thresholds.low }">{{ rewrite.riskScore.toFixed(2) }}</strong></span>
        <span><small>改写片段</small><strong>{{ rewrite.replacements.length }} 处</strong></span>
      </div>
    </header>

    <div class="compare-grid">
      <article class="compare-pane">
        <header><span class="compare-dot is-danger"></span>原始 Prompt<small>高风险片段已掩码为 §</small></header>
        <p class="compare-text"><span v-for="(part, index) in maskedParts" :key="index" :class="{ 'mask-token': part.masked }">{{ part.text }}</span></p>
      </article>
      <article class="compare-pane is-safe">
        <header><span class="compare-dot is-safe"></span>净化后 Prompt<small>可直接送入大模型</small></header>
        <p class="compare-text"><span v-for="(segment, index) in rewrite.segments" :key="index" :class="{ 'fill-token': segment.changed }">{{ segment.text }}</span></p>
      </article>
    </div>

    <div class="rewrite-footer">
      <div class="replacement-list">
        <span class="replacement-label">局部填空</span>
        <span v-for="item in rewrite.replacements" :key="item.from" class="replacement">
          <del>{{ item.from }}</del><PlatformIcon name="arrow" /><ins>{{ item.to }}</ins>
          <em>{{ item.type }}</em>
        </span>
      </div>
      <div v-if="action === 'pending'" class="rewrite-actions">
        <el-button type="primary" @click="$emit('accept')"><PlatformIcon name="check" />采纳改写</el-button>
        <el-button @click="$emit('rollback')">回退原句</el-button>
      </div>
      <span v-else class="rewrite-done">
        <PlatformIcon name="check" />{{ action === 'rewritten' ? '已采纳改写版本' : '已回退原始句子' }}
      </span>
    </div>

    <p v-if="rewrite.conservative" class="rewrite-warning">
      <PlatformIcon name="help" />改写后二次检测仍高于 θ2，系统已退化为「保守删除」策略：移除风险片段后再送模型。
    </p>
  </section>
</template>
