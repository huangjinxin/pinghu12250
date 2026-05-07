<template>
  <div class="record-detail-modal">
    <n-card title="练习详情" :bordered="false">
      <template #header-extra>
        <n-button text @click="$emit('close')">
          <template #icon>
            <n-icon><CloseOutline /></n-icon>
          </template>
        </n-button>
      </template>

      <div class="detail-stats">
        <div class="stat-item">
          <div class="stat-value">{{ record.charCount }}</div>
          <div class="stat-label">汉字数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ record.accuracy }}%</div>
          <div class="stat-label">正确率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatDuration(record.duration) }}</div>
          <div class="stat-label">用时</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ record.totalKeys }}</div>
          <div class="stat-label">总按键</div>
        </div>
      </div>

      <div class="detail-list">
        <div v-for="(item, i) in record.content" :key="i" class="detail-item" @click="playChar(item)">
          <span class="item-char">{{ item.char }}</span>
          <span class="item-pinyin">{{ item.pinyin }}</span>
          <span :class="['item-errors', item.errors > 0 ? 'has-error' : '']">
            {{ item.errors > 0 ? `${item.errors}次错误` : '完美' }}
          </span>
        </div>
      </div>

      <div class="detail-date">
        练习时间：{{ formatDate(record.createdAt) }}
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { CloseOutline } from '@vicons/ionicons5'

const props = defineProps({
  record: { type: Object, required: true }
})

defineEmits(['close'])

function playChar(item) {
  playSequence(item.initial, item.final, item.pinyinLetters, item.tone)
}

function playSequence(initial, final, pinyinLetters, tone) {
  let delay = 0
  if (initial) {
    setTimeout(() => playAudio('initial', initial), delay)
    delay += 600
  }
  if (final) {
    setTimeout(() => playAudio('final', final), delay)
    delay += 600
  }
  setTimeout(() => playAudio('syllable', tone > 0 ? `${pinyinLetters}${tone}` : `${pinyinLetters}1`), delay)
}

const audioCache = new Map()
function playAudio(type, name) {
  const path = `/audio/pinyin/${type}s/${name}.mp3`
  let audio = audioCache.get(path)
  if (!audio) {
    audio = new Audio(path)
    audioCache.set(path, audio)
  }
  audio.currentTime = 0
  audio.play().catch(() => {})
}

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.record-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.record-detail-modal :deep(.n-card) {
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #18a058;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.detail-item:hover {
  background: #e8e8e8;
}

.item-char {
  font-size: 24px;
  font-weight: bold;
  width: 40px;
  text-align: center;
}

.item-pinyin {
  font-size: 16px;
  color: #666;
  flex: 1;
}

.item-errors {
  font-size: 12px;
  color: #18a058;
}

.item-errors.has-error {
  color: #d03050;
}

.detail-date {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
</style>
