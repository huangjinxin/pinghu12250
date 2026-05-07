<template>
  <!-- 选择模式状态提示条 -->
  <Transition name="slide-down">
    <div v-if="active" class="selection-mode-bar">
      <div class="mode-indicator">
        <span class="pulse-dot"></span>
        <span class="mode-text">选择模式</span>
      </div>
      <div class="mode-hint">点击文字选中 · 拖动框选多字</div>
      <button class="exit-btn" @click="exitMode">
        <n-icon size="20"><CloseOutline /></n-icon>
        <span>退出</span>
      </button>
    </div>
  </Transition>

  <!-- 选区高亮层 -->
  <div
    v-if="active"
    ref="selectionLayerRef"
    class="touch-selection-layer"
    @touchstart.prevent="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend.prevent="onTouchEnd"
    @mousedown.prevent="onMouseDown"
    @mousemove.prevent="onMouseMove"
    @mouseup.prevent="onMouseUp"
  >
    <!-- 选中高亮框 -->
    <div
      v-for="(rect, idx) in highlightRects"
      :key="idx"
      class="selection-highlight"
      :style="getHighlightStyle(rect)"
    ></div>

    <!-- 拖动选区框 -->
    <div
      v-if="isDragging && dragRect"
      class="drag-selection-box"
      :style="getDragBoxStyle()"
    ></div>
  </div>

  <!-- 触控操作菜单 -->
  <Teleport to="body">
    <Transition name="menu-slide">
      <div
        v-if="showMenu && selectedText"
        class="touch-action-menu"
        :class="{ 'menu-bottom': menuPosition === 'bottom' }"
        @touchstart.stop
        @mousedown.stop
      >
        <!-- 识别的文字内容 -->
        <div class="recognized-text">
          <span class="label">识别内容：</span>
          <span class="text">{{ selectedText }}</span>
        </div>

        <!-- 操作按钮组 -->
        <div class="action-buttons">
          <button
            v-if="isSingleChar"
            class="action-btn primary"
            @click="handleLookup"
          >
            <n-icon size="24"><BookOutline /></n-icon>
            <span>查字</span>
          </button>

          <button
            class="action-btn"
            :class="{ active: speaking }"
            @click="handleSpeak"
          >
            <n-icon size="24"><VolumeHighOutline /></n-icon>
            <span>{{ speaking ? '停止' : '朗读' }}</span>
          </button>

          <button class="action-btn" @click="handleAskAI">
            <n-icon size="24"><SparklesOutline /></n-icon>
            <span>AI解析</span>
          </button>

          <button class="action-btn" @click="handleSaveNote">
            <n-icon size="24"><BookmarkOutline /></n-icon>
            <span>存笔记</span>
          </button>

          <button class="action-btn" @click="handleSendToChat">
            <n-icon size="24"><ChatbubbleOutline /></n-icon>
            <span>引用</span>
          </button>
        </div>

        <!-- 关闭按钮 -->
        <button class="close-menu-btn" @click="clearSelection">
          <n-icon size="16"><CloseOutline /></n-icon>
        </button>
      </div>
    </Transition>
  </Teleport>

  <!-- 查字弹窗 -->
  <Teleport to="body">
    <Transition name="popup-fade">
      <div
        v-if="showDictPopup"
        class="dict-popup-overlay"
        @click="closeDictPopup"
      >
        <div class="dict-popup-content" @click.stop>
          <CharacterDetail
            :character="selectedText"
            @loaded="onDictLoaded"
          />
          <button class="popup-close-btn" @click="closeDictPopup">
            <n-icon size="18"><CloseOutline /></n-icon>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'
import CharacterDetail from './CharacterDetail.vue';
import { speak, stopSpeaking } from '@/utils/speechService';
import { smartFilterText } from '@/utils/pinyinFilter';
import { isSingleChinese } from '@/api/dict';

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  textLayerRef: {
    type: Object,
    default: null
  },
  pageContainerRef: {
    type: Object,
    default: null
  },
  subject: {
    type: String,
    default: ''
  },
  currentPage: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits([
  'exit',
  'selection-change',
  'save-note',
  'send-to-chat',
  'ask-ai'
]);

// Refs
const selectionLayerRef = ref(null);

