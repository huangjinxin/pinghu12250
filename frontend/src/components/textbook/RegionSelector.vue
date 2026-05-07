<template>
  <Teleport to="body">
    <div
      v-if="active"
      class="region-selector-overlay"
      @mousedown="startSelection"
      @mousemove="updateSelection"
      @mouseup="endSelection"
      @touchstart.prevent="startTouchSelection"
      @touchmove.prevent="updateTouchSelection"
      @touchend="endTouchSelection"
    >
      <!-- 选区框 -->
      <div
        v-if="isSelecting || hasSelection"
        class="selection-box"
        :style="selectionStyle"
      >
        <div class="selection-handles" v-if="hasSelection">
          <span class="handle nw"></span>
          <span class="handle ne"></span>
          <span class="handle sw"></span>
          <span class="handle se"></span>
        </div>
      </div>

      <!-- 提示文字 -->
      <div v-if="!isSelecting && !hasSelection" class="selector-hint">
        <n-icon size="32"><ScanOutline /></n-icon>
        <span>拖动框选题目区域</span>
      </div>

      <!-- 操作按钮（选区完成后显示） -->
      <div v-if="hasSelection" class="selection-actions" :style="actionsStyle">
        <n-button type="primary" size="small" @click="handleConfirm">
          <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
          确认
        </n-button>
        <n-button size="small" @click="handleReset">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          重选
        </n-button>
        <n-button size="small" @click="handleCancel">
          <template #icon><n-icon><CloseOutline /></n-icon></template>
          取消
        </n-button>
      </div>

      <!-- 取消按钮（无选区时） -->
      <n-button
        v-if="!hasSelection"
        class="cancel-btn"
        circle
        size="large"
        @click="handleCancel"
      >
        <template #icon><n-icon><CloseOutline /></n-icon></template>
      </n-button>
    </div>

    <!-- 二级操作菜单 -->
    <Transition name="menu-fade">
      <div
        v-if="showActionMenu && capturedImage"
        class="region-action-menu"
        :style="menuStyle"
      >
        <div class="menu-preview">
          <img :src="capturedImage" alt="选区预览" />
        </div>
        <div class="menu-actions">
          <n-button type="primary" @click="handleAction('solving')">
            <template #icon><n-icon><HelpCircleOutline /></n-icon></template>
            解题
          </n-button>
          <n-button @click="handleAction('practice')">
            <template #icon><n-icon><SchoolOutline /></n-icon></template>
            练习
          </n-button>
          <n-button @click="handleAction('ai')">
            <template #icon><n-icon><SparklesOutline /></n-icon></template>
            发给AI
          </n-button>
          <n-button @click="handleAction('note')">
            <template #icon><n-icon><BookmarkOutline /></n-icon></template>
            存笔记
          </n-button>
        </div>
        <n-button text class="menu-close" @click="closeActionMenu">
          <n-icon size="20"><CloseOutline /></n-icon>
        </n-button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import ScanOutline from '@vicons/ionicons5/es/ScanOutline'
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline'
import SchoolOutline from '@vicons/ionicons5/es/SchoolOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'

const props = defineProps({
  active: { type: Boolean, default: false },
  canvasRef: { type: Object, default: null }
});

const emit = defineEmits(['cancel', 'capture', 'action']);

// 选区状态
const isSelecting = ref(false);
const startX = ref(0);
const startY = ref(0);
const endX = ref(0);
const endY = ref(0);
const hasSelection = ref(false);

// 截取的图片
const capturedImage = ref(null);
const showActionMenu = ref(false);

// 计算选区样式
const selectionStyle = computed(() => {
  const left = Math.min(startX.value, endX.value);
  const top = Math.min(startY.value, endY.value);
  const width = Math.abs(endX.value - startX.value);
  const height = Math.abs(endY.value - startY.value);

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  };
});

// 操作按钮位置
const actionsStyle = computed(() => {
  const left = Math.min(startX.value, endX.value);
  const bottom = Math.max(startY.value, endY.value);
  return {
    left: `${left}px`,
    top: `${bottom + 10}px`
  };
});

// 菜单位置（屏幕中央）
const menuStyle = computed(() => ({
  position: 'fixed',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)'
}));

// 鼠标事件
const startSelection = (e) => {
  if (hasSelection.value) return;
  isSelecting.value = true;
  startX.value = e.clientX;
  startY.value = e.clientY;
  endX.value = e.clientX;
  endY.value = e.clientY;
};

