<script setup>
import { ref } from 'vue'
// 引入各个功能组件
import TextDetection from './components/TextDetection.vue'
import ImageDetection from './components/ImageDetection.vue'
import ImageTextDetection from './components/ImageTextDetection.vue'
import HallucinationDetection from './components/HallucinationDetection.vue'
import SycophancyDetection from './components/SycophancyDetection.vue'
import TextWatermark from './components/TextWatermark.vue'
import AuditPanel from './components/safety/AuditPanel.vue'
import KBBuild from './components/safety/KBBuild.vue'
import KBBrowser from './components/safety/KBBrowser.vue'
import KBAdd from './components/safety/KBAdd.vue'
import KBEdit from './components/safety/KBEdit.vue'

import { onMounted } from 'vue'
import { useSystemStore } from './stores/system'
import { useKBStore } from './stores/kb'

const systemStore = useSystemStore()
const kbStore = useKBStore()

const editDialogRef = ref(null)

const openEdit = (row) => {
  editDialogRef.value?.open(row)
}

onMounted(async () => {
  await systemStore.fetchConfigState()
  await kbStore.loadAll()
})

// 当前激活的菜单索引，默认选中 '1-3' (图文检测)
const activeIndex = ref('1-3')
// 当前显示的视图名称，用于标题显示和组件切换
const currentView = ref('图文检测')

/**
 * 处理菜单选择事件
 * 根据选中的菜单项索引更新当前视图
 * @param {string} key - 选中的菜单项 index
 * @param {string[]} keyPath - 菜单项的路径数组
 */
const handleSelect = (key, keyPath) => {
  // 定义菜单索引到视图名称的映射关系
  const viewMap = {
    '1-3': '图文检测',
    '1-4': '幻觉检测',
    '1-5': '谄媚检测',
    '2': '文本水印',
    '3': '历史记录',
    '4-1': '内容安全审核',
    '4-2': '导入知识库',
    '4-3': '知识库列表',
    '4-4': '新增知识'
  }
  // 更新当前视图，如果未匹配到则默认为 '图文检测'
  currentView.value = viewMap[key] || '图文检测'
}
</script>

<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <!-- 顶部 Header 区域 -->
      <el-header class="header">
        <div class="logo">大模型检测平台</div>
        <div class="user-info">Admin</div>
      </el-header>
      
      <el-container>
        <!-- 左侧侧边栏导航区域 -->
        <el-aside width="200px" class="aside">
          <el-menu
            :default-active="activeIndex"
            class="el-menu-vertical-demo"
            @select="handleSelect"
          >
            <!-- 一级菜单：价值观检测 -->
            <el-sub-menu index="1">
              <template #title>
                <span>价值观检测</span>
              </template>
              <el-menu-item index="1-3">图文</el-menu-item>
              <el-menu-item index="1-4">幻觉</el-menu-item>
              <el-menu-item index="1-5">谄媚</el-menu-item>
            </el-sub-menu>
            
            <!-- 一级菜单：文本水印 -->
            <el-menu-item index="2">
              <span>文本水印</span>
            </el-menu-item>
            
            <!-- 一级菜单：历史记录 -->
            <el-menu-item index="3">
              <span>历史记录</span>
            </el-menu-item>

            <!-- 一级菜单：内容安全审核 -->
            <el-sub-menu index="4">
              <template #title>
                <span>涉政内容审核</span>
              </template>
              <el-menu-item index="4-1">内容安全审核</el-menu-item>
              <el-menu-item index="4-2">导入知识库</el-menu-item>
              <el-menu-item index="4-3">知识库管理</el-menu-item>
              <el-menu-item index="4-4">新增知识条目</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>
        
        <!-- 右侧主要内容区域 -->
        <el-main class="main">
          <div class="content-wrapper">
            <!-- 动态显示标题，仅在非检测类视图显示，因为检测组件内部自带标题或不需要标题 -->
            <h2 v-if="currentView === '历史记录'">{{ currentView }}</h2>
            
            <!-- 根据 currentView 动态渲染对应的组件 -->
            <TextDetection v-if="currentView === '文本检测'" />
            <ImageDetection v-else-if="currentView === '图片检测'" />
            <HallucinationDetection v-else-if="currentView === '幻觉检测'" />
            <SycophancyDetection v-else-if="currentView === '谄媚检测'" />
            <ImageTextDetection v-else-if="currentView === '图文检测'" />
            <TextWatermark v-else-if="currentView === '文本水印'" />
            <AuditPanel v-else-if="currentView === '内容安全审核'" />
            <KBBuild v-else-if="currentView === '导入知识库'" />
            <KBBrowser v-else-if="currentView === '知识库列表'" @edit="openEdit" />
            <KBAdd v-else-if="currentView === '新增知识'" />
            
            <!-- 默认空状态，用于未开发的功能（如历史记录） -->
            <el-empty v-else :description="currentView + ' 功能区域'" />
            
            <KBEdit ref="editDialogRef" />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
}

.header {
  background-color: #409EFF;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
}

.aside {
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
}

.content-wrapper {
  background: white;
  padding: 20px;
  border-radius: 4px;
  height: 100%;
  box-sizing: border-box;
}
</style>
