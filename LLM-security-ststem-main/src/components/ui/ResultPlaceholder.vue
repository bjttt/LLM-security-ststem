<script setup>
import PlatformIcon from './PlatformIcon.vue'
defineProps({ loading: Boolean, title: { type: String, default: '你的分析报告将在这里生成' }, description: { type: String, default: '提交内容后，查看模型给出的评估与分析。' }, items: { type: Array, default: () => ['检测结论', '分析依据', '处理建议'] }, icon: { type: String, default: 'scan' } })
</script>

<template>
  <section class="result-placeholder" :class="{ 'is-loading': loading }" :aria-busy="loading" aria-live="polite"><span class="placeholder-symbol"><PlatformIcon :name="loading ? 'activity' : icon" /></span><div class="placeholder-copy"><span class="micro-label">{{ loading ? 'ANALYSIS IN PROGRESS' : 'RESULT PREVIEW' }}</span><h3>{{ loading ? '正在分析，请稍候…' : title }}</h3><p>{{ description }}</p></div><div class="placeholder-items"><span v-for="item in items" :key="item"><PlatformIcon name="check" />{{ item }}</span></div></section>
</template>
