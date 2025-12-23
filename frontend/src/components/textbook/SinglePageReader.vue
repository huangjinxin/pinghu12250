<template>
  <div class="single-page-reader" ref="containerRef">
    <!-- 页面容器（支持缩放） -->
    <div class="page-wrapper" :style="wrapperStyle">
      <div
        class="page-container"
        ref="pageContainerRef"
        :style="pageStyle"
        :class="slideClass"
      >
        <!-- Canvas 渲染层 -->
        <canvas ref="canvasRef"></canvas>
        <!-- 文字选择层 -->
        <div class="text-layer" ref="textLayerRef"></div>
        <!-- 链接注解层 -->
        <div class="annotation-layer" ref="annotationLayerRef"></div>
      </div>
    </div>

    <!-- 翻页控制 -->
    <div class="page-nav">
      <n-button
        circle
        size="large"
        :disabled="currentPage <= 1"
        @click="prevPage"
        class="nav-btn prev"
      >
        <template #icon>
          <n-icon size="24"><ChevronBack /></n-icon>
        </template>
      </n-button>

      <div class="page-indicator">
        <span class="current">{{ internalPage }}</span>
        <span class="separator">/</span>
        <span class="total">{{ totalPages }}</span>
      </div>

      <n-button
        circle
        size="large"
        :disabled="internalPage >= totalPages"
        @click="nextPage"
        class="nav-btn next"
      >
        <template #icon>
          <n-icon size="24"><ChevronForward /></n-icon>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronBack, ChevronForward } from '@vicons/ionicons5';
import { smartFilterText } from '@/utils/pinyinFilter';

