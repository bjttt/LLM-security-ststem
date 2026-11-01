<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from './ui/PlatformIcon.vue'

const props = defineProps({ categories: { type: Array, required: true }, results: { type: Object, required: true } })
const activeFilter = ref('all')
const flagged = computed(() => props.categories.filter(item => props.results[item.key]))
const visible = computed(() => props.categories.filter(item => activeFilter.value === 'all' || (activeFilter.value === 'flagged' ? props.results[item.key] : !props.results[item.key])))
const filters = computed(() => [
  { id: 'all', name: '全部维度', count: props.categories.length },
  { id: 'flagged', name: '需关注项', count: flagged.value.length },
  { id: 'clear', name: '未检出项', count: props.categories.length - flagged.value.length },
])
</script>

<template>
  <div class="risk-dimensions">
    <div class="risk-summary"><div><span class="micro-label">MULTIMODAL DETECTION REPORT</span><h3>多维度检测结果</h3></div><div class="risk-summary-counts"><span><strong>{{ categories.length }}</strong>检测维度</span><span class="risk-count"><strong>{{ flagged.length }}</strong>需关注项</span><span><strong>{{ categories.length - flagged.length }}</strong>未检出项</span></div></div>
    <div class="result-filters" role="group" aria-label="筛选检测维度"><button v-for="filter in filters" :key="filter.id" type="button" :aria-pressed="activeFilter === filter.id" :class="{ active: activeFilter === filter.id }" @click="activeFilter = filter.id">{{ filter.name }}<span>{{ filter.count }}</span></button></div>
    <div v-if="visible.length" class="dimension-result-grid"><article v-for="item in visible" :key="item.key" class="dimension-result-item" :class="{ 'has-risk': results[item.key] }"><span class="dimension-state-icon"><PlatformIcon :name="results[item.key] ? 'help' : 'check'" /></span><span>{{ item.label }}</span><strong>{{ results[item.key] ? (item.positiveLabel || '违规') : (item.negativeLabel || '正常') }}</strong></article></div>
    <div v-else class="dimension-filter-empty"><PlatformIcon name="shield" /><p>当前筛选下没有{{ activeFilter === 'flagged' ? '需关注' : '未检出' }}项</p></div>
  </div>
</template>
