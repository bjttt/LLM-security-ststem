<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import PlatformIcon from './components/ui/PlatformIcon.vue'
const OverviewView = defineAsyncComponent(() => import('./views/OverviewView.vue'))
const WorkspaceView = defineAsyncComponent(() => import('./views/WorkspaceView.vue'))
const KnowledgeView = defineAsyncComponent(() => import('./views/KnowledgeView.vue'))
import { primaryPages, detectionTools, knowledgeTabs, parseRoute } from './navigation/pages'
import { useSystemStore } from './stores/system'
import { useKBStore } from './stores/kb'

const systemStore = useSystemStore()
const kbStore = useKBStore()
const route = ref(parseRoute(window.location.hash))
const sidebarOpen = ref(false)
const loading = ref(true)
const helpOpen = ref(false)
const currentPage = computed(() => primaryPages.find(page => page.id === route.value.page))
const currentSection = computed(() => route.value.page === 'workspace' ? detectionTools.find(tool => tool.id === route.value.section)?.name : route.value.page === 'knowledge' ? knowledgeTabs.find(tab => tab.id === route.value.section)?.name : '')
const syncRoute = () => {
  route.value = parseRoute(window.location.hash)
  sidebarOpen.value = false
  document.title = (currentSection.value || currentPage.value.name) + ' · 大模型检测平台'
  window.scrollTo({ top: 0, behavior: 'instant' })
}
const handleEscape = (event) => { if (event.key === 'Escape') sidebarOpen.value = false }

const loadPageData = async () => {
  const { page, section } = route.value
  if (page === 'knowledge' || (page === 'workspace' && section === 'audit')) {
    // Preserve the legacy services, loading them only when their pages are opened.
    await Promise.allSettled([systemStore.fetchConfigState(), kbStore.loadAll()])
  } else {
    await systemStore.fetchModelConfig()
  }
}
watch(() => `${route.value.page}/${route.value.section}`, loadPageData)

onMounted(async () => {
  window.addEventListener('hashchange', syncRoute)
  window.addEventListener('keydown', handleEscape)
  syncRoute()
  // Core detection does not wait for the optional legacy knowledge service.
  try {
    await loadPageData()
  } finally {
    loading.value = false
  }
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncRoute)
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="platform-shell">
    <button v-if="sidebarOpen" class="sidebar-scrim" aria-label="关闭导航" @click="sidebarOpen = false"></button>
    <aside class="sidebar" :class="{ 'is-open': sidebarOpen }">
      <a class="brand" href="#/overview"><span class="brand-mark"><PlatformIcon name="shield" /></span><span><strong>大模型检测平台</strong><small>AI SAFETY PLATFORM</small></span></a>
      <div class="sidebar-workspace"><span class="workspace-symbol">S</span><div><strong>安全评估空间</strong><small>Safety workspace</small></div><span class="workspace-dot"></span></div>
      <div class="nav-label">工作空间 <span>WORKSPACE</span></div>
      <nav class="primary-nav" aria-label="主导航"><a v-for="page in primaryPages" :key="page.id" :href="page.href" :class="{ active: route.page === page.id }" :aria-current="route.page === page.id ? 'page' : undefined"><PlatformIcon :name="page.icon" /><span>{{ page.name }}</span><PlatformIcon v-if="route.page === page.id" class="nav-arrow" name="chevron" /></a></nav>
      <div class="nav-label tools-label">快捷工具 <span>TOOLS</span></div>
      <nav class="shortcut-nav" aria-label="快捷工具"><a v-for="tool in detectionTools" :key="tool.id" :href="'#/workspace/' + tool.id" :class="{ selected: route.page === 'workspace' && route.section === tool.id }"><PlatformIcon :name="tool.icon" />{{ tool.name }}</a></nav>
      <div class="sidebar-bottom"><div class="sidebar-tip"><PlatformIcon name="spark" /><h3>为可信 AI 而构建</h3><p>用清晰的评估，守护每一份生成内容。</p><a href="#/workspace/multimodal">开启检测 <PlatformIcon name="arrow" /></a></div><button class="sidebar-help" @click="helpOpen = true"><PlatformIcon name="help" />使用指南<PlatformIcon name="chevron" /></button><div class="sidebar-version"><span class="workspace-dot"></span>AI SAFETY · 工作空间</div></div>
    </aside>
    <div class="main-shell">
      <header class="topbar"><div class="breadcrumb"><button class="mobile-menu icon-button" aria-label="打开导航" :aria-expanded="sidebarOpen" @click="sidebarOpen = !sidebarOpen"><PlatformIcon name="menu" /></button><span class="breadcrumb-root">工作空间</span><PlatformIcon name="chevron" /><span>{{ currentPage.name }}</span><template v-if="currentSection"><PlatformIcon name="chevron" /><span class="breadcrumb-section">{{ currentSection }}</span></template></div><div class="topbar-right"><span class="topbar-label">AI 内容安全评估</span><span class="topbar-divider"></span><span class="avatar">A</span><div class="user-label"><strong>Admin</strong><small>管理员</small></div></div></header>
      <main class="main-content" id="main-content"><OverviewView v-if="route.page === 'overview'" :loading="loading" /><WorkspaceView v-else-if="route.page === 'workspace'" :section="route.section" /><KnowledgeView v-else :section="route.section" /><footer class="page-footer"><span>大模型检测平台 <span class="footer-divider">/</span> 让智能更值得信任</span><span>AI SAFETY PLATFORM</span></footer></main>
    </div>
    <el-dialog v-model="helpOpen" title="使用指南" width="min(560px, 92vw)" class="guide-dialog"><div class="help-content"><p>通过左侧导航，在三个页面之间切换：</p><ul><li><strong>平台概览：</strong>查看平台能力、已加载的知识与模型配置，快速进入检测场景。</li><li><strong>检测工作台：</strong>选择图文检测、幻觉检测、谄媚检测、文本水印或内容安全审核，提交内容后查看结果。</li><li><strong>知识库：</strong>搜索和编辑知识条目，新增记录或导入 CSV 数据集。</li></ul><p>图文检测支持 Enter 提交、Ctrl + Enter 换行。各检测工具沿用现有服务进行分析。</p></div><template #footer><el-button type="primary" @click="helpOpen = false">知道了</el-button></template></el-dialog>
  </div>
</template>

<style scoped>
:deep(.overview-view .metric-card:has(.model-value)) {
  display: none;
}

:deep(.overview-view .metric-grid) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 640px) {
  :deep(.overview-view .metric-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