const props = defineProps({
  pdfDoc: {
    type: Object,
    default: null
  },
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
  subject: {
    type: String,
    default: ''
  },
  highlightKeyword: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['page-change', 'text-selection', 'link-click']);

// Refs
const containerRef = ref(null);
const pageContainerRef = ref(null);
const canvasRef = ref(null);
const textLayerRef = ref(null);
const annotationLayerRef = ref(null);

// 状态
const pageWidth = ref(500);
const pageHeight = ref(700);
const internalPage = ref(1);
const slideClass = ref('');

// 页面缓存
const pageCache = new Map();

// 计算样式 - 居中缩放
const wrapperStyle = computed(() => ({
  transform: `scale(${props.zoom})`,
  transformOrigin: 'center center'
}));

const pageStyle = computed(() => ({
  width: `${pageWidth.value}px`,
  height: `${pageHeight.value}px`
}));

// 计算页面尺寸（优先适应高度，fit-to-height 模式）
const calculateSize = async () => {
  if (!props.pdfDoc || !containerRef.value) return;

  try {
    const page = await props.pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const ratio = viewport.width / viewport.height;

    // 使用 getBoundingClientRect 获取实际渲染尺寸
    const rect = containerRef.value.getBoundingClientRect();
    const bottomSpace = 80; // 底部翻页控制栏空间
    const padding = 20;

    // 如果获取不到有效尺寸，使用窗口尺寸估算
    let availableWidth = rect.width > 100 ? rect.width - padding * 2 : window.innerWidth * 0.6;
    let availableHeight = rect.height > 100 ? rect.height - bottomSpace : window.innerHeight - 150;

    console.log('Container size:', rect.width, rect.height, 'Available:', availableWidth, availableHeight);

    // 优先适应高度（fit-to-height）
    let h = availableHeight;
    let w = h * ratio;

    // 如果宽度超出可用空间，则按宽度调整
    if (w > availableWidth) {
      w = availableWidth;
      h = w / ratio;
    }

    // 确保合理的尺寸范围
    pageWidth.value = Math.max(400, Math.floor(w));
    pageHeight.value = Math.max(500, Math.floor(h));

    console.log('Page size:', pageWidth.value, pageHeight.value);
  } catch (err) {
    console.warn('计算页面尺寸失败:', err);
  }
};

// 渲染页面到 Canvas
const renderPage = async (pageNum) => {
  const canvas = canvasRef.value;
  if (!canvas || !props.pdfDoc) return;

  if (pageNum < 1 || pageNum > props.totalPages) {
    return;
  }

  // 检查缓存
  const cacheKey = `${pageNum}_${pageWidth.value}`;
  if (pageCache.has(cacheKey)) {
    const cached = pageCache.get(cacheKey);
    canvas.width = cached.width;
    canvas.height = cached.height;
    canvas.style.width = pageWidth.value + 'px';
    canvas.style.height = pageHeight.value + 'px';
    canvas.getContext('2d').putImageData(cached.data, 0, 0);
    return;
  }

  try {
    const page = await props.pdfDoc.getPage(pageNum);
    const dpr = window.devicePixelRatio || 1;
    const scale = (pageWidth.value / page.getViewport({ scale: 1 }).width) * dpr;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = pageWidth.value + 'px';
    canvas.style.height = pageHeight.value + 'px';

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 缓存渲染结果
    pageCache.set(cacheKey, {
      width: canvas.width,
      height: canvas.height,
      data: ctx.getImageData(0, 0, canvas.width, canvas.height)
    });
  } catch (err) {
    console.warn('渲染页面失败:', err);
  }
};

// 渲染文字层
const renderTextLayer = async (pageNum, keyword = '') => {
  const textLayer = textLayerRef.value;
  if (!textLayer || !props.pdfDoc) return;

  textLayer.innerHTML = '';

  if (pageNum < 1 || pageNum > props.totalPages) return;

  const searchKeyword = keyword || props.highlightKeyword;
  const searchLower = searchKeyword ? searchKeyword.toLowerCase() : '';

  try {
    const page = await props.pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const defaultViewport = page.getViewport({ scale: 1 });
    const scale = pageWidth.value / defaultViewport.width;
    const viewport = page.getViewport({ scale });

    // 矩阵乘法
    const multiplyMatrices = (m1, m2) => [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];

    let firstHighlight = null; // 记录第一个高亮元素

    for (const item of textContent.items) {
      if (!item.str || !item.transform) continue;

      const tx = multiplyMatrices(viewport.transform, item.transform);
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      const left = tx[4];
      const top = tx[5] - fontHeight;
      const width = item.width * scale;

      const span = document.createElement('span');
      span.className = 'text-item';

      // 检查是否需要高亮并只高亮匹配部分
      const itemLower = item.str.toLowerCase();
      const matchIndex = searchLower ? itemLower.indexOf(searchLower) : -1;

      if (matchIndex !== -1) {
        // 有匹配，分割文本只高亮匹配部分
        const beforeText = item.str.substring(0, matchIndex);
        const matchText = item.str.substring(matchIndex, matchIndex + searchKeyword.length);
        const afterText = item.str.substring(matchIndex + searchKeyword.length);

        if (beforeText) {
          span.appendChild(document.createTextNode(beforeText));
        }

        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'highlight-text';
        highlightSpan.textContent = matchText;
        span.appendChild(highlightSpan);

        if (!firstHighlight) {
          firstHighlight = highlightSpan;
        }

        if (afterText) {
          span.appendChild(document.createTextNode(afterText));
        }
      } else {
        span.textContent = item.str;
      }

      span.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        font-size: ${fontHeight}px;
        font-family: sans-serif;
        line-height: 1;
        white-space: pre;
        color: transparent;
        transform-origin: left top;
      `;

      textLayer.appendChild(span);

      // 水平缩放
      if (width > 0 && span.offsetWidth > 0) {
        const scaleX = width / span.offsetWidth;
        if (scaleX > 0.1 && scaleX < 10) {
          span.style.transform = `scaleX(${scaleX})`;
        }
      }
    }

    // 滚动到第一个高亮元素
    if (firstHighlight) {
      await nextTick();
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (err) {
    console.warn('渲染文字层失败:', err);
  }
};

// 渲染注解层（链接）
const renderAnnotations = async (pageNum) => {
  const annotationLayer = annotationLayerRef.value;
  if (!annotationLayer || !props.pdfDoc) return;

  annotationLayer.innerHTML = '';

  if (pageNum < 1 || pageNum > props.totalPages) return;

  try {
    const page = await props.pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();
    const viewport = page.getViewport({ scale: 1 });
    const scale = pageWidth.value / viewport.width;

    const links = annotations.filter(a => a.subtype === 'Link');

    for (const link of links) {
      if (!link.rect) continue;

      const [x1, y1, x2, y2] = link.rect;
      const left = x1 * scale;
      const top = (viewport.height - y2) * scale;
      const width = (x2 - x1) * scale;
      const height = (y2 - y1) * scale;

      const linkEl = document.createElement('div');
      linkEl.className = 'pdf-link';
      linkEl.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        cursor: pointer;
      `;

      linkEl.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleLinkClick(link);
      });

      annotationLayer.appendChild(linkEl);
    }
  } catch (err) {
    console.warn('渲染注解失败:', err);
  }
};

