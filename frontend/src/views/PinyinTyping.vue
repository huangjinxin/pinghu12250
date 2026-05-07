<template>
  <div class="pinyin-typing-page">
    <n-tabs v-model:value="activeTab" type="line" animated class="pinyin-tabs">
      <n-tab-pane name="practice" tab="拼音练习">
        <PinyinInput @start="handleStart" />
      </n-tab-pane>
      <n-tab-pane name="analysis" tab="练习分析">
        <PinyinAnalysis ref="analysisRef" :active="activeTab === 'analysis'" />
      </n-tab-pane>
      <n-tab-pane name="leaderboard" tab="排行榜">
        <PinyinLeaderboard />
      </n-tab-pane>
      <n-tab-pane name="chart" tab="声韵调">
        <PinyinChart />
      </n-tab-pane>
    </n-tabs>

    <!-- 全屏练习模态 -->
    <PinyinPractice
      v-if="showPractice"
      :pinyin-data="pinyinData"
      @close="handleClose"
      @complete="handleComplete"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import PinyinInput from '@/components/pinyin/PinyinInput.vue'
import PinyinAnalysis from '@/components/pinyin/PinyinAnalysis.vue'
import PinyinLeaderboard from '@/components/pinyin/PinyinLeaderboard.vue'
import PinyinPractice from '@/components/pinyin/PinyinPractice.vue'
import PinyinChart from '@/components/pinyin/PinyinChart.vue'

const message = useMessage()
const activeTab = ref('practice')
const showPractice = ref(false)
const pinyinData = ref(null)
const analysisRef = ref(null)

function handleStart(data) {
  pinyinData.value = data
  showPractice.value = true
}

function handleClose() {
  showPractice.value = false
}

function handleComplete() {
  showPractice.value = false
  activeTab.value = 'analysis'
  message.success('练习记录已保存')
  // 刷新分析列表
  analysisRef.value?.refresh()
}
</script>

<style scoped>
.pinyin-typing-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

:deep(.n-tabs-nav) {
  padding: 0 16px;
}

.pinyin-tabs :deep(.n-tabs-nav-scroll-content) {
  min-width: max-content;
}

.pinyin-tabs :deep(.n-tabs-tab) {
  white-space: nowrap;
}

:deep(.n-tab-pane) {
  padding: 16px 0;
}

@media (max-width: 768px) {
  .pinyin-typing-page {
    padding: 12px;
  }

  :deep(.n-tabs-nav) {
    padding: 0 8px;
  }

  .pinyin-tabs :deep(.n-tabs-tab) {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
