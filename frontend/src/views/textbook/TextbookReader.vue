<template>
  <div class="textbook-reader">
    <!-- 顶部工具栏 -->
    <ReaderToolbar
      :title="textbook?.title"
      :mode="mode"
      :current-page="currentPage"
      :total-pages="totalPages"
      :zoom="zoomLevel"
      :pdf-loaded="pdfLoaded"
      :is-fullscreen="isFullscreen"
      @update:mode="handleModeChange"
      @back="goBack"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @toggle-fullscreen="toggleFullscreen"
      @delete-pdf="handleDeletePdf"
      @upload-pdf="handleUploadPdf"
    />

    <!-- 主内容区 -->
    <div class="reader-content">
      <!-- 原版教材模式：双页翻书 -->
      <FlipBookMode
        v-show="mode === 'flipbook'"
        ref="flipbookModeRef"
        :pdf-doc="pdfDoc"
        :total-pages="totalPages"
        :current-page="currentPage"
        :zoom="zoomLevel"
        :sound-enabled="soundEnabled"
        :subject="textbook?.subject"
        :loading="loading"
        @page-change="onPageChange"
        @ready="onFlipbookReady"
        @link-click="onLinkClick"
        @navigation-change="onNavigationChange"
        @text-selection="onTextSelection"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @toggle-sound="toggleSound"
        @upload-pdf="handleUploadPdf"
        @fullscreen-change="onFullscreenChange"
      />

      <!-- 辅助功能模式：单页 + 右侧面板 -->
      <AssistMode
        v-show="mode === 'assist'"
        ref="assistModeRef"
        :pdf-doc="pdfDoc"
        :total-pages="totalPages"
        :current-page="currentPage"
        :zoom="zoomLevel"
        :subject="textbook?.subject"
        :textbook-id="textbook?.id"
        :loading="loading"
        :content-type="contentType"
        :chapters="chapters"
        :current-chapter-id="currentChapterId"
        @page-change="onPageChange"
        @text-selection="onTextSelection"
        @chapter-change="onChapterChange"
      />
    </div>

    <!-- 文字选中菜单（两种模式都显示浮动菜单） -->
    <TextSelectionMenu
      :show="!!textSelection"
      :text="textSelection?.text"
      :position="textSelection?.rect"
      :subject="textbook?.subject"
      @close="clearSelection"
    />
  </div>
</template>

