<template>
  <div class="pinyin-chart">
    <!-- 声母 -->
    <div class="section">
      <div class="section-title">声母（23个）</div>
      <n-grid :cols="6" :x-gap="8" :y-gap="8">
        <n-gi v-for="item in initials" :key="item">
          <div class="pinyin-card" @click="playInitial(item)">
            <div class="pinyin-text">{{ item }}</div>
          </div>
        </n-gi>
      </n-grid>
    </div>

    <!-- 韵母 -->
    <div class="section">
      <div class="section-title">单韵母（6个）</div>
      <n-grid :cols="6" :x-gap="8" :y-gap="8">
        <n-gi v-for="item in singleFinals" :key="item">
          <div class="pinyin-card" @click="playFinal(item)">
            <div class="pinyin-text">{{ item }}</div>
          </div>
        </n-gi>
      </n-grid>
    </div>

    <div class="section">
      <div class="section-title">复韵母（9个）</div>
      <n-grid :cols="6" :x-gap="8" :y-gap="8">
        <n-gi v-for="item in compoundFinals" :key="item">
          <div class="pinyin-card" @click="playFinal(item)">
            <div class="pinyin-text">{{ item }}</div>
          </div>
        </n-gi>
      </n-grid>
    </div>

    <div class="section">
      <div class="section-title">前鼻韵母（5个）</div>
      <n-grid :cols="6" :x-gap="8" :y-gap="8">
        <n-gi v-for="item in nasalFinals" :key="item">
          <div class="pinyin-card" @click="playFinal(item)">
            <div class="pinyin-text">{{ item }}</div>
          </div>
        </n-gi>
      </n-grid>
    </div>

    <div class="section">
      <div class="section-title">后鼻韵母（4个）</div>
      <n-grid :cols="6" :x-gap="8" :y-gap="8">
        <n-gi v-for="item in backNasalFinals" :key="item">
          <div class="pinyin-card" @click="playFinal(item)">
            <div class="pinyin-text">{{ item }}</div>
          </div>
        </n-gi>
      </n-grid>
    </div>

    <!-- 声调示例 -->
    <div class="section">
      <div class="section-title">声调（以"a"为例）</div>
      <n-grid :cols="5" :x-gap="8" :y-gap="8">
        <n-gi v-for="item in tones" :key="item.tone">
          <div class="pinyin-card tone-card" @click="playSyllable('a', item.tone)">
            <div class="pinyin-text large">{{ item.display }}</div>
            <div class="tone-label">{{ item.label }}</div>
          </div>
        </n-gi>
      </n-grid>
    </div>

    <!-- 使用说明 -->
    <div class="tips">
      <n-alert type="info" :bordered="false">
        点击任意拼音卡片即可听发音。声母和韵母可以组合成完整的音节。
      </n-alert>
    </div>
  </div>
</template>

<script setup>
const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w']
const singleFinals = ['a', 'o', 'e', 'i', 'u', 'ü']
const compoundFinals = ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er']
const nasalFinals = ['an', 'en', 'in', 'un', 'ün']
const backNasalFinals = ['ang', 'eng', 'ing', 'ong']
const tones = [
  { tone: 1, display: 'ā', label: '一声（阴平）' },
  { tone: 2, display: 'á', label: '二声（阳平）' },
  { tone: 3, display: 'ǎ', label: '三声（上声）' },
  { tone: 4, display: 'à', label: '四声（去声）' },
  { tone: 0, display: 'a', label: '轻声' },
]

// 拼音汉字映射表（优先使用一声）
const PINYIN_VOICE_MAP = {
  // 声母
  'b':'玻', 'p':'坡', 'm':'摸', 'f':'佛',
  'd':'得', 't':'特', 'n':'呢', 'l':'勒',
  'g':'哥', 'k':'科', 'h':'喝',
  'j':'基', 'q':'欺', 'x':'西',
  'zh':'知', 'ch':'吃', 'sh':'诗', 'r':'日',
  'z':'资', 'c':'雌', 's':'思',
  'y':'衣', 'w':'乌',
  // 单韵母
  'a':'阿', 'o':'窝', 'e':'鹅', 'i':'衣', 'u':'乌', 'v':'迂',
  // 复韵母
  'ai':'哀', 'ei':'诶', 'ui':'威', 'ao':'凹', 'ou':'欧', 'iu':'优',
  'ie':'耶', 've':'约', 'er':'儿',
  // 前鼻韵母
  'an':'安', 'en':'恩', 'in':'因', 'un':'温', 'vn':'冤',
  // 后鼻韵母
  'ang':'肮', 'eng':'亨', 'ing':'英', 'ong':'翁'
}

function speak(text) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.8
  utterance.volume = 1
  speechSynthesis.speak(utterance)
}

function playInitial(initial) {
  const char = PINYIN_VOICE_MAP[initial] || initial
  speak(char)
}

function playFinal(final) {
  // ü 转换为 v
  const normalized = final.replace('ü', 'v')
  const char = PINYIN_VOICE_MAP[normalized] || final
  speak(char)
}

function playSyllable(pinyin, tone) {
  // 构建带声调的拼音文本
  const toneMarks = { 1: 'ā', 2: 'á', 3: 'ǎ', 4: 'à', 0: 'a' }
  const text = tone > 0 ? `${pinyin}${tone}` : pinyin
  speak(text)
}
</script>

<style scoped>
.pinyin-chart {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #007aff;
}

.pinyin-card {
  background: #f5f5f7;
  border: 1px solid #e5e5e7;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

.pinyin-card:hover {
  background: #e8e8ed;
  border-color: #d2d2d7;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pinyin-card:active {
  transform: scale(0.98);
  background: #d2d2d7;
}

.pinyin-text {
  font-size: 22px;
  font-weight: 600;
  color: #1d1d1f;
  text-align: center;
}

.pinyin-text.large {
  font-size: 28px;
}

.tone-card {
  background: #fff;
  border: 1px solid #d2d2d7;
  flex-direction: column;
  gap: 6px;
  min-height: 80px;
}

.tone-card:hover {
  background: #f5f5f7;
  border-color: #007aff;
}

.tone-label {
  font-size: 11px;
  color: #86868b;
  text-align: center;
  font-weight: 400;
}

.tips {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .pinyin-chart {
    padding: 0 8px;
  }

  .pinyin-text {
    font-size: 20px;
  }

  .pinyin-text.large {
    font-size: 26px;
  }
}
</style>
