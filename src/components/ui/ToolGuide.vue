<script setup>
import { computed } from 'vue'
import PlatformIcon from './PlatformIcon.vue'
import { useKBStore } from '../../stores/kb'
import { useSystemStore } from '../../stores/system'
const props = defineProps({ tool: { type: String, default: 'multimodal' } })
const kbStore = useKBStore()
const systemStore = useSystemStore()
const guides = {
  multimodal: { title: '一份内容，多维审视', intro: '同时关注内容本身与图文语境，快速定位值得进一步查看的风险项。', icon: 'image', outputs: ['16 个检测维度', '内容分析结论', '风险标签明细'], tips: ['文本与图片可单独提交，也可组合使用。', '多张附件中，当前检测使用第一张图片。', '报告中可筛选风险项，快速定位需关注的内容。'], questions: [{ title: '只有文本可以检测吗？', answer: '可以。输入文本即可提交；也可以仅添加图片进行检测。' }, { title: '如何查看图片内容？', answer: '在附件缩略图上点击预览，可打开大图；不需要的附件可以移除。' }], related: { href: '#/workspace/audit', name: '知识增强内容审核' } },
  hallucination: { title: '判断回答是否可靠', intro: '从一个具体问题开始，对照原始回答、模型分析与修正建议。', icon: 'brain', outputs: ['模型原始回答', '幻觉指数与结论', '去幻觉修正建议'], tips: ['问题尽量清晰、具体，并包含必要上下文。', '可使用事实核验或知识问答示例体验。', '分析完成后仍可修改问题并重新检测。'], questions: [{ title: '输入问题还是模型回答？', answer: '当前工具接收初始问题，由模型生成原始回答后进行幻觉评估。' }, { title: '怎样使用修正建议？', answer: '在报告的修正建议卡片中点击复制，可将建议用于后续内容优化。' }], related: { href: '#/workspace/sycophancy', name: '模型客观性评估' } },
  sycophancy: { title: '关注回答的独立判断', intro: '检查模型是否因用户立场而过度附和，对照分析和修正后的回答。', icon: 'chat', outputs: ['模型原始回答', '谄媚指数与结论', '去谄媚修正建议'], tips: ['保留问题中的观点与表达方式。', '尝试观点判断、事实纠偏等不同场景。', '结合原始响应与分析结论理解评估结果。'], questions: [{ title: '适合哪些评估场景？', answer: '适合对观点附和、事实纠偏与决策建议等场景进行模型客观性评估。' }, { title: '可以连续评估多个问题吗？', answer: '可以。完成一次检测后，在输入区修改问题，再点击重新检测。' }], related: { href: '#/workspace/hallucination', name: '模型可靠性评估' } },
  watermark: { title: '从生成到验证', intro: '左侧建立水印特征，右侧检测已有文本，形成清晰的内容溯源流程。', icon: 'stamp', outputs: ['水印文本生成', '隐藏水印判断', '可信度 Z-Score'], tips: ['添加成功后，水印文本会沿用原流程复制到剪贴板。', '将完整文本粘贴到右侧进行检测。', '返回图片时可查看加水印前后的图片对比。'], questions: [{ title: '检测结果在哪里查看？', answer: '检测完成后会弹出结果提示，展示水印判断和 Z-Score。' }, { title: '为什么不一定有图片对比？', answer: '只有生成结果同时包含原始图片与水印图片时，页面才显示图片对比入口。' }], related: { href: '#/workspace/multimodal', name: '图文内容安全检测' } },
  audit: { title: '结论与依据一起查看', intro: '通过知识检索辅助审核，查看分析过程、相关条目及最终处理建议。', icon: 'book', outputs: ['审核分析过程', '相关知识条目', '结论与处理建议'], tips: ['保留需要审核的完整文本和上下文。', '可调整知识重排、返回文档数和生成温度。', '知识库越贴近审核场景，检索依据越便于理解。'], questions: [{ title: '知识重排有什么作用？', answer: '对检索结果进一步排序，帮助优先查看更相关的知识条目。' }, { title: '如何补充审核知识？', answer: '进入知识库新增条目，或通过 CSV 数据集导入知识。' }], related: { href: '#/knowledge/list', name: '管理审核知识库' } },
}
const guide = computed(() => guides[props.tool] || guides.multimodal)
</script>

<template>
  <aside class="tool-guide"><section class="tool-guide-card"><span class="icon-tile blue"><PlatformIcon :name="guide.icon" /></span><span class="micro-label">SCENARIO GUIDE</span><h3>{{ guide.title }}</h3><p>{{ guide.intro }}</p><div class="guide-output-list"><span v-for="item in guide.outputs" :key="item"><PlatformIcon name="check" />{{ item }}</span></div></section><section class="tool-guide-card tips-card"><h3><PlatformIcon name="spark" />使用小贴士</h3><ul><li v-for="tip in guide.tips" :key="tip">{{ tip }}</li></ul></section><section class="tool-guide-card faq-card"><h3>常见问题</h3><details v-for="question in guide.questions" :key="question.title"><summary>{{ question.title }}<PlatformIcon name="plus" /></summary><p>{{ question.answer }}</p></details></section><section v-if="tool === 'audit'" class="tool-guide-card audit-context"><h3>当前工作空间</h3><div><span>已加载知识</span><strong>{{ kbStore.documents.length }} 条</strong></div><div><span>已读取模型配置</span><strong>{{ systemStore.currentModel || '待配置' }}</strong></div></section><a class="tool-related-link" :href="guide.related.href"><div><span class="micro-label">CONTINUE EXPLORING</span><h3>{{ guide.related.name }}</h3></div><PlatformIcon name="arrow" /></a></aside>
</template>
