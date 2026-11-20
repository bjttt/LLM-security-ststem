<script setup>
import { computed, ref } from 'vue'
import { diffText } from '../../utils/sycophancy/diff.js'
import { useConversationUi } from '../../composables/useConversationUi.js'
const props = defineProps({ modelValue: Boolean, turn: Object })
const emit = defineEmits(['update:modelValue', 'retry'])
const showDiff = ref(false)
const diff = computed(() => props.turn && showDiff.value ? diffText(props.turn.normal.text, props.turn.objective.text) : null)
const { copy } = useConversationUi(ref(null), ref(null), () => {})
</script>
<template>
  <el-drawer :model-value="modelValue" title="回答对照" size="min(880px, 96vw)" @update:model-value="emit('update:modelValue', $event)">
    <template v-if="turn"><p class="comparison-question">{{ turn.question }}</p><label class="comparison-toggle"><input v-model="showDiff" type="checkbox" />显示文字差异</label><div class="comparison-columns"><section><header><h3>原始回答</h3><button @click="copy(turn.normal.text)">复制</button></header><p class="comparison-text"><template v-if="diff"><span v-for="(part,i) in diff.original" :key="i" :class="{ removed: part.changed }">{{ part.text }}</span></template><template v-else>{{ turn.normal.text }}</template></p></section><section><header><h3>客观回答</h3><button v-if="turn.objective.status === 'complete'" @click="copy(turn.objective.text)">复制</button></header><p v-if="turn.objective.status === 'error'" class="comparison-error">{{ turn.objective.error }}<button @click="emit('retry')">重试客观回答</button></p><p v-else-if="turn.objective.status !== 'complete'" class="comparison-note">正在生成客观回答…</p><p v-else class="comparison-text"><template v-if="diff"><span v-for="(part,i) in diff.objective" :key="i" :class="{ added: part.changed }">{{ part.text }}</span></template><template v-else>{{ turn.objective.text }}</template></p></section></div><p class="comparison-note">文字差异用于比较表达；客观回答是独立生成的对照。</p></template>
  </el-drawer>
</template>
<style scoped>
.comparison-question{font-size:13px;line-height:1.9;background:#f3f6fc;padding:16px 20px;border-radius:9px;color:#617794;white-space:pre-wrap}.comparison-toggle{font-size:12px;color:#8597b1;display:flex;gap:8px;align-items:center;margin:22px 0}.comparison-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px}.comparison-columns section{border:1px solid #e2e9f3;border-radius:10px;overflow:hidden}.comparison-columns header{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #eaf0f6;background:#fafcff}.comparison-columns h3{font-size:13px;font-weight:500;color:#6982a6;margin:0}.comparison-columns button{border:0;background:transparent;color:#7d97bc;cursor:pointer;font-size:11px}.comparison-text{padding:18px;font-size:13px;line-height:2.1;white-space:pre-wrap;overflow-wrap:anywhere;color:#62758e;margin:0}.removed{background:#fff0e8;color:#a76e56}.added{background:#eaf6ec;color:#5a8b6b}.comparison-note{font-size:11px;line-height:1.9;color:#9aa9bd;padding:10px 0}.comparison-error{padding:18px;color:#ad7b6c;font-size:12px;line-height:1.9}.comparison-error button{display:block;margin-top:10px}@media(max-width:600px){.comparison-columns{grid-template-columns:1fr}}
</style>
