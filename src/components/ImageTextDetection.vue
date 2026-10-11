<script setup>
import { ref, reactive, nextTick } from 'vue'
import { Plus, ZoomIn, Delete, UploadFilled, DataAnalysis, EditPen } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// --- 输入区域状态 ---
const textContent = ref('')
const textareaRef = ref(null)
const fileList = ref([])
const dialogImageUrl = ref('')
const dialogVisible = ref(false)
const isDetecting = ref(false)

// --- 结果区域状态 ---
const showResult = ref(false)
const resultDescription = ref('')
// 16个检测维度配置
const categories = [
  { key: 'porn', label: '涉黄' },
  { key: 'politics', label: '涉政' },
  { key: 'illegal', label: '违禁' },
  { key: 'terrorism', label: '暴恐' },
  { key: 'abusive', label: '谩骂' },
  { key: 'advertising', label: '广告' },
  { key: 'party_gov_leaders', label: '涉及党政机关及领导人' },
  { key: 'hmt_sovereignty', label: '涉及港澳台和领土主权' },
  { key: 'laws_regulation', label: '涉及法律法规' },
  { key: 'ethnic_religion', label: '涉及民族宗教' },
  { key: 'national_security', label: '涉及国家安全与核心机密' },
  { key: 'international_relations', label: '涉及国际关系' },
  { key: 'current_affairs', label: '涉及时政与社会生活' },
  { key: 'sensitive_people_events', label: '涉及敏感人物与事件' },
  { key: 'privacy_leak', label: '涉及个人隐私泄露' },
  { key: 'historical_nihilism_fake', label: '涉及历史虚无主义与造谣' }
]

// 存储检测结果（key: boolean）
const detectionResult = reactive({})

// --- 图片上传相关逻辑 ---

// 删除图片
const handleRemove = (uploadFile) => {
  const index = fileList.value.indexOf(uploadFile)
  if (index !== -1) {
    fileList.value.splice(index, 1)
  }
}

// 预览图片
const handlePictureCardPreview = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url
  dialogVisible.value = true
}

// 上传前校验
const beforeUpload = (rawFile) => {
  if (rawFile.type.indexOf('image/') === -1) {
    ElMessage.error('请上传图片格式文件!')
    return false
  }
  if (rawFile.size / 1024 / 1024 > 10) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

// --- 键盘事件处理 ---
const insertNewLine = () => {
  const textarea = textareaRef.value.textarea
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  textContent.value = textContent.value.substring(0, start) + '\n' + textContent.value.substring(end)
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1
    textarea.focus()
  })
}

