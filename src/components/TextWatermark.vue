<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Stamp, Search, ScaleToOriginal, Edit, Picture as IconPicture } from '@element-plus/icons-vue'

// 左侧输入内容（添加水印）
const addWatermarkInput = ref('')
// 右侧输入内容（检测水印）
const detectWatermarkInput = ref('')
// 加载状态
const loadingAdd = ref(false)
const loadingDetect = ref(false)

// 新增：水印添加后的状态
const hasAddedWatermark = ref(false)
// 新增：模型初始响应（plain_text）
const plainTextResult = ref('')
// 新增：图片Base64数据
const watermarkedImage = ref('')
const plainImage = ref('')
// 新增：图片对比弹窗控制
const showImageDialog = ref(false)

/**
 * 显示结果提示框
 * 封装 Element Plus 的 MessageBox 组件
 */
const showResultDialog = (title, message, type) => {
  ElMessageBox.alert(message, title, {
    confirmButtonText: '确定',
    type: type,
    showClose: true,
    closeOnPressEscape: true,
    center: true,
  })
}

/**
 * 处理添加水印功能
 */
const handleAddWatermark = async () => {
  if (!addWatermarkInput.value.trim()) {
    ElMessage.warning('请输入需要添加水印的文本内容')
    return
  }

  loadingAdd.value = true
  
  try {
    const response = await fetch('/watermark-api/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: addWatermarkInput.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const res = await response.json()
    console.log('添加水印返回:', res)

    // 修改：根据后端新返回结构
    // res.watermarked_text (原result)
    // res.plain_text (模型初始响应)
    if (res.watermarked_text) {
      // 保存模型初始响应并切换UI状态
      plainTextResult.value = res.plain_text || ''

      // 保存图片Base64数据
      watermarkedImage.value = res.watermarked_image_base64 || ''
      plainImage.value = res.plain_image_base64 || ''

      hasAddedWatermark.value = true

      // 自动复制到剪贴板
      await navigator.clipboard.writeText(res.watermarked_text)
      
      showResultDialog(
        '操作成功', 
        '水印已成功嵌入到文本中！\n包含水印的文本已自动复制到剪贴板。', 
        'success'
      )
    } else {
      showResultDialog('操作失败', '未能获取到添加水印后的文本', 'error')
    }

  } catch (error) {
    console.error('添加水印失败:', error)
    ElMessage.error('请求失败，请检查网络或后端服务')
  } finally {
    loadingAdd.value = false
  }
}

/**
 * 处理检测水印功能
 */
const handleDetectWatermark = async () => {
  if (!detectWatermarkInput.value.trim()) {
    ElMessage.warning('请输入需要检测的文本内容')
    return
  }

  loadingDetect.value = true

  try {
    const response = await fetch('/watermark-api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: detectWatermarkInput.value
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const res = await response.json()
    console.log('检测水印返回:', res)
    
    // 响应包含: code, z_score, is_watermarked
    if (res.is_watermarked) {
      showResultDialog(
        '检测完成', 
        `在该文本中检测到隐藏水印。\n可信度 (Z-Score): ${res.z_score}`, 
        'success'
      )
    } else {
      showResultDialog(
        '检测完成', 
        `未在该文本中检测到已知的水印特征。\n可信度 (Z-Score): ${res.z_score}`, 
        'warning'
      )
    }
  } catch (error) {
    console.error('检测水印失败:', error)
    ElMessage.error('请求失败，请检查网络或后端服务')
  } finally {
    loadingDetect.value = false
  }
}
</script>

<template>
  <div class="watermark-container">
    <el-row :gutter="20">
      <!-- 左侧：添加水印 -->
      <el-col :span="12">
        <el-card class="action-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="title">
                <el-icon><Edit /></el-icon> 添加水印
              </span>
            </div>
          </template>
          
          <div class="content-wrapper">
             <!-- 原始输入框 -->
             <div class="textarea-container">
               <span v-if="hasAddedWatermark" class="textarea-label">初始问题：</span>
               <el-input
                v-model="addWatermarkInput"
                type="textarea"
                :rows="hasAddedWatermark ? 6 : 15"
                placeholder="在此输入需要嵌入水印的原始文本..."
                resize="none"
                class="custom-textarea"
              />
            </div>
            
            <!-- 新增：模型初始响应框 -->
            <div v-if="hasAddedWatermark" class="textarea-container">
              <span class="textarea-label">模型初始响应：</span>
              <el-input
                v-model="plainTextResult"
                type="textarea"
                :rows="6"
                placeholder="模型初始响应..."
                readonly
                resize="none"
                class="custom-textarea readonly-textarea"
              />
            </div>
            
            <div class="button-wrapper">
              <div class="buttons-row">
                <el-button 
                  type="primary" 
                  size="large" 
                  class="action-btn" 
                  @click="handleAddWatermark"
                  :loading="loadingAdd"
                >
                  <el-icon class="btn-icon"><Stamp /></el-icon>
                  添加水印
                </el-button>
                
                <!-- 新增：查看图片对比按钮 -->
                <el-button 
                  v-if="hasAddedWatermark && watermarkedImage && plainImage"
                  type="info" 
                  size="large" 
                  class="action-btn" 
                  @click="showImageDialog = true"
                >
                  <el-icon class="btn-icon"><IconPicture /></el-icon>
                  查看图片对比
                </el-button>
              </div>

              <p class="btn-desc">为文本嵌入水印，用于版权保护与溯源</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：检测水印 -->
      <el-col :span="12">
        <el-card class="action-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="title">
                <el-icon><Search /></el-icon> 检测水印
              </span>
            </div>
          </template>
          
          <div class="content-wrapper">
            <el-input
              v-model="detectWatermarkInput"
              type="textarea"
              :rows="15"
              placeholder="在此输入需要检测的文本内容..."
              resize="none"
              class="custom-textarea"
            />
            
            <div class="button-wrapper">
              <el-button 
                type="success" 
                size="large" 
    
                class="action-btn" 
                @click="handleDetectWatermark"
                :loading="loadingDetect"
              >
                <el-icon class="btn-icon"><ScaleToOriginal /></el-icon>
                检测水印
              </el-button>
              <p class="btn-desc">检测文本中是否包含隐藏水印，并提取水印信息</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <!-- 图片对比弹窗 -->
    <el-dialog
      v-model="showImageDialog"
      title="水印图片对比"
      width="80%"
      center
    >
      <div class="image-compare-container">
        <div class="image-box">
          <h3>加水印前 (Plain Image)</h3>
          <el-image 
            :src="`data:image/png;base64,${plainImage}`" 
            fit="contain" 
            :preview-src-list="[`data:image/png;base64,${plainImage}`]"
          />
        </div>
        <div class="image-box">
          <h3>加水印后 (Watermarked Image)</h3>
          <el-image 
            :src="`data:image/png;base64,${watermarkedImage}`" 
            fit="contain" 
            :preview-src-list="[`data:image/png;base64,${watermarkedImage}`]"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.watermark-container {
  max-width: 1200px;
  margin: 0 auto;
}

.action-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.action-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.custom-textarea {
  flex: 1;
}

.textarea-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.textarea-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: bold;
}

.readonly-textarea :deep(.el-textarea__inner) {
  background-color: #f5f7fa;
  color: #606266;
}

.custom-textarea :deep(.el-textarea__inner) {
  height: 100%;
  font-size: 16px;
  padding: 15px;
  font-family: inherit;
  line-height: 1.6;
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
  font-size: 18px;
}

.button-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-bottom: 10px;
}

.action-btn {
  width: 200px;
  height: 50px;
  font-size: 16px;
  margin-bottom: 10px;
  transition: transform 0.2s;
  font-weight: bold;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  margin-right: 8px;
}

.btn-desc {
  color: #909399;
  font-size: 13px;
  line-height: 1.5;
}

.buttons-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 20px;
  width: 100%;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.buttons-row .action-btn {
  margin-bottom: 0;
}

.image-compare-container {
  display: flex;
  gap: 20px;
  justify-content: space-around;
}

.image-box {
  flex: 1;
  text-align: center;
  border: 1px solid #dcdfe6;
  padding: 10px;
  border-radius: 4px;
}

.image-box h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #303133;
}

.image-box .el-image {
  width: 100%;
  max-height: 500px;
}
</style>
