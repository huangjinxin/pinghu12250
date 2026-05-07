<template>
  <div class="typing-idioms">
    <n-spin :show="loading">
      <!-- 进度概览 -->
      <div class="idiom-progress" v-if="stats">
        <n-card size="small" :bordered="true">
          <div class="progress-content">
            <div class="progress-ring">
              <n-progress
                type="circle"
                :percentage="Math.round((stats.totalTriggered / stats.totalIdioms) * 100)"
                :stroke-width="8"
                :width="80"
              />
            </div>
            <div class="progress-info">
              <div class="progress-title">成语收集进度</div>
              <div class="progress-count">
                <span class="triggered">{{ stats.totalTriggered }}</span>
                <span class="divider">/</span>
                <span class="total">{{ stats.totalIdioms }}</span>
              </div>
              <div class="progress-hint">点击卡片复制成语释义 · 六种方式解锁成语</div>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 难度过滤 -->
      <div class="tier-filter">
        <n-space>
          <n-tag
            v-for="t in tierOptions"
            :key="t.value"
            :type="activeTier === t.value ? 'primary' : 'default'"
            :bordered="activeTier !== t.value"
            size="small"
            round
            checkable
            :checked="activeTier === t.value"
            @update:checked="activeTier = t.value"
          >
            {{ t.label }}
          </n-tag>
        </n-space>
      </div>

      <!-- 分类标签 -->
      <div class="category-tabs">
        <n-tabs v-model:value="activeCategory" type="segment" size="small">
          <n-tab name="all">全部</n-tab>
          <n-tab v-for="(_, key) in categories" :key="key" :name="key">{{ key }}</n-tab>
        </n-tabs>
      </div>

      <!-- 成语卡片网格 -->
      <div class="idiom-grid">
        <div
          v-for="idiom in filteredIdioms"
          :key="idiom.word"
          class="idiom-card"
          :class="{ triggered: idiom.triggered, ['tier-' + idiom.tier]: true }"
          @click="copyIdiom(idiom)"
        >
          <div class="idiom-header">
            <div class="idiom-word">{{ idiom.word }}</div>
            <n-tag :type="tierTagType[idiom.tier]" size="tiny">{{ idiom.tierLabel }}</n-tag>
          </div>
          <div class="idiom-meaning">{{ idiom.meaning }}</div>
          <div class="idiom-meta">
            <n-tag v-if="idiom.triggered" size="tiny" type="success">
              已解锁 {{ idiom.count }}次
            </n-tag>
            <n-tag v-else size="tiny" type="default">
              {{ idiom.condition }}
            </n-tag>
          </div>
          <div class="copy-hint">点击复制</div>
        </div>
      </div>

      <n-empty v-if="!loading && filteredIdioms.length === 0" description="暂无成语数据" />
    </n-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { typingAPI } from '@/api/index'

const message = useMessage()
const loading = ref(true)
const activeCategory = ref('all')
const activeTier = ref(0)
const categories = ref({})
const stats = ref(null)

const tierOptions = [
  { label: '全部', value: 0 },
  { label: '普通', value: 1 },
  { label: '精英', value: 2 },
  { label: '传说', value: 3 },
]

const tierTagType = { 1: 'success', 2: 'warning', 3: 'error' }

const filteredIdioms = computed(() => {
  let list = []
  if (activeCategory.value === 'all') {
    list = Object.values(categories.value).flat()
  } else {
    list = categories.value[activeCategory.value] || []
  }
  if (activeTier.value > 0) {
    list = list.filter(i => i.tier === activeTier.value)
  }
  return list
})

async function loadIdioms() {
  loading.value = true
  try {
    const res = await typingAPI.getIdiomStats()
    if (res.success) {
      categories.value = res.data.categories
      stats.value = {
        totalTriggered: res.data.totalTriggered,
        totalIdioms: res.data.totalIdioms,
      }
    }
  } catch (e) {
    message.error('加载成语数据失败')
  } finally {
    loading.value = false
  }
}

function copyIdiom(idiom) {
  const text = `${idiom.word}：${idiom.meaning}`
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制：' + idiom.word)
  }).catch(() => {
    message.error('复制失败')
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

onMounted(() => {
  loadIdioms()
})
</script>

<style scoped>
.typing-idioms {
  max-width: 800px;
  margin: 0 auto;
}

.idiom-progress {
  margin-bottom: 16px;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.progress-info {
  flex: 1;
}

.progress-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.progress-count {
  font-size: 24px;
  font-weight: bold;
}

.progress-count .triggered {
  color: #10b981;
}

.progress-count .divider {
  color: #ccc;
  margin: 0 4px;
}

.progress-count .total {
  color: #666;
}

.progress-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.tier-filter {
  margin-bottom: 12px;
}

.category-tabs {
  margin-bottom: 16px;
}

.idiom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.idiom-card {
  padding: 14px;
  background: #f9fafb;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}

.idiom-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.idiom-card:hover .copy-hint {
  opacity: 1;
}

.idiom-card.tier-2 {
  background: #fefce8;
}

.idiom-card.tier-3 {
  background: #fef2f2;
}

.idiom-card.triggered {
  background: linear-gradient(135deg, #fef3c7, #fde68a33);
  border-color: #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.idiom-card.triggered.tier-3 {
  background: linear-gradient(135deg, #fecaca, #fca5a533);
  border-color: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.idiom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.idiom-word {
  font-size: 22px;
  font-weight: bold;
  color: #1f2937;
  letter-spacing: 4px;
}

.idiom-card.triggered .idiom-word {
  color: #b45309;
}

.idiom-card.triggered.tier-3 .idiom-word {
  color: #991b1b;
}

.idiom-meaning {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
  min-height: 40px;
}

.idiom-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.copy-hint {
  position: absolute;
  bottom: 6px;
  right: 10px;
  font-size: 10px;
  color: #999;
  opacity: 0;
  transition: opacity 0.2s;
}

@media (max-width: 480px) {
  .idiom-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .idiom-word {
    font-size: 18px;
  }
  .idiom-meaning {
    font-size: 11px;
  }
}
</style>
