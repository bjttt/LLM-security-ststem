import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ConfigApi } from '../api/safety';

export const useSystemStore = defineStore('system', () => {
  const llmConfigured = ref(false);
  const currentModel = ref('');
  const embeddingModel = ref('');
  const rerankerModel = ref('');
  const supportedModels = ref({});
  const supportedEmbeddings = ref({});
  const supportedRerankers = ref({});
  const violationTypes = ref([]);
  
  const fetchConfigState = async () => {
    try {
      const res = await ConfigApi.getState();
      llmConfigured.value = res.llm_configured;
      currentModel.value = res.current_model;
      embeddingModel.value = res.embedding_model;
      rerankerModel.value = res.reranker_model;
      supportedModels.value = res.supported_llm_models;
      supportedEmbeddings.value = res.supported_embeddings;
      supportedRerankers.value = res.supported_rerankers;
      violationTypes.value = res.violation_types;
    } catch (e) {
      console.error("加载系统配置失败", e);
    }
  };

  return {
    llmConfigured,
    currentModel,
    embeddingModel,
    rerankerModel,
    supportedModels,
    supportedEmbeddings,
    supportedRerankers,
    violationTypes,
    fetchConfigState
  };
});
