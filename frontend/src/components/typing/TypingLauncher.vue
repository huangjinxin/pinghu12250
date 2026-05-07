<template>
  <div class="typing-launcher">
    <n-card size="small">
      <div class="launcher-content">
        <div class="game-icon">🚀</div>
        <h2 class="game-title">星际字航员</h2>
        <p class="game-desc">不用切换输入法，直接敲击字母消灭敌人！高连击触发全屏火力打击。</p>

        <div class="difficulty-section">
          <div class="difficulty-label">选择速度</div>
          <n-radio-group v-model:value="difficulty" name="difficulty">
            <n-space>
              <n-radio :value="0.25">极慢 (x0.25)</n-radio>
              <n-radio :value="0.5">慢速 (x0.5)</n-radio>
              <n-radio :value="0.75">中速 (x0.75)</n-radio>
              <n-radio :value="1.0">快速 (x1.0)</n-radio>
            </n-space>
          </n-radio-group>
        </div>

        <n-button type="primary" size="large" block @click="handleStart">
          准备起飞
        </n-button>

        <div class="tips">
          <n-text depth="3" style="font-size: 13px;">
            提示：需要外接键盘。敲击字母锁定并消灭屏幕上的敌人，完成一局后自动保存记录。
          </n-text>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['start'])
const difficulty = ref(1.0)

function handleStart() {
  emit('start', difficulty.value)
}
</script>

<style scoped>
.typing-launcher {
  max-width: 500px;
  margin: 0 auto;
}

.launcher-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
}

.game-icon {
  font-size: 64px;
}

.game-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.game-desc {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  max-width: 360px;
}

.difficulty-section {
  width: 100%;
  text-align: center;
}

.difficulty-label {
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.tips {
  text-align: center;
  margin-top: 8px;
}
</style>
