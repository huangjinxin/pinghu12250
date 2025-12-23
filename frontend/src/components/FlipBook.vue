<template>
  <div
    class="flipbook-container"
    ref="containerRef"
    :style="containerStyle"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
  >
    <div class="flipbook" :style="bookStyle">
      <div class="spread" :class="slideClass">
        <div class="page page-left">
          <canvas ref="leftCanvasRef"></canvas>
          <!-- 左页文字层（用于选择） -->
          <div class="text-layer" ref="leftTextRef" :style="annotationStyle"></div>
          <!-- 左页注解层（链接） -->
          <div class="annotation-layer" ref="leftAnnotationRef" :style="annotationStyle"></div>
          <div class="page-shadow right"></div>
        </div>
        <div class="page page-right">
          <canvas ref="rightCanvasRef"></canvas>
          <!-- 右页文字层（用于选择） -->
          <div class="text-layer" ref="rightTextRef" :style="annotationStyle"></div>
          <!-- 右页注解层（链接） -->
          <div class="annotation-layer" ref="rightAnnotationRef" :style="annotationStyle"></div>
          <div class="page-shadow left"></div>
        </div>
        <div class="spine"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { smartFilterText } from '@/utils/pinyinFilter';

const props = defineProps({
  pdfDoc: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  zoom: { type: Number, default: 1 },
  soundEnabled: { type: Boolean, default: true },
  subject: { type: String, default: '' }
});

const emit = defineEmits(['page-change', 'ready', 'link-click', 'navigation-change', 'text-selection']);

// Refs
const containerRef = ref(null);
const leftCanvasRef = ref(null);
const rightCanvasRef = ref(null);
const leftAnnotationRef = ref(null);
const rightAnnotationRef = ref(null);
const leftTextRef = ref(null);
const rightTextRef = ref(null);

// 状态
const currentSpread = ref(0);
const pageWidth = ref(400);
const pageHeight = ref(560);
const slideClass = ref('');

// 跳转历史栈
const navigationHistory = ref([]);
const canGoBack = computed(() => navigationHistory.value.length > 0);

// 获取是否可返回的方法（供外部调用）
const getCanGoBack = () => navigationHistory.value.length > 0;

// 页面缓存
const pageCache = new Map();

// 计算属性
const leftPage = computed(() => currentSpread.value * 2 + 1);
const rightPage = computed(() => currentSpread.value * 2 + 2);

const containerStyle = computed(() => ({
  transform: `scale(${props.zoom})`,
  transformOrigin: 'center center'
}));

const bookStyle = computed(() => ({
  width: `${pageWidth.value * 2}px`,
  height: `${pageHeight.value}px`
}));

const annotationStyle = computed(() => ({
  width: `${pageWidth.value}px`,
  height: `${pageHeight.value}px`
}));

// 计算页面尺寸
const calculateSize = async () => {
  if (!props.pdfDoc || !containerRef.value) return;

  const page = await props.pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const ratio = viewport.width / viewport.height;

  const container = containerRef.value;
  const maxWidth = (container.clientWidth - 60) / 2;
  const maxHeight = container.clientHeight - 60;

  let w = maxWidth;
  let h = w / ratio;

  if (h > maxHeight) {
    h = maxHeight;
    w = h * ratio;
  }

  pageWidth.value = Math.floor(w);
  pageHeight.value = Math.floor(h);
};