<script setup>
import { ref, provide, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { textbookAPI, textbookNoteAPI } from '@/api/index';
import ReaderToolbar from '@/components/textbook/ReaderToolbar.vue';
import FlipBookMode from '@/components/textbook/FlipBookMode.vue';
import AssistMode from '@/components/textbook/AssistMode.vue';
import TextSelectionMenu from '@/components/textbook/TextSelectionMenu.vue';
import { initSpeech } from '@/utils/speechService';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

// ===== 阅读器共享状态 =====
const readerState = reactive({
  mode: 'flipbook',      // 'flipbook' | 'assist'
  contentType: 'pdf',    // 'pdf' | 'epub'
  pdfDoc: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  subject: '',
  selection: null,
  // EPUB 相关
  chapters: [],
  currentChapterId: '',
  currentPosition: null,
  panel: {
    collapsed: false,
    cards: []
  }
});

// 提供给子组件
provide('readerState', readerState);

// ===== 本地状态 =====
const textbook = ref(null);
const loading = ref(true);
const mode = ref('flipbook');
const pdfLoaded = ref(false);
const pdfDoc = ref(null);
const currentPage = ref(1);
const totalPages = ref(0);
const zoomLevel = ref(1);
const soundEnabled = ref(true);
const isFullscreen = ref(false);
const textSelection = ref(null);

// EPUB 状态
const contentType = ref('pdf');
const chapters = ref([]);
const currentChapterId = ref('');

// 组件引用
const flipbookModeRef = ref(null);
const assistModeRef = ref(null);

// ===== 模式切换 =====
const handleModeChange = (newMode) => {
  // EPUB 不支持翻书模式
  if (contentType.value === 'epub' && newMode === 'flipbook') {
    message.warning('EPUB 教材不支持翻书模式');
    return;
  }

  mode.value = newMode;
  readerState.mode = newMode;

  // 清除文字选中状态
  textSelection.value = null;
  readerState.selection = null;

  // 同步当前页码到新模式
  // currentPage 保持不变，两种模式共享
};

// ===== 导航 =====
const goBack = () => router.back();

// ===== 数据加载 =====
const loadTextbook = async () => {
  loading.value = true;
  try {
    const id = route.params.id;
    const data = await textbookAPI.getTextbookDetail(id);
    textbook.value = data.textbook;
    readerState.subject = data.textbook.subject;

    // 检测内容类型
    contentType.value = data.textbook.contentType || 'pdf';
    readerState.contentType = contentType.value;

    if (contentType.value === 'epub' && data.textbook.epubMetadata?.chapters) {
      // EPUB 教材
      chapters.value = data.textbook.epubMetadata.chapters;
      readerState.chapters = chapters.value;
      if (chapters.value.length > 0) {
        currentChapterId.value = chapters.value[0].id;
        readerState.currentChapterId = chapters.value[0].id;
      }
      // EPUB 不支持翻书模式，强制切换到辅助模式
      mode.value = 'assist';
      readerState.mode = 'assist';
      pdfLoaded.value = true; // 标记教材已加载（用于工具栏显示）
      loading.value = false;
    } else if (data.textbook.pdfUrl) {
      // PDF 教材
      await nextTick();
      await loadPdf(data.textbook.pdfUrl);
    } else {
      loading.value = false;
    }
  } catch (error) {
    message.error('加载教材失败');
    loading.value = false;
  }
};

const loadPdf = async (pdfUrl) => {
  try {
    loading.value = true;
    pdfLoaded.value = false;

    // 清理旧实例
    if (pdfDoc.value) {
      pdfDoc.value.destroy();
      pdfDoc.value = null;
    }

    // 使用全局 pdfjsLib
    const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    pdfDoc.value = pdf;
    totalPages.value = pdf.numPages;

    // 检查 URL 中是否有指定页码
    const queryPage = parseInt(route.query.page);
    if (queryPage && queryPage >= 1 && queryPage <= pdf.numPages) {
      currentPage.value = queryPage;
      readerState.currentPage = queryPage;
    } else {
      currentPage.value = 1;
      readerState.currentPage = 1;
    }

    // 同步到共享状态
    readerState.pdfDoc = pdf;
    readerState.totalPages = pdf.numPages;

    pdfLoaded.value = true;

    // 如果有指定页码，延迟跳转确保组件已渲染
    if (queryPage && queryPage >= 1 && queryPage <= pdf.numPages) {
      await nextTick();
      goToPage(queryPage);
    }
  } catch (error) {
    console.error('加载PDF失败:', error);
    message.error('加载PDF失败');
  } finally {
    loading.value = false;
  }
};

// ===== 事件处理 =====
const onPageChange = (page) => {
  currentPage.value = page;
  readerState.currentPage = page;
};

// 跳转到指定页面
const goToPage = (page) => {
  if (!pdfLoaded.value || page < 1 || page > totalPages.value) return;

  currentPage.value = page;
  readerState.currentPage = page;

  // 根据当前模式调用对应组件的跳转方法
  if (mode.value === 'flipbook') {
    flipbookModeRef.value?.goToPage?.(page);
  } else {
    assistModeRef.value?.goToPage?.(page);
  }
};

// 监听 URL query.page 变化
watch(() => route.query.page, (newPage) => {
  if (newPage && pdfLoaded.value) {
    const page = parseInt(newPage);
    if (page >= 1 && page <= totalPages.value) {
      goToPage(page);
    }
  }
});

const onFlipbookReady = () => {
  console.log('FlipBook 初始化完成');
};

const onLinkClick = (linkInfo) => {
  if (linkInfo.type === 'url') {
    window.open(linkInfo.url, '_blank');
  }
};

const onNavigationChange = (info) => {
  // FlipBook 内部导航状态变化
};

const onTextSelection = (selection) => {
  textSelection.value = selection;
  readerState.selection = selection;
};

// EPUB 章节变化处理
const onChapterChange = (data) => {
  currentChapterId.value = data.chapterId;
  readerState.currentChapterId = data.chapterId;
};

const clearSelection = () => {
  textSelection.value = null;
  readerState.selection = null;
  // 清除两种模式下的选中状态
  if (mode.value === 'flipbook') {
    flipbookModeRef.value?.clearSelection();
  } else {
    assistModeRef.value?.clearSelection?.();
  }
};

const onFullscreenChange = (fullscreen) => {
  isFullscreen.value = fullscreen;
};

// ===== 缩放控制 =====
const zoomIn = () => {
  if (zoomLevel.value < 2) {
    zoomLevel.value = Math.min(2, zoomLevel.value + 0.25);
    readerState.zoom = zoomLevel.value;
  }
};

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.25);
    readerState.zoom = zoomLevel.value;
  }
};

