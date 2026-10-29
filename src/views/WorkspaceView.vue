<script setup>
import { computed } from 'vue'
import PlatformIcon from '../components/ui/PlatformIcon.vue'
import ToolGuide from '../components/ui/ToolGuide.vue'
import ImageTextDetection from '../components/ImageTextDetection.vue'
import HallucinationDetection from '../components/HallucinationDetection.vue'
import SycophancyDetection from '../components/SycophancyDetection.vue'
import TextWatermark from '../components/TextWatermark.vue'
import AuditPanel from '../components/safety/AuditPanel.vue'
import { detectionTools } from '../navigation/pages'

const props = defineProps({ section: { type: String, default: 'multimodal' } })
const components = { multimodal: ImageTextDetection, hallucination: HallucinationDetection, sycophancy: SycophancyDetection, watermark: TextWatermark, audit: AuditPanel }
const activeTool = computed(() => detectionTools.find(tool => tool.id === props.section) || detectionTools[0])
</script>

<template>
  <div class="page-view">
    <div class="page-heading">
      <div><div class="eyebrow">DETECTION WORKSPACE</div><h1>检测工作台<span class="heading-dot">.</span></h1><p>从内容安全到生成可靠性，一站式完成模型内容评估。</p></div>
      <a class="text-link" href="#/knowledge/list">管理审核知识库 <PlatformIcon name="arrow" /></a>
    </div>
    <nav class="section-tabs" aria-label="检测工具">
      <a v-for="tool in detectionTools" :key="tool.id" :href="'#/workspace/' + tool.id" :class="{ active: section === tool.id }" :aria-current="section === tool.id ? 'page' : undefined"><PlatformIcon :name="tool.icon" />{{ tool.name }}</a>
    </nav>
    <div class="workspace-intro"><div class="tool-heading"><span class="icon-tile blue"><PlatformIcon :name="activeTool.icon" /></span><div><h2>{{ activeTool.name }}</h2><p>{{ activeTool.hint }}</p></div></div><span class="quiet-badge">{{ activeTool.tag }}</span></div>
    <div class="workspace-steps" aria-label="检测流程"><div><span>01</span><strong>准备内容</strong><small>输入文本或选择附件</small></div><PlatformIcon name="chevron" /><div><span>02</span><strong>发起评估</strong><small>根据场景提交检测</small></div><PlatformIcon name="chevron" /><div><span>03</span><strong>阅读报告</strong><small>查看结论与详细分析</small></div></div>
    <div class="workspace-layout"><div class="workspace-main"><div class="feature-surface"><component :is="components[activeTool.id]" :key="activeTool.id" /></div></div><ToolGuide :tool="activeTool.id" :key="activeTool.id" /></div>
    <div class="workspace-note"><PlatformIcon name="help" /><span>检测结果与分析将在提交后展示，可切换上方工具进行不同类型的评估。</span><a href="#/overview">返回平台概览 <PlatformIcon name="arrow" /></a></div>
  </div>
</template>
