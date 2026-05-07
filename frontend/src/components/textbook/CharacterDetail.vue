<template>
  <div class="character-detail">
    <!-- 加载中 -->
    <div v-if="loading" class="detail-loading">
      <n-spin size="small" />
    </div>

    <!-- 有数据 -->
    <div v-else-if="data" class="detail-content">
      <div class="detail-main">
        <span class="char-display">{{ data.character }}</span>
        <span class="char-pinyin" v-if="data.pinyin">{{ data.pinyin }}</span>
      </div>
      <div class="char-definition" v-if="data.definition">
        {{ data.definition }}
      </div>
      <div class="char-no-definition" v-else>
        暂无释义
      </div>
      <button class="speak-btn" @click.stop="speakCharacter" :class="{ speaking }">
        <n-icon size="18"><VolumeHighOutline /></n-icon>
      </button>
    </div>

    <!-- 无数据 -->
    <div v-else class="detail-empty">
      <span>未找到释义</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import { lookupCharacter } from '@/api/dict';
import { speak, isSpeaking } from '@/utils/speechService';

const props = defineProps({
  character: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['loaded']);

const loading = ref(false);
const data = ref(null);
const speaking = ref(false);

// 朗读字符
const speakCharacter = async () => {
  if (!data.value?.character) return;

  speaking.value = true;
  try {
    await speak(data.value.character);
  } finally {
    speaking.value = false;
  }
};

// 加载字典数据
const loadData = async () => {
  if (!props.character) {
    data.value = null;
    return;
  }

  loading.value = true;
  try {
    const result = await lookupCharacter(props.character);
    data.value = result;
    emit('loaded', result);
  } catch (error) {
    console.error('加载字典数据失败:', error);
    data.value = null;
  } finally {
    loading.value = false;
  }
};

// 监听字符变化
watch(() => props.character, loadData, { immediate: true });
</script>

<style scoped>
.character-detail {
  position: relative;
  padding: 12px 16px;
  min-width: 180px;
  max-width: 280px;
}

.detail-loading {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.detail-content {
  position: relative;
}

.detail-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
  padding-right: 32px;
}

.char-display {
  font-size: 36px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.2;
}

.char-pinyin {
  font-size: 20px;
  color: #e53e3e;
  font-family: 'Times New Roman', serif;
  font-style: italic;
}

.char-definition {
  font-size: 14px;
  color: #4a5568;
  line-height: 1.6;
  word-break: break-word;
}

.char-no-definition {
  font-size: 14px;
  color: #a0aec0;
  font-style: italic;
}

.speak-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f0f5ff;
  color: #4299e1;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.speak-btn:hover {
  background: #e6f0ff;
  color: #3182ce;
}

.speak-btn:active {
  transform: scale(0.95);
}

.speak-btn.speaking {
  background: #4299e1;
  color: white;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.detail-empty {
  padding: 8px 0;
  color: #a0aec0;
  font-size: 14px;
  text-align: center;
}
</style>