// 处理链接点击
const handleLinkClick = async (link) => {
  if (link.dest) {
    try {
      let pageIndex;
      if (Array.isArray(link.dest)) {
        pageIndex = await props.pdfDoc.getPageIndex(link.dest[0]);
      } else if (typeof link.dest === 'string') {
        const dest = await props.pdfDoc.getDestination(link.dest);
        if (dest && dest[0]) {
          pageIndex = await props.pdfDoc.getPageIndex(dest[0]);
        }
      }
      if (pageIndex !== undefined) {
        goToPage(pageIndex + 1);
      }
    } catch (err) {
      console.warn('链接跳转失败:', err);
    }
  } else if (link.url) {
    emit('link-click', { type: 'url', url: link.url });
  }
};

// 渲染当前页
const renderCurrentPage = async () => {
  await Promise.all([
    renderPage(internalPage.value),
    renderTextLayer(internalPage.value),
    renderAnnotations(internalPage.value)
  ]);
};

// 翻页（带动画）
const nextPage = async () => {
  if (internalPage.value >= props.totalPages) return;

  // 翻页动画
  slideClass.value = 'slide-out-left';
  await new Promise(r => setTimeout(r, 120));

  internalPage.value++;
  emit('page-change', internalPage.value);
  await renderCurrentPage();

  slideClass.value = 'slide-in-right';
  await new Promise(r => setTimeout(r, 120));
  slideClass.value = '';
};

const prevPage = async () => {
  if (internalPage.value <= 1) return;

  // 翻页动画
  slideClass.value = 'slide-out-right';
  await new Promise(r => setTimeout(r, 120));

  internalPage.value--;
  emit('page-change', internalPage.value);
  await renderCurrentPage();

  slideClass.value = 'slide-in-left';
  await new Promise(r => setTimeout(r, 120));
  slideClass.value = '';
};

const goToPage = async (page) => {
  if (page >= 1 && page <= props.totalPages && page !== internalPage.value) {
    const direction = page > internalPage.value ? 'left' : 'right';

    slideClass.value = `slide-out-${direction}`;
    await new Promise(r => setTimeout(r, 120));

    internalPage.value = page;
    emit('page-change', internalPage.value);
    await renderCurrentPage();

    slideClass.value = `slide-in-${direction === 'left' ? 'right' : 'left'}`;
    await new Promise(r => setTimeout(r, 120));
    slideClass.value = '';
  }
};

// 文字选中检测
let selectionDebounceTimer = null;

const handleSelectionChange = () => {
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }

  selectionDebounceTimer = setTimeout(() => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      emit('text-selection', null);
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      emit('text-selection', null);
      return;
    }

    // 检查是否在当前组件的 text-layer 内
    const isInTextLayer = textLayerRef.value && textLayerRef.value.contains(anchorNode);

    if (!isInTextLayer) {
      return;
    }

    let text = selection.toString().trim();

    // 语文课本：过滤拼音
    text = smartFilterText(text, props.subject);

    if (!text || !/[\u4e00-\u9fa5a-zA-Z]/.test(text)) {
      emit('text-selection', null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      emit('text-selection', {
        text,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        }
      });
    } catch (e) {
      emit('text-selection', null);
    }
  }, 100);
};

// 清除选中
const clearSelection = () => {
  window.getSelection()?.removeAllRanges();
  emit('text-selection', null);
};

