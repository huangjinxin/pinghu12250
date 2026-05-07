<template>
  <div class="flipbook-mode">
    <n-spin :show="loading" description="加载中...">
      <template v-if="pdfDoc">
        <div class="pdf-main" ref="pdfMainRef">
          <!-- FlipBook 翻书组件 -->
          <div class="flipbook-wrapper">
            <FlipBook
              ref="flipbookRef"
              :pdf-doc="pdfDoc"
              :total-pages="totalPages"
              :zoom="zoom"
              :sound-enabled="soundEnabled"
              :subject="subject"
              @page-change="onPageChange"
              @ready="onReady"
              @link-click="onLinkClick"
              @navigation-change="onNavigationChange"
              @text-selection="onTextSelection"
            />
          </div>

          <!-- 底部控制栏 -->
          <div class="pdf-controls">
            <!-- 返回按钮（跳转历史） -->
            <n-button
              v-if="canGoBack"
              size="small"
              @click="handleGoBack"
              class="control-btn back-btn"
            >
              <template #icon>
                <n-icon><ArrowUndoOutline /></n-icon>
              </template>
              返回
            </n-button>

            <!-- 上一页 -->
            <n-button
              size="large"
              circle
              @click="flipPrev"
              :disabled="currentPage <= 1"
              class="control-btn nav-btn"
            >
              <template #icon>
                <n-icon size="24"><ChevronBack /></n-icon>
              </template>
            </n-button>

            <!-- 页码显示 -->
            <div class="page-info">
              <span class="page-num">{{ currentPage }} / {{ totalPages }}</span>
            </div>

            <!-- 下一页 -->
            <n-button
              size="large"
              circle
              @click="flipNext"
              :disabled="currentPage >= totalPages - 1"
              class="control-btn nav-btn"
            >
              <template #icon>
                <n-icon size="24"><ChevronForward /></n-icon>
              </template>
            </n-button>

            <!-- 缩放 -->
            <n-button-group size="small">
              <n-button @click="$emit('zoom-out')" :disabled="zoom <= 0.5" class="control-btn">
                <template #icon>
                  <n-icon><Remove /></n-icon>
                </template>
              </n-button>
              <n-button class="control-btn zoom-display">
                {{ Math.round(zoom * 100) }}%
              </n-button>
              <n-button @click="$emit('zoom-in')" :disabled="zoom >= 2" class="control-btn">
                <template #icon>
                  <n-icon><Add /></n-icon>
                </template>
              </n-button>
            </n-button-group>

            <!-- 全屏按钮 -->
            <n-button
              size="small"
              @click="toggleFullscreen"
              class="control-btn"
            >
              <template #icon>
                <n-icon><component :is="isFullscreen ? Contract : Expand" /></n-icon>
              </template>
            </n-button>

            <!-- 声音开关 -->
            <n-button
              size="small"
              @click="$emit('toggle-sound')"
              class="control-btn"
            >
              <template #icon>
                <n-icon><component :is="soundEnabled ? VolumeHigh : VolumeMute" /></n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </template>

      <!-- 无 PDF 时显示上传入口 -->
      <template v-else-if="!loading">
        <div class="no-pdf">
          <n-empty description="该教材暂无PDF文件">
            <template #extra>
              <n-upload
                :custom-request="handleUpload"
                accept=".pdf"
                :show-file-list="false"
              >
                <n-button type="primary">上传PDF</n-button>
              </n-upload>
            </template>
          </n-empty>
        </div>
      </template>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ChevronBack from '@vicons/ionicons5/es/ChevronBack'
import ChevronForward from '@vicons/ionicons5/es/ChevronForward'
import Expand from '@vicons/ionicons5/es/Expand'
import Contract from '@vicons/ionicons5/es/Contract'
import Add from '@vicons/ionicons5/es/Add'
import Remove from '@vicons/ionicons5/es/Remove'
import VolumeHigh from '@vicons/ionicons5/es/VolumeHigh'
import VolumeMute from '@vicons/ionicons5/es/VolumeMute'
import ArrowUndoOutline from '@vicons/ionicons5/es/ArrowUndoOutline'
import FlipBook from '@/components/FlipBook.vue';

const props = defineProps({
  pdfDoc: Object,
  totalPages: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  zoom: {
    type: Number,
    default: 1
  },
  soundEnabled: {
    type: Boolean,
    default: true
  },
  subject: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'page-change',
  'ready',
  'link-click',
  'navigation-change',
  'text-selection',
  'zoom-in',
  'zoom-out',
  'toggle-sound',
  'upload-pdf',
  'fullscreen-change'
]);

// Refs
const flipbookRef = ref(null);
const pdfMainRef = ref(null);
const canGoBack = ref(false);
const isFullscreen = ref(false);

// FlipBook 事件处理
const onPageChange = (page) => {
  emit('page-change', page);
};

const onReady = () => {
  emit('ready');
};

const onLinkClick = (linkInfo) => {
  emit('link-click', linkInfo);
};

const onNavigationChange = (info) => {
  canGoBack.value = info.canGoBack;
  emit('navigation-change', info);
};

const onTextSelection = (selection) => {
  emit('text-selection', selection);
};

// 翻页控制
const flipNext = () => {
  flipbookRef.value?.flipNext();
};

const flipPrev = () => {
  flipbookRef.value?.flipPrev();
};

const handleGoBack = () => {
  flipbookRef.value?.goBack();
};

// 全屏控制
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await pdfMainRef.value?.requestFullscreen();
      isFullscreen.value = true;
    } else {
      await document.exitFullscreen();
      isFullscreen.value = false;
    }
    emit('fullscreen-change', isFullscreen.value);
  } catch (e) {
    console.warn('全屏切换失败:', e);
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  emit('fullscreen-change', isFullscreen.value);
};

// 上传处理
const handleUpload = (options) => {
  emit('upload-pdf', options);
};

// 清除选中（供父组件调用）
const clearSelection = () => {
  flipbookRef.value?.clearSelection();
};

// 跳转到指定页（供父组件调用）
const goToPage = (page) => {
  flipbookRef.value?.goToPage(page);
};

// 暴露方法给父组件
defineExpose({
  flipNext,
  flipPrev,
  handleGoBack,
  clearSelection,
  goToPage,
  toggleFullscreen
});

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style scoped>
.flipbook-mode {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.flipbook-mode :deep(.n-spin-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.flipbook-mode :deep(.n-spin-content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.pdf-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;
  background: #4a5568;
}

.flipbook-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  min-height: 400px;
}

/* 底部控制栏 */
.pdf-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 50px;
  z-index: 100;
}

.pdf-controls .control-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
}

.pdf-controls .control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.pdf-controls .control-btn:disabled {
  opacity: 0.3;
}

.pdf-controls .back-btn {
  background: rgba(24, 144, 255, 0.3);
  padding: 0 12px;
  font-size: 12px;
}

.pdf-controls .back-btn:hover {
  background: rgba(24, 144, 255, 0.5);
}

.pdf-controls .nav-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
}

.pdf-controls .nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.pdf-controls .page-info {
  min-width: 100px;
  text-align: center;
}

.pdf-controls .page-num {
  color: white;
  font-size: 16px;
  font-weight: 500;
}

.pdf-controls .zoom-display {
  min-width: 60px;
  text-align: center;
  cursor: default;
}

/* 全屏模式 */
.pdf-main:fullscreen {
  background: #2d3748;
}

.pdf-main:fullscreen .pdf-controls {
  bottom: 40px;
}

.no-pdf {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}
</style>
