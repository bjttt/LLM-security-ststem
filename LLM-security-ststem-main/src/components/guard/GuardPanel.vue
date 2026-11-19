<script setup>
import { computed, onMounted, ref } from 'vue'
import { useGuardStore } from '../../stores/guard'
import SingleTurnView from './SingleTurnView.vue'
import MultiTurnView from './MultiTurnView.vue'
import AuditLedger from './AuditLedger.vue'
import GuardSettings from './GuardSettings.vue'

const store = useGuardStore()
const settingsOpen = ref(false)

const tabs = [
  { id: 'single', name: '单轮检测', hint: '形变逃逸防御' },
  { id: 'multi', name: '多轮会话', hint: '时间逃逸防御' },
  { id: 'audit', name: '审计台账', hint: '阻断与改写留痕' },
]

const pipeline = [
  { name: '接入层', desc: '单轮 Prompt / 多轮对话' },
  { name: '三元组特征', desc: '意图 · 实体 · 情感' },
  { name: '双路检测', desc: '对比检测 + 跨轮记忆' },
  { name: '风险决策', desc: '低 / 中 / 高分级' },
  { name: '语义改写', desc: 'Token 掩码局部填空' },
  { name: '输出层', desc: '净化 Prompt / 阻断' },
]

const thresholdSummary = computed(() => `θ ${store.thresholds.mask} · 低/高 ${store.thresholds.low}/${store.thresholds.high} · 窗口 ${store.thresholds.window}`)

onMounted(() => {
  store.fetchEngine()
})
</script>

<template>
  <div class="guard-panel">
    <section class="guard-hero" aria-label="输入端防护说明">
      <div class="guard-hero-top">
        <div class="guard-hero-copy">
          <span class="micro-label">INPUT-SIDE GUARD · 对比检测 — 记忆追踪 — 语义改写</span>
          <h2>先检测，后放行<span class="guard-dot">.</span></h2>
          <p>在 Prompt 进入大模型之前完成风险识别与局部净化：对未见模板保持敏感，对正常意图保持友好。</p>
        </div>
        <div class="guard-hero-side">
          <div class="guard-engine">
            <span class="engine-pulse"></span>
            <div><strong>{{ store.engineLabel }}</strong><small>{{ store.agentConfigured ? 'DeepSeek · 服务端风险评分' : '规则 + 224 维特征哈希近似' }}</small></div>
          </div>
          <button type="button" class="guard-settings-toggle" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
            <PlatformIcon name="layers" />
            <span>{{ settingsOpen ? '收起参数' : '检测参数' }}</span>
            <small>{{ thresholdSummary }}</small>
          </button>
        </div>
      </div>
      <ol class="guard-pipeline" aria-label="防护流水线">
        <li v-for="(step, index) in pipeline" :key="step.name">
          <span class="pipeline-index">0{{ index + 1 }}</span>
          <div><strong>{{ step.name }}</strong><small>{{ step.desc }}</small></div>
        </li>
      </ol>
      <GuardSettings v-if="settingsOpen" />
    </section>

    <nav class="guard-tabs" role="tablist" aria-label="防护模式">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="store.tab === tab.id"
        :class="{ active: store.tab === tab.id }"
        @click="store.setTab(tab.id)"
      >
        <strong>{{ tab.name }}</strong>
        <small>{{ tab.hint }}</small>
        <span v-if="tab.id === 'audit' && store.audit.length" class="tab-count">{{ store.audit.length }}</span>
        <span v-else-if="tab.id === 'multi' && store.session.turns.length" class="tab-count">{{ store.session.turns.length }}</span>
      </button>
    </nav>

    <SingleTurnView v-if="store.tab === 'single'" />
    <MultiTurnView v-else-if="store.tab === 'multi'" />
    <AuditLedger v-else />
  </div>
</template>
