<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Picture, DataAnalysis } from '@element-plus/icons-vue'

// 图片预览地址
const imageUrl = ref('')
// 当前上传的文件对象
const currentFile = ref(null)
// 加载状态
const loading = ref(false)
// 是否显示结果区域
const showResult = ref(false)
// 上传组件引用
const uploadRef = ref(null)
// 检测结果数据
const result = ref({
  score: 0,
  label: '',
  analysis: ''
})

// 仪表盘颜色配置
const colors = [
  { color: '#67C23A', percentage: 20 },
  { color: '#E6A23C', percentage: 40 },
  { color: '#F56C6C', percentage: 80 },
]

/**
 * 处理文件选择变更
 * 生成本地预览 URL 并重置结果状态
 * @param {Object} uploadFile - 上传的文件对象
 */
const handleFileChange = (uploadFile) => {
  const rawFile = uploadFile.raw
  const isImage = rawFile.type.startsWith('image/')
  
  if (!isImage) {
    ElMessage.error('上传文件格式不正确，请上传图片文件 (jpg/png/webp 等)')
    // 清除错误文件
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
    return
  }

  currentFile.value = rawFile
  imageUrl.value = URL.createObjectURL(rawFile)
  showResult.value = false
}

/**
 * 处理图片检测逻辑
 * 验证图片并调用后端 API
 */
const handleDetect = async () => {
  // 1. 验证是否已上传图片
  if (!imageUrl.value || !currentFile.value) {
    ElMessage.warning('请先上传需要检测的图片')
    return
  }
  
  loading.value = true
  
  try {
    // 2. 构建 FormData
    const formData = new FormData()
    formData.append('image', currentFile.value)

    // 3. 调用后端 API
    const response = await fetch('/api/askimg', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const resData = await response.json()
    
    // 4. 处理返回结果
    showResult.value = true
    
    if (resData.data) {
      const { isFake, confidence, explanation } = resData.data
      
      // 将置信度转换为百分比分数 (0-1 -> 0-100)
      const score = Math.round(confidence * 100)
      
      result.value = {
        score: score,
        label: isFake ? '疑似 AI 生成' : '疑似实拍图片',
        analysis: explanation || '未获取到详细解释说明'
      }
    } else {
      // 兜底处理
      result.value = {
        score: 0,
        label: '检测失败',
        analysis: '未能获取有效检测数据'
      }
    }

    // 显示后端返回的消息（如果有错误或提示）
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
 * 清空图片和结果
 * 重置上传组件状态
 */
const clearImage = () => {
  imageUrl.value = ''
  currentFile.value = null
  showResult.value = false
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

/**
 * 处理键盘按键事件
 * 仅在非 Ctrl/Shift/Alt 组合键下的 Enter 触发检测
 * @param {KeyboardEvent} e - 键盘事件对象
 */
const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
    // 仅当有图片且未在加载中时触发
    if (imageUrl.value && !loading.value) {
      e.preventDefault()
      handleDetect()
    }
  }
}
</script>

<template>
  <div class="detection-container" @keydown="handleKeydown" tabindex="0">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="input-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="title">
                <el-icon><Picture /></el-icon> 图片上传
              </span>
              <el-button text @click="clearImage" v-if="imageUrl">清空</el-button>
            </div>
          </template>
          
          <div class="upload-area">
            <el-upload
              ref="uploadRef"
              class="upload-demo"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :show-file-list="false"
              accept="image/*"
              v-if="!imageUrl"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或 <em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 jpg/png 文件，大小不超过 5MB
                </div>
              </template>
            </el-upload>

            <div v-else class="image-preview-wrapper">
              <el-image 
                :src="imageUrl" 
                class="image-preview" 
                :preview-src-list="[imageUrl]"
                fit="contain"
                :hide-on-click-modal="true"
                :preview-teleported="true"
              />
              <div class="image-overlay">
                <el-button type="primary" @click="handleDetect" :loading="loading" size="large" round>
                  立即检测
                </el-button>
              </div>
            </div>
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
              <el-progress type="dashboard" :percentage="result.score" :color="colors" />
              <div class="score-label">AI 概率</div>
            </div>
            <div class="analysis-text">
              <h4>详细分析</h4>
              <p>{{ result.analysis }}</p>
              <div class="heatmap-placeholder">
                <!-- Placeholder for heatmap or visual analysis -->
                <div class="fake-heatmap"></div>
                <span>热力图分析示例</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.detection-container {
  max-width: 1200px; /* Increased width for "spacious" look */
  margin: 0 auto;
  outline: none; /* Remove focus outline */
}

.input-card {
  min-height: 300px; /* Taller input area */
  display: flex;
  flex-direction: column;
}

.upload-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 20px;
}

.upload-demo {
  width: 100%;
}

.image-preview-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-preview {
  display: block;
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.image-overlay {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 30px;
  backdrop-filter: blur(5px);
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

.analysis-text {
  flex: 1;
}

.heatmap-placeholder {
  margin-top: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  background: #fafafa;
}

.fake-heatmap {
  height: 100px;
  background: linear-gradient(90deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%);
  opacity: 0.5;
  margin-bottom: 10px;
  border-radius: 4px;
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
