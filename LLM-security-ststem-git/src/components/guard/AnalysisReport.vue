<script setup>
import { computed } from 'vue'
import TokenHeatmap from './TokenHeatmap.vue'
import RewriteCompare from './RewriteCompare.vue'

const props = defineProps({
  analysis: { type: Object, required: true },
  action: { type: String, default: 'pending' },
  elapsed: { type: Number, default: 0 },
})
defineEmits(['accept', 'rollback', 'pass', 'force', 'open-audit'])

const channelList = computed(() => [
  { ...props.analysis.channels.intent, tone: 'blue' },
  { ...props.analysis.channels.entity, tone: 'amber' },
  { ...props.analysis.channels.sentiment, tone: 'violet' },
])

const headline = computed(() => {
  const { action, analysis } = props
  if (action === 'blocked') return '已阻断 · 保守删除并写入审计'
  if (action === 'forced') return '已强制放行 · 人工操作已留痕'
  if (action === 'rewritten') return '已采纳改写 · 净化 Prompt 将进入模型'
  if (action === 'rolledback') return '已回退原句 · 风险仍然存在'
  if (action === 'passed') return analysis.level === 'low' ? '已放行 · 用户无感知' : '已直接通过 · 风险未处置'
  return analysis.level === 'mid' ? '需要人工确认 · 已生成净化版本' : '等待处置'
})

const isBlocked = computed(() => props.action === 'blocked' || props.action === 'forced')
const conservativeText = computed(() => props.analysis.rewrite?.conservativeText || props.analysis.text)
</script>