// 状态
const selectedText = ref('');
const selectedSpans = ref([]);
const highlightRects = ref([]);
const showMenu = ref(false);
const menuPosition = ref('bottom');
const speaking = ref(false);
const showDictPopup = ref(false);

// 拖动选择状态
const isDragging = ref(false);
const dragStart = ref(null);
const dragEnd = ref(null);
const dragRect = ref(null);

// 计算是否为单个汉字
const isSingleChar = computed(() => {
  return isSingleChinese(selectedText.value);
});

// ===== 选区高亮样式 =====
const getHighlightStyle = (rect) => {
  return {
    position: 'absolute',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
};

// 拖动选区框样式
const getDragBoxStyle = () => {
  if (!dragRect.value) return {};
  const { left, top, width, height } = dragRect.value;
  return {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  };
};

// ===== 触摸事件处理 =====
const onTouchStart = (e) => {
  if (!props.active) return;

  const touch = e.touches[0];
  const point = { x: touch.clientX, y: touch.clientY };

  // 检查是否点击到文字
  const hitSpan = getTextSpanAtPoint(point);
  if (hitSpan) {
    // 点击到文字，开始选择
    selectSingleSpan(hitSpan);
    dragStart.value = point;
    isDragging.value = false;
  } else {
    // 点击空白，开始拖动选择
    dragStart.value = point;
    dragEnd.value = point;
    isDragging.value = true;
    clearSelection();
  }
};

const onTouchMove = (e) => {
  if (!props.active || !dragStart.value) return;

  const touch = e.touches[0];
  dragEnd.value = { x: touch.clientX, y: touch.clientY };

  // 计算拖动距离
  const distance = Math.sqrt(
    Math.pow(dragEnd.value.x - dragStart.value.x, 2) +
    Math.pow(dragEnd.value.y - dragStart.value.y, 2)
  );

  // 超过阈值才视为拖动选择
  if (distance > 10) {
    isDragging.value = true;
    updateDragRect();
    selectSpansInRect();
  }
};

const onTouchEnd = (e) => {
  if (!props.active) return;

  if (isDragging.value && selectedSpans.value.length > 0) {
    showActionMenu();
  }

  isDragging.value = false;
  dragStart.value = null;
  dragEnd.value = null;
  dragRect.value = null;
};

// ===== 鼠标事件处理（桌面兼容）=====
const onMouseDown = (e) => {
  if (!props.active) return;

  const point = { x: e.clientX, y: e.clientY };
  const hitSpan = getTextSpanAtPoint(point);

  if (hitSpan) {
    selectSingleSpan(hitSpan);
    dragStart.value = point;
    isDragging.value = false;
  } else {
    dragStart.value = point;
    dragEnd.value = point;
    isDragging.value = true;
    clearSelection();
  }
};

const onMouseMove = (e) => {
  if (!props.active || !dragStart.value) return;
  if (e.buttons !== 1) return; // 只在按住左键时处理

  dragEnd.value = { x: e.clientX, y: e.clientY };

  const distance = Math.sqrt(
    Math.pow(dragEnd.value.x - dragStart.value.x, 2) +
    Math.pow(dragEnd.value.y - dragStart.value.y, 2)
  );

  if (distance > 10) {
    isDragging.value = true;
    updateDragRect();
    selectSpansInRect();
  }
};

const onMouseUp = (e) => {
  if (!props.active) return;

  if (isDragging.value && selectedSpans.value.length > 0) {
    showActionMenu();
  }

  isDragging.value = false;
  dragStart.value = null;
  dragEnd.value = null;
  dragRect.value = null;
};

// ===== 文字层操作 =====

// 获取指定点的文字 span
const getTextSpanAtPoint = (point) => {
  if (!props.textLayerRef) return null;

  const container = props.pageContainerRef;
  if (!container) return null;

  const containerRect = container.getBoundingClientRect();
  const relativeX = point.x - containerRect.left;
  const relativeY = point.y - containerRect.top;

  const spans = props.textLayerRef.querySelectorAll('.text-item');

  for (const span of spans) {
    const rect = span.getBoundingClientRect();
    const spanLeft = rect.left - containerRect.left;
    const spanTop = rect.top - containerRect.top;
    const spanRight = spanLeft + rect.width;
    const spanBottom = spanTop + rect.height;

    if (relativeX >= spanLeft && relativeX <= spanRight &&
        relativeY >= spanTop && relativeY <= spanBottom) {
      return span;
    }
  }

  return null;
};

// 选中单个 span
const selectSingleSpan = (span) => {
  clearHighlights();

  selectedSpans.value = [span];
  const text = span.textContent || '';
  selectedText.value = smartFilterText(text, props.subject);

  // 添加高亮
  updateHighlightRects();

  // 显示菜单
  showActionMenu();

  emit('selection-change', {
    text: selectedText.value,
    page: props.currentPage
  });
};

// 更新拖动选区
const updateDragRect = () => {
  if (!dragStart.value || !dragEnd.value) return;

  const container = props.pageContainerRef;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();

  const left = Math.min(dragStart.value.x, dragEnd.value.x) - containerRect.left;
  const top = Math.min(dragStart.value.y, dragEnd.value.y) - containerRect.top;
  const right = Math.max(dragStart.value.x, dragEnd.value.x) - containerRect.left;
  const bottom = Math.max(dragStart.value.y, dragEnd.value.y) - containerRect.top;

  dragRect.value = {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
};

// 选中矩形内的所有 span
const selectSpansInRect = () => {
  if (!dragRect.value || !props.textLayerRef) return;

  const container = props.pageContainerRef;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const spans = props.textLayerRef.querySelectorAll('.text-item');
  const selected = [];

  const dragLeft = dragRect.value.left;
  const dragTop = dragRect.value.top;
  const dragRight = dragLeft + dragRect.value.width;
  const dragBottom = dragTop + dragRect.value.height;

  for (const span of spans) {
    const rect = span.getBoundingClientRect();
    const spanLeft = rect.left - containerRect.left;
    const spanTop = rect.top - containerRect.top;
    const spanRight = spanLeft + rect.width;
    const spanBottom = spanTop + rect.height;

    // 检查是否相交
    if (spanRight > dragLeft && spanLeft < dragRight &&
        spanBottom > dragTop && spanTop < dragBottom) {
      selected.push(span);
    }
  }

  selectedSpans.value = selected;

  // 合并文本
  const texts = selected.map(s => s.textContent || '');
  selectedText.value = smartFilterText(texts.join(''), props.subject);

  updateHighlightRects();
};

// 更新高亮矩形
const updateHighlightRects = () => {
  if (!props.pageContainerRef) return;

  const containerRect = props.pageContainerRef.getBoundingClientRect();
  const rects = [];

  for (const span of selectedSpans.value) {
    const rect = span.getBoundingClientRect();
    rects.push({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height
    });
  }

  highlightRects.value = rects;
};

// 清除高亮
const clearHighlights = () => {
  highlightRects.value = [];
};

// ===== 菜单操作 =====

const showActionMenu = () => {
  if (!selectedText.value) return;

  // 根据选区位置决定菜单位置
  if (highlightRects.value.length > 0) {
    const firstRect = highlightRects.value[0];
    menuPosition.value = firstRect.top < 200 ? 'bottom' : 'top';
  } else {
    menuPosition.value = 'bottom';
  }

  showMenu.value = true;
};

const clearSelection = () => {
  selectedText.value = '';
  selectedSpans.value = [];
  clearHighlights();
  showMenu.value = false;
  if (speaking.value) {
    stopSpeaking();
    speaking.value = false;
  }

  emit('selection-change', null);
};

const exitMode = () => {
  clearSelection();
  emit('exit');
};

// ===== 操作处理 =====

const handleLookup = () => {
  if (!selectedText.value) return;
  showDictPopup.value = true;
};

const handleSpeak = async () => {
  if (!selectedText.value) return;

  if (speaking.value) {
    stopSpeaking();
    speaking.value = false;
    return;
  }

  speaking.value = true;
  try {
    await speak(selectedText.value);
  } finally {
    speaking.value = false;
  }
};

const handleAskAI = () => {
  if (!selectedText.value) return;

  emit('ask-ai', selectedText.value);
  clearSelection();
};

const handleSaveNote = () => {
  if (!selectedText.value) return;

  emit('save-note', {
    text: selectedText.value,
    sourceType: 'pdf_selection',
    page: props.currentPage
  });

  clearSelection();
};

const handleSendToChat = () => {
  if (!selectedText.value) return;

  emit('send-to-chat', selectedText.value);
  clearSelection();
};

// 字典相关
const onDictLoaded = (data) => {
  // 可扩展
};

const closeDictPopup = () => {
  showDictPopup.value = false;
};

// ===== 生命周期 =====

// 监听 active 变化
watch(() => props.active, (newVal) => {
  if (!newVal) {
    clearSelection();
  }
});

// 点击外部退出
const handleClickOutside = (e) => {
  if (!props.active) return;

  // 检查是否点击在菜单或弹窗内
  if (e.target.closest('.touch-action-menu') ||
      e.target.closest('.dict-popup-content') ||
      e.target.closest('.selection-mode-bar')) {
    return;
  }

  // 点击选择层外部退出选择模式
  if (!e.target.closest('.touch-selection-layer') &&
      !e.target.closest('.page-container')) {
    exitMode();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (speaking.value) {
    stopSpeaking();
  }
});

// 暴露方法
defineExpose({
  clearSelection,
  exitMode
});
</script>

<style scoped>
/* 选择模式状态栏 */
.selection-mode-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10001;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.4);
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.mode-text {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.mode-hint {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.exit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 24px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.exit-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.98);
}

/* 选择层 */
.touch-selection-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  cursor: crosshair;
}

