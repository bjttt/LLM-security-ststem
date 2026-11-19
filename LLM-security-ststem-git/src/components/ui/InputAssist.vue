<script setup>
import { computed, ref } from 'vue'
import PlatformIcon from './PlatformIcon.vue'
const props = defineProps({ text: { type: String, default: '' }, examples: { type: Array, default: () => [] }, disabled: Boolean, shortcut: { type: String, default: '' }, label: { type: String, default: '文本' } })
const emit = defineEmits(['select', 'clear'])
const pendingExample = ref(null)
const dialogVisible = computed({ get: () => Boolean(pendingExample.value), set: (visible) => { if (!visible) pendingExample.value = null } })
const chooseExample = (example) => {
  if (props.text.trim() && props.text !== example.text) pendingExample.value = example
  else emit('select', example.text)
}
const applyExample = () => { emit('select', pendingExample.value.text); pendingExample.value = null }
</script>

<template>
  <div class="input-assist">
    <div v-if="examples.length" class="example-strip"><span><PlatformIcon name="spark" />试试示例</span><button v-for="example in examples" :key="example.label" type="button" :disabled="disabled" @click="chooseExample(example)">{{ example.label }}<PlatformIcon name="arrow" /></button></div>
    <div class="input-meta"><span>{{ text.length.toLocaleString() }} 字<span v-if="shortcut" class="shortcut-hint">{{ shortcut }}</span></span><button type="button" :disabled="disabled || !text.length" @click="emit('clear')"><PlatformIcon name="close" />清空{{ label }}</button></div>
    <el-dialog v-model="dialogVisible" title="填入示例内容" width="min(440px, 92vw)" :show-close="true"><p class="example-confirm">填入示例将替换当前输入内容。</p><template #footer><el-button @click="pendingExample = null">保留当前内容</el-button><el-button type="primary" @click="applyExample">填入示例</el-button></template></el-dialog>
  </div>
</template>
