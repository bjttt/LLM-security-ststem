<script setup>
import { ref, reactive, nextTick } from 'vue'
import { Plus, DataAnalysis } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { detectMultimodal, riskCategories } from '../api/model'
import MultimodalResults from './MultimodalResults.vue'

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
// 检测维度与模型输出字段共用配置。
const categories = riskCategories

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
  if (isDetecting.value) return
  if (!textContent.value && fileList.value.length === 0) {
    ElMessage.warning('请输入文本或上传图片进行检测')
    return
  }

  isDetecting.value = true
  showResult.value = false

  try {
    // Preserve the existing first-image behavior. Validation runs in the service,
    // because el-upload does not call before-upload when auto-upload is false.
    const data = await detectMultimodal(textContent.value, fileList.value[0]?.raw)
    const labels = data.labels

    categories.forEach(cat => {
      // 模型返回 1 表示有该类风险，0 表示无
      detectionResult[cat.key] = labels[cat.key] === 1
    })

    // 设置结果描述信息，使用 data.comment 替换原来的 message
    resultDescription.value = data.comment || '检测完成'
    console.log(data)
    showResult.value = true

  } catch (error) {
    console.error('Detection error:', error)
    ElMessage.error(error.message || '检测失败，请重试')
  } finally {
    isDetecting.value = false
  }
}
</script>

<template>
  <div class="image-text-detection-container enriched-detection">
    <el-card class="input-card" shadow="never">
      <template #header><div class="card-header"><span class="title"><span class="panel-step">01</span>待检测内容</span><span class="request-status" :class="{ busy: isDetecting }"><span></span>{{ isDetecting ? '分析中' : showResult ? '已生成报告' : '等待提交' }}</span></div></template>
      <div class="input-content">
        <div class="field-heading"><label>文本内容</label><span>支持文本、图片或图文组合</span></div>
        <el-input ref="textareaRef" v-model="textContent" :rows="7" type="textarea" placeholder="在这里输入待检测的内容，或点击下方示例快速体验…" resize="none" class="text-area" aria-label="待检测文本" @keydown.enter.exact.prevent="handleDetect" @keydown.ctrl.enter.prevent="insertNewLine" />
        <InputAssist :text="textContent" :disabled="isDetecting" shortcut="Enter 检测 · Ctrl + Enter 换行" :examples="[{ label: '日常内容', text: '今天天气晴朗，我们计划去公园散步，享受轻松的周末时光。' }, { label: '广告场景', text: '限时优惠，立即领取专属福利！点击链接了解活动详情。' }, { label: '隐私场景', text: '公开分享他人的手机号码、家庭住址和身份证信息，是否会涉及隐私风险？' }]" @select="textContent = $event" @clear="textContent = ''" />
        <div class="upload-section"><div class="field-heading"><label><PlatformIcon name="image" />图片附件<span class="field-optional">可选</span></label><span>{{ fileList.length ? '已选择 ' + fileList.length + ' 张' : '可添加图片进行联合检测' }}</span></div><div class="action-area"><div class="upload-wrapper"><el-upload v-model:file-list="fileList" action="#" list-type="picture-card" :auto-upload="false" :on-preview="handlePictureCardPreview" :on-remove="handleRemove" :before-upload="beforeUpload" accept="image/*" multiple class="custom-upload"><div class="upload-tile"><el-icon><Plus /></el-icon><span>添加图片</span></div></el-upload></div></div><p class="field-help">支持图片预览与移除。当前检测使用附件列表中的第一张图片。</p></div>
        <p class="field-help">AIGC检测由模型评估生成迹象，结果供复核参考，不能确证创作来源。</p>
        <div class="submit-bar"><span><PlatformIcon name="shield" />结果覆盖 {{ categories.length }} 个检测维度，含 AIGC检测</span><el-button type="primary" :loading="isDetecting" @click="handleDetect" class="detect-btn" size="large"><el-icon class="el-icon--left"><DataAnalysis /></el-icon>{{ showResult ? '重新检测' : '开始图文检测' }}</el-button></div>
      </div>
    </el-card>
    <ResultPlaceholder v-if="!showResult" :loading="isDetecting" title="准备好内容，开启多维度评估" description="提交后将展示风险维度、AIGC判断、分析结论与详细标签。" :items="[`${categories.length} 项检测维度`, '图文联合分析', 'AIGC检测']" />
    <transition name="el-fade-in-linear"><el-card v-if="showResult" class="result-card" shadow="never"><template #header><div class="card-header"><span class="title"><span class="panel-step">02</span>检测报告</span><span class="report-badge"><PlatformIcon name="check" />分析完成</span></div></template><div class="result-description" :class="{ 'is-danger': categories.some(c => detectionResult[c.key]) }"><span class="micro-label">ANALYSIS</span><h3>内容分析结论</h3><p>{{ resultDescription }}</p></div><MultimodalResults :categories="categories" :results="detectionResult" /></el-card></transition>
    <el-dialog v-model="dialogVisible" title="图片预览" width="min(800px, 92vw)"><img :src="dialogImageUrl" alt="待检测图片预览" style="width: 100%" /></el-dialog>
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