<template>
  <div class="guard-report">
    <section class="verdict-banner" :class="`tone-${analysis.level}`" aria-live="polite">
      <div class="verdict-gauge" :style="{ '--p': analysis.riskScore }">
        <div class="gauge-inner"><strong>{{ Math.round(analysis.riskScore * 100) }}</strong><small>风险分</small></div>
      </div>

      <div class="verdict-copy">
        <div class="verdict-tags">
          <span class="level-tag">{{ analysis.levelLabel }}</span>
          <span class="action-tag">{{ analysis.levelAction }}</span>
          <span v-if="analysis.level === 'low'" class="quiet-badge">低于 θ1 {{ analysis.thresholds.low }}</span>
          <span v-else-if="analysis.level === 'high'" class="quiet-badge">高于 θ2 {{ analysis.thresholds.high }}</span>
          <span v-else class="quiet-badge">落入灰色带 {{ analysis.thresholds.low }} – {{ analysis.thresholds.high }}</span>
        </div>
        <h3>{{ headline }}</h3>
        <p>{{ analysis.level === 'low' ? '未命中攻击策略，无需改写，Prompt 将原样送入大模型。' : analysis.level === 'mid' ? '系统只对高风险片段做了局部改写，其余内容保持不变；可采纳、回退或直接通过。' : '高风险输入不进入模型，风险片段被保守删除，特征写入跨轮记忆与审计台账。' }}</p>
        <div class="verdict-meta">
          <span><b>{{ analysis.stats.riskTokens }}</b>风险 Token</span>
          <span><b>{{ analysis.stats.phrases }}</b>风险片段</span>
          <span><b>{{ analysis.stats.strategies }}</b>命中策略</span>
          <span><b>{{ elapsed || 1 }}</b>ms 端到端耗时</span>
        </div>
      </div>

      <div class="verdict-actions">
        <template v-if="action === 'pending' && analysis.level === 'mid'">
          <el-button type="primary" @click="$emit('accept')"><PlatformIcon name="check" />采纳改写</el-button>
          <el-button @click="$emit('rollback')">回退原句</el-button>
          <el-button text @click="$emit('pass')">直接通过</el-button>
        </template>
        <template v-else-if="action === 'blocked'">
          <el-button type="danger" plain @click="$emit('force')">强制放行（留痕）</el-button>
          <button type="button" class="text-button" @click="$emit('open-audit')">查看审计台账</button>
        </template>
        <span v-else class="verdict-state"><PlatformIcon :name="action === 'rolledback' ? 'help' : 'check'" />{{ action === 'rewritten' ? '人工已确认' : action === 'rolledback' ? '已回退' : action === 'forced' ? '人工放行' : '自动完成' }}</span>
      </div>
    </section>

    <TokenHeatmap :tokens="analysis.tokens" :risk-phrases="analysis.riskPhrases" :threshold="analysis.thresholds.mask" />

    <div class="feature-grid">
      <section class="report-card channel-card" aria-label="三元组特征">
        <header class="report-head">
          <div>
            <span class="micro-label">TRIPLET FEATURE</span>
            <h3>意图 · 实体 · 情感三元组</h3>
            <p>三路并行编码后拼接为 224 维混合向量</p>
          </div>
          <span class="dim-chip">224 维</span>
        </header>
        <div class="channel-list">
          <div v-for="channel in channelList" :key="channel.key" class="channel-row">
            <div class="channel-name"><strong>{{ channel.label }}</strong><small>{{ channel.model }} · {{ channel.dims }} 维</small></div>
            <div class="channel-track"><i :class="channel.tone" :style="{ width: `${Math.round(channel.score * 100)}%` }"></i></div>
            <b>{{ channel.score.toFixed(2) }}</b>
          </div>
        </div>
        <div class="vector-split" aria-hidden="true">
          <span class="split-intent" style="width: 57.1%">意图 128</span>
          <span class="split-entity" style="width: 28.6%">实体 64</span>
          <span class="split-sentiment" style="width: 14.3%">情感 32</span>
        </div>
      </section>

      <section class="report-card prototype-card" aria-label="双原型对比">
        <header class="report-head">
          <div>
            <span class="micro-label">DUAL-PROTOTYPE</span>
            <h3>双原型距离判定</h3>
            <p>margin = {{ analysis.prototypes.margin }}，距离更近的原型即为预测类别</p>
          </div>
          <span class="proto-predict">{{ analysis.prototypes.matched }}</span>
        </header>
        <div class="proto-rows">
          <div class="proto-row">
            <span class="proto-name is-attack">攻击原型</span>
            <div class="proto-track"><i class="is-attack" :style="{ width: `${analysis.prototypes.attack * 100}%` }"></i></div>
            <b>{{ analysis.prototypes.attack.toFixed(2) }}</b>
          </div>
          <div class="proto-row">
            <span class="proto-name is-normal">正常原型</span>
            <div class="proto-track"><i class="is-normal" :style="{ width: `${analysis.prototypes.normal * 100}%` }"></i></div>
            <b>{{ analysis.prototypes.normal.toFixed(2) }}</b>
          </div>
        </div>
        <p class="proto-formula">
          d_normal − d_attack = <b>{{ (analysis.prototypes.normal - analysis.prototypes.attack).toFixed(2) }}</b>
          <span :class="analysis.prototypes.pass ? 'is-pass' : 'is-fail'">{{ analysis.prototypes.pass ? '> 0.5，判为攻击空间' : '≤ 0.5，判为正常空间' }}</span>
        </p>
        <ul class="strategy-list">
          <li v-for="name in analysis.strategies" :key="name">{{ name }}</li>
        </ul>
      </section>
    </div>

    <section v-if="analysis.variantNotes.length" class="report-card variant-card" aria-label="变体规避信号">
      <header class="report-head">
        <div><span class="micro-label">OBFUSCATION SIGNALS</span><h3>变体规避信号</h3></div>
        <span class="quiet-badge">{{ analysis.variantNotes.length }} 项</span>
      </header>
      <div class="variant-list">
        <div v-for="note in analysis.variantNotes" :key="note.label" class="variant-item">
          <strong>{{ note.label }}</strong>
          <p>{{ note.detail }}</p>
          <span>权重 {{ note.weight.toFixed(2) }}</span>
        </div>
      </div>
    </section>

    <RewriteCompare v-if="analysis.level === 'mid'" :analysis="analysis" :action="action" @accept="$emit('accept')" @rollback="$emit('rollback')" />

    <section v-if="isBlocked" class="report-card block-card" aria-label="高风险处置">
      <header class="report-head">
        <div><span class="micro-label">CONSERVATIVE DELETE</span><h3>高风险处置 · 保守删除</h3></div>
        <span class="block-badge">{{ action === 'forced' ? '人工放行' : '已阻断' }}</span>
      </header>
      <p class="block-copy">按「自动删除 + 事后审计」策略移除风险片段，{{ action === 'forced' ? '经人工确认后放行，操作已留痕。' : '净化结果不会送入大模型。' }}</p>
      <p class="block-preview">{{ conservativeText }}</p>
      <p class="block-note"><PlatformIcon name="shield" />该轮特征（V/S/C）已写入跨轮风险记忆，审计台账同步记录摘要与命中策略。</p>
    </section>
  </div>
</template>
