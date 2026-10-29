<template>
  <div class="audit-panel enriched-detection">
    <el-card shadow="never"><template #header><div class="card-header"><span class="title"><span class="panel-step">01</span>提交审核内容</span><span class="request-status" :class="{ busy: loading }"><span></span>{{ loading ? '审核中' : auditResult ? '已生成结果' : '等待提交' }}</span></div></template><div class="field-heading"><label>待审核文本</label><span>结合知识检索与模型分析</span></div><el-input v-model="query" type="textarea" :rows="7" placeholder="输入需要审核的文本内容，可以是文章段落、模型回答或待发布文案…" aria-label="内容安全审核文本" /><InputAssist :text="query" :disabled="loading" :examples="[{ label: '公开文案', text: '我们倡导文明交流、尊重他人隐私，共同营造健康有序的网络环境。' }, { label: '知识核查', text: '请结合知识库，审核以下表述是否存在不准确或不合规之处：未经核实的信息不宜作为事实传播。' }]" @select="query = $event" @clear="query = ''" />
    <div class="audit-options-heading"><h3><PlatformIcon name="layers" />审核参数</h3><span>根据任务需要调整检索与生成设置</span></div><div class="audit-options"><div class="audit-option"><div><h4>知识重排</h4><p>优先展示更相关的知识依据</p></div><el-switch v-model="useRerank" active-text="启用重排" /></div><div class="audit-option"><div><h4>返回文档数</h4><p>知识检索返回的条目数量</p></div><el-input-number v-model="rerankTopK" :min="1" :max="10" size="small" /></div><div class="audit-option temperature-option"><div><h4>生成温度 <span>{{ temperature.toFixed(1) }}</span></h4><p>较低温度有助于保持回答稳定</p></div><el-slider v-model="temperature" :min="0" :max="1" :step="0.1" /></div></div><div class="submit-bar"><span><PlatformIcon name="book" />知识依据与审核分析将同步展示</span><el-button type="primary" size="large" @click="audit" :loading="loading"><PlatformIcon name="shield" />开始内容审核</el-button></div></el-card>
    <ResultPlaceholder v-if="!answer && !auditResult && !loading" title="让每个审核结论都有依据" description="提交文本后，查看审核分析过程、相关知识与结果明细。" :items="['审核分析', '知识检索', '结果明细']" icon="book" />
    <div v-if="answer || loading" class="output-panel"><el-card shadow="never"><template #header><div class="card-header"><span class="title"><span class="panel-step">02</span>审核分析过程</span><span class="request-status" :class="{ busy: loading }"><span></span>{{ loading ? '正在生成分析' : '分析已返回' }}</span></div></template><div v-if="loading && !answer" class="audit-stream-loading"><PlatformIcon name="activity" /><span>正在等待审核分析…</span><el-skeleton :rows="3" animated /></div><div class="answer-box"><p style="white-space: pre-wrap;">{{ answer }}</p><span v-if="loading && answer" class="stream-cursor" aria-label="仍在生成"></span></div><div v-if="retrievedDocs.length > 0" class="docs-box"><div class="field-heading"><h4><PlatformIcon name="book" />相关知识依据</h4><span>{{ retrievedDocs.length }} 条检索结果</span></div><el-collapse><el-collapse-item v-for="(doc, idx) in retrievedDocs" :key="idx" :title="`[条目 ${idx + 1}] ${doc.category} - ${doc.title}`"><p class="retrieved-doc-text">{{ doc.text }}</p><p class="retrieved-doc-meta"><i>相关度得分: {{ (doc.rerank_score || doc.score).toFixed(3) }}</i><span>违规类型: {{ doc.violation_type }}</span></p></el-collapse-item></el-collapse></div></el-card></div>
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
