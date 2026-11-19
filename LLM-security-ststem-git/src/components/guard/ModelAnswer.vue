<script setup>
import { computed } from 'vue'
import PlatformIcon from '../ui/PlatformIcon.vue'

const props = defineProps({
  answer: { type: Object, default: null },
  model: { type: String, default: '' },
  action: { type: String, default: 'pending' },
})
defineEmits(['generate'])

const canGenerate = computed(() => ['passed', 'rewritten', 'forced'].includes(props.action))
const blocked = computed(() => props.action === 'blocked' || props.action === 'rolledback')
const statusText = computed(() => {
  if (blocked.value) return props.action === 'blocked' ? '已阻断' : '已回退'
  if (!props.answer) return '等待放行'
  if (props.answer.status === 'loading') return '生成中'
  if (props.answer.status === 'error') return '生成失败'
  return '已完成'
})
</script>

<template>
  <section class="model-answer" :class="{ 'is-blocked': blocked, 'is-loading': answer?.status === 'loading' }" aria-live="polite">
    <header class="model-answer-head">
      <div class="model-answer-title">
        <span class="model-answer-icon"><PlatformIcon name="chat" /></span>
        <div>
          <span class="micro-label">MODEL RESPONSE</span>
          <h3>模型回答</h3>
        </div>
      </div>
      <div class="model-answer-meta">
        <span v-if="model" class="model-chip">{{ model }}</span>
        <span class="model-status" :class="`is-${answer?.status || 'idle'}`">{{ statusText }}</span>
      </div>
    </header>

    <div v-if="blocked" class="model-answer-blocked">
      <PlatformIcon name="shield" />
      <div>
        <strong>{{ action === 'blocked' ? '本次请求已被阻断' : '已回退原句' }}</strong>
        <p>{{ action === 'blocked' ? '高风险 Prompt 没有送入大模型，因此不会产生模型输出。' : '回退后原句不会送入大模型；如需继续，请重新提交或采纳净化版本。' }}</p>
      </div>
    </div>

    <div v-else-if="!answer || answer.status === 'idle'" class="model-answer-empty">
      <p>{{ canGenerate ? '防护已通过，可以把最终 Prompt 送入大模型生成回答。' : '完成处置后，这里会显示模型对提示词的输出。' }}</p>
      <el-button v-if="canGenerate" type="primary" plain @click="$emit('generate')">
        <PlatformIcon name="spark" />生成模型回答
      </el-button>
    </div>

    <div v-else class="model-answer-body">
      <p v-if="answer.status === 'loading' && !answer.output" class="model-answer-loading">
        <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        正在生成回答…
      </p>
      <pre v-if="answer.output" class="model-answer-text">{{ answer.output }}</pre>
      <p v-if="answer.status === 'error'" class="model-answer-error">
        {{ answer.error }}
        <button type="button" @click="$emit('generate')">重试</button>
      </p>
      <footer v-if="answer.status === 'done'" class="model-answer-foot">
        <span><PlatformIcon name="check" />已通过防护并完成生成</span>
        <span v-if="answer.elapsed">{{ answer.elapsed }} ms</span>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.model-answer { border: 1px solid var(--line, #e3e8ef); border-radius: 16px; background: #fff; overflow: hidden; }
.model-answer-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 18px; border-bottom: 1px solid #eef2f7; }
.model-answer-title { display: flex; align-items: center; gap: 10px; }
.model-answer-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; background: #eef4ff; color: #2f6fed; }
.model-answer-title h3 { margin: 2px 0 0; font-size: 15px; color: #172033; }
.model-answer-meta { display: flex; align-items: center; gap: 8px; }
.model-chip { padding: 4px 9px; border-radius: 999px; background: #f2f5fa; color: #5b6673; font-size: 11px; }
.model-status { font-size: 11px; color: #7a8594; }
.model-status.is-done { color: #1e8e4e; }
.model-status.is-error { color: #c0392b; }
.model-status.is-loading { color: #b7791f; }
.model-answer-blocked { display: flex; gap: 12px; align-items: flex-start; padding: 16px 18px; background: #fff7f7; color: #8a3b3b; }
.model-answer-blocked strong { display: block; margin-bottom: 4px; }
.model-answer-blocked p { margin: 0; line-height: 1.7; font-size: 13px; }
.model-answer-empty { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px; color: #5b6673; }
.model-answer-empty p { margin: 0; line-height: 1.7; font-size: 13px; }
.model-answer-body { padding: 16px 18px; }
.model-answer-text { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; line-height: 1.85; color: #1f2a37; }
.model-answer-loading { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; color: #7a8594; font-size: 12px; }
.typing-dot { width: 5px; height: 5px; border-radius: 50%; background: #2f6fed; animation: typing 1.2s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: .15s; }
.typing-dot:nth-child(3) { animation-delay: .3s; }
@keyframes typing { 0%, 60%, 100% { opacity: .25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
.model-answer-error { margin: 8px 0 0; color: #c0392b; font-size: 13px; }
.model-answer-error button { margin-left: 8px; border: 0; background: none; color: #2f6fed; cursor: pointer; }
.model-answer-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #e3e8ef; color: #7a8594; font-size: 11px; }
.model-answer-foot span { display: inline-flex; align-items: center; gap: 5px; }
</style>
