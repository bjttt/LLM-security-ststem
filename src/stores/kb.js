import { defineStore } from 'pinia';
import { ref } from 'vue';
import { KBApi } from '../api/safety';

export const useKBStore = defineStore('kb', () => {
  const documents = ref([]);
  const stats = ref({ total_documents: 0, categories: {}, index_size: 0 });

  const fetchDocuments = async () => {
    try {
      const data = await KBApi.getAll();
      documents.value = data;
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await KBApi.getStats();
      stats.value = data;
    } catch (error) {
      console.error(error);
    }
  };

  const loadAll = async () => {
    await fetchDocuments();
    await fetchStats();
  };

  return {
    documents,
    stats,
    fetchDocuments,
    fetchStats,
    loadAll
  };
});
