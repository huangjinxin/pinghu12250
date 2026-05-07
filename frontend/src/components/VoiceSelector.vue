<template>
  <n-popover trigger="click" placement="bottom-end" :width="320">
    <template #trigger>
      <n-button :type="buttonType" :size="size" :quaternary="quaternary">
        <template #icon>
          <n-icon><VolumeHighOutline /></n-icon>
        </template>
        {{ buttonText || '朗读设置' }}
      </n-button>
    </template>
    <div class="voice-selector-panel">
      <div class="panel-header">
        <n-icon size="18" color="#7c3aed"><SettingsOutline /></n-icon>
        <span>朗读语音设置</span>
      </div>

      <!-- 不支持提示 -->
      <div v-if="!isSupported" class="unsupported-notice">
        <n-icon :component="AlertCircleOutline" />
        <span>当前浏览器不支持朗读功能</span>
      </div>

      <template v-else>
        <!-- 语音选择 -->
        <div class="setting-item">
          <span class="setting-label">语音</span>
          <n-select
            v-model:value="selectedVoiceURI"
            :options="voiceOptions"
            size="small"
            placeholder="选择语音"
            filterable
            class="voice-select"
          />
        </div>

        <!-- 语速调节 -->
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

        <!-- 试听按钮 -->
        <div class="setting-item test-section">
          <n-button
            size="small"
            :type="isPlaying ? 'warning' : 'primary'"
            @click="handleTest"
          >
            <template #icon>
              <n-icon>
                <StopOutline v-if="isPlaying" />
                <PlayOutline v-else />
              </n-icon>
            </template>
            {{ isPlaying ? '停止' : '试听效果' }}
          </n-button>
          <span class="hint-text">调整后立即生效，全局通用</span>
        </div>
      </template>
    </div>
  </n-popover>
</template>

<script setup>
import { computed } from 'vue';
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import AlertCircleOutline from '@vicons/ionicons5/es/AlertCircleOutline'
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import StopOutline from '@vicons/ionicons5/es/StopOutline'
import { useSpeechSynthesis } from '@/composables/useSpeechSynthesis';

defineProps({
  buttonType: {
    type: String,
    default: 'default'
  },
  buttonText: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium'
  },
  quaternary: {
    type: Boolean,
    default: false
  }
});

const {
  isSupported,
  isPlaying,
  chineseVoices,
  selectedVoiceURI,
  rate,
  rateText,
  speak,
  stop
} = useSpeechSynthesis();

// 语音选择下拉选项
const voiceOptions = computed(() => {
  return chineseVoices.value.map(v => ({
    label: v.displayName,
    value: v.uri
  }));
});

// 试听
const handleTest = () => {
  if (isPlaying.value) {
    stop();
  } else {
    speak('这是一段语音朗读的试听效果，调整设置后会立即生效。');
  }
};
</script>

<style scoped>
.voice-selector-panel {
  padding: 8px 0;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 12px;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 12px;
  font-weight: 500;
  color: #374151;
}

.unsupported-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
}

.setting-item {
  padding: 8px 4px;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

.setting-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.voice-select {
  width: 100%;
}

.rate-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rate-value {
  font-size: 13px;
  color: #7c3aed;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.test-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding-top: 12px;
}

.hint-text {
  font-size: 12px;
  color: #9ca3af;
}
</style>
