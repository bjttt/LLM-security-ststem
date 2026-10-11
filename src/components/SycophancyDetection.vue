<script setup>
import { ref, nextTick } from 'vue'
import { MagicStick, DocumentChecked, EditPen, DataAnalysis, CopyDocument, ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const inputText = ref('')
const initialProblem = ref('') // 新增：初始问题
const textareaRef = ref(null)
const isDetecting = ref(false)
const showResult = ref(false)
const hasTriggeredDetection = ref(false)

const result = ref({
  score: 0,
  hasSycophancy: false,
  analysis: '',
  optimizedText: ''
})

const insertNewLine = () => {
   // Logic placeholder
}

const handleDetect = async () => {
  if (!initialProblem.value.trim()) {
    ElMessage.warning('请输入初始问题')
    return
  }

  hasTriggeredDetection.value = true
  isDetecting.value = true
  showResult.value = false
  
  // 重置结果
  inputText.value = '正在生成模型响应...'
  result.value = {
    score: 0,
    hasSycophancy: false,
    analysis: '',
    optimizedText: ''
  }

  try {
    const response = await fetch('/api/v1/llm/sycophancy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: initialProblem.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const res = await response.json()
    console.log('服务端返回数据:', res)

    // 解析 date 字段 (兼容 data 拼写)
    let data = res.data || {}

    // 1. 初始结果 (normal_answer)
    inputText.value = data.normal_answer || ''

    // 2. 谄媚指数 (Sycophancy_score)
    let score = data.Sycophancy_score || 0
    // 如果是小数则转换为百分比 (例如 0.85 -> 85)
    if (score <= 1 && score > 0) {
      score = 100 - Math.floor(score * 100)
    } else {
      score = 100 - Math.floor(score)
    }

    // 3. 分析结论 (reason)
    const reason = JSON.parse(data.raw_score_output).reason || res.message || '未获取到详细分析'

    // 4. 修正建议 (suppressed_answer)
    const optimized = data.suppressed_answer || ''

    result.value = {
      score: score,
      // 假设分数大于 40 判定为有谄媚倾向
      hasSycophancy: score > 40,
      analysis: reason,
      optimizedText: optimized
    }
    
    showResult.value = true

  } catch (error) {
    console.error('Sycophancy detection error:', error)
    ElMessage.error('检测请求失败，请检查网络或后端服务')
    inputText.value = '生成失败，请重试'
  } finally {
    isDetecting.value = false
  }
}

const copyOptimizedText = () => {
  if (!result.value.optimizedText) return
  navigator.clipboard.writeText(result.value.optimizedText).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>

<template>
  <div class="sycophancy-container" :class="{ 'is-triggered': hasTriggeredDetection }">
    <el-row :gutter="20" class="main-row">
      <!-- 左侧：输入区域 -->
      <el-col :span="hasTriggeredDetection ? 12 : 24" class="left-col transition-col">
        <el-card class="input-card top-card" shadow="hover" :class="{ 'is-shrunk': hasTriggeredDetection }">
          <template #header>
            <div class="card-header">
              <span class="title"><el-icon><EditPen /></el-icon> 初始问题</span>
            </div>
          </template>
          <div class="input-wrapper">
            <el-input
              ref="textareaRef"
              v-model="initialProblem"
              type="textarea"
              :rows="hasTriggeredDetection ? 5 : 12"
              placeholder="请输入初始问题... (Enter 立即生成并检测)"
              resize="none"
              class="custom-textarea"
              @keydown.enter.exact.prevent="handleDetect"
            />
            <div class="button-area" v-if="!hasTriggeredDetection">
              <el-button 
                type="primary" 
                size="large" 
                :loading="isDetecting" 
                @click="handleDetect" 
                round
                class="detect-btn"
              >
                <el-icon class="el-icon--left"><DataAnalysis /></el-icon>
                谄媚检测
              </el-button>
            </div>
          </div>
        </el-card>

         <!-- 初始结果响应卡片 (仅在触发后显示) -->
        <el-card v-if="hasTriggeredDetection" class="input-card bottom-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="title"><el-icon><DocumentChecked /></el-icon> 初始结果 (模型响应)</span>
            </div>
          </template>
          <div class="input-wrapper">
             <el-input
              v-model="inputText"
              type="textarea"
              :rows="8"
              readonly
              resize="none"
              class="custom-textarea readonly-textarea"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：结果区域 -->
      <el-col :span="12" class="right-col transition-col" v-if="hasTriggeredDetection">
        <div v-if="isDetecting" class="loading-state">
          <el-skeleton :rows="10" animated />
        </div>

        <div v-else class="result-wrapper">
          <!-- 分析卡片 -->
          <el-card class="result-card analysis-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span><el-icon><DataAnalysis /></el-icon> 检测分析</span>
                <el-tag :type="result.hasSycophancy ? 'danger' : 'success'" effect="dark">
                  {{ result.hasSycophancy ? '发现谄媚' : '内容客观' }}
                </el-tag>
              </div>
            </template>
            <div class="analysis-content">
              <div class="score-area">
                <el-progress 
                  type="dashboard" 
                  :percentage="result.score" 
                  :color="result.hasSycophancy ? '#F56C6C' : '#67C23A'"
                  :width="120"
                >
                  <template #default="{ percentage }">
                    <span class="percentage-value">{{ percentage }}%</span>
                    <span class="percentage-label">谄媚指数</span>
                  </template>
                </el-progress>
              </div>
              <div class="text-analysis">
                <h4>分析结论：</h4>
                <p>{{ result.analysis }}</p>
              </div>
            </div>
          </el-card>

          <!-- 修正建议卡片 -->
          <el-card class="result-card optimized-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span><el-icon><DocumentChecked /></el-icon> 修正建议 (去谄媚)</span>
                <el-button type="primary" link @click="copyOptimizedText">
                  <el-icon><CopyDocument /></el-icon> 复制
                </el-button>
              </div>
            </template>
            <div class="optimized-content-wrapper">
              <div class="optimized-content">
                {{ result.optimizedText }}
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.sycophancy-container {
  max-width: 1200px;
  margin: 0 auto;
  transition: all 0.5s ease-in-out;
}
.sycophancy-container.is-triggered {
  max-width: 100%;
  height: 100%;
}
.main-row {
  height: 100%;
}
.transition-col {
  transition: all 0.5s ease-in-out;
}
.left-col, .right-col {
  display: flex;
  flex-direction: column;
}
.sycophancy-container.is-triggered .left-col,
.sycophancy-container.is-triggered .right-col {
  height: 100%;
}
.input-card {
  display: flex;
  flex-direction: column;
  transition: all 0.5s;
}
.input-card.top-card {
   min-height: 350px;
}
.sycophancy-container.is-triggered .input-card {
   height: auto;
   flex: 1;
   margin-bottom: 20px;
   min-height: 0;
}
.sycophancy-container.is-triggered .input-card:last-child {
   margin-bottom: 0;
}

.input-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.custom-textarea {
  margin-bottom: 20px;
  transition: all 0.5s;
  flex: 1;
}
.sycophancy-container.is-triggered .custom-textarea {
  flex: 1;
  margin-bottom: 0;
}
.readonly-textarea :deep(.el-textarea__inner) {
    background-color: #f5f7fa;
    color: #606266;
}
.custom-textarea :deep(.el-textarea__inner) {
  font-size: 16px;
  line-height: 1.6;
  padding: 15px;
  font-family: inherit;
  transition: all 0.5s;
  height: 100%;
}
.button-area {
  text-align: right;
}
.detect-btn {
  padding: 12px 40px;
  font-weight: bold;
  transition: all 0.3s;
}
.detect-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.result-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}
.result-card {
  display: flex;
  flex-direction: column;
}
.analysis-card {
  flex: 0 0 auto; /* 不自动伸缩 */
}
.optimized-card {
  flex: 1; /* 占据剩余空间 */
  display: flex;
  flex-direction: column;
}
.optimized-card :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}
.analysis-content {
  display: flex;
  align-items: center;
  gap: 30px;
}
.score-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.percentage-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
}
.percentage-label {
  display: block;
  font-size: 12px;
  color: #909399;
}
.text-analysis {
  flex: 1;
  line-height: 1.6;
  color: #606266;
}
.text-analysis h4 {
  margin: 0 0 10px 0;
  color: #303133;
}
.optimized-content-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f0f9eb;
}
.optimized-content {
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  font-size: 15px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}
.card-header .el-icon {
  margin-right: 5px;
  vertical-align: middle;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 18px;
}

.score-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.percentage-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
}
.percentage-label {
  display: block;
  font-size: 12px;
  color: #909399;
}
.text-analysis {
  flex: 1;
  line-height: 1.6;
  color: #606266;
}
.text-analysis h4 {
  margin: 0 0 10px 0;
  color: #303133;
}
.optimized-content-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f0f9eb;
}
.optimized-content {
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  font-size: 15px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}
.card-header .el-icon {
  margin-right: 5px;
  vertical-align: middle;
}
.empty-state {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.loading-state {
  background: white;
  padding: 20px;
  border-radius: 4px;
}
</style>