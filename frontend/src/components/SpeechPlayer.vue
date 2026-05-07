<template>
  <div class="speech-player" :class="{ active: isActive }">
    <div class="player-content">
      <!-- 播放/暂停按钮 -->
      <n-button
        :type="isActive ? 'primary' : 'default'"
        circle
        size="large"
        @click="handlePlayPause"
      >
        <template #icon>
          <n-icon>
            <PauseOutline v-if="isPlaying" />
            <PlayOutline v-else />
          </n-icon>
        </template>
      </n-button>

      <!-- 状态和进度 -->
      <div class="player-info">
        <div class="player-status">
          <n-icon class="status-icon" :component="VolumeHighOutline" />
          <span class="status-text">{{ statusText }}</span>
          <span v-if="isActive" class="progress-text">{{ progress }}%</span>
        </div>

        <!-- 进度条 -->
        <div v-if="isActive" class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div v-else class="hint-text">点击播放按钮开始朗读</div>
      </div>

      <!-- 设置按钮 -->
      <n-popover trigger="click" placement="bottom-end" :width="280">
        <template #trigger>
          <n-button quaternary circle size="small">
            <template #icon>
              <n-icon><SettingsOutline /></n-icon>
            </template>
          </n-button>
        </template>
        <div class="settings-panel">
          <div class="setting-item">
            <span class="setting-label">语音</span>
            <n-select
              v-model:value="selectedVoiceURI"
              :options="voiceOptions"
              size="small"
              placeholder="选择语音"
              style="width: 180px"
            />
          </div>
          <div class="setting-item">
            <span class="setting-label">语速</span>
            <div class="rate-control">
              <n-slider
                v-model:value="rate"
                :min="0.5"
                :max="2"
                :step="0.1"
                :tooltip="false"
                style="flex: 1"
              />
              <span class="rate-value">{{ rateText }}</span>
            </div>
          </div>
        </div>
      </n-popover>

      <!-- 停止按钮 -->
      <n-button
        v-if="isActive"
        quaternary
        circle
        size="small"
        @click="handleStop"
      >
        <template #icon>
          <n-icon><StopOutline /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- 不支持提示 -->
    <div v-if="!isSupported" class="unsupported-notice">
      <n-icon :component="AlertCircleOutline" />
      <span>当前浏览器不支持朗读功能</span>
    </div>
  </div>
</template>

<script setup>
import { watch, onUnmounted, computed } from 'vue';
import { NButton, NIcon, NPopover, NSelect, NSlider } from 'naive-ui';
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import PauseOutline from '@vicons/ionicons5/es/PauseOutline'
import StopOutline from '@vicons/ionicons5/es/StopOutline'
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import AlertCircleOutline from '@vicons/ionicons5/es/AlertCircleOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import { useSpeechSynthesis } from '@/composables/useSpeechSynthesis';

const props = defineProps({
  /** 要朗读的文本 */
  text: {
    type: String,
    required: true
  },
  /** 是否自动停止（当text变化时） */
  autoStop: {
    type: Boolean,
    default: true
  }
});

const {
  isPlaying,
  isPaused,
  isActive,
  progress,
  isSupported,
  statusText,
  chineseVoices,
  selectedVoiceURI,
  rate,
  rateText,
  speak,
  pause,
  resume,
  stop
} = useSpeechSynthesis();

// 语音选择下拉选项
const voiceOptions = computed(() => {
  return chineseVoices.value.map(v => ({
    label: v.displayName,
    value: v.uri
  }));
});

// 处理播放/暂停
const handlePlayPause = () => {
  if (isPlaying.value) {
    pause();
  } else if (isPaused.value) {
    resume();
  } else {
    speak(props.text);
  }
};

// 处理停止
const handleStop = () => {
  stop();
};

// 当文本变化时停止当前朗读
watch(
  () => props.text,
  () => {
    if (props.autoStop) {
      stop();
    }
  }
);

// 组件卸载时停止朗读
onUnmounted(() => {
  stop();
});
</script>

<style scoped>
.speech-player {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 12px 16px;
  transition: all 0.2s ease;
}

.speech-player.active {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border: 1px solid #a78bfa;
}

.player-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.status-icon {
  color: #7c3aed;
  font-size: 16px;
}

.status-text {
  font-weight: 500;
  color: #374151;
}

.progress-text {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.hint-text {
  font-size: 12px;
  color: #9ca3af;
}

.unsupported-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

/* 设置面板样式 */
.settings-panel {
  padding: 4px 0;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

.setting-label {
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
  width: 40px;
}

.rate-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.rate-value {
  font-size: 12px;
  color: #7c3aed;
  font-weight: 500;
  min-width: 36px;
  text-align: right;
}
</style>
