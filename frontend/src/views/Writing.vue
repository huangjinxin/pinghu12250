<template>
  <div class="writing-page">
    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="fonts" tab="字体">
        <FontManager @font-selected="handleFontSelected" />
      </n-tab-pane>
      <n-tab-pane name="practice" tab="临摹">
        <PracticePanel
          :default-font="defaultFont"
          @start-practice="handleStartPractice"
        />
      </n-tab-pane>
      <n-tab-pane name="gallery" tab="作品库">
        <CalligraphyGallery />
      </n-tab-pane>
      <n-tab-pane name="analysis" tab="书写分析">
        <WritingAnalysis />
      </n-tab-pane>
    </n-tabs>

    <!-- 全屏书写模态框 -->
    <CalligraphyPractice
      v-if="showPractice"
      :text="practiceText"
      :font="selectedFont"
      @close="handlePracticeClose"
      @complete="handlePracticeComplete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { fontAPI } from '@/api/index';
import FontManager from '@/components/writing/FontManager.vue';
import PracticePanel from '@/components/writing/PracticePanel.vue';
import CalligraphyGallery from '@/components/writing/CalligraphyGallery.vue';
import CalligraphyPractice from '@/components/writing/CalligraphyPractice.vue';
import WritingAnalysis from '@/components/writing/WritingAnalysis.vue';

const message = useMessage();
const activeTab = ref('practice');
const defaultFont = ref(null);
const selectedFont = ref(null);
const showPractice = ref(false);
const practiceText = ref('');

// 加载默认字体
const loadDefaultFont = async () => {
  try {
    const res = await fontAPI.list();
    if (res.success && res.data) {
      defaultFont.value = res.data.find(f => f.isDefault) || res.data[0] || null;
    }
  } catch (error) {
    console.error('加载字体失败:', error);
  }
};

// 字体选择回调
const handleFontSelected = (font) => {
  selectedFont.value = font;
  defaultFont.value = font;
};

// 开始练习
const handleStartPractice = ({ text, font }) => {
  if (!text || text.trim().length === 0) {
    message.warning('请输入要临摹的文字');
    return;
  }
  practiceText.value = text.trim();
  selectedFont.value = font || defaultFont.value;
  showPractice.value = true;
};

// 关闭练习
const handlePracticeClose = () => {
  showPractice.value = false;
};

// 练习完成
const handlePracticeComplete = () => {
  showPractice.value = false;
  activeTab.value = 'gallery';
  message.success('作品已保存到作品库');
};

onMounted(() => {
  loadDefaultFont();
});
</script>

<style scoped>
.writing-page {
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
