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
        @page-change="onPageChange"
        @text-selection="onTextSelection"
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
import { ref, provide, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { textbookAPI } from '@/api/index';
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
  pdfDoc: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  subject: '',
  selection: null,
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

// 组件引用
const flipbookModeRef = ref(null);
const assistModeRef = ref(null);

// ===== 模式切换 =====
const handleModeChange = (newMode) => {
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

    if (data.textbook.pdfUrl) {
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
    currentPage.value = 1;

    // 同步到共享状态
    readerState.pdfDoc = pdf;
    readerState.totalPages = pdf.numPages;
    readerState.currentPage = 1;

    pdfLoaded.value = true;
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

// ===== PDF 管理 =====
const handleUploadPdf = async ({ file, onFinish, onError }) => {
  const formData = new FormData();
  formData.append('pdf', file.file);

  try {
    loading.value = true;
    await textbookAPI.uploadPdf(textbook.value.id, formData);
    message.success('上传成功');
    await loadTextbook();
    onFinish();
  } catch (error) {
    message.error('上传失败');
    onError();
  }
};

const handleDeletePdf = () => {
  if (!textbook.value?.id) return;

  dialog.warning({
    title: '确认删除',
    content: '确定要删除该PDF文件吗？此操作不可恢复。',
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

        await textbookAPI.deletePdf(textbook.value.id);
        message.success('PDF已删除');
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