/* 选中高亮 */
.selection-highlight {
  background: rgba(102, 126, 234, 0.35);
  border-radius: 3px;
  pointer-events: none;
  animation: highlight-pulse 1s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0%, 100% { background: rgba(102, 126, 234, 0.35); }
  50% { background: rgba(102, 126, 234, 0.5); }
}

/* 拖动选区框 */
.drag-selection-box {
  background: rgba(102, 126, 234, 0.15);
  border: 2px dashed rgba(102, 126, 234, 0.6);
  border-radius: 4px;
  pointer-events: none;
}

/* 触控操作菜单 */
.touch-action-menu {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 70px;
  width: calc(100% - 32px);
  max-width: 500px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
  padding: 16px;
  z-index: 10002;
}

.touch-action-menu.menu-bottom {
  top: auto;
  bottom: 100px;
}

/* 识别内容 */
.recognized-text {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.recognized-text .label {
  color: #666;
  font-size: 13px;
  flex-shrink: 0;
}

.recognized-text .text {
  color: #333;
  font-size: 18px;
  font-weight: 600;
  word-break: break-all;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 72px;
  min-height: 72px;
  padding: 12px;
  background: #f8f9fa;
  border: none;
  border-radius: 16px;
  color: #333;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.action-btn:active {
  background: #e9ecef;
  transform: scale(0.96);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:active {
  opacity: 0.9;
}

.action-btn.active {
  background: #4299e1;
  color: white;
}

/* 关闭按钮 */
.close-menu-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9ecef;
  border: none;
  border-radius: 50%;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.close-menu-btn:active {
  background: #dee2e6;
}

/* 查字弹窗 */
.dict-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10003;
  padding: 20px;
}

.dict-popup-content {
  background: white;
  border-radius: 20px;
  max-width: 360px;
  width: 100%;
  max-height: 80vh;
  overflow: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.popup-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 1;
}

.popup-close-btn:active {
  background: #e0e0e0;
}

/* 动画 */
.slide-down-enter-active {
  animation: slide-down-in 0.25s ease-out;
}

.slide-down-leave-active {
  animation: slide-down-out 0.2s ease-in;
}

@keyframes slide-down-in {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-down-out {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

.menu-slide-enter-active {
  animation: menu-slide-in 0.2s ease-out;
}

.menu-slide-leave-active {
  animation: menu-slide-out 0.15s ease-in;
}

@keyframes menu-slide-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes menu-slide-out {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
}

.popup-fade-enter-active {
  animation: popup-in 0.25s ease-out;
}

.popup-fade-leave-active {
  animation: popup-out 0.2s ease-in;
}

@keyframes popup-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes popup-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* 触摸设备优化 */
@media (pointer: coarse) {
  .action-btn {
    min-width: 80px;
    min-height: 80px;
    padding: 14px;
    font-size: 14px;
  }

  .exit-btn {
    min-height: 48px;
    padding: 12px 24px;
  }

  .recognized-text .text {
    font-size: 20px;
  }
}
</style>
