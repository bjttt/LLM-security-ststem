<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from './PlatformIcon.vue'
const props = defineProps({ categories: { type: Array, required: true }, results: { type: Object, required: true } })
const activeFilter = ref('all')
const risky = computed(() => props.categories.filter(item => props.results[item.key]))
const visible = computed(() => activeFilter.value === 'risk' ? risky.value : activeFilter.value === 'normal' ? props.categories.filter(item => !props.results[item.key]) : props.categories)
const filters = computed(() => [{ id: 'all', name: '全部维度', count: props.categories.length }, { id: 'risk', name: '风险项', count: risky.value.length }, { id: 'normal', name: '正常项', count: props.categories.length - risky.value.length }])
</script>

<template>
  <div class="risk-dimensions"><div class="risk-summary"><div><span class="micro-label">RISK DIMENSION REPORT</span><h3>多维度检测结果</h3></div><div class="risk-summary-counts"><span><strong>{{ categories.length }}</strong>检测维度</span><span class="risk-count"><strong>{{ risky.length }}</strong>风险项</span><span><strong>{{ categories.length - risky.length }}</strong>正常项</span></div></div><div class="result-filters" role="group" aria-label="筛选检测维度"><button v-for="filter in filters" :key="filter.id" type="button" :aria-pressed="activeFilter === filter.id" :class="{ active: activeFilter === filter.id }" @click="activeFilter = filter.id">{{ filter.name }}<span>{{ filter.count }}</span></button></div><div v-if="visible.length" class="dimension-result-grid"><article v-for="item in visible" :key="item.key" class="dimension-result-item" :class="{ 'has-risk': results[item.key] }"><span class="dimension-state-icon"><PlatformIcon :name="results[item.key] ? 'help' : 'check'" /></span><span>{{ item.label }}</span><strong>{{ results[item.key] ? '违规' : '正常' }}</strong></article></div><div v-else class="dimension-filter-empty"><PlatformIcon name="shield" /><p>当前筛选下没有{{ activeFilter === 'risk' ? '风险' : '正常' }}项</p></div></div>
</template>
