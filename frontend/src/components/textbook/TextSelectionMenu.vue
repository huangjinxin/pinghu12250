<template>
  <Teleport to="body">
    <Transition name="menu-fade">
      <div
        v-if="show && position"
        class="text-selection-menu"
        :style="menuStyle"
        @click.stop
        @mousedown.stop
        @touchstart.stop
      >
        <!-- 单字：查字按钮 -->
        <button
          v-if="isSingleCharacter"
          class="menu-btn"
          @click="handleLookup"
        >
          <n-icon size="16"><BookOutline /></n-icon>
          <span>查字</span>
        </button>

        <!-- 朗读按钮 -->
        <button
          class="menu-btn"
          :class="{ speaking }"
          @click="handleSpeak"
        >
          <n-icon size="16"><VolumeHighOutline /></n-icon>
          <span>朗读</span>
        </button>

        <!-- 箭头指示 -->
        <div class="menu-arrow" :class="arrowDirection"></div>
      </div>
    </Transition>

    <!-- 字典弹窗 -->
    <Transition name="popup-fade">
      <div
        v-if="showDictPopup && dictPosition"
        class="dict-popup"
        :style="dictStyle"
        @click.stop
        @mousedown.stop
        @touchstart.stop
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
import { BookOutline, VolumeHighOutline, CloseOutline } from '@vicons/ionicons5';
import CharacterDetail from './CharacterDetail.vue';
import { speak, stopSpeaking } from '@/utils/speechService';
import { isSingleChinese } from '@/api/dict';
import { smartFilterText } from '@/utils/pinyinFilter';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  },
  position: {
    type: Object,
    default: null
  },
  subject: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);

// 状态
const speaking = ref(false);
const showDictPopup = ref(false);
const dictPosition = ref(null);
const arrowDirection = ref('down');

// 计算是否为单个汉字
const isSingleCharacter = computed(() => {
  return isSingleChinese(props.text);
});

// 计算菜单位置样式
const menuStyle = computed(() => {
  if (!props.position) return {};

  const { top, left, width, height } = props.position;
  const menuWidth = isSingleCharacter.value ? 140 : 80;
  const menuHeight = 44;
  const offset = 10;

  // 居中于选区上方
  let x = left + width / 2 - menuWidth / 2;
  let y = top - menuHeight - offset;

  // 确保不超出屏幕边界
  const padding = 8;
  x = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));

  // 如果上方空间不足，显示在下方
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

// 计算字典弹窗位置
const dictStyle = computed(() => {
  if (!dictPosition.value) return {};

  return {
    position: 'fixed',
    left: `${dictPosition.value.x}px`,
    top: `${dictPosition.value.y}px`,
    zIndex: 10001
  };
});

// 处理查字
const handleLookup = () => {
  if (!props.position) return;

  const { top, left, width, height } = props.position;
  const popupWidth = 240;
  const popupHeight = 120;
  const offset = 8;

  // 计算弹窗位置（菜单下方或选区下方）
  let x = left + width / 2 - popupWidth / 2;
  let y = top + height + offset + 50; // 菜单高度 + offset

  // 边界检查
  const padding = 8;
  x = Math.max(padding, Math.min(x, window.innerWidth - popupWidth - padding));
  if (y + popupHeight > window.innerHeight - padding) {
    y = top - popupHeight - offset;
  }

  dictPosition.value = { x, y };
  showDictPopup.value = true;
};

// 处理朗读
const handleSpeak = async () => {
  if (!props.text) return;

  if (speaking.value) {
    stopSpeaking();
    speaking.value = false;
    return;
  }

  speaking.value = true;
  try {
    // 语文课本：朗读时过滤拼音字母
    const textToSpeak = smartFilterText(props.text, props.subject);
    await speak(textToSpeak);
  } finally {
    speaking.value = false;
  }
};

// 字典数据加载完成
const onDictLoaded = (data) => {
  // 可以在这里处理额外逻辑
};

// 关闭字典弹窗
const closeDictPopup = () => {
  showDictPopup.value = false;
  dictPosition.value = null;
};

// 点击外部关闭
const handleClickOutside = (e) => {
  // 检查是否点击在菜单或弹窗内
  if (e.target.closest('.text-selection-menu') ||
      e.target.closest('.dict-popup')) {
    return;
  }

  // 检查是否正在选择文字
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    return;
  }

  // 关闭
  closeDictPopup();
  emit('close');
};

// 监听 show 变化
watch(() => props.show, (newVal) => {
  if (!newVal) {
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
/* 菜单容器 */
.text-selection-menu {
  display: flex;
  gap: 2px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.88);
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 菜单按钮 */
.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 16px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: white;
  font-size: 14px;
  font-weight: 500;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.menu-btn:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.98);
}

.menu-btn.speaking {
  background: rgba(66, 153, 225, 0.5);
}

/* 箭头指示 */
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
  width: 24px;
  height: 24px;
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

/* 进入/离开动画 */
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
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
