<template>
  <div class="admin-home">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">管理后台</h1>
      <p class="text-gray-500 mt-1">欢迎回来，{{ currentTime }}好</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <n-card size="small" class="stat-card" @click="router.push('/admin/users')">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <n-icon size="24" color="#3b82f6"><PeopleOutline /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-800">{{ formatNumber(stats.users) }}</div>
            <div class="text-xs text-gray-500">用户总数</div>
          </div>
        </div>
      </n-card>

      <n-card size="small" class="stat-card" @click="router.push('/admin/reward-rules?tab=review')">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <n-icon size="24" color="#f97316"><CheckmarkCircleOutline /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-800">{{ formatNumber(totalPending) }}</div>
            <div class="text-xs text-gray-500">待审核</div>
          </div>
        </div>
      </n-card>

      <n-card size="small" class="stat-card" @click="router.push('/admin/interaction?tab=imessage')">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <n-icon size="24" color="#a855f7"><ChatbubblesOutline /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-800">{{ formatNumber(stats.totalMessages) }}</div>
            <div class="text-xs text-gray-500">消息总数</div>
          </div>
        </div>
      </n-card>

      <n-card size="small" class="stat-card">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <n-icon size="24" color="#22c55e"><TrendingUpOutline /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-800">{{ formatNumber(stats.yesterdayActive) }}</div>
            <div class="text-xs text-gray-500">昨日活跃</div>
          </div>
        </div>
      </n-card>

      <n-card size="small" class="stat-card">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <n-icon size="24" color="#eab308"><TrophyOutline /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-yellow-600">{{ formatNumber(stats.bestTypingScore) }}</div>
            <div class="text-xs text-gray-500">打字最高分</div>
          </div>
        </div>
      </n-card>

      <n-card size="small" class="stat-card" @click="router.push('/admin/campus-class')">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <n-icon size="24" color="#6366f1"><SchoolOutline /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-800">{{ formatNumber(stats.totalClasses) }}</div>
            <div class="text-xs text-gray-500">班级总数</div>
          </div>
        </div>
      </n-card>
    </div>

    <div class="mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">快捷入口</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/reward-rules?tab=review')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#f97316"><CheckmarkCircleOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">审核中心</div>
            <div class="text-xs text-gray-500 mt-1">待审 {{ formatNumber(totalPending) }}</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/interaction?tab=imessage')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#a855f7"><ChatbubblesOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">勤学好问</div>
            <div class="text-xs text-gray-500 mt-1">消息 {{ formatNumber(stats.totalMessages) }}</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/analytics')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#22c55e"><BarChartOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">数据中心</div>
            <div class="text-xs text-gray-500 mt-1">API配置/统计</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/campus-class')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#3b82f6"><SchoolOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">校区班级</div>
            <div class="text-xs text-gray-500 mt-1">学校/班级/学生</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/users')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#6366f1"><PeopleOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">用户管理</div>
            <div class="text-xs text-gray-500 mt-1">用户 {{ stats.users }}</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/paycodes')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#eab308"><CardOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">财务管理</div>
            <div class="text-xs text-gray-500 mt-1">学习币/支付码</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/reward-rules?tab=rules')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#ef4444"><TrophyOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">奖罚管理</div>
            <div class="text-xs text-gray-500 mt-1">积分规则</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/interaction?tab=feedback')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#06b6d4"><MailOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">用户反馈</div>
            <div class="text-xs text-gray-500 mt-1">反馈管理</div>
          </div>
        </n-card>

        <n-card size="small" hoverable class="quick-action" @click="router.push('/admin/credit-rules')">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <n-icon size="28" color="#3b82f6"><TrophyOutline /></n-icon>
            </div>
            <div class="font-medium text-gray-800">信用管理</div>
            <div class="text-xs text-gray-500 mt-1">评分规则</div>
          </div>
        </n-card>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <n-card title="待办事项" size="small">
        <template #header-extra>
          <n-tag type="warning" size="small">{{ pendingTasks.length }} 项</n-tag>
        </template>
        <div v-if="pendingTasks.length" class="space-y-3">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
            @click="handleTaskClick(task)"
          >
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="task.iconBg">
                <n-icon size="18" :color="task.iconColor"><component :is="task.icon" /></n-icon>
              </div>
              <div>
                <div class="font-medium text-gray-800">{{ task.title }}</div>
                <div class="text-xs text-gray-500">{{ task.subtitle }}</div>
              </div>
            </div>
            <n-badge :value="task.count" :max="999" />
          </div>
        </div>
        <div v-else class="text-center text-gray-400 py-8">
          <n-icon size="48"><CheckboxOutline /></n-icon>
          <p class="mt-2">暂无待办事项</p>
        </div>
      </n-card>

      <n-card title="系统信息" size="small">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">活跃用户</span>
            <span class="font-medium">{{ formatNumber(stats.onlineUsers) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">班级数量</span>
            <span class="font-medium">{{ stats.totalClasses }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">消息总量</span>
            <span class="font-medium">{{ formatNumber(stats.totalMessages) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">数据库状态</span>
            <n-tag :type="dbStatus === 'connected' ? 'success' : 'error'" size="small">
              {{ dbStatus === 'connected' ? '已连接' : '未连接' }}
            </n-tag>
          </div>
          <n-divider />
          <n-space vertical>
            <n-button block @click="router.push('/admin/bots')">
              <template #icon><n-icon><HardwareChipOutline /></n-icon></template>
              BOT管理
            </n-button>
            <n-button block @click="router.push('/admin/activity-logs')">
              <template #icon><n-icon><DocumentTextOutline /></n-icon></template>
              操作日志
            </n-button>
          </n-space>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI, submissionAPI, imessageAPI, classAPI, creativeWorkAPI, poetryWorkAPI, calligraphyAPI } from '@/api'
import {
  PeopleOutline,
  CheckmarkCircleOutline,
  ChatbubblesOutline,
  TrendingUpOutline,
  BarChartOutline,
  SchoolOutline,
  CardOutline,
  TrophyOutline,
  MailOutline,
  CheckboxOutline,
  DocumentTextOutline,
  HardwareChipOutline,
  EaselOutline,
  BookOutline,
  PencilOutline,
} from '@vicons/ionicons5/es'

const router = useRouter()

const formatNumber = (num) => {
  if (num === null || num === undefined || num === 0) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return num.toString()
}

const currentTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上'
  if (hour < 18) return '下午'
  return '晚上'
})

const stats = ref({
  users: 0,
  pendingSubmissions: 0,
  pendingCreative: 0,
  pendingPoetry: 0,
  pendingCalligraphy: 0,
  totalMessages: 0,
  yesterdayActive: 0,
  bestTypingScore: 0,
  totalClasses: 0,
  onlineUsers: 0,
})

const dbStatus = ref('checking')

const totalPending = computed(() => {
  return stats.value.pendingSubmissions + stats.value.pendingCreative + 
         stats.value.pendingPoetry + stats.value.pendingCalligraphy
})

const pendingTasks = computed(() => {
  const tasks = []
  
  if (stats.value.pendingSubmissions > 0) {
    tasks.push({
      id: 'submissions',
      title: '任务提交',
      subtitle: `待审核 ${stats.value.pendingSubmissions} 条`,
      count: stats.value.pendingSubmissions,
      icon: TrophyOutline,
      iconBg: 'bg-orange-100',
      iconColor: '#f97316',
      path: '/admin/reward-rules?tab=review',
    })
  }
  
  if (stats.value.pendingCreative > 0) {
    tasks.push({
      id: 'creative',
      title: '创业作品',
      subtitle: `待审核 ${stats.value.pendingCreative} 条`,
      count: stats.value.pendingCreative,
      icon: EaselOutline,
      iconBg: 'bg-blue-100',
      iconColor: '#3b82f6',
      path: '/admin/creative-works',
    })
  }
  
  if (stats.value.pendingPoetry > 0) {
    tasks.push({
      id: 'poetry',
      title: '诗词作品',
      subtitle: `待审核 ${stats.value.pendingPoetry} 条`,
      count: stats.value.pendingPoetry,
      icon: BookOutline,
      iconBg: 'bg-green-100',
      iconColor: '#22c55e',
      path: '/admin/poetry-works',
    })
  }
  
  if (stats.value.pendingCalligraphy > 0) {
    tasks.push({
      id: 'calligraphy',
      title: '书法作品',
      subtitle: `待审核 ${stats.value.pendingCalligraphy} 条`,
      count: stats.value.pendingCalligraphy,
      icon: PencilOutline,
      iconBg: 'bg-purple-100',
      iconColor: '#a855f7',
      path: '/admin/calligraphy',
    })
  }
  
  return tasks
})

const loadStats = async () => {
  dbStatus.value = 'checking'
  try {
    const [adminStats, submissionStats, creativeStats, poetryStats, calligraphyRes, imessageStats, classStats] = await Promise.all([
      adminAPI.getStats().catch(() => ({ totalUsers: 0, pendingUsers: 0, activeUsers: 0, todayLogins: 0 })),
      submissionAPI.getSubmissionStats().catch(() => ({ stats: { pending: 0 } })),
      creativeWorkAPI.adminGetStats().catch(() => ({ pending: 0 })),
      poetryWorkAPI.adminGetStats().catch(() => ({ stats: { pending: 0 } })),
      calligraphyAPI.reviewList({ status: 'PENDING', limit: 1 }).catch(() => ({ data: { total: 0 } })),
      imessageAPI.getStats().catch(() => ({ data: { totalMessages: 0 } })),
      classAPI.getClasses().catch(() => ({ classes: [] })),
    ])

    stats.value = {
      users: adminStats.totalUsers || 0,
      pendingSubmissions: submissionStats.stats?.pending || 0,
      pendingCreative: creativeStats.pending || 0,
      pendingPoetry: poetryStats.stats?.pending || 0,
      pendingCalligraphy: calligraphyRes.data?.total || 0,
      totalMessages: imessageStats.data?.totalMessages || imessageStats.totalMessages || 0,
      yesterdayActive: adminStats.yesterdayActive || 0,
      bestTypingScore: adminStats.bestTypingScore || 0,
      totalClasses: classStats.classes?.length || 0,
      onlineUsers: adminStats.activeUsers || 0,
    }
    dbStatus.value = 'connected'
  } catch (error) {
    console.error('加载统计数据失败:', error)
    dbStatus.value = 'error'
  }
}

const handleTaskClick = (task) => {
  router.push(task.path)
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-home {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.quick-action {
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action:hover {
  transform: translateY(-2px);
}
</style>
