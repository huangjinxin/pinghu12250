<template>
  <div class="epub-reader" ref="containerRef">
    <!-- 章节目录侧边栏 -->
    <div class="toc-sidebar" :class="{ collapsed: !showToc }">
      <div class="toc-header">
        <span>目录</span>
        <n-button quaternary size="small" @click="showToc = false">
          <template #icon><n-icon><CloseOutline /></n-icon></template>
        </n-button>
      </div>
      <div class="toc-list">
        <div
          v-for="chapter in chapters"
          :key="chapter.id"
          class="toc-item"
          :class="{ active: chapter.id === currentChapterId }"
          @click="goToChapter(chapter.id)"
        >
          {{ chapter.title }}
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-area">
      <!-- 顶部章节导航 -->
      <div class="chapter-nav">
        <n-button size="small" quaternary @click="showToc = true">
          <template #icon><n-icon><MenuOutline /></n-icon></template>
          目录
        </n-button>
        <span class="chapter-title">{{ currentChapterTitle }}</span>
        <div class="chapter-buttons">
          <n-button size="small" :disabled="!hasPreviousChapter" @click="previousChapter">
            上一章
          </n-button>
          <n-button size="small" :disabled="!hasNextChapter" @click="nextChapter">
            下一章
          </n-button>
        </div>
      </div>

      <!-- EPUB 内容渲染区 -->
      <div
        class="epub-content"
        ref="contentRef"
        @mouseup="handleTextSelection"
        @touchend="handleTextSelection"
        v-html="currentChapterHtml"
      />

      <!-- 底部信息 -->
      <div class="chapter-footer">
        <span>{{ currentChapterIndex + 1 }} / {{ chapters.length }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <n-spin size="large" />
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { NSpin, NButton, NIcon } from 'naive-ui';
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import MenuOutline from '@vicons/ionicons5/es/MenuOutline'
import { textbookAPI } from '@/api/index';

const props = defineProps({
  textbookId: { type: String, required: true },
  chapters: { type: Array, default: () => [] },
  initialChapterId: { type: String, default: '' },
  subject: { type: String, default: '' },
});

const emit = defineEmits([
  'chapter-change',
  'text-selection',
  'position-change',
]);

// 状态
const containerRef = ref(null);
const contentRef = ref(null);
const loading = ref(false);
const showToc = ref(false);
const currentChapterId = ref('');
const currentChapterHtml = ref('');

// 计算属性
const currentChapterIndex = computed(() => {
  return props.chapters.findIndex(c => c.id === currentChapterId.value);
});

const currentChapterTitle = computed(() => {
  const chapter = props.chapters.find(c => c.id === currentChapterId.value);
  return chapter?.title || '';
});

const hasPreviousChapter = computed(() => currentChapterIndex.value > 0);
const hasNextChapter = computed(() => currentChapterIndex.value < props.chapters.length - 1);

// 加载章节内容
async function loadChapter(chapterId) {
  if (!chapterId || !props.textbookId) return;

  loading.value = true;
  try {
    const res = await textbookAPI.getEpubChapter(props.textbookId, chapterId);
    if (res.success) {
      currentChapterId.value = chapterId;
      currentChapterHtml.value = res.html;

      // 滚动到顶部
      await nextTick();
      if (contentRef.value) {
        contentRef.value.scrollTop = 0;
      }

      emit('chapter-change', {
        chapterId,
        chapterTitle: currentChapterTitle.value,
        chapterIndex: currentChapterIndex.value,
      });

      emit('position-change', {
        type: 'epub',
        chapterId,
        paragraphId: null,
      });
    }
  } catch (error) {
    console.error('加载章节失败:', error);
  } finally {
    loading.value = false;
  }
}

// 导航方法
function goToChapter(chapterId) {
  loadChapter(chapterId);
  showToc.value = false;
}

function previousChapter() {
  if (hasPreviousChapter.value) {
    const prevChapter = props.chapters[currentChapterIndex.value - 1];
    loadChapter(prevChapter.id);
  }
}

function nextChapter() {
  if (hasNextChapter.value) {
    const nextChapter = props.chapters[currentChapterIndex.value + 1];
    loadChapter(nextChapter.id);
  }
}

// 文本选区处理
function handleTextSelection() {
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    // 检查是否在内容区域内
    if (!contentRef.value?.contains(selection.anchorNode)) {
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    // 获取选区矩形
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 获取段落ID（如果有）
    let paragraphId = null;
    let node = selection.anchorNode;
    while (node && node !== contentRef.value) {
      if (node.nodeType === Node.ELEMENT_NODE && node.id) {
        paragraphId = node.id;
        break;
      }
      node = node.parentNode;
    }

    // 计算文本偏移量
    const textRange = {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    };

    emit('text-selection', {
      text,
      rect,
      position: {
        type: 'epub',
        chapterId: currentChapterId.value,
        paragraphId,
        textRange,
      },
    });
  }, 100);
}