// 渲染页面到Canvas
const renderPage = async (pageNum, canvas) => {
  if (!canvas || !props.pdfDoc) return;

  if (pageNum < 1 || pageNum > props.totalPages) {
    canvas.width = pageWidth.value * 2;
    canvas.height = pageHeight.value * 2;
    canvas.style.width = pageWidth.value + 'px';
    canvas.style.height = pageHeight.value + 'px';
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

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

  pageCache.set(cacheKey, {
    width: canvas.width,
    height: canvas.height,
    data: ctx.getImageData(0, 0, canvas.width, canvas.height)
  });
};

// 渲染注解层（链接）
const renderAnnotations = async (pageNum, annotationLayer) => {
  if (!annotationLayer || !props.pdfDoc) return;

  // 清空现有注解
  annotationLayer.innerHTML = '';

  if (pageNum < 1 || pageNum > props.totalPages) return;

  try {
    const page = await props.pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();
    const viewport = page.getViewport({ scale: 1 });
    const scale = pageWidth.value / viewport.width;

    // 只处理链接类型的注解
    const links = annotations.filter(a => a.subtype === 'Link');

    for (const link of links) {
      if (!link.rect) continue;

      // PDF坐标系转换：原点在左下角，需要转换到左上角
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

      // 处理链接点击
      linkEl.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleLinkClick(link);
      });

      // 阻止拖拽触发翻页
      linkEl.addEventListener('mousedown', (e) => e.stopPropagation());
      linkEl.addEventListener('touchstart', (e) => e.stopPropagation());

      annotationLayer.appendChild(linkEl);
    }
  } catch (err) {
    console.warn('渲染注解失败:', err);
  }
};

// 渲染文字层（用于选择文字）
const renderTextLayer = async (pageNum, textLayer) => {
  if (!textLayer || !props.pdfDoc) return;

  // 清空现有文字
  textLayer.innerHTML = '';

  if (pageNum < 1 || pageNum > props.totalPages) return;

  try {
    const page = await props.pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // 计算缩放后的 viewport
    const defaultViewport = page.getViewport({ scale: 1 });
    const scale = pageWidth.value / defaultViewport.width;
    const viewport = page.getViewport({ scale });

    // 矩阵乘法工具函数
    const transformPoint = (transform, x, y) => {
      return [
        transform[0] * x + transform[2] * y + transform[4],
        transform[1] * x + transform[3] * y + transform[5]
      ];
    };

    // 合并两个变换矩阵
    const multiplyMatrices = (m1, m2) => {
      return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
      ];
    };

    for (const item of textContent.items) {
      if (!item.str || !item.transform) continue;

      // 将 item.transform 与 viewport.transform 合并
      const tx = multiplyMatrices(viewport.transform, item.transform);

      // 计算字体高度（从变换矩阵的 c, d 分量）
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

      // tx[4], tx[5] 是变换后的位置，tx[5] 是基线位置
      const left = tx[4];
      const top = tx[5] - fontHeight;  // 基线往上移一个字体高度得到顶部

      // 计算宽度
      const width = item.width * scale;

      const span = document.createElement('span');
      span.className = 'text-item';
      span.textContent = item.str;

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

      // 水平缩放以匹配宽度
      if (width > 0 && span.offsetWidth > 0) {
        const scaleX = width / span.offsetWidth;
        if (scaleX > 0.1 && scaleX < 10) {
          span.style.transform = `scaleX(${scaleX})`;
        }
      }
    }
  } catch (err) {
    console.warn('渲染文字层失败:', err);
  }
};

// 处理链接点击
const handleLinkClick = (link) => {
  // 内部页面跳转
  if (link.dest) {
    // dest 可能是数组或字符串
    if (Array.isArray(link.dest)) {
      // 第一个元素通常是页面引用
      props.pdfDoc.getPageIndex(link.dest[0]).then(pageIndex => {
        goToPage(pageIndex + 1);
      }).catch(() => {
        // 尝试作为命名目标处理
        resolveNamedDest(link.dest);
      });
    } else if (typeof link.dest === 'string') {
      resolveNamedDest(link.dest);
    }
  }
  // 外部URL
  else if (link.url) {
    emit('link-click', { type: 'url', url: link.url });
    // 可选：自动打开外部链接
    // window.open(link.url, '_blank');
  }
  // GoTo action
  else if (link.action === 'GoTo' && link.dest) {
    resolveNamedDest(link.dest);
  }
};

