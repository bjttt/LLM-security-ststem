<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from '../components/ui/PlatformIcon.vue'
import KBBrowser from '../components/safety/KBBrowser.vue'
import KBBuild from '../components/safety/KBBuild.vue'
import KBAdd from '../components/safety/KBAdd.vue'
import KBEdit from '../components/safety/KBEdit.vue'
import { useKBStore } from '../stores/kb'
import { knowledgeTabs } from '../navigation/pages'

const props = defineProps({ section: { type: String, default: 'list' } })
const kbStore = useKBStore()
const editDialogRef = ref(null)
const activeTab = computed(() => knowledgeTabs.find(tab => tab.id === props.section) || knowledgeTabs[0])
const categoryCount = computed(() => Object.keys(kbStore.stats.categories || {}).length)
const loadedCategories = computed(() => {
  const counts = new Map()
  for (const doc of kbStore.documents) {
    const category = doc.category || '未分类'
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})
const openEdit = (row) => editDialogRef.value?.open(row)
</script>

<template>
  <div class="page-view">
    <div class="page-heading"><div><div class="eyebrow">KNOWLEDGE LIBRARY</div><h1>让审核有据可依<span class="heading-dot">.</span></h1><p>沉淀规则、案例与权威知识，构建内容安全的知识底座。</p></div><a class="button primary" href="#/workspace/audit">前往内容审核 <PlatformIcon name="arrow" /></a></div>
    <div class="knowledge-stats">
      <div><span class="icon-tile blue"><PlatformIcon name="book" /></span><div><span>已加载知识条目</span><strong>{{ kbStore.documents.length.toLocaleString() }}<small>条</small></strong></div></div>
      <div><span class="icon-tile lavender"><PlatformIcon name="layers" /></span><div><span>知识分类</span><strong>{{ categoryCount }}<small>类</small></strong></div></div>
      <div><span class="icon-tile peach"><PlatformIcon name="scan" /></span><div><span>索引大小</span><strong>{{ Number(kbStore.stats.index_size || 0).toLocaleString() }}<small>项</small></strong></div></div>
    </div>
    <nav class="section-tabs" aria-label="知识库功能"><a v-for="tab in knowledgeTabs" :key="tab.id" :href="'#/knowledge/' + tab.id" :class="{ active: section === tab.id }" :aria-current="section === tab.id ? 'page' : undefined"><PlatformIcon :name="tab.icon" />{{ tab.name }}</a></nav>
    <div class="workspace-intro"><div><h2>{{ activeTab.name }}</h2><p>{{ activeTab.description }}</p></div><a v-if="section === 'list'" class="text-link" href="#/knowledge/add"><PlatformIcon name="plus" />新增条目</a></div>
    <div v-if="section === 'list' && loadedCategories.length" class="knowledge-distribution"><div><span class="micro-label">LIBRARY COMPOSITION</span><h3>已加载知识分布</h3></div><div class="category-distribution-items"><span v-for="category in loadedCategories" :key="category.name">{{ category.name }}<strong>{{ category.count }}</strong></span></div></div>
    <div class="feature-surface knowledge-surface"><KBBrowser v-if="section === 'list'" @edit="openEdit" /><KBBuild v-else-if="section === 'import'" /><KBAdd v-else /></div>
    <div class="workspace-note"><PlatformIcon name="book" /><span>知识库由现有服务提供，新增或编辑后将自动更新列表。</span></div>
    <KBEdit ref="editDialogRef" />
  </div>
</template>
