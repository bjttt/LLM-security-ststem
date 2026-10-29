<template>
  <el-card class="knowledge-import" shadow="never"><template #header><div class="card-header"><span class="title"><span class="panel-step">01</span>导入知识数据集</span><span class="quiet-badge">CSV IMPORT</span></div></template><div class="import-warning"><PlatformIcon name="help" /><div><h3>导入将重建当前知识库</h3><p>上传新的 CSV 会清空原有知识库并重建索引。请在选择文件前确认数据内容与列名配置。</p></div></div><div class="import-layout"><div class="import-main"><div class="field-heading"><label>列名映射</label><span>列名必须与 CSV 第一行一致</span></div><el-form class="column-mapping" label-position="top"><el-form-item label="正文内容列"><el-input v-model="textColumn" placeholder="默认: content" /><p class="field-help">该列将作为知识条目的正文内容</p></el-form-item><el-form-item label="知识分类列"><el-input v-model="categoryColumn" placeholder="默认: category" /><p class="field-help">用于区分法规、政策文件或违规案例</p></el-form-item></el-form><el-upload class="upload-area csv-upload-area" drag action="" :http-request="handleUpload" :show-file-list="false" accept=".csv"><span class="csv-file-symbol"><PlatformIcon name="upload" /></span><h3>将 CSV 数据集拖放到这里</h3><div class="el-upload__text">或 <em>点击选择本地文件</em></div><span class="csv-extension">.CSV</span><template #tip><div class="el-upload__tip">选择文件后会立即沿用现有导入流程上传并重建知识库。</div></template></el-upload></div><CsvGuide :text-column="textColumn" :category-column="categoryColumn" /></div><div class="import-checklist"><span><PlatformIcon name="check" />先配置列名</span><PlatformIcon name="chevron" /><span><PlatformIcon name="check" />确认重建数据</span><PlatformIcon name="chevron" /><span><PlatformIcon name="upload" />选择 CSV 文件</span></div></el-card>
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
