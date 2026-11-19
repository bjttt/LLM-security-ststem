<template>
  <el-dialog v-model="visible" title="编辑知识条目" width="60%">
    <el-form :model="form" label-width="100px" @submit.prevent="submit">
      <el-form-item label="标题">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="正文内容">
        <el-input type="textarea" :rows="6" v-model="form.text" required />
      </el-form-item>
      <el-form-item label="分类">
        <el-input v-model="form.category" />
      </el-form-item>
      <el-form-item label="违规类型">
        <el-select v-model="form.violation_type" multiple placeholder="可选多项">
          <el-option v-for="vt in systemStore.violationTypes" :key="vt" :label="vt" :value="vt" />
        </el-select>
      </el-form-item>
      <el-form-item label="严重程度">
        <el-select v-model="form.severity">
          <el-option label="无" value="无" />
          <el-option label="低" value="低" />
          <el-option label="中" value="中" />
          <el-option label="高" value="高" />
        </el-select>
      </el-form-item>
      <el-form-item label="处理建议">
        <el-input v-model="form.suggestion" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit" :loading="loading">保存修改</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { KBApi } from '../../api/safety';
import { useSystemStore } from '../../stores/system';
import { useKBStore } from '../../stores/kb';

const systemStore = useSystemStore();
const kbStore = useKBStore();

const visible = ref(false);
const loading = ref(false);
const currentId = ref('');
const form = reactive({
  title: '',
  text: '',
  category: '',
  violation_type: [],
  severity: '',
  suggestion: ''
});

const open = (row) => {
  currentId.value = row.id;
  Object.assign(form, {
    title: row.title || '',
    text: row.text || '',
    category: row.category || '',
    violation_type: row.violation_type ? row.violation_type.split(',').map((s) => s.trim()) : [],
    severity: row.severity || '',
    suggestion: row.suggestion || ''
  });
  visible.value = true;
};

defineExpose({ open });

const submit = async () => {
  loading.value = true;
  try {
    const payload = {
      ...form,
      violation_type: Array.isArray(form.violation_type) ? form.violation_type.join(',') : form.violation_type
    };
    await KBApi.update(currentId.value, payload);
    ElMessage.success('更新成功');
    visible.value = false;
    await kbStore.loadAll();
  } catch (e) {
    ElMessage.error('更新失败');
  } finally {
    loading.value = false;
  }
};
</script>
