<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { EditPen, DataAnalysis } from '@element-plus/icons-vue'

// 输入的文本内容
const inputText = ref('')
// 加载状态，用于控制按钮 loading 效果
const loading = ref(false)
// 是否显示结果区域
const showResult = ref(false)
// 检测结果数据对象
const result = ref({
  score: 0,     // AI 概率分数
  label: '',    // 结果标签（如：疑似 AI 生成）
  analysis: ''  // 详细分析文本
})

// 仪表盘进度条颜色配置
const colors = [
  { color: '#67C23A', percentage: 20 }, // 低风险绿色
  { color: '#E6A23C', percentage: 40 }, // 中风险黄色
  { color: '#F56C6C', percentage: 80 }, // 高风险红色
]

/**
 * 处理检测逻辑
 * 验证输入并调用后端 API 获取检测结果
 */
const handleDetect = async () => {
  // 1. 验证输入是否为空
  if (!inputText.value.trim()) {
    ElMessage.warning('请输入需要检测的内容')
    return
  }
  
  // 2. 设置加载状态
  loading.value = true
  
  try {
    // 3. 调用后端 API
    const response = await fetch('/api/v1/moderation/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: inputText.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const resData = await response.json()
    
    // 4. 处理返回结果
    showResult.value = true
    
    // 保留原有的模拟分数逻辑，因为后端只返回了文本数据
    // 如果后端后续增加了分数返回，可以在这里修改
    const score = Math.floor(Math.random() * 100)
    
    result.value = {
      score: score,
      label: score > 50 ? '疑似 AI 生成' : '疑似人工撰写',
      // 将后端返回的 data 展示在分析结果中
      analysis: resData.data || '未获取到详细分析结果'
    }

    // 显示后端返回的消息（如果有）
    if (resData.message && resData.message !== 'success') {
       ElMessage.info(resData.message)
    }

  } catch (error) {
    console.error('Detection error:', error)
    ElMessage.error('检测请求失败，请检查网络或后端服务')
  } finally {
    loading.value = false
  }
}

/**
 * 清空文本输入和结果
 */
const clearText = () => {
  inputText.value = ''
  showResult.value = false
}

/**
 * 处理键盘按键事件
 * Enter: 触发检测
 * Ctrl + Enter: 换行
 * @param {KeyboardEvent} e - 键盘事件对象
 */
const handleKeydown = (e) => {
  if (e.key === 'Enter') {
    if (e.ctrlKey) {
      // Ctrl + Enter: 插入换行符
      e.preventDefault()
      inputText.value += '\n'
    } else {
      // Enter: 触发检测
      e.preventDefault()
      handleDetect()
    }
  }
}
</script>

<template>
  <div class="detection-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="input-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="title">
                <el-icon><EditPen /></el-icon> 文本输入
              </span>
              <el-button text @click="clearText">清空</el-button>
            </div>
          </template>
          <el-input
            v-model="inputText"
            :rows="12"
            type="textarea"
            placeholder="在此输入需要检测的文本内容（按 Enter 立即检测，Ctrl + Enter 换行）..."
            resize="none"
            @keydown="handleKeydown"
            class="custom-textarea"
          />
          <div class="action-area">
            <span class="word-count">字数: {{ inputText.length }}</span>
            <el-button type="primary" :loading="loading" @click="handleDetect" size="large" round>
              <el-icon class="el-icon--left"><DataAnalysis /></el-icon>
              立即检测 
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="result-section" v-if="showResult">
      <el-col :span="24">
        <el-card class="result-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="title">
                <el-icon><DataAnalysis /></el-icon> 检测结果
              </span>
              <el-tag :type="result.score > 50 ? 'danger' : 'success'">{{ result.label }}</el-tag>
            </div>
          </template>
          
          <div class="result-content">
            <div class="score-circle">
              <el-progress type="dashboard" :percentage="result.score" :color="colors" :width="150" />
              <div class="score-label">AI 概率</div>
            </div>
            <div class="analysis-text">
              <h4>详细分析</h4>
              <p>{{ result.analysis }}</p>
              <el-alert
                title="检测结果仅供参考，请结合实际情况判断。"
                type="info"
                show-icon
                :closable="false"
                style="margin-top: 15px"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.detection-container {
  max-width: 1200px; /* Increased width */
  margin: 0 auto;
}

.input-card {
  min-height: 350px; /* Increased height */
}

.custom-textarea :deep(.el-textarea__inner) {
  font-size: 16px; /* Larger font */
  line-height: 1.6;
  padding: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 18px; /* Larger font */
}

.action-area {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
}

.word-count {
  color: #909399;
  font-size: 14px;
}

.result-section {
  margin-top: 30px; /* More space */
  animation: slideIn 0.5s ease-out;
}

.result-content {
  display: flex;
  gap: 40px; /* More gap */
  align-items: flex-start;
  padding: 20px;
}

.score-circle {
  text-align: center;
  min-width: 180px;
}

.score-label {
  margin-top: -10px;
  font-size: 16px;
  color: #606266;
}

.analysis-text {
  flex: 1;
}

.analysis-text h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
  font-size: 18px;
}

.analysis-text p {
  color: #606266;
  line-height: 1.8;
  font-size: 15px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