// 初始化
const init = async () => {
  if (!props.pdfDoc) return;

  // 等待 DOM 更新
  await nextTick();

  // 等待多帧确保布局完成
  for (let i = 0; i < 3; i++) {
    await new Promise(r => requestAnimationFrame(r));
  }

  // 额外延迟确保 CSS 动画完成
  await new Promise(r => setTimeout(r, 100));

  await calculateSize();

  // 如果尺寸太小，可能布局还没完成，重试一次
  if (pageHeight.value < 500 && containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    if (rect.height < 200) {
      console.log('Container too small, retrying...');
      await new Promise(r => setTimeout(r, 200));
      await calculateSize();
    }
  }

  await renderCurrentPage();
};

// 暴露方法
defineExpose({
  goToPage,
  nextPage,
  prevPage,
  clearSelection,
  refresh: renderCurrentPage
});

// 监听 PDF 变化
watch(() => props.pdfDoc, async (newDoc) => {
  if (newDoc) {
    pageCache.clear();
    internalPage.value = props.currentPage || 1;
    await init();
  }
}, { immediate: true });

// 监听外部页码变化
watch(() => props.currentPage, (newPage) => {
  if (newPage && newPage !== internalPage.value) {
    internalPage.value = newPage;
    renderCurrentPage();
  }
});

// 监听高亮关键词变化
watch(() => props.highlightKeyword, () => {
  renderTextLayer(internalPage.value);
});

// 监听窗口大小变化
let resizeTimer = null;
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(async () => {
    pageCache.clear();
    await calculateSize();
    await nextTick();
    await renderCurrentPage();
  }, 200);
};

onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
  window.removeEventListener('resize', handleResize);
  if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
  if (resizeTimer) clearTimeout(resizeTimer);
  pageCache.clear();
});
</script>

<style scoped>
.single-page-reader {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: linear-gradient(145deg, #3a4150 0%, #2a3140 100%);
  overflow: hidden;
  box-sizing: border-box;
}

.page-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s ease;
  width: 100%;
  min-height: 0;
}

.page-container {
  position: relative;
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.page-container canvas {
  display: block;
}

/* 翻页动画 */
.page-container.slide-out-left {
  transform: translateX(-20px);
  opacity: 0.5;
}

.page-container.slide-in-right {
  animation: slideInRight 0.12s ease-out;
}

.page-container.slide-out-right {
  transform: translateX(20px);
  opacity: 0.5;
}

.page-container.slide-in-left {
  animation: slideInLeft 0.12s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(20px);
    opacity: 0.5;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(-20px);
    opacity: 0.5;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 文字层 */
.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 2;
  pointer-events: none;
}

.text-layer :deep(.text-item) {
  position: absolute;
  color: transparent;
  pointer-events: auto;
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: text;
}

.text-layer :deep(.text-item::selection) {
  background: rgba(24, 144, 255, 0.3);
}

/* 高亮样式 */
.text-layer :deep(.highlight-text) {
  background: rgba(255, 105, 180, 0.35);
  color: transparent;
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(255, 105, 180, 0.4);
  animation: highlightPulse 2s ease-in-out infinite;
}

@keyframes highlightPulse {
  0%, 100% {
    box-shadow: 0 0 6px rgba(255, 105, 180, 0.4);
  }
  50% {
    box-shadow: 0 0 12px rgba(255, 105, 180, 0.6);
  }
}

/* 注解层 */
.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.annotation-layer :deep(.pdf-link) {
  background: transparent;
  transition: background 0.2s;
  pointer-events: auto;
  cursor: pointer;
}

.annotation-layer :deep(.pdf-link:hover) {
  background: rgba(24, 144, 255, 0.15);
  border-radius: 2px;
}

/* 翻页控制 */
.page-nav {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 6px 16px;
  border-radius: 40px;
  z-index: 10;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border: none !important;
  color: white !important;
  transition: all 0.2s !important;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.05);
}

.nav-btn:disabled {
  opacity: 0.3 !important;
}

.page-indicator {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: white;
  font-size: 15px;
  min-width: 70px;
  justify-content: center;
}

.page-indicator .current {
  font-weight: 600;
  font-size: 18px;
}

.page-indicator .separator {
  color: rgba(255, 255, 255, 0.5);
  margin: 0 2px;
}

.page-indicator .total {
  color: rgba(255, 255, 255, 0.7);
}
</style>
