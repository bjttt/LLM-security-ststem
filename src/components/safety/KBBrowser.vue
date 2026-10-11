<template>
  <el-card>
    <template #header>
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <span>知识库内容浏览 (共 {{ filteredDocs.length }} 条)</span>
        <el-input v-model="searchQuery" placeholder="输入关键词搜索标题、内容或分类..." style="width: 300px" clearable />
      </div>
    </template>
    <el-table :data="filteredDocs" style="width: 100%" height="400" stripe>
      <el-table-column prop="id" label="ID" width="100" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="violation_type" label="违规类型" width="120" />
      <el-table-column prop="title" label="标题" show-overflow-tooltip width="150" />
      <el-table-column prop="text" label="正文内容" show-overflow-tooltip />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="scope">
          <el-button size="small" type="primary" @click="$emit('edit', scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useKBStore } from '../../stores/kb';
import { KBApi } from '../../api/safety';
import { ElMessage, ElMessageBox } from 'element-plus';

const kbStore = useKBStore();
defineEmits(['edit']);

const searchQuery = ref('');

const filteredDocs = computed(() => {
  if (!searchQuery.value) {
    return kbStore.documents;
  }
  const q = searchQuery.value.toLowerCase();
  return kbStore.documents.filter((doc) => {
    return (doc.title && doc.title.toLowerCase().includes(q)) || 
           (doc.text && doc.text.toLowerCase().includes(q)) || 
           (doc.category && doc.category.toLowerCase().includes(q)) ||
           (doc.violation_type && doc.violation_type.toLowerCase().includes(q));
  });
});

const del = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这条知识片段吗？', '警告', { type: 'warning' });
    await KBApi.delete(id);
    ElMessage.success('删除成功');
    await kbStore.loadAll();
  } catch(e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};
</script>
<style scoped>
.card-header {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}
</style>
