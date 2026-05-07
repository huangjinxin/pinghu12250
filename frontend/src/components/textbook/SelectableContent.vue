<template>
  <div
    class="selectable-content"
    ref="containerRef"
    @mouseup="handleMouseUp"
    @touchend="handleTouchEnd"
  >
    <slot></slot>

    <!-- 选中操作菜单 -->
    <Teleport to="body">
      <Transition name="menu-fade">
        <div
          v-if="showMenu && menuPosition"
          class="selection-menu"
          :style="menuStyle"
          @mousedown.stop
          @touchstart.stop
        >
          <button class="menu-btn" @click="handleSpeak" :class="{ active: speaking }">
            <n-icon size="14"><VolumeHighOutline /></n-icon>
            <span>朗读</span>
          </button>
          <button class="menu-btn" @click="handleSaveNote">
            <n-icon size="14"><BookmarkOutline /></n-icon>
            <span>存笔记</span>
          </button>
          <button class="menu-btn" @click="handleSendToInput">
            <n-icon size="14"><SendOutline /></n-icon>
            <span>发对话</span>
          </button>
          <button class="menu-btn" @click="handleAskAI">
            <n-icon size="14"><SparklesOutline /></n-icon>
            <span>AI解释</span>
          </button>
          <!-- 箭头 -->
          <div class="menu-arrow" :class="arrowDirection"></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import SendOutline from '@vicons/ionicons5/es/SendOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import { speak, stopSpeaking } from '@/utils/speechService';

const props = defineProps({
  // 所属教材ID
  textbookId: {
    type: String,
    default: ''
  },
  // 当前页码
  currentPage: {
    type: Number,
    default: 1
  },
  // 来源类型
  sourceType: {
    type: String,
    default: 'content'
  }
});

const emit = defineEmits(['save-note', 'send-to-input', 'ask-ai']);

const message = useMessage();
const containerRef = ref(null);
const showMenu = ref(false);
const menuPosition = ref(null);
const selectedText = ref('');
const speaking = ref(false);
const arrowDirection = ref('down');

// 菜单样式
const menuStyle = computed(() => {
  if (!menuPosition.value) return {};

  return {
    position: 'fixed',
    left: `${menuPosition.value.x}px`,
    top: `${menuPosition.value.y}px`,
    zIndex: 10000
  };
});

// 检测选中文字
const checkSelection = () => {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed) {
    hideMenu();
    return;
  }

  const text = selection.toString().trim();
  if (!text) {
    hideMenu();
    return;
  }

  // 检查选中是否在当前容器内
  const anchorNode = selection.anchorNode;
  if (!containerRef.value || !containerRef.value.contains(anchorNode)) {
    return;
  }

  selectedText.value = text;

  // 计算菜单位置
  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const menuWidth = 280;
    const menuHeight = 44;
    const offset = 10;

    let x = rect.left + rect.width / 2 - menuWidth / 2;
    let y = rect.top - menuHeight - offset;

    // 边界检查
    const padding = 8;
    x = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));

    if (y < padding) {
      y = rect.bottom + offset;
      arrowDirection.value = 'up';
    } else {
      arrowDirection.value = 'down';
    }

    menuPosition.value = { x, y };
    showMenu.value = true;
  } catch (e) {
    hideMenu();
  }
};

// 隐藏菜单
const hideMenu = () => {
  showMenu.value = false;
  menuPosition.value = null;
  selectedText.value = '';
};

// 鼠标抬起
const handleMouseUp = () => {
  setTimeout(checkSelection, 10);
};

// 触摸结束
const handleTouchEnd = () => {
  setTimeout(checkSelection, 300);
};

// 点击外部关闭
const handleClickOutside = (e) => {
  if (!showMenu.value) return;

  if (e.target.closest('.selection-menu')) return;

  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return;

  hideMenu();
};

// 朗读
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

// 保存笔记
const handleSaveNote = () => {
  if (!selectedText.value) return;

  emit('save-note', {
    text: selectedText.value,
    sourceType: props.sourceType,
    page: props.currentPage
  });

  message.success('已保存到笔记');
  hideMenu();
  window.getSelection()?.removeAllRanges();
};

// 发送到输入框
const handleSendToInput = () => {
  if (!selectedText.value) return;

  emit('send-to-input', selectedText.value);
  hideMenu();
  window.getSelection()?.removeAllRanges();
};

// AI 解释
const handleAskAI = () => {
  if (!selectedText.value) return;

  emit('ask-ai', selectedText.value);
  hideMenu();
  window.getSelection()?.removeAllRanges();
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('touchstart', handleClickOutside);
  if (speaking.value) {
    stopSpeaking();
  }
});
</script>

<style scoped>
.selectable-content {
  user-select: text;
  -webkit-user-select: text;
}

/* 选中菜单 */
.selection-menu {
  display: flex;
  gap: 2px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.88);
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: 18px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.menu-btn:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.98);
}

.menu-btn.active {
  background: rgba(66, 153, 225, 0.5);
}

/* 触摸设备优化 */
@media (pointer: coarse) {
  .selection-menu {
    padding: 8px;
    gap: 4px;
  }

  .menu-btn {
    padding: 12px 14px;
    min-height: 48px;
    font-size: 14px;
  }
}

/* 箭头 */
.menu-arrow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}

.menu-arrow.down {
  bottom: -7px;
  border-top: 8px solid rgba(0, 0, 0, 0.88);
}

.menu-arrow.up {
  top: -7px;
  border-bottom: 8px solid rgba(0, 0, 0, 0.88);
}

/* 动画 */
.menu-fade-enter-active {
  animation: menu-in 0.15s ease-out;
}

.menu-fade-leave-active {
  animation: menu-out 0.1s ease-in;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes menu-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
