<template>
  <div class="pinyin-input-panel">
    <n-card title="拼音打字练习" size="small">
      <n-space vertical :size="16">
        <div class="input-section">
          <n-input
            v-model:value="inputText"
            type="textarea"
            placeholder="请输入或粘贴汉字文本（支持语音输入），如：床前明月光"
            :rows="4"
            :maxlength="200"
            show-count
          />
          <div class="char-count">
            汉字数量：<n-tag :type="charCount > 50 ? 'error' : 'success'" size="small">
              {{ charCount }} / 50
            </n-tag>
            <span v-if="charCount > 50" class="count-warning">超出上限，将只取前50个汉字</span>
          </div>
        </div>

        <n-button
          type="primary"
          size="large"
          block
          :loading="loading"
          :disabled="charCount === 0"
          @click="handleStart"
        >
          开始学习拼音
        </n-button>

        <div class="tips">
          <n-text depth="3" style="font-size: 13px;">
            提示：支持iPad语音输入或复制粘贴诗词内容，系统将自动生成拼音。标点符号和空格会被过滤。
          </n-text>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { pinyinAPI } from '@/api/index'

const emit = defineEmits(['start'])
const message = useMessage()

const inputText = ref('')
const loading = ref(false)

// 计算汉字数量（排除标点空格）
const charCount = computed(() => {
  const matches = inputText.value.match(/[\u4e00-\u9fff]/g)
  return matches ? matches.length : 0
})

async function handleStart() {
  if (charCount.value === 0) {
    message.warning('请输入汉字文本')
    return
  }

  loading.value = true
  try {
    const res = await pinyinAPI.convert({ text: inputText.value })
    if (res.success && res.data) {
      emit('start', res.data)
    } else {
      message.error(res.error || '拼音转换失败')
    }
  } catch (error) {
    console.error('Request Error:', error)
    message.error('拼音转换失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.pinyin-input-panel {
  max-width: 600px;
  margin: 0 auto;
}

.char-count {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.count-warning {
  color: #e88080;
  font-size: 12px;
}

.tips {
  text-align: center;
}
</style>
