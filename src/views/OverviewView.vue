<script setup>
import { computed } from 'vue'
import PlatformIcon from '../components/ui/PlatformIcon.vue'
import { detectionTools } from '../navigation/pages'
import { useKBStore } from '../stores/kb'
import { useSystemStore } from '../stores/system'

defineProps({ loading: Boolean })
const kbStore = useKBStore()
const systemStore = useSystemStore()
const metrics = computed(() => [
  { label: '一体化检测工具', value: '05', unit: '种', note: '覆盖检测、审核与溯源', icon: 'scan', tone: 'blue' },
  { label: '图文风险维度', value: '16', unit: '项', note: '多维度分析内容安全', icon: 'layers', tone: 'lavender' },
  { label: '已加载知识条目', value: kbStore.documents.length.toLocaleString(), unit: '条', note: '为内容审核提供检索依据', icon: 'book', tone: 'peach' },
  { label: '当前审核模型', value: systemStore.currentModel || '待配置', unit: '', note: systemStore.llmConfigured ? '已读取模型配置' : '暂未读取有效模型配置', icon: 'brain', tone: 'sky', model: true },
])
const dimensions = ['涉黄内容', '涉政内容', '违禁内容', '暴恐内容', '谩骂内容', '广告内容', '隐私泄露', '民族宗教']
</script>

<template>
  <div class="page-view overview-view">
    <div class="page-heading"><div><div class="eyebrow">YOUR AI SAFETY COMMAND CENTER</div><h1>每一次生成，都值得信任<span class="heading-dot">.</span></h1><p>欢迎来到大模型检测平台，在这里开启更可靠的 AI 内容评估。</p></div><span class="date-label"><PlatformIcon name="clock" />{{ new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()) }}</span></div>
    <section class="hero-panel" aria-label="平台介绍">
      <div class="hero-copy"><span class="hero-label"><span></span> RESPONSIBLE AI, BY DESIGN</span><h2>看见风险。<br />让智能更有边界。</h2><p>多模态检测、模型可靠性评估与知识增强审核，<br class="desktop-break" />让复杂的内容安全工作，变得清晰而有序。</p><div class="hero-actions"><a class="button hero-button" href="#/workspace/multimodal">开始一次检测 <PlatformIcon name="arrow" /></a><a class="hero-secondary" href="#/knowledge/list">探索知识库 <PlatformIcon name="chevron" /></a></div></div>
      <div class="hero-visual" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="orbit-line"></div><div class="shield-emblem"><PlatformIcon name="shield" /></div><div class="visual-chip chip-top"><span class="chip-dot"></span>多维风险识别</div><div class="visual-chip chip-bottom"><PlatformIcon name="check" />可信内容评估</div><span class="orbit-node node-one"></span><span class="orbit-node node-two"></span><span class="visual-caption">TRUST IS THE FOUNDATION.</span></div>
    </section>
    <section class="metric-grid" aria-label="平台能力与配置"><article v-for="metric in metrics" :key="metric.label" class="metric-card"><div class="metric-top"><span>{{ metric.label }}</span><span class="icon-tile" :class="metric.tone"><PlatformIcon :name="metric.icon" /></span></div><div class="metric-value" :class="{ 'model-value': metric.model }">{{ loading && (metric.model || metric.icon === 'book') ? '—' : metric.value }}<small>{{ metric.unit }}</small></div><p>{{ metric.note }}</p></article></section>
    <div class="overview-columns"><section class="capability-section"><div class="section-heading"><div><span class="eyebrow">CAPABILITIES</span><h2>选择你的检测场景</h2></div><a class="text-link" href="#/workspace/multimodal">进入工作台 <PlatformIcon name="arrow" /></a></div><div class="capability-grid"><a v-for="(tool, index) in detectionTools" :key="tool.id" :href="'#/workspace/' + tool.id" class="capability-card" :class="{ 'wide-card': tool.id === 'audit' }"><div class="capability-top"><span class="icon-tile" :class="['blue', 'lavender', 'peach', 'sky', 'blue'][index]"><PlatformIcon :name="tool.icon" /></span><span class="capability-index">0{{ index + 1 }}</span></div><h3>{{ tool.name }}</h3><p>{{ tool.description }}</p><div class="capability-bottom"><span>{{ tool.tag }}</span><PlatformIcon name="arrow" /></div></a></div></section>
      <aside class="overview-rail"><section class="guide-card"><span class="eyebrow">GET STARTED</span><h2>三步，开启安全评估</h2><ol class="workflow-list"><li><span>01</span><div><h3>选择检测场景</h3><p>根据内容与评估目标，选择合适的检测工具。</p></div></li><li><span>02</span><div><h3>提交待检测内容</h3><p>输入文本、上传图片，或设置审核参数。</p></div></li><li><span>03</span><div><h3>查看分析与建议</h3><p>阅读风险判断、分析结论及优化建议。</p></div></li></ol><a class="button secondary" href="#/workspace/multimodal">前往检测工作台 <PlatformIcon name="arrow" /></a></section><section class="dimension-card"><div class="section-heading"><h3>多维度内容安全</h3><span class="quiet-badge">16 项</span></div><p>从常见风险到细分场景，全面审视图文内容。</p><div class="dimension-tags"><span v-for="item in dimensions" :key="item">{{ item }}</span></div><a class="text-link" href="#/workspace/multimodal">查看图文检测 <PlatformIcon name="arrow" /></a></section><a class="knowledge-promo" href="#/knowledge/list"><span class="icon-tile blue"><PlatformIcon name="book" /></span><div><h3>构建你的知识底座</h3><p>管理知识，让审核更有依据</p></div><PlatformIcon name="arrow" /></a></aside>
    </div>
  </div>
</template>
