<template>
  <div class="pinyin-practice-overlay" @click.self="handleClickBackground">
    <!-- 隐藏的输入框捕获键盘 -->
    <input
      ref="hiddenInput"
      class="hidden-input"
      type="text"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      @keydown="handleKeyDown"
      @input="handleMobileInput"
    />

    <div class="practice-container">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <n-tag type="info" size="small">{{ progress }}</n-tag>
          <n-tag :type="currentAccuracy >= 90 ? 'success' : currentAccuracy >= 70 ? 'warning' : 'error'" size="small">
            正确率 {{ currentAccuracy }}%
          </n-tag>
          <n-tag size="small">{{ formatTime(elapsedSeconds) }}</n-tag>
        </div>
        <div class="toolbar-right">
          <n-button size="small" :type="showHint ? 'primary' : 'default'" @click="toggleHint">
            {{ showHint ? '隐藏提示' : '显示提示' }}
          </n-button>
          <n-button size="small" @click="handleExit">退出</n-button>
        </div>
      </div>

      <!-- 主练习区域 -->
      <div v-if="!isCompleted" class="practice-main" @click="focusInput">
        <!-- 拼音显示 -->
        <div class="pinyin-display">
          <template v-if="showHint && currentChar">
            <span
              v-for="(letter, i) in currentChar.pinyin.split('')"
              :key="i"
              class="pinyin-letter hint-letter"
              @click.stop="playLetterSound(currentChar, i)"
            >{{ letter }}</span>
          </template>
          <template v-else>
            <span class="pinyin-placeholder">{{ showHint ? '' : '点击「显示提示」查看拼音' }}</span>
          </template>
        </div>

        <!-- 汉字显示 -->
        <div class="char-display" @click.stop="playCharSound(currentChar)">
          {{ currentChar?.char }}
        </div>
        <div class="char-hint">点击汉字听发音</div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="letter-boxes">
            <div
              v-for="(expected, i) in expectedLetters"
              :key="i"
              class="letter-box"
              :class="{
                'filled-correct': typedLetters[i]?.correct === true,
                'filled-error': typedLetters[i]?.correct === false,
                'current': i === typedLetters.length && !hasError,
                'shake': typedLetters[i]?.correct === false,
              }"
            >
              <span v-if="typedLetters[i]">{{ typedLetters[i].letter }}</span>
              <span v-else class="letter-placeholder">_</span>
            </div>
          </div>
          <div class="extra-keys">
            <n-button size="small" @click="handleKeyInput('ü')">ü</n-button>
          </div>
          <div v-if="hasError" class="error-hint">
            输入错误，按退格键删除后重试
          </div>
        </div>

        <!-- 已完成的字符 -->
        <div v-if="results.length > 0" class="completed-chars">
          <div class="completed-label">已完成</div>
          <div class="completed-list">
            <div v-for="(r, i) in results" :key="i" class="completed-item">
              <span class="completed-char">{{ r.char }}</span>
              <span class="completed-pinyin">{{ r.pinyinLetters }}</span>
              <span v-if="r.errors === 0" class="completed-status correct">✓</span>
              <span v-else class="completed-status has-error">{{ r.errors }}误</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 完成界面 -->
      <div v-else class="practice-complete">
        <div class="complete-title">练习完成！</div>

        <div class="complete-stats">
          <div class="stat-item">
            <div class="stat-value">{{ submitData.charCount }}</div>
            <div class="stat-label">汉字数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ submitData.accuracy }}%</div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatTime(submitData.duration) }}</div>
            <div class="stat-label">用时</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ submitData.totalKeys }}</div>
            <div class="stat-label">总按键</div>
          </div>
        </div>

        <!-- 每个字的详情 -->
        <div class="complete-details">
          <div v-for="(r, i) in results" :key="i" class="detail-item" @click="playCharSound(r)">
            <span class="detail-char">{{ r.char }}</span>
            <span class="detail-pinyin">{{ r.pinyin }}</span>
            <span :class="['detail-errors', r.errors > 0 ? 'has-error' : '']">
              {{ r.errors > 0 ? `${r.errors}次错误` : '完美' }}
            </span>
          </div>
        </div>

        <n-space justify="center" style="margin-top: 24px;">
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            保存到记录
          </n-button>
          <n-button @click="handleExit">返回</n-button>
        </n-space>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { pinyinAPI } from '@/api/index'
import { usePinyinPractice } from '@/composables/usePinyinPractice'

const props = defineProps({
  pinyinData: { type: Object, required: true },
})

const emit = defineEmits(['close', 'complete'])
const message = useMessage()
const dialog = useDialog()

const hiddenInput = ref(null)
const submitting = ref(false)
const isKeydownHandling = ref(false)

const {
  chars, currentIndex, currentChar, typedLetters, expectedLetters,
  showHint, isCompleted, hasError, totalChars, progress, results,
  totalErrorCount, totalKeysTyped, totalCorrectKeys, currentAccuracy, elapsedSeconds,
  initPractice, handleKeyInput, toggleHint, playCharSound, playLetterSound,
  getSubmitData,
} = usePinyinPractice()

const submitData = computed(() => getSubmitData())

