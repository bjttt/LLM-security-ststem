<template>
  <el-card class="knowledge-browser" shadow="never"><template #header><div class="card-header"><div><span class="title"><PlatformIcon name="book" />知识条目<span class="count-badge">{{ filteredDocs.length }}</span></span><p class="panel-subtitle">搜索正文与分类，展开条目查看完整内容。</p></div><el-input v-model="searchQuery" placeholder="搜索标题、正文、分类或违规类型…" class="knowledge-search" clearable aria-label="搜索知识条目"><template #prefix><PlatformIcon name="scan" /></template></el-input></div></template><div class="knowledge-quick-search"><span>快捷搜索</span><button type="button" :class="{ active: !searchQuery }" @click="searchQuery = ''">全部条目</button><button v-for="category in ['法律法规', '政策文件', '违规案例', '权威表述']" :key="category" type="button" :class="{ active: searchQuery === category }" @click="searchQuery = category">{{ category }}</button><a href="#/knowledge/add"><PlatformIcon name="plus" />新增知识</a></div>
    <el-table :data="filteredDocs" style="width: 100%" height="480" stripe><el-table-column type="expand" width="44"><template #default="scope"><div class="knowledge-row-detail"><div class="field-heading"><h3>{{ scope.row.title || '未命名知识条目' }}</h3><span>ID {{ scope.row.id }}</span></div><p class="knowledge-full-text">{{ scope.row.text }}</p><div class="knowledge-detail-tags"><span>分类：{{ scope.row.category || '—' }}</span><span>违规类型：{{ scope.row.violation_type || '—' }}</span><span>严重程度：{{ scope.row.severity || '—' }}</span></div><div v-if="scope.row.suggestion || scope.row.sources" class="knowledge-detail-reference"><p v-if="scope.row.suggestion"><strong>处理建议</strong>{{ scope.row.suggestion }}</p><p v-if="scope.row.sources"><strong>参考来源</strong>{{ scope.row.sources }}</p></div><el-button size="small" type="primary" @click="$emit('edit', scope.row)">编辑此条目</el-button></div></template></el-table-column><el-table-column prop="id" label="ID" width="90" /><el-table-column prop="title" label="知识标题" show-overflow-tooltip min-width="170" /><el-table-column prop="category" label="分类" width="120"><template #default="scope"><span class="category-chip">{{ scope.row.category || '—' }}</span></template></el-table-column><el-table-column prop="violation_type" label="违规类型" width="130" show-overflow-tooltip /><el-table-column prop="text" label="正文内容" show-overflow-tooltip min-width="200" /><el-table-column label="操作" width="136" fixed="right"><template #default="scope"><el-button size="small" type="primary" @click="$emit('edit', scope.row)">编辑</el-button><el-button size="small" type="danger" @click="del(scope.row.id)">删除</el-button></template></el-table-column><template #empty><div class="knowledge-empty"><span class="placeholder-symbol"><PlatformIcon name="book" /></span><h3>{{ searchQuery ? '没有找到匹配的知识条目' : '暂无已加载的知识条目' }}</h3><p>{{ searchQuery ? '尝试其他关键词，或清空搜索查看全部内容。' : '从一条知识或一份数据集开始，建立你的审核依据。' }}</p><button v-if="searchQuery" type="button" class="button secondary" @click="searchQuery = ''">清空搜索</button><div v-else><a class="button primary" href="#/knowledge/add"><PlatformIcon name="plus" />新增条目</a><a class="button secondary" href="#/knowledge/import">导入数据集</a></div></div></template></el-table><div class="table-footer"><span>当前展示 {{ filteredDocs.length }} 条<span v-if="searchQuery"> · 关键词：{{ searchQuery }}</span></span><span><PlatformIcon name="help" />点击行首箭头，查看完整正文与参考信息</span></div>
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
