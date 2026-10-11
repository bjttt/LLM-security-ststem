<template>
  <el-card v-if="result" class="audit-result">
    <template #header>
      <div class="card-header">
        <span>审核结果明细</span>
        <el-tag
          :type="result.result === '合规' ? 'success' : result.result === '不合规' ? 'danger' : 'warning'"
        >
          {{ result.result }}
        </el-tag>
      </div>
    </template>
    <el-descriptions border :column="1">
      <el-descriptions-item label="违规类型">{{ result.violation_type }}</el-descriptions-item>
      <el-descriptions-item label="严重程度">{{ result.severity }}</el-descriptions-item>
      <el-descriptions-item label="处理建议">{{ result.suggestion }}</el-descriptions-item>
      <el-descriptions-item label="参考来源">{{ result.sources }}</el-descriptions-item>
      <el-descriptions-item label="判定原因">{{ result.reason }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>
<script setup>
defineProps({
  result: Object
});
</script>
<style scoped>
.audit-result {
  margin-top: 24px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
</style>