// 解析命名目标
const resolveNamedDest = async (destName) => {
  try {
    const dest = await props.pdfDoc.getDestination(destName);
    if (dest && dest[0]) {
      const pageIndex = await props.pdfDoc.getPageIndex(dest[0]);
      goToPage(pageIndex + 1);
    }
  } catch (err) {
    console.warn('无法解析链接目标:', destName);
  }
};

// 跳转到指定页
const goToPage = (targetPage, saveHistory = true) => {
  if (targetPage < 1 || targetPage > props.totalPages) return;

  // 计算目标spread（双页）
  const targetSpread = Math.floor((targetPage - 1) / 2);

  if (targetSpread === currentSpread.value) return;

  // 保存当前位置到历史栈
  if (saveHistory) {
    navigationHistory.value.push(leftPage.value);
    emit('navigation-change', { canGoBack: true, historyLength: navigationHistory.value.length });
  }

  playSound();

  // 直接跳转，不用动画
  currentSpread.value = targetSpread;
  renderCurrentSpread();
  renderCurrentAnnotations();
  renderCurrentTextLayers();
  preloadAdjacent();

  emit('link-click', { type: 'page', page: targetPage });
};

// 返回上一个位置
const goBack = () => {
  if (navigationHistory.value.length === 0) return;

  const previousPage = navigationHistory.value.pop();
  emit('navigation-change', { canGoBack: navigationHistory.value.length > 0, historyLength: navigationHistory.value.length });
  goToPage(previousPage, false); // 不保存历史
};

// 渲染当前双页
const renderCurrentSpread = async () => {
  await Promise.all([
    renderPage(leftPage.value, leftCanvasRef.value),
    renderPage(rightPage.value, rightCanvasRef.value)
  ]);
  emit('page-change', leftPage.value);
};

// 渲染当前注解
const renderCurrentAnnotations = async () => {
  await Promise.all([
    renderAnnotations(leftPage.value, leftAnnotationRef.value),
    renderAnnotations(rightPage.value, rightAnnotationRef.value)
  ]);
};

// 渲染当前文字层
const renderCurrentTextLayers = async () => {
  await Promise.all([
    renderTextLayer(leftPage.value, leftTextRef.value),
    renderTextLayer(rightPage.value, rightTextRef.value)
  ]);
};

// 预加载
const preloadAdjacent = () => {
  const pages = [leftPage.value - 2, leftPage.value - 1, rightPage.value + 1, rightPage.value + 2];
  pages.filter(p => p >= 1 && p <= props.totalPages && !pageCache.has(`${p}_${pageWidth.value}`))
    .forEach(p => {
      const c = document.createElement('canvas');
      renderPage(p, c);
    });
};

// 翻页声音 - 教材翻页音效（纸张摩擦 + 落下贴合）
let audioCtx = null;
let flipSoundBuffer = null;

// 初始化并预生成音效缓冲区
const initFlipSound = () => {
  if (flipSoundBuffer) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = audioCtx.sampleRate;

  // 总时长 250ms（两段式：150ms摩擦 + 100ms落下）
  const duration = 0.25;
  const totalSamples = Math.floor(sampleRate * duration);

  flipSoundBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const data = flipSoundBuffer.getChannelData(0);

  // 第一段：纸张拉起摩擦声（0-150ms）
  const phase1End = Math.floor(sampleRate * 0.15);
  // 第二段：纸张落下贴合声（150-250ms）
  const phase2Start = phase1End;

  // 峰值音量 -16dB ≈ 0.158
  const peakGain = 0.158;

  // 生成粉噪声基底（比白噪声更自然）
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;

    // 粉噪声生成（1/f noise，更接近自然纸张声）
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    pink *= 0.11; // 归一化

    let envelope = 0;

    if (i < phase1End) {
      // 第一段：纸张拉起摩擦（快起慢落）
      const p = i / phase1End;
      if (p < 0.08) {
        envelope = p / 0.08; // 快速起音 8%
      } else {
        envelope = 1.0 - (p - 0.08) * 0.3; // 缓慢衰减
      }
      envelope *= 0.9;
    } else {
      // 第二段：纸张落下贴合（短促轻击）
      const p = (i - phase2Start) / (totalSamples - phase2Start);
      if (p < 0.15) {
        envelope = p / 0.15 * 0.7; // 快速起音
      } else {
        envelope = 0.7 * Math.pow(1 - (p - 0.15) / 0.85, 2); // 快速衰减
      }
    }

    data[i] = pink * envelope * peakGain;
  }
};