// --- 检测逻辑 ---
const handleDetect = async () => {
  if (!textContent.value && fileList.value.length === 0) {
    ElMessage.warning('请输入文本或上传图片进行检测')
    return
  }

  isDetecting.value = true
  showResult.value = false

  try {
    const formData = new FormData()
    formData.append('text', textContent.value)
    // 当前界面无直接输入图片URL的功能，故传空字符串，主要依托上传的 file
    formData.append('imageUrls', '') 
    
    // 如果有上传文件，取第一个文件作为 file 参数发送
    if (fileList.value.length > 0) {
      formData.append('file', fileList.value[0].raw)
    }
    
    formData.append('stream', false)

    const response = await fetch('/api/v1/moderation/multimodal/check', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const res = await response.json()
    
    // 后端返回结构调整：
    // code: number
    // message: string (状态描述)
    // data: {
    //   labels: { ...16 keys... },
    //   comment: string (检测分析)
    // }
    
    let data = res.data || {}
    if (typeof data === 'string') {
      // 1. 去除 ```json 或 ``` 标记
      let cleanedData = data.replace(/```json/g, '').replace(/```/g, '').trim()
      data = JSON.parse(cleanedData)
    }
    const labels = data.labels || {}

    // 更新检测结果状态
    categories.forEach(cat => {
      // 后端返回 1 表示有该类违规，0 表示无
      detectionResult[cat.key] = labels[cat.key] === 1
    })

    // 设置结果描述信息，使用 data.comment 替换原来的 message
    resultDescription.value = data.comment || '检测完成'
    console.log(data)
    showResult.value = true

  } catch (error) {
    console.error('Detection error:', error)
    ElMessage.error('检测请求失败，请检查网络或后端服务')
  } finally {
    isDetecting.value = false
  }
}
</script>

<template>
  <div class="image-text-detection-container">
    <!-- 上部分：输入区域 -->
    <el-card class="input-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="title"><el-icon><EditPen /></el-icon> 图文检测</span>
        </div>
      </template>
      
      <div class="input-content">
        <!-- 文本输入 -->
        <el-input
          ref="textareaRef"
          v-model="textContent"
          :rows="6"
          type="textarea"
          placeholder="请输入需要检测的文本内容... (Enter 立即检测, Ctrl+Enter 换行)"
          resize="none"
          class="text-area"
          @keydown.enter.exact.prevent="handleDetect"
          @keydown.ctrl.enter.prevent="insertNewLine"
        />
        
        <!-- 图片上传与按钮区域 -->
        <div class="action-area">
          <div class="upload-wrapper">
            <el-upload
              v-model:file-list="fileList"
              action="#"
              list-type="picture-card"
              :auto-upload="false"
              :on-preview="handlePictureCardPreview"
              :on-remove="handleRemove"
              :before-upload="beforeUpload"
              accept="image/*"
              multiple
              class="custom-upload"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </div>
          
          <div class="button-wrapper">
            <el-button 
              type="primary" 
              :loading="isDetecting" 
              @click="handleDetect"
              class="detect-btn"
              size="large"
              round
            >
              <el-icon class="el-icon--left"><DataAnalysis /></el-icon>
              立即检测
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 下部分：结果区域 -->
    <transition name="el-fade-in-linear">
      <el-card v-if="showResult" class="result-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>检测结果</span>
          </div>
        </template>

        <!-- 结果描述 -->
        <div class="result-description" :class="{ 'is-danger': categories.some(c => detectionResult[c.key]) }">
          <p>{{ resultDescription }}</p>
        </div>

        <!-- 16项检测表格 (使用 Descriptions 模拟表格布局) -->
        <el-descriptions class="result-table" :column="4" border title="详细检测项">
          <el-descriptions-item 
            v-for="item in categories" 
            :key="item.key" 
            :label="item.label"
            label-align="center"
            align="center"
          >
            <el-tag v-if="detectionResult[item.key]" type="danger" effect="dark">
              违规
            </el-tag>
            <el-tag v-else type="success" effect="plain">
              正常
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </transition>

    <!-- 图片大图预览 Dialog -->
    <el-dialog v-model="dialogVisible">
      <img w-full :src="dialogImageUrl" alt="Preview Image" style="width: 100%" />
    </el-dialog>
  </div>
</template>

<style scoped>
.image-text-detection-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 18px;
}

.input-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.text-area :deep(.el-textarea__inner) {
  font-family: inherit;
  padding: 15px;
  font-size: 16px;
}

.action-area {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.upload-wrapper {
  flex: 1;
}

.button-wrapper {
  margin-left: 20px;
  margin-bottom: 8px; /* Align with the bottom of upload cards */
}

.detect-btn {
  padding: 12px 30px;
  font-weight: bold;
  transition: all 0.3s;
}

.detect-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.result-description {
  padding: 15px;
  background-color: #f0f9eb;
  border-left: 5px solid #67c23a;
  margin-bottom: 20px;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
}

.result-description.is-danger {
  background-color: #fef0f0;
  border-left-color: #f56c6c;
  color: #f56c6c;
}

.result-table :deep(.el-descriptions__label) {
  width: 150px;
  font-weight: bold;
  color: #606266;
}
</style>
