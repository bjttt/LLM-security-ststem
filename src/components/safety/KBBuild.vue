<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>上传数据集重建知识库</span>
      </div>
    </template>
    <el-upload
      class="upload-area"
      drag
      action=""
      :http-request="handleUpload"
      :show-file-list="false"
      accept=".csv"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        拖拽 CSV 文件到此处，或者 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          注意！上传新的 CSV 将清空原有知识库并重新构建索引。<br/>
          请确保包含对应的内容与分类列。
        </div>
      </template>
    </el-upload>
    <el-form class="mt-4" label-width="120px">
      <el-form-item label="内容列名">
        <el-input v-model="textColumn" placeholder="默认: content" />
      </el-form-item>
      <el-form-item label="分类列名">
        <el-input v-model="categoryColumn" placeholder="默认: category" />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';
import { UploadFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { KBApi } from '../../api/safety';
import { useKBStore } from '../../stores/kb';

const kbStore = useKBStore();
const textColumn = ref('content');
const categoryColumn = ref('category');

const handleUpload = async (options) => {
  const formData = new FormData();
  formData.append('file', options.file);
  formData.append('text_column', textColumn.value || 'content');
  formData.append('category_column', categoryColumn.value || 'category');

  try {
    const res = await KBApi.upload(formData);
    ElMessage.success(res.message || '上传并重建成功');
    await kbStore.loadAll();
  } catch (e) {
    ElMessage.error(e?.response?.data?.detail || '上传失败');
  }
};
</script>
<style scoped>
.mt-4 { margin-top: 1rem; }
.card-header {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}
</style>
