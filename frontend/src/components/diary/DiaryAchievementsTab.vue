<template>
  <div class="diary-achievements">
    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12">
      <n-spin size="large" />
    </div>

    <template v-else>
      <!-- 成就统计概览 -->
      <div class="stats-overview mb-6">
        <div class="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
          <div class="flex items-center gap-4">
            <div class="text-4xl">🏆</div>
            <div>
              <div class="text-2xl font-bold text-amber-700">
                {{ stats?.unlocked || 0 }} / {{ stats?.total || 0 }}
              </div>
              <div class="text-sm text-amber-600">已解锁成就</div>
            </div>
          </div>
          <div class="text-right">
            <n-progress
              type="circle"
              :percentage="stats?.progress || 0"
              :stroke-width="8"
              :indicator-text-color="'#d97706'"
              style="width: 60px"
            />
          </div>
        </div>
      </div>

      <!-- 最近解锁 -->
      <div v-if="stats?.recentUnlocks?.length" class="recent-unlocks mb-6">
        <h3 class="text-sm font-medium text-gray-600 mb-3">最近解锁</h3>
        <div class="flex gap-2 overflow-x-auto pb-2">
          <div
            v-for="achievement in stats.recentUnlocks"
            :key="achievement.id"
            class="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg border border-primary-100"
          >
            <span class="text-xl">{{ achievement.emoji }}</span>
            <div>
              <div class="text-sm font-medium text-primary-700">{{ achievement.name }}</div>
              <div class="text-xs text-primary-500">{{ formatDate(achievement.unlockedAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成就分类 -->
      <n-tabs type="line" animated>
        <n-tab-pane
          v-for="category in categories"
          :key="category.key"
          :name="category.key"
          :tab="category.label"
        >
          <!-- 分类说明 -->
          <div class="category-intro mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ category.icon }}</span>
              <span class="text-sm text-gray-600">{{ category.desc }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="achievement in getAchievementsByCategory(category.key)"
              :key="achievement.id"
              class="achievement-card"
              :class="{ 'unlocked': achievement.unlocked, 'locked': !achievement.unlocked }"
            >
              <div class="flex items-start gap-3">
                <!-- 成就图标 -->
                <div
                  class="achievement-icon"
                  :class="{ 'grayscale opacity-40': !achievement.unlocked }"
                >
                  {{ achievement.emoji }}
                </div>

                <!-- 成就信息 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium" :class="achievement.unlocked ? 'text-gray-800' : 'text-gray-400'">
                      {{ achievement.name }}
                    </span>
                    <n-tag v-if="achievement.unlocked" type="success" size="tiny">已解锁</n-tag>
                  </div>
                  <div class="text-sm" :class="achievement.unlocked ? 'text-gray-600' : 'text-gray-400'">
                    {{ achievement.description }}
                  </div>
                  <div v-if="achievement.unlocked && achievement.unlockedAt" class="text-xs text-gray-400 mt-1">
                    {{ formatDate(achievement.unlockedAt) }} 解锁
                  </div>
                  <div v-if="achievement.rewardPoints > 0" class="text-xs text-amber-500 mt-1">
                    +{{ achievement.rewardPoints }} 积分
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="getAchievementsByCategory(category.key).length === 0" class="text-center py-8 text-gray-400">
            暂无此类成就
          </div>
        </n-tab-pane>
      </n-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { diaryGameAPI } from '@/api'
import { format } from 'date-fns'

const loading = ref(true)
const achievements = ref([])
const stats = ref(null)

// 成就分类
const categories = [
  {
    key: 'streak',
    label: '连续打卡',
    icon: '🔥',
    desc: '坚持每天写日记，连续打卡达到指定天数即可解锁。断签后需重新开始累计。'
  },
  {
    key: 'level',
    label: '单篇字数',
    icon: '📝',
    desc: '单篇日记达到指定字数等级即可解锁。字数只统计文字，不含标点和空格。'
  },
  {
    key: 'grade',
    label: '高分挑战',
    icon: '⭐',
    desc: '通过 AI 分析获得指定等级评分即可解锁。评分取决于内容、情感、语言、结构和创意五个维度。'
  },
  {
    key: 'words',
    label: '累计字数',
    icon: '📊',
    desc: '所有日记的总字数累计达到指定数量即可解锁。每篇日记都会增加累计字数。'
  },
  {
    key: 'rank',
    label: '段位达成',
    icon: '🎖️',
    desc: '通过持续写作提升段位，达到指定段位即可解锁。段位由日记数量、字数和连续打卡综合决定。'
  },
  {
    key: 'special',
    label: '特殊成就',
    icon: '🎁',
    desc: '完成特殊任务或在特定时间写日记即可解锁。包括节日日记、首次成就等。'
  },
]

// 按分类获取成就
const getAchievementsByCategory = (category) => {
  return achievements.value.filter(a => a.category === category)
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return format(new Date(date), 'MM-dd HH:mm')
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [achievementsRes, statsRes] = await Promise.all([
      diaryGameAPI.getAchievements(),
      diaryGameAPI.getAchievementStats()
    ])

    if (achievementsRes.success) {
      achievements.value = achievementsRes.data
    }
    if (statsRes.success) {
      stats.value = statsRes.data
    }
  } catch (error) {
    console.error('[DiaryAchievements] 加载失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.achievement-card {
  padding: 16px;
  border-radius: 12px;
  transition: all 0.2s;
}

.achievement-card.unlocked {
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  border: 1px solid #fcd34d;
}

.achievement-card.locked {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.achievement-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
