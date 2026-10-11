<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>新增知识条目</span>
      </div>
    </template>
    <el-form :model="form" label-width="100px" @submit.prevent="submit">
      <el-form-item label="标题">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="内容(必填)">
        <el-input type="textarea" :rows="4" v-model="form.text" required />
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="form.category" placeholder="知识类型">
          <el-option label="法律法规" value="法律法规" />
          <el-option label="政策文件" value="政策文件" />
          <el-option label="违规案例" value="违规案例" />
          <el-option label="权威表述" value="权威表述" />
        </el-select>
      </el-form-item>
      <el-form-item label="违规类型">
        <el-select v-model="form.violation_type" multiple placeholder="可选多项">
          <el-option v-for="vt in systemStore.violationTypes" :key="vt" :label="vt" :value="vt" />
        </el-select>
      </el-form-item>
      <el-form-item label="严重程度">
        <el-select v-model="form.severity" placeholder="请选择">
          <el-option label="无" value="无" />
          <el-option label="低" value="低" />
          <el-option label="中" value="中" />
          <el-option label="高" value="高" />
        </el-select>
      </el-form-item>
      <el-form-item label="处理建议">
        <el-input v-model="form.suggestion" />
      </el-form-item>
      <el-form-item label="参考来源">
        <el-input v-model="form.sources" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit">添加记录</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { KBApi } from '../../api/safety';
import { useSystemStore } from '../../stores/system';
import { useKBStore } from '../../stores/kb';

const systemStore = useSystemStore();
const kbStore = useKBStore();

const form = reactive({
  title: '',
  text: '',
  category: '违规案例',
  violation_type: [],
  severity: '无',
  suggestion: '无',
  sources: ''
});

const submit = async () => {
  if (!form.text.trim()) {
    ElMessage.warning('内容不可为空');
    return;
  }
  try {
    const payload = {
      ...form,
      violation_type: Array.isArray(form.violation_type) ? form.violation_type.join(',') : form.violation_type
    };
    await KBApi.add(payload);
    ElMessage.success('条目添加成功');
    await kbStore.loadAll();
    form.title = '';
    form.text = '';
    form.violation_type = [];
  } catch (e) {
    ElMessage.error('添加失败');
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