const updateSelection = (e) => {
  if (!isSelecting.value) return;
  endX.value = e.clientX;
  endY.value = e.clientY;
};

const endSelection = () => {
  if (!isSelecting.value) return;
  isSelecting.value = false;

  // 检查选区是否有效（至少 20x20 像素）
  const width = Math.abs(endX.value - startX.value);
  const height = Math.abs(endY.value - startY.value);
  if (width >= 20 && height >= 20) {
    hasSelection.value = true;
  }
};

// 触摸事件
const startTouchSelection = (e) => {
  if (hasSelection.value) return;
  const touch = e.touches[0];
  isSelecting.value = true;
  startX.value = touch.clientX;
  startY.value = touch.clientY;
  endX.value = touch.clientX;
  endY.value = touch.clientY;
};

const updateTouchSelection = (e) => {
  if (!isSelecting.value) return;
  const touch = e.touches[0];
  endX.value = touch.clientX;
  endY.value = touch.clientY;
};

const endTouchSelection = () => {
  endSelection();
};

// 确认选区
const handleConfirm = async () => {
  if (!props.canvasRef) {
    emit('cancel');
    return;
  }

  try {
    // 获取 canvas 相对于视口的位置
    const canvasRect = props.canvasRef.getBoundingClientRect();

    // 计算选区相对于 canvas 的坐标
    const left = Math.min(startX.value, endX.value) - canvasRect.left;
    const top = Math.min(startY.value, endY.value) - canvasRect.top;
    const width = Math.abs(endX.value - startX.value);
    const height = Math.abs(endY.value - startY.value);

    // 计算缩放比例（canvas 实际尺寸 vs 显示尺寸）
    const scaleX = props.canvasRef.width / canvasRect.width;
    const scaleY = props.canvasRef.height / canvasRect.height;

    // 创建临时 canvas 来裁剪
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * scaleX;
    tempCanvas.height = height * scaleY;
    const ctx = tempCanvas.getContext('2d');

    // 裁剪图像
    ctx.drawImage(
      props.canvasRef,
      left * scaleX,
      top * scaleY,
      width * scaleX,
      height * scaleY,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    // 转为 base64
    capturedImage.value = tempCanvas.toDataURL('image/jpeg', 0.9);
    showActionMenu.value = true;

    // 重置选区状态
    resetSelection();
  } catch (e) {
    console.error('截取选区失败:', e);
    emit('cancel');
  }
};

// 重置选区
const handleReset = () => {
  resetSelection();
};

const resetSelection = () => {
  isSelecting.value = false;
  hasSelection.value = false;
  startX.value = 0;
  startY.value = 0;
  endX.value = 0;
  endY.value = 0;
};

// 取消
const handleCancel = () => {
  resetSelection();
  capturedImage.value = null;
  showActionMenu.value = false;
  emit('cancel');
};

// 关闭操作菜单
const closeActionMenu = () => {
  showActionMenu.value = false;
  capturedImage.value = null;
  emit('cancel');
};

// 处理操作
const handleAction = (action) => {
  emit('action', { action, image: capturedImage.value });
  closeActionMenu();
};

// 监听 active 变化
watch(() => props.active, (val) => {
  if (!val) {
    resetSelection();
    showActionMenu.value = false;
  }
});
</script>

<style scoped>
.region-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  cursor: crosshair;
}

.selection-box {
  position: fixed;
  border: 2px dashed #1890ff;
  background: rgba(24, 144, 255, 0.1);
  pointer-events: none;
}

.selection-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #1890ff;
  border-radius: 2px;
}

.handle.nw { top: -5px; left: -5px; }
.handle.ne { top: -5px; right: -5px; }
.handle.sw { bottom: -5px; left: -5px; }
.handle.se { bottom: -5px; right: -5px; }

.selector-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: white;
  font-size: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.selection-actions {
  position: fixed;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  z-index: 10000;
}

.cancel-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
  border: none !important;
}

/* 二级操作菜单 */
.region-action-menu {
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  padding: 16px;
  z-index: 10001;
  max-width: 90vw;
  max-height: 80vh;
  overflow: auto;
}

.menu-preview {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.menu-preview img {
  display: block;
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.menu-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.menu-actions .n-button {
  justify-content: flex-start;
}

.menu-close {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #999;
}

.menu-close:hover {
  color: #333;
}

/* 动画 */
.menu-fade-enter-active {
  animation: menu-in 0.2s ease-out;
}

.menu-fade-leave-active {
  animation: menu-out 0.15s ease-in;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes menu-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
}
</style>
