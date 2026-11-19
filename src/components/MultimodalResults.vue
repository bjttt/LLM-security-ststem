<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from './ui/PlatformIcon.vue'
import { aigcCategory } from '../api/model'

const props = defineProps({ categories: { type: Array, required: true }, results: { type: Object, required: true } })
const activeFilter = ref('all')
const isFlagged = category => Boolean(props.results[category.key]?.detected)
const flagged = computed(() => props.categories.filter(isFlagged))
const visible = computed(() => props.categories.filter(category => activeFilter.value === 'all' || (activeFilter.value === 'flagged' ? isFlagged(category) : !isFlagged(category))))
const filters = computed(() => [
  { id: 'all', name: '全部分类', count: props.categories.length },
  { id: 'flagged', name: '命中分类', count: flagged.value.length },
  { id: 'clear', name: '未检出分类', count: props.categories.length - flagged.value.length },
])
</script>

<template>
  <div class="risk-dimensions">
    <div class="result-filters" role="group" aria-label="筛选审核分类">
      <button v-for="filter in filters" :key="filter.id" type="button" :aria-pressed="activeFilter === filter.id" :class="{ active: activeFilter === filter.id }" @click="activeFilter = filter.id">{{ filter.name }}<span>{{ filter.count }}</span></button>
    </div>
    <div v-if="visible.length" class="taxonomy-grid">
      <article v-for="category in visible" :key="category.key" class="taxonomy-card" :class="{ 'has-risk': isFlagged(category) }" :data-category="category.key">
        <div class="taxonomy-heading"><h4>{{ category.label }}</h4><strong class="taxonomy-status">{{ isFlagged(category) ? '命中' : '未检出' }}</strong></div>
        <ul class="taxonomy-children">
          <li v-for="child in category.children" :key="child.key" :class="{ 'is-flagged': results[category.key]?.children?.[child.key] }">
            <span>{{ child.label }}</span><span class="child-status"><PlatformIcon :name="results[category.key]?.children?.[child.key] ? 'help' : 'check'" />{{ results[category.key]?.children?.[child.key] ? '命中' : '未检出' }}</span>
          </li>
        </ul>
      </article>
    </div>
    <div v-else class="dimension-filter-empty"><PlatformIcon name="shield" /><p>当前筛选下没有{{ activeFilter === 'flagged' ? '命中' : '未检出' }}分类</p></div>
    <section class="aigc-result" aria-label="AIGC 检测结果">
      <h3>{{ aigcCategory.label }}</h3>
      <strong>{{ results.aigc ? aigcCategory.positiveLabel : aigcCategory.negativeLabel }}</strong>
    </section>
  </div>
</template>

<style scoped>
.taxonomy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.taxonomy-card { padding: 18px; border: 1px solid #e1e8f1; border-radius: 12px; background: #fff; }
.taxonomy-card.has-risk { border-color: #e9be93; background: #fffaf5; }
.taxonomy-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.taxonomy-heading h4 { margin: 0; font-size: 18px; color: #253954; }
.taxonomy-status { font-size: 14px; color: #48645b; }
.has-risk .taxonomy-status { color: #a05219; }
.taxonomy-children { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 6px; }
.taxonomy-children li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; border-radius: 6px; background: #f4f7fb; font-size: 14px; color: #44546b; }
.taxonomy-children li.is-flagged { background: #ffead7; color: #964b14; font-weight: 600; }
.child-status { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-size: 13px; }
.child-status .platform-icon { width: 15px; height: 15px; }
.aigc-result { margin-top: 24px; border-top: 1px solid #e1e8f1; padding-top: 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.aigc-result h3 { margin: 5px 0 0; font-size: 18px; }
.aigc-result > strong { color: #4266a1; font-size: 14px; flex-shrink: 0; }
.result-filters { flex-wrap: wrap; }
.result-filters button { font-size: 14px; }
@media (max-width: 620px) { .taxonomy-grid { grid-template-columns: 1fr; } .aigc-result { align-items: flex-start; flex-direction: column; } }
</style>
