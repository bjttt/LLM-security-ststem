<script setup>
import { useGuardStore } from '../../stores/guard'

const store = useGuardStore()
</script>

<template>
  <div class="guard-settings">
    <div class="guard-settings-head">
      <div>
        <h3><PlatformIcon name="layers" />检测参数</h3>
        <p>阈值调整后会立即重新评估当前输入与多轮轨迹</p>
      </div>
      <button type="button" class="text-button" @click="store.resetThresholds()">恢复默认</button>
    </div>
    <div class="guard-settings-grid">
      <div class="guard-setting">
        <div class="setting-label"><span>掩码阈值 θ</span><strong>{{ store.thresholds.mask.toFixed(2) }}</strong></div>
        <el-slider :model-value="store.thresholds.mask" :min="0.2" :max="0.6" :step="0.05" :show-tooltip="false" @update:model-value="store.setThresholds({ mask: Number($event) })" />
        <p>p_i ≥ θ 的 Token 被标记为需改写片段</p>
      </div>
      <div class="guard-setting">
        <div class="setting-label"><span>低风险上界 θ1</span><strong>{{ store.thresholds.low.toFixed(2) }}</strong></div>
        <el-slider :model-value="store.thresholds.low" :min="0.3" :max="0.65" :step="0.01" :show-tooltip="false" @update:model-value="store.setThresholds({ low: Number($event) })" />
        <p>低于该分数直接放行，用户无感知</p>
      </div>
      <div class="guard-setting">
        <div class="setting-label"><span>高风险下界 θ2</span><strong>{{ store.thresholds.high.toFixed(2) }}</strong></div>
        <el-slider :model-value="store.thresholds.high" :min="0.55" :max="0.95" :step="0.01" :show-tooltip="false" @update:model-value="store.setThresholds({ high: Number($event) })" />
        <p>高于该分数保守删除并阻断，落审计</p>
      </div>
      <div class="guard-setting">
        <div class="setting-label"><span>记忆窗口 w</span><strong>{{ store.thresholds.window }}</strong></div>
        <el-slider :model-value="store.thresholds.window" :min="2" :max="5" :step="1" :show-tooltip="false" @update:model-value="store.setThresholds({ window: Number($event) })" />
        <p>抗污染校验使用的滑动窗口轮数</p>
      </div>
    </div>
  </div>
</template>