// 秒数刷新
const timer = ref(null)
const tick = ref(0)
onMounted(() => {
  timer.value = setInterval(() => { tick.value++ }, 1000)
})
onUnmounted(() => {
  if (timer.value) clearInterval(timer.value)
})

// 初始化
onMounted(() => {
  initPractice(props.pinyinData.chars)
  nextTick(() => focusInput())
})

function focusInput() {
  hiddenInput.value?.focus()
}

function handleClickBackground() {
  focusInput()
}

function handleKeyDown(e) {
  if (e.key === 'Backspace' || (e.key.length === 1 && /[a-zA-Z]/.test(e.key))) {
    e.preventDefault()
    isKeydownHandling.value = true
    const key = e.key === 'v' ? 'ü' : e.key
    const result = handleKeyInput(key)
    e.target.value = ''
    setTimeout(() => { isKeydownHandling.value = false }, 0)

    if (result === 'all_done') {
      // 练习完成
    }
  }
}

// iPad/移动端输入处理
function handleMobileInput(e) {
  if (isKeydownHandling.value) return

  const value = e.target.value
  if (value) {
    // 逐字符处理
    for (const char of value) {
      if (/[a-zA-Z]/.test(char)) {
        const mapped = char === 'v' ? 'ü' : char
        handleKeyInput(mapped)
      }
    }
    e.target.value = ''
  }
}

// 当切换字符时重新 focus
watch(currentIndex, () => {
  nextTick(() => focusInput())
})

async function handleSubmit() {
  submitting.value = true
  try {
    const data = getSubmitData()
    const res = await pinyinAPI.submit(data)
    if (res.success) {
      message.success('练习记录已保存')
      emit('complete')
    } else {
      message.error(res.error || '保存失败')
    }
  } catch (error) {
    message.error('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

function handleExit() {
  if (!isCompleted.value && results.value.length > 0) {
    dialog.warning({
      title: '确认退出',
      content: '退出后当前练习记录将不会保存，确定要退出吗？',
      positiveText: '确定退出',
      negativeText: '继续练习',
      onPositiveClick: () => {
        emit('close')
      }
    })
  } else {
    emit('close')
  }
}

function formatTime(seconds) {
  // 重新计算（利用 tick 触发响应式）
  const _ = tick.value
  const s = isCompleted.value ? submitData.value.duration : elapsedSeconds.value
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.pinyin-practice-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #f5f5f5;
  z-index: 1000;
  overflow-y: auto;
}

.hidden-input {
  position: fixed;
  top: -100px;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.practice-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.practice-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 32px;
}

/* 拼音显示 */
.pinyin-display {
  margin-bottom: 16px;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.pinyin-letter.hint-letter {
  font-size: 36px;
  color: #18a058;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.pinyin-letter.hint-letter:hover {
  background: #e8f5e9;
}

.pinyin-placeholder {
  font-size: 14px;
  color: #999;
}

/* 汉字显示 */
.char-display {
  font-size: 96px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  line-height: 1.2;
  transition: color 0.2s;
  user-select: none;
}

.char-display:hover {
  color: #18a058;
}

.char-hint {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 32px;
}

/* 输入区域 */
.input-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.letter-boxes {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.letter-box {
  width: 48px;
  height: 56px;
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  background: white;
  transition: all 0.2s;
}

.letter-box.current {
  border-color: #36ad6a;
  box-shadow: 0 0 0 2px rgba(54, 173, 106, 0.2);
}

.letter-box.filled-correct {
  background: #e8f5e9;
  border-color: #18a058;
  color: #18a058;
}

.letter-box.filled-error {
  background: #fde8e8;
  border-color: #e88080;
  color: #e88080;
}

.letter-box.shake {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.letter-placeholder {
  color: #ddd;
}

.extra-keys {
  margin-top: 12px;
}

.error-hint {
  margin-top: 12px;
  color: #e88080;
  font-size: 14px;
}

/* 已完成字符 */
.completed-chars {
  width: 100%;
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.completed-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
}

.completed-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #eee;
  font-size: 13px;
}

.completed-char {
  font-weight: bold;
  font-size: 16px;
}

.completed-pinyin {
  color: #666;
}

.completed-status.correct {
  color: #18a058;
}

.completed-status.has-error {
  color: #e88080;
  font-size: 12px;
}

/* 完成界面 */
.practice-complete {
  padding-top: 40px;
  text-align: center;
}

.complete-title {
  font-size: 28px;
  font-weight: bold;
  color: #18a058;
  margin-bottom: 24px;
}

.complete-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.complete-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 500px;
  margin: 0 auto;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.detail-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.detail-char {
  font-size: 20px;
  font-weight: bold;
}

.detail-pinyin {
  color: #18a058;
  font-size: 14px;
}

.detail-errors.has-error {
  color: #e88080;
  font-size: 12px;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .practice-container {
    padding: 8px;
  }

  .char-display {
    font-size: 72px;
  }

  .letter-box {
    width: 40px;
    height: 48px;
    font-size: 24px;
  }

  .pinyin-letter.hint-letter {
    font-size: 28px;
  }

  .complete-stats {
    gap: 16px;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>
