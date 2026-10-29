<script setup>
import { ref, nextTick } from 'vue'
import { MagicStick, DocumentChecked, EditPen, DataAnalysis, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const inputText = ref('')
const initialProblem = ref('') // 新增：初始问题
const textareaRef = ref(null)
const isDetecting = ref(false)
const showResult = ref(false)
const hasTriggeredDetection = ref(false)

const result = ref({
  score: 0,
  hasHallucination: false,
  analysis: '',
  optimizedText: ''
})

const insertNewLine = () => {
  // 保持现有逻辑，针对 initialProblem (用户输入框)
  // 如果需要区分具体哪个输入框触发，可以改造，但这里主要是主输入框
  // 假设主输入框是 initialProblem
  // (后续模板中会绑定 initialProblem)
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
    hasHallucination: false,
    analysis: '',
    optimizedText: ''
  }

  try {
    const response = await fetch('/api/v1/llm/hallucination', {
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

    // 2. 幻觉指数 (hallucination_score)
    let score = data.hallucination_score || 0
    // 如果是小数则转换为百分比
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
      // 假设分数大于 20 判定为有幻觉，或者根据 suppressed_answer 是否变化
      hasHallucination: score > 20, 
      analysis: reason,
      optimizedText: optimized
    }
    
    showResult.value = true

  } catch (error) {
    console.error('Hallucination detection error:', error)
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
  <div class="hallucination-container enriched-detection" :class="{ 'is-triggered': hasTriggeredDetection }">
    <el-row :gutter="20" class="main-row">
      <el-col :span="hasTriggeredDetection ? 12 : 24" class="left-col transition-col">
        <el-card class="input-card top-card" shadow="never" :class="{ 'is-shrunk': hasTriggeredDetection }"><template #header><div class="card-header"><span class="title"><span class="panel-step">01</span>初始问题</span><span class="request-status" :class="{ busy: isDetecting }"><span></span>{{ isDetecting ? '分析中' : showResult ? '已生成报告' : '等待提交' }}</span></div></template><div class="input-wrapper"><div class="field-heading"><label>你希望模型回答什么？</label><span>输入一个完整的问题</span></div><el-input ref="textareaRef" v-model="initialProblem" type="textarea" :rows="hasTriggeredDetection ? 5 : 8" placeholder="输入你的问题，或使用下方示例开始评估…" resize="none" class="custom-textarea" aria-label="初始问题" @keydown.enter.exact.prevent="handleDetect" /><InputAssist :text="initialProblem" :disabled="isDetecting" shortcut="Enter 生成并检测" :examples="[{ label: '事实核验', text: '长城能否在月球上用肉眼看到？请说明原因。' }, { label: '知识问答', text: '水在不同海拔下的沸点会发生什么变化？' }, { label: '历史事实', text: '请介绍人类首次登月的时间、任务名称与参加人员。' }]" @select="initialProblem = $event" @clear="initialProblem = ''" /><div class="button-area"><el-button type="primary" size="large" :loading="isDetecting" @click="handleDetect" class="detect-btn"><el-icon class="el-icon--left"><DataAnalysis /></el-icon>{{ hasTriggeredDetection ? '重新检测' : '开始幻觉检测' }}</el-button></div></div></el-card>
        <el-card v-if="hasTriggeredDetection" class="input-card bottom-card" shadow="never"><template #header><div class="card-header"><span class="title"><el-icon><DocumentChecked /></el-icon>模型原始回答</span><span class="quiet-badge">ORIGINAL RESPONSE</span></div></template><div class="input-wrapper"><el-input v-model="inputText" type="textarea" :rows="8" readonly resize="none" class="custom-textarea readonly-textarea" aria-label="模型原始回答" /><p class="field-help">保留原始响应，便于与右侧分析及修正建议对照阅读。</p></div></el-card>
      </el-col>
      <el-col :span="12" class="right-col transition-col" v-if="hasTriggeredDetection">
        <div v-if="isDetecting" class="loading-state"><ResultPlaceholder loading description="模型正在生成响应并进行评估，分析完成后将展示报告。" :items="['原始回答', '幻觉指数', '修正建议']" icon="brain" /><el-skeleton :rows="6" animated /></div>
        <div v-else-if="showResult" class="result-wrapper">
          <el-card class="result-card analysis-card" shadow="never"><template #header><div class="card-header"><span class="title"><span class="panel-step">02</span>检测分析</span><el-tag :type="result.hasHallucination ? 'danger' : 'success'" effect="plain">{{ result.hasHallucination ? '发现幻觉' : '内容可靠' }}</el-tag></div></template><div class="analysis-content"><div class="score-area"><el-progress type="dashboard" :percentage="result.score" :color="result.hasHallucination ? '#F56C6C' : '#67C23A'" :width="120"><template #default="{ percentage }"><span class="percentage-value">{{ percentage }}%</span><span class="percentage-label">幻觉指数</span></template></el-progress></div><div class="text-analysis"><span class="micro-label">MODEL ASSESSMENT</span><h4>分析结论</h4><p>{{ result.analysis }}</p></div></div></el-card>
          <el-card class="result-card optimized-card" shadow="never"><template #header><div class="card-header"><span class="title"><span class="panel-step">03</span>修正建议（去幻觉）</span><el-button type="primary" link @click="copyOptimizedText"><el-icon><CopyDocument /></el-icon>复制建议</el-button></div></template><div class="optimized-content-wrapper"><div class="optimized-content">{{ result.optimizedText }}</div></div></el-card>
        </div>
        <ResultPlaceholder v-else title="暂未生成有效报告" description="本次请求未获取到结果，可在左侧调整问题后重新检测。" :items="['重新输入', '重新检测']" icon="brain" />
      </el-col>
    </el-row>
    <ResultPlaceholder v-if="!hasTriggeredDetection" title="从一个问题开始，了解模型的可靠性" description="模型原始回答、检测分析和修正建议将在提交后展示。" :items="['原始回答对照', '幻觉指数', '修正建议']" icon="brain" />
  </div>
</template>

<style scoped>
.hallucination-container {
  max-width: 1200px;
  margin: 0 auto;
  transition: all 0.5s ease-in-out;
}
.hallucination-container.is-triggered {
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
.hallucination-container.is-triggered .left-col,
.hallucination-container.is-triggered .right-col {
  height: 100%;
}
.input-card {
  display: flex;
  flex-direction: column;
  transition: all 0.5s;
}
/* 初始状态只需一个卡片高度 */
.input-card.top-card {
   min-height: 350px;
}
/* 触发后左侧有两个卡片，高度自适应 */
.hallucination-container.is-triggered .input-card {
   height: auto;
   flex: 1; /* 均分高度 */
   margin-bottom: 20px;
   min-height: 0;
}
/* 最后一个卡片不需要下边距 */
.hallucination-container.is-triggered .input-card:last-child {
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
/* 移除之前的 flex:1 强制，让rows控制高度或者 flex 控制 */
.hallucination-container.is-triggered .custom-textarea {
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
  height: 100%; /* 确保填满容器 */
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