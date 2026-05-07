<template>
  <Teleport to="body">
    <Transition name="menu-fade">
      <div
        v-if="show && position"
        class="unified-selection-menu"
        :style="menuStyle"
        @mousedown.stop
        @touchstart.stop
        @click.stop
        @contextmenu.prevent
      >
        <!-- A组：文本操作（给人用） -->
        <div class="menu-group group-a">
          <span class="group-label">文本</span>
          <div class="menu-buttons">
            <!-- 查字（单字时显示） -->
            <button v-if="isSingleCharacter" class="menu-btn" @click="handleLookup" title="查字">
              <n-icon size="16"><BookOutline /></n-icon>
              <span>查字</span>
            </button>
            <!-- 朗读 -->
            <button class="menu-btn" :class="{ active: speaking }" @click="handleSpeak" title="朗读">
              <n-icon size="16"><VolumeHighOutline /></n-icon>
              <span>{{ speaking ? '停止' : '朗读' }}</span>
            </button>
            <!-- 复制 -->
            <button class="menu-btn" @click="handleCopy" title="复制">
              <n-icon size="16"><CopyOutline /></n-icon>
              <span>复制</span>
            </button>
            <!-- 高亮 -->
            <button class="menu-btn" @click="handleHighlight" title="高亮">
              <n-icon size="16"><ColorWandOutline /></n-icon>
              <span>高亮</span>
            </button>
            <!-- 加入笔记（文本） -->
            <button class="menu-btn" @click="handleSaveNote" title="存笔记">
              <n-icon size="16"><BookmarkOutline /></n-icon>
              <span>笔记</span>
            </button>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="menu-divider"></div>

        <!-- B组：AI操作（图像通道） -->
        <div class="menu-group group-b">
          <span class="group-label">AI</span>
          <div class="menu-buttons">
            <!-- 放入解析 -->
            <button class="menu-btn" @click="handleToAnalysis" title="AI解析">
              <n-icon size="16"><SparklesOutline /></n-icon>
              <span>解析</span>
            </button>
            <!-- 解题 -->
            <button class="menu-btn" @click="handleToSolving" title="解题">
              <n-icon size="16"><HelpCircleOutline /></n-icon>
              <span>解题</span>
            </button>
            <!-- 放入输入框 -->
            <button class="menu-btn" @click="handleSendToInput" title="发对话">
              <n-icon size="16"><SendOutline /></n-icon>
              <span>对话</span>
            </button>
          </div>
        </div>

        <!-- 箭头 -->
        <div class="menu-arrow" :class="arrowDirection"></div>
      </div>
    </Transition>

    <!-- 字典弹窗 -->
    <Transition name="popup-fade">
      <div
        v-if="showDictPopup && dictPosition"
        class="dict-popup"
        :style="dictPopupStyle"
        @mousedown.stop
        @touchstart.stop
        @click.stop
      >
        <CharacterDetail
          :character="text"
          @loaded="onDictLoaded"
        />
        <button class="popup-close" @click="closeDictPopup">
          <n-icon size="14"><CloseOutline /></n-icon>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import ColorWandOutline from '@vicons/ionicons5/es/ColorWandOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline'
import SendOutline from '@vicons/ionicons5/es/SendOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import CharacterDetail from './CharacterDetail.vue';
import { speak, stopSpeaking } from '@/utils/speechService';
import { isSingleChinese } from '@/api/dict';
import { smartFilterText } from '@/utils/pinyinFilter';

const props = defineProps({
  show: { type: Boolean, default: false },
  text: { type: String, default: '' },
  position: { type: Object, default: null },
  subject: { type: String, default: '' },
  currentPage: { type: Number, default: 1 },
  getScreenshot: { type: Function, default: null }
});

const emit = defineEmits([
  'close',
  'save-note',
  'send-to-input',
  'to-analysis',
  'to-solving',
  'highlight'
]);

// 状态
const speaking = ref(false);
const showDictPopup = ref(false);
const dictPosition = ref(null);
const arrowDirection = ref('down');

// 是否单个汉字
const isSingleCharacter = computed(() => isSingleChinese(props.text));

// 菜单样式
const menuStyle = computed(() => {
  if (!props.position) return {};

  const { top, left, width, height } = props.position;
  const menuWidth = 320;
  const menuHeight = 100;
  const offset = 12;

  let x = left + width / 2 - menuWidth / 2;
  let y = top - menuHeight - offset;

  // 边界检查
  const padding = 8;
  x = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));

  if (y < padding) {
    y = top + height + offset;
    arrowDirection.value = 'up';
  } else {
    arrowDirection.value = 'down';
  }

  return {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: 10000
  };
});