// ===== 声音控制 =====
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
};

// ===== 全屏控制 =====
const toggleFullscreen = () => {
  flipbookModeRef.value?.toggleFullscreen();
};

// ===== 教材文件管理 =====
const handleUploadPdf = async ({ file, onFinish, onError }) => {
  const fileName = file.file.name;
  const isEpub = fileName.toLowerCase().endsWith('.epub');
  const formData = new FormData();

  // 检查是否有笔记
  const hasExistingContent = pdfLoaded.value;
  if (hasExistingContent) {
    try {
      const noteCount = await textbookNoteAPI.getCount(textbook.value.id);
      if (noteCount > 0) {
        const confirmed = await new Promise(resolve => {
          dialog.warning({
            title: '重新上传提醒',
            content: `该教材下有 ${noteCount} 条学习笔记。重新上传后，笔记中的页码引用可能失效，但笔记内容会保留。`,
            positiveText: '继续上传',
            negativeText: '取消',
            onPositiveClick: () => resolve(true),
            onNegativeClick: () => resolve(false),
            onClose: () => resolve(false),
          });
        });
        if (!confirmed) {
          onError();
          return;
        }
      }
    } catch (e) {
      console.warn('获取笔记数量失败:', e);
    }
  }

  try {
    loading.value = true;

    if (isEpub) {
      formData.append('epub', file.file);
      await textbookAPI.uploadEpub(textbook.value.id, formData);
      message.success('EPUB 上传成功');
    } else {
      formData.append('pdf', file.file);
      await textbookAPI.uploadPdf(textbook.value.id, formData);
      message.success('PDF 上传成功');
    }

    await loadTextbook();
    onFinish();
  } catch (error) {
    message.error('上传失败');
    onError();
  }
};

const handleDeletePdf = async () => {
  if (!textbook.value?.id) return;

  const isEpub = textbook.value.contentType === 'epub';
  const fileType = isEpub ? 'EPUB' : 'PDF';

  // 检查笔记数量
  let noteCount = 0;
  try {
    noteCount = await textbookNoteAPI.getCount(textbook.value.id);
  } catch (e) {
    console.warn('获取笔记数量失败:', e);
  }

  const contentMessage = noteCount > 0
    ? `该教材下有 ${noteCount} 条学习笔记。删除${fileType}文件后，笔记内容会保留，但将无法跳转到原页面。`
    : `确定要删除该${fileType}文件吗？`;

  dialog.warning({
    title: '确认删除',
    content: contentMessage,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        loading.value = true;
        if (pdfDoc.value) {
          pdfDoc.value.destroy();
          pdfDoc.value = null;
        }
        pdfLoaded.value = false;

        if (isEpub) {
          await textbookAPI.deleteEpub(textbook.value.id);
          message.success('EPUB已删除');
        } else {
          await textbookAPI.deletePdf(textbook.value.id);
          message.success('PDF已删除');
        }
        await loadTextbook();
      } catch (error) {
        message.error('删除失败');
        loading.value = false;
      }
    }
  });
};

// ===== 生命周期 =====
onMounted(() => {
  loadTextbook();
  initSpeech();
});

onUnmounted(() => {
  if (pdfDoc.value) {
    pdfDoc.value.destroy();
    pdfDoc.value = null;
  }
});
</script>

<style scoped>
.textbook-reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.reader-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