// 清除选区
function clearSelection() {
  window.getSelection()?.removeAllRanges();
}

// 获取当前位置
function getCurrentPosition() {
  return {
    type: 'epub',
    chapterId: currentChapterId.value,
    paragraphId: null,
  };
}

// 跳转到指定位置
async function goToPosition(position) {
  if (position.type !== 'epub' || !position.chapterId) return;

  await loadChapter(position.chapterId);

  if (position.paragraphId) {
    await nextTick();
    const el = contentRef.value?.querySelector(`#${position.paragraphId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// 提取当前章节文本（用于 AI）
function extractTextContent() {
  if (!contentRef.value) return '';
  return contentRef.value.innerText || '';
}

// 截图当前视图（用于 AI）
async function captureCurrentView() {
  // EPUB 默认使用文本，返回空
  // 如需截图可使用 html2canvas
  return null;
}

// 暴露方法
defineExpose({
  goToChapter,
  goToPosition,
  previousChapter,
  nextChapter,
  clearSelection,
  getCurrentPosition,
  extractTextContent,
  captureCurrentView,
  getCurrentChapterId: () => currentChapterId.value,
  getCurrentChapterTitle: () => currentChapterTitle.value,
});

// 监听章节列表变化
watch(() => props.chapters, (newChapters) => {
  if (newChapters.length > 0 && !currentChapterId.value) {
    // 加载第一个章节
    loadChapter(props.initialChapterId || newChapters[0].id);
  }
}, { immediate: true });

// 监听初始章节ID
watch(() => props.initialChapterId, (newId) => {
  if (newId && newId !== currentChapterId.value) {
    loadChapter(newId);
  }
});

// 键盘导航
function handleKeydown(e) {
  if (e.key === 'ArrowLeft' && hasPreviousChapter.value) {
    previousChapter();
  } else if (e.key === 'ArrowRight' && hasNextChapter.value) {
    nextChapter();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.epub-reader {
  display: flex;
  height: 100%;
  position: relative;
  background: #fff;
}

.toc-sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  transition: margin-left 0.3s ease;
}

.toc-sidebar.collapsed {
  margin-left: -240px;
}

.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
}

.toc-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.toc-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.toc-item:hover {
  background: #e8e8e8;
}

.toc-item.active {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chapter-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.chapter-title {
  flex: 1;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-buttons {
  display: flex;
  gap: 8px;
}

.epub-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
}

/* EPUB 内容样式 */
.epub-content :deep(h1),
.epub-content :deep(h2),
.epub-content :deep(h3),
.epub-content :deep(h4) {
  margin: 1.5em 0 0.5em;
  font-weight: 600;
  line-height: 1.4;
}

.epub-content :deep(h1) { font-size: 1.5em; }
.epub-content :deep(h2) { font-size: 1.3em; }
.epub-content :deep(h3) { font-size: 1.15em; }

.epub-content :deep(p) {
  margin: 0.8em 0;
  text-indent: 2em;
}

.epub-content :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 1em 0;
}

.epub-content :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.epub-content :deep(a:hover) {
  text-decoration: underline;
}

.epub-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #ddd;
  background: #f9f9f9;
}

.epub-content :deep(pre),
.epub-content :deep(code) {
  font-family: 'Menlo', 'Monaco', monospace;
  background: #f5f5f5;
  border-radius: 4px;
}

.epub-content :deep(pre) {
  padding: 1em;
  overflow-x: auto;
}

.epub-content :deep(code) {
  padding: 0.2em 0.4em;
  font-size: 0.9em;
}

.chapter-footer {
  padding: 8px 16px;
  text-align: center;
  font-size: 12px;
  color: #999;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
}

/* 文本选中样式 */
.epub-content ::selection {
  background: rgba(25, 118, 210, 0.2);
}
</style>