// 字典弹窗样式
const dictPopupStyle = computed(() => {
  if (!dictPosition.value) return {};
  return {
    position: 'fixed',
    left: `${dictPosition.value.x}px`,
    top: `${dictPosition.value.y}px`,
    zIndex: 10001
  };
});

// === A组操作 ===

// 查字
const handleLookup = () => {
  if (!props.position) return;

  const { top, left, width, height } = props.position;
  const popupWidth = 240;
  const popupHeight = 120;

  let x = left + width / 2 - popupWidth / 2;
  let y = top + height + 60;

  const padding = 8;
  x = Math.max(padding, Math.min(x, window.innerWidth - popupWidth - padding));
  if (y + popupHeight > window.innerHeight - padding) {
    y = top - popupHeight - 8;
  }

  dictPosition.value = { x, y };
  showDictPopup.value = true;
};

// 朗读
const handleSpeak = async () => {
  if (!props.text) return;

  if (speaking.value) {
    stopSpeaking();
    speaking.value = false;
    return;
  }

  speaking.value = true;
  try {
    const textToSpeak = smartFilterText(props.text, props.subject);
    await speak(textToSpeak);
  } finally {
    speaking.value = false;
  }
};

// 复制
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.text);
    window.$message?.success('已复制');
    closeMenu();
  } catch {
    window.$message?.error('复制失败');
  }
};

// 高亮
const handleHighlight = () => {
  emit('highlight', { text: props.text, page: props.currentPage });
  closeMenu();
};

// 保存笔记（文本）
const handleSaveNote = () => {
  emit('save-note', {
    text: props.text,
    sourceType: 'pdf_selection',
    page: props.currentPage
  });
  closeMenu();
};

// === B组操作（AI，使用截图）===

// 放入解析
const handleToAnalysis = () => {
  emit('to-analysis', {
    text: props.text,
    screenshot: props.getScreenshot?.(),
    page: props.currentPage
  });
  closeMenu();
};

// 解题
const handleToSolving = () => {
  emit('to-solving', {
    text: props.text,
    screenshot: props.getScreenshot?.(),
    page: props.currentPage
  });
  closeMenu();
};

// 发送到输入框
const handleSendToInput = () => {
  emit('send-to-input', props.text);
  closeMenu();
};

// 关闭菜单
const closeMenu = () => {
  closeDictPopup();
  window.getSelection()?.removeAllRanges();
  emit('close');
};

// 关闭字典弹窗
const closeDictPopup = () => {
  showDictPopup.value = false;
  dictPosition.value = null;
};

const onDictLoaded = () => {};

// 点击外部关闭
const handleClickOutside = (e) => {
  if (e.target.closest('.unified-selection-menu') ||
      e.target.closest('.dict-popup')) {
    return;
  }

  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    return;
  }

  closeMenu();
};

// 监听显示状态
watch(() => props.show, (val) => {
  if (!val) {
    closeDictPopup();
    if (speaking.value) {
      stopSpeaking();
      speaking.value = false;
    }
  }
});

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('touchstart', handleClickOutside);
});
</script>

<style scoped>
.unified-selection-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.92);
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  max-width: 340px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-left: 4px;
}

.menu-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  min-height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.menu-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.96);
}

.menu-btn.active {
  background: rgba(66, 153, 225, 0.6);
}

/* 触摸设备优化 */
@media (pointer: coarse) {
  .unified-selection-menu {
    padding: 12px 14px;
    gap: 10px;
  }

  .menu-btn {
    padding: 10px 14px;
    min-height: 44px;
    font-size: 13px;
  }
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 2px 0;
}

/* 箭头 */
.menu-arrow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
}

.menu-arrow.down {
  bottom: -9px;
  border-top: 10px solid rgba(0, 0, 0, 0.92);
}

.menu-arrow.up {
  top: -9px;
  border-bottom: 10px solid rgba(0, 0, 0, 0.92);
}

/* 字典弹窗 */
.dict-popup {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  min-width: 200px;
  max-width: 300px;
  position: relative;
}

.popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f0f0f0;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.popup-close:hover {
  background: #e0e0e0;
  color: #333;
}

/* 动画 */
.menu-fade-enter-active {
  animation: menu-in 0.18s ease-out;
}

.menu-fade-leave-active {
  animation: menu-out 0.12s ease-in;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.94);
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
    transform: scale(0.94);
  }
}

.popup-fade-enter-active {
  animation: popup-in 0.2s ease-out;
}

.popup-fade-leave-active {
  animation: popup-out 0.15s ease-in;
}

@keyframes popup-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes popup-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
