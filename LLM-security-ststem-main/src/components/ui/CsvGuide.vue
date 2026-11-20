<script setup>
import { computed } from 'vue'
import PlatformIcon from './PlatformIcon.vue'
const props = defineProps({ textColumn: { type: String, default: 'content' }, categoryColumn: { type: String, default: 'category' } })
const csvField = (value) => '"' + String(value).replaceAll('"', '""') + '"'
const templateUrl = computed(() => {
  const rows = [
    [props.textColumn || 'content', props.categoryColumn || 'category'],
    ['此处填写知识条目的正文内容', '违规案例'],
  ]
  const content = String.fromCharCode(65279) + rows.map(row => row.map(csvField).join(',')).join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10)
  return 'data:text/csv;charset=utf-8,' + encodeURIComponent(content)
})
</script>

<template>
  <section class="csv-guide"><div class="csv-guide-heading"><div><span class="micro-label">DATA FORMAT</span><h3>数据格式示例</h3></div><a class="button secondary" :href="templateUrl" download="knowledge-template.csv"><PlatformIcon name="upload" />下载 CSV 模板</a></div><p>模板列名随列名配置同步更新，填写正文与分类后即可使用。</p><div class="csv-preview"><table><thead><tr><th>{{ textColumn || 'content' }}</th><th>{{ categoryColumn || 'category' }}</th></tr></thead><tbody><tr><td>此处填写知识条目的正文内容</td><td>违规案例</td></tr><tr><td>可补充法律法规、政策文件与权威表述</td><td>法律法规</td></tr></tbody></table></div><div class="csv-hints"><span><PlatformIcon name="check" />UTF-8 编码</span><span><PlatformIcon name="check" />第一行为列名</span><span><PlatformIcon name="check" />正文与分类分列填写</span></div></section>
</template>
