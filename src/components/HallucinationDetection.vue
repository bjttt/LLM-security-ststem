<script setup>
import { onMounted } from 'vue'
import EvaluationChat from './EvaluationChat.vue'
import SessionSidebar from './conversation/SessionSidebar.vue'
import { useEvaluationChatStore } from '../stores/evaluationChat.js'
const store = useEvaluationChatStore()
onMounted(() => store.hydrate('hallucination'))
</script>

<template>
  <div class="tool-conversations">
    <SessionSidebar tool-name="幻觉检测" :sessions="store.conversations('hallucination')" :active-id="store.currentId('hallucination')" :ready="store.isReady('hallucination')" :storage-error="store.storageError('hallucination')" @create="store.newConversation('hallucination')" @select="id => store.select('hallucination', id)" @rename="(id, title) => store.rename('hallucination', id, title)" @remove="id => store.remove('hallucination', id)" />
    <div class="tool-conversation-main"><EvaluationChat kind="hallucination" :ready="store.isReady('hallucination')" /></div>
  </div>
</template>