// 播放翻页声音
const playPageFlipSound = () => {
  if (!props.soundEnabled) return;

  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      flipSoundBuffer = null;
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!flipSoundBuffer) {
      initFlipSound();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = flipSoundBuffer;

    // 带通滤波：保留 400-2500Hz（纸张摩擦的主要频段）
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 0.7;

    source.connect(bandpass);
    bandpass.connect(audioCtx.destination);
    source.start();
  } catch (e) {
    // 静默失败，不影响翻页功能
  }
};

// 兼容旧代码的别名
const playSound = playPageFlipSound;

// 翻下一页
const flipNext = async () => {
  if (rightPage.value >= props.totalPages) return;

  playSound();
  slideClass.value = 'slide-out-left';

  await new Promise(r => setTimeout(r, 150));

  currentSpread.value++;
  await renderCurrentSpread();
  await renderCurrentAnnotations();
  await renderCurrentTextLayers();

  slideClass.value = 'slide-in-right';
  await new Promise(r => setTimeout(r, 150));

  slideClass.value = '';
  preloadAdjacent();
};

// 翻上一页
const flipPrev = async () => {
  if (currentSpread.value <= 0) return;

  playSound();
  slideClass.value = 'slide-out-right';

  await new Promise(r => setTimeout(r, 150));

  currentSpread.value--;
  await renderCurrentSpread();
  await renderCurrentAnnotations();
  await renderCurrentTextLayers();

  slideClass.value = 'slide-in-left';
  await new Promise(r => setTimeout(r, 150));

  slideClass.value = '';
  preloadAdjacent();
};

// 触摸
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;

const onTouchStart = (e) => {
  // 文字区域不处理翻页，让浏览器处理文字选择
  if (e.target.closest('.text-layer') || e.target.classList.contains('text-item')) {
    isDragging = false;
    return;
  }

  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  isDragging = true;
};

const onTouchMove = (e) => {
  if (!isDragging) return;

  const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

  // 水平滑动时阻止默认行为
  if (deltaX > deltaY && deltaX > 10) {
    e.preventDefault();
  }
};

const onTouchEnd = (e) => {
  if (!isDragging) return;

  const deltaX = e.changedTouches[0].clientX - touchStartX;
  const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);

  isDragging = false;

  // 水平滑动超过50px且主要是水平方向时翻页
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
    deltaX < 0 ? flipNext() : flipPrev();
  }
};

// 鼠标
const onMouseDown = (e) => {
  // 文字区域不处理翻页，让浏览器处理文字选择
  if (e.target.closest('.text-layer') || e.target.classList.contains('text-item')) {
    return;
  }

  const startX = e.clientX;
  let hasMoved = false;

  const onMove = (e) => {
    if (Math.abs(e.clientX - startX) > 10) {
      hasMoved = true;
    }
  };

  const onUp = (e) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);

    const delta = e.clientX - startX;
    if (hasMoved && Math.abs(delta) > 50) {
      delta < 0 ? flipNext() : flipPrev();
    }
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

// 文字选中检测
let selectionDebounceTimer = null;

