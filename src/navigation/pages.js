export const detectionTools = [
  { id: 'multimodal', name: '图文检测', icon: 'image', tag: 'MULTIMODAL', description: '联合分析文本与图片，从 16 个维度识别内容风险。', hint: '输入文本或上传图片，即可开始多模态内容检测。' },
  { id: 'hallucination', name: '幻觉检测', icon: 'brain', tag: 'RELIABILITY', description: '评估模型回答的可靠性，查看分析结论与修正建议。', hint: '输入初始问题，对比模型响应与去幻觉建议。' },
  { id: 'sycophancy', name: '谄媚检测', icon: 'chat', tag: 'OBJECTIVITY', description: '识别模型的过度迎合倾向，辅助评估回答客观性。', hint: '输入问题，分析模型是否存在过度迎合倾向。' },
  { id: 'watermark', name: '文本水印', icon: 'stamp', tag: 'TRACEABILITY', description: '嵌入与检测文本水印，为生成内容提供溯源能力。', hint: '为文本添加隐藏水印，或检查已有文本的水印特征。' },
  { id: 'audit', name: '内容安全审核', icon: 'shield', tag: 'KNOWLEDGE-BASED', description: '结合知识库检索与模型分析，提供内容审核依据。', hint: '配置检索参数，获取审核分析与相关知识条目。' },
]

export const knowledgeTabs = [
  { id: 'list', name: '知识库管理', icon: 'book', description: '浏览、搜索与维护审核知识，让每一次判断都有据可依。' },
  { id: 'import', name: '导入知识库', icon: 'upload', description: '通过 CSV 数据集构建知识库，统一管理内容与分类。' },
  { id: 'add', name: '新增知识', icon: 'plus', description: '补充知识条目、违规案例与参考来源，完善审核依据。' },
]

export const primaryPages = [
  { id: 'overview', name: '平台概览', english: 'Overview', icon: 'grid', href: '#/overview' },
  { id: 'workspace', name: '检测工作台', english: 'Workspace', icon: 'scan', href: '#/workspace/multimodal' },
  { id: 'knowledge', name: '知识库', english: 'Knowledge', icon: 'book', href: '#/knowledge/list' },
]

export function parseRoute(hash) {
  const [page, section] = hash.replace(/^#\/?/, '').split('/')
  if (page === 'workspace') return { page, section: detectionTools.some(tool => tool.id === section) ? section : 'multimodal' }
  if (page === 'knowledge') return { page, section: knowledgeTabs.some(tab => tab.id === section) ? section : 'list' }
  return { page: 'overview', section: '' }
}
