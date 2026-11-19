<template>
  <el-card class="knowledge-add" shadow="never"><template #header><div class="card-header"><span class="title"><PlatformIcon name="plus" />新增知识条目</span><span class="quiet-badge">NEW KNOWLEDGE</span></div></template><div class="knowledge-form-layout"><el-form :model="form" label-position="top" class="knowledge-entry-form" @submit.prevent="submit"><div class="form-section-title"><span class="panel-step">01</span><div><h3>基础内容</h3><p>用清晰的标题和完整正文描述知识。</p></div></div><el-form-item label="知识标题"><el-input v-model="form.title" placeholder="为知识条目填写一个便于检索的标题" /></el-form-item><el-form-item label="正文内容（必填）"><el-input type="textarea" :rows="7" v-model="form.text" placeholder="填写法规原文、政策表述、违规案例或其他审核依据…" required /><InputAssist :text="form.text" label="正文" @clear="form.text = ''" /></el-form-item><div class="form-section-title"><span class="panel-step">02</span><div><h3>分类与审核标签</h3><p>建立分类，便于后续搜索与审核检索。</p></div></div><div class="form-field-grid"><el-form-item label="知识分类"><el-select v-model="form.category" placeholder="知识类型"><el-option label="法律法规" value="法律法规" /><el-option label="政策文件" value="政策文件" /><el-option label="违规案例" value="违规案例" /><el-option label="权威表述" value="权威表述" /></el-select></el-form-item><el-form-item label="严重程度"><el-select v-model="form.severity" placeholder="请选择"><el-option label="无" value="无" /><el-option label="低" value="低" /><el-option label="中" value="中" /><el-option label="高" value="高" /></el-select></el-form-item></div><el-form-item label="违规类型"><el-select v-model="form.violation_type" multiple placeholder="选择适用的违规类型，可选多项"><el-option v-for="vt in systemStore.violationTypes" :key="vt" :label="vt" :value="vt" /></el-select></el-form-item><div class="form-section-title"><span class="panel-step">03</span><div><h3>处理建议与来源</h3><p>补充处理方式与引用依据，帮助理解审核结论。</p></div></div><el-form-item label="处理建议"><el-input v-model="form.suggestion" placeholder="填写适用的处理或修改建议" /></el-form-item><el-form-item label="参考来源"><el-input v-model="form.sources" placeholder="填写资料名称、来源说明或参考链接" /></el-form-item><div class="submit-bar"><span><PlatformIcon name="book" />添加成功后将自动更新知识库</span><el-button type="primary" native-type="submit" size="large"><PlatformIcon name="plus" />添加知识条目</el-button></div></el-form><aside class="entry-preview"><div class="preview-card"><span class="micro-label">LIVE PREVIEW</span><h3>条目预览</h3><p class="preview-caption">预览会随左侧填写内容同步更新</p><div class="preview-document"><span class="category-chip">{{ form.category }}</span><h4>{{ form.title || '你的知识标题' }}</h4><p :class="{ 'preview-empty-text': !form.text }">{{ form.text || '知识正文会显示在这里。完整、准确的内容有助于形成更清晰的审核依据。' }}</p><div class="preview-document-meta"><span>严重程度<strong>{{ form.severity }}</strong></span><span>正文长度<strong>{{ form.text.length }} 字</strong></span></div><div v-if="form.violation_type.length" class="preview-tags"><span v-for="type in form.violation_type" :key="type">{{ type }}</span></div><div v-if="form.sources" class="preview-source"><PlatformIcon name="book" />{{ form.sources }}</div></div></div><div class="entry-writing-guide"><PlatformIcon name="spark" /><h3>让知识更易于检索</h3><ul><li>标题使用明确、可辨识的主题。</li><li>正文尽量保留完整语义和必要上下文。</li><li>分类与违规类型应与内容相匹配。</li><li>引用内容可补充可追溯的资料来源。</li></ul></div></aside></div></el-card>
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
