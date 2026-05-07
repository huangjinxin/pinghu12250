<template>
  <div class="typing-page">
    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="practice" tab="开始练习">
        <TypingLauncher @start="handleStart" />
      </n-tab-pane>
      <n-tab-pane name="records" tab="练习记录">
        <TypingRecords ref="recordsRef" />
      </n-tab-pane>
      <n-tab-pane name="analysis" tab="数据分析">
        <TypingDataAnalysis />
      </n-tab-pane>
      <n-tab-pane name="leaderboard" tab="排行榜">
        <TypingLeaderboard />
      </n-tab-pane>
      <n-tab-pane name="idioms" tab="成语">
        <TypingIdioms />
      </n-tab-pane>
    </n-tabs>

    <!-- 全屏游戏 -->
    <TypingPractice
      v-if="showPractice"
      :difficulty="difficulty"
      @close="handleClose"
      @complete="handleComplete"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import TypingLauncher from '@/components/typing/TypingLauncher.vue'
import TypingRecords from '@/components/typing/TypingRecords.vue'
import TypingLeaderboard from '@/components/typing/TypingLeaderboard.vue'
import TypingDataAnalysis from '@/components/typing/TypingDataAnalysis.vue'
import TypingIdioms from '@/components/typing/TypingIdioms.vue'
import TypingPractice from '@/components/typing/TypingPractice.vue'

const message = useMessage()
const activeTab = ref('practice')
const showPractice = ref(false)
const difficulty = ref(1.0)
const recordsRef = ref(null)

function handleStart(diff) {
  difficulty.value = diff || 1.0
  showPractice.value = true
}

function handleClose() {
  showPractice.value = false
}

function handleComplete() {
  showPractice.value = false
  activeTab.value = 'records'
  message.success('练习记录已保存')
  recordsRef.value?.refresh()
}
</script>

<style scoped>
.typing-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

:deep(.n-tabs-nav) {
  padding: 0 16px;
}

:deep(.n-tab-pane) {
  padding: 16px 0;
}
</style>