const handleSelectionChange = () => {
  // 防抖处理
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }

  selectionDebounceTimer = setTimeout(() => {
    const selection = window.getSelection();

    // 无选中或选中为空
    if (!selection || selection.isCollapsed) {
      emit('text-selection', null);
      return;
    }

    // 检查选中是否在 text-layer 内
    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      emit('text-selection', null);
      return;
    }

    // 检查是否在当前组件的 text-layer 内
    const isInTextLayer =
      (leftTextRef.value && leftTextRef.value.contains(anchorNode)) ||
      (rightTextRef.value && rightTextRef.value.contains(anchorNode));

    if (!isInTextLayer) {
      return; // 不是在本组件的 text-layer 内，不处理
    }

    // 获取选中文字
    let text = selection.toString().trim();

    // 语文课本：过滤拼音字母
    text = smartFilterText(text, props.subject);

    // 验证：必须包含有效文字（汉字或字母）
    if (!text || !/[\u4e00-\u9fa5a-zA-Z]/.test(text)) {
      emit('text-selection', null);
      return;
    }

    // 获取选区位置
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
  }, 100); // 100ms 防抖
};

// 清除选中
const clearSelection = () => {
  window.getSelection()?.removeAllRanges();
  emit('text-selection', null);
};

// 初始化
const init = async () => {
  if (!props.pdfDoc) return;
  await calculateSize();
  await nextTick();
  await renderCurrentSpread();
  await renderCurrentAnnotations();
  await renderCurrentTextLayers();
  preloadAdjacent();
  emit('ready');
};

defineExpose({
  flipNext,
  flipPrev,
  goToPage,
  goBack,
  canGoBack,
  getCanGoBack,
  navigationHistory,
  getCurrentPage: () => leftPage.value,
  clearSelection
});

watch(() => props.pdfDoc, () => {
  if (props.pdfDoc) {
    pageCache.clear();
    currentSpread.value = 0;
    init();
  }
}, { immediate: true });

onMounted(() => {
  if (props.pdfDoc) init();
  // 监听文字选中事件
  document.addEventListener('selectionchange', handleSelectionChange);
});

onUnmounted(() => {
  pageCache.clear();
  // 移除文字选中事件监听
  document.removeEventListener('selectionchange', handleSelectionChange);
  // 清理防抖定时器
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }
});
</script>

<style scoped>
.flipbook-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(145deg, #3a4150 0%, #2a3140 100%);
  transition: transform 0.3s;
  user-select: none;
  overflow: hidden;
}

.flipbook {
  position: relative;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  border-radius: 4px;
}

.spread {
  display: flex;
  position: relative;
}

.page {
  position: relative;
  background: #fff;
  overflow: hidden;
}

.page canvas {
  display: block;
}

/* 文字层 - 用于选择文字 */
.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 5;
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

/* 注解层 - 用于PDF链接（最上层） */
.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 6;
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

.page-left {
  border-radius: 4px 0 0 4px;
}

.page-right {
  border-radius: 0 4px 4px 0;
}

.page-shadow {
  position: absolute;
  top: 0;
  width: 40px;
  height: 100%;
  pointer-events: none;
}

.page-shadow.right {
  right: 0;
  background: linear-gradient(to left, rgba(0,0,0,0.08), transparent);
}

.page-shadow.left {
  left: 0;
  background: linear-gradient(to right, rgba(0,0,0,0.08), transparent);
}

.spine {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 100%;
  background: linear-gradient(90deg,
    rgba(0,0,0,0.2),
    rgba(0,0,0,0.05) 40%,
    rgba(255,255,255,0.05) 50%,
    rgba(0,0,0,0.05) 60%,
    rgba(0,0,0,0.2)
  );
  z-index: 10;
}

/* 滑动动画 */
.slide-out-left {
  animation: slideOutLeft 0.15s ease-in forwards;
}

.slide-in-right {
  animation: slideInRight 0.15s ease-out forwards;
}

.slide-out-right {
  animation: slideOutRight 0.15s ease-in forwards;
}

.slide-in-left {
  animation: slideInLeft 0.15s ease-out forwards;
}

@keyframes slideOutLeft {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-30px); opacity: 0.5; }
}

@keyframes slideInRight {
  from { transform: translateX(30px); opacity: 0.5; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(30px); opacity: 0.5; }
}

@keyframes slideInLeft {
  from { transform: translateX(-30px); opacity: 0.5; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
