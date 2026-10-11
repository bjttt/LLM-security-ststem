<template>
  <div class="audit-panel">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>内容安全审核</span>
        </div>
      </template>
      <el-input
        v-model="query"
        type="textarea"
        :rows="4"
        placeholder="输入需要审核的文本内容..."
      />
      <div class="controls" style="margin-top: 15px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
        <el-switch v-model="useRerank" active-text="启用重排" />
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 14px; white-space: nowrap;">返回文档数:</span>
          <el-input-number v-model="rerankTopK" :min="1" :max="10" size="small" />
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; max-width: 200px;">
          <span style="font-size: 14px; white-space: nowrap;">temperature:</span>
          <el-slider v-model="temperature" :min="0" :max="1" :step="0.1" style="flex: 1;" />
        </div>
        
        <el-button type="primary" style="margin-left:auto; display:flex;" @click="audit" :loading="loading">
          开始审核
        </el-button>
      </div>
    </el-card>

    <div v-if="answer || loading" class="output-panel" style="margin-top: 20px;">
      <el-card>
        <h4>审核分析过程</h4>
        <div class="answer-box">
          <p style="white-space: pre-wrap;">{{ answer }}</p>
        </div>
        
        <div v-if="retrievedDocs.length > 0" class="docs-box" style="margin-top: 15px;">
          <h4>检索出的相关知识条目</h4>
          <el-collapse>
            <el-collapse-item v-for="(doc, idx) in retrievedDocs" :key="idx" :title="`[条目 ${idx + 1}] ${doc.category} - ${doc.title}`">
              <p>{{ doc.text }}</p>
              <p><i>相关度得分: {{ (doc.rerank_score || doc.score).toFixed(3) }}</i> | <i>违规类型: {{ doc.violation_type }}</i></p>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-card>
    </div>

    <AuditResult v-if="auditResult" :result="auditResult" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import AuditResult from './AuditResult.vue';

const query = ref('');
const useRerank = ref(true);
const rerankTopK = ref(3);
const temperature = ref(0.3);
const loading = ref(false);
const answer = ref('');
const auditResult = ref(null);
const retrievedDocs = ref([]);

const audit = async () => {
  if (!query.value.trim()) {
    ElMessage.warning('请输入审核文本');
    return;
  }
  loading.value = true;
  answer.value = '';
  auditResult.value = null;
  retrievedDocs.value = [];
  try {
    const response = await fetch('/api/audit/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.value,
        use_rerank: useRerank.value,
        temperature: temperature.value,
        rerank_top_k: rerankTopK.value
      })
    });

    if (!response.body) throw new Error('ReadableStream not supported');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'chunk') {
              answer.value += data.content;
            } else if (data.type === 'result') {
              auditResult.value = data.audit_result;
            } else if (data.type === 'meta') {
              retrievedDocs.value = data.retrieved_docs || [];
            }
          } catch(e) {}
        }
      }
    }
  } catch (e) {
    ElMessage.error('审核请求异常');
  } finally {
    loading.value = false;
  }
};
</script>
<style scoped>
.audit-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.card-header {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}
.controls {
  background: var(--el-fill-color-light);
  padding: 12px 16px;
  border-radius: var(--el-border-radius-base);
}
.answer-box {
  background: var(--el-fill-color-light);
  padding: 16px;
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.6;
}
h4 {
  margin-top: 0;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.docs-box {
  margin-top: 24px;
}
</style>
