<template>
  <div class="home">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="user-greeting">
        <span class="greeting-text">{{ greetingText }}</span>
        <span class="username">{{ nickname }}</span>
      </div>
      <router-link to="/leaderboard" class="dashboard-btn">
        📊 进度看板
      </router-link>
    </div>

    <!-- 主内容区域 -->
    <div class="home-content">
      <!-- 今日任务 -->
      <section class="section">
        <div class="section-header">
          <h2>
            <n-icon :size="20" color="#6366f1"><Flag /></n-icon>
            今日任务
          </h2>
          <router-link to="/challenges" class="link">查看全部 →</router-link>
        </div>

        <div v-if="loadingTasks" class="loading-placeholder">
          <n-spin size="small" />
          <span>加载中...</span>
        </div>

        <div v-else class="tasks-grid">
          <TaskCard
            v-for="task in todayTasks"
            :key="task.id"
            :title="task.name"
            :status="task.status"
            :points="task.points"
            :icon="task.icon"
            :icon-color="task.color"
            :icon-bg-color="task.bgColor"
            :to="task.submitUrl"
            :reject-reason="task.rejectReason"
          />
        </div>
      </section>

      <!-- 退回提醒 -->
      <RejectedAlert
        :items="rejectedItems"
        @resubmit="handleResubmit"
      />

      <!-- 排行榜数据图表 -->
      <LeaderboardOverview />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { submissionAPI, calligraphyAPI, feedAPI, typingAPI, pinyinAPI } from '@/api';
import TaskCard from '@/components/home/TaskCard.vue';
import RejectedAlert from '@/components/home/RejectedAlert.vue';
import LeaderboardOverview from '@/components/home/LeaderboardOverview.vue';
import Flag from '@vicons/ionicons5/es/Flag'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import CalculatorOutline from '@vicons/ionicons5/es/CalculatorOutline'
import NewspaperOutline from '@vicons/ionicons5/es/NewspaperOutline'
import PencilOutline from '@vicons/ionicons5/es/PencilOutline'
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline'
import KeypadOutline from '@vicons/ionicons5/es/KeypadOutline'
import TextOutline from '@vicons/ionicons5/es/TextOutline'

const authStore = useAuthStore();

// 用户信息
const nickname = computed(() =>
  authStore.user?.profile?.nickname || authStore.user?.username || '同学'
);

// 问候语
const greetingText = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，';
  if (hour < 9) return '早上好，';
  if (hour < 12) return '上午好，';
  if (hour < 14) return '中午好，';
  if (hour < 18) return '下午好，';
  if (hour < 22) return '晚上好，';
  return '夜深了，';
});

// 状态数据
const loadingTasks = ref(true);

// 今日任务配置
const taskConfigs = [
  {
    id: 'diary',
    name: '日记',
    templateName: '日记(审批前提项/日)',
    points: 200,
    icon: BookOutline,
    color: '#a855f7',
    bgColor: '#f3e8ff',
    submitUrl: '/diaries/new',
  },
  {
    id: 'math',
    name: '数学',
    templateName: '可汗学院数学进度',
    points: 60,
    icon: CalculatorOutline,
    color: '#3b82f6',
    bgColor: '#dbeafe',
    submitUrl: '/my-growth',
  },
  {
    id: 'poetry',
    name: '背诗',
    templateName: '背诗',
    points: 55,
    icon: NewspaperOutline,
    color: '#f97316',
    bgColor: '#ffedd5',
    submitUrl: '/my-growth',
  },
  {
    id: 'calligraphy',
    name: '书写',
    isCalligraphy: true,
    points: 50,
    icon: PencilOutline,
    color: '#ec4899',
    bgColor: '#fce7f3',
    submitUrl: '/works?tab=calligraphy',
  },
  {
    id: 'moments',
    name: '分享生活',
    isSocial: 'moments',
    points: 3,
    icon: CameraOutline,
    color: '#14b8a6',
    bgColor: '#ccfbf1',
    submitUrl: '/moments',
  },
  {
    id: 'questions',
    name: '勤学好问',
    isSocial: 'questions',
    points: 3,
    icon: HelpCircleOutline,
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    submitUrl: '/moments?tab=leaderboard',
  },
  {
    id: 'typing',
    name: '打字训练',
    isTyping: true,
    points: 30,
    icon: KeypadOutline,
    color: '#6366f1',
    bgColor: '#eef2ff',
    submitUrl: '/typing',
  },
  {
    id: 'pinyin',
    name: '拼音练习',
    isPinyin: true,
    points: 30,
    icon: TextOutline,
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    submitUrl: '/pinyin',
  },
];

// 今日任务状态
const todayTasks = ref([]);
const rejectedItems = ref([]);

// 加载今日任务状态
async function loadTodayStatus() {
  try {
    const templateNames = taskConfigs
      .filter(t => !t.isCalligraphy && !t.isSocial && !t.isTyping && !t.isPinyin)
      .map(t => t.templateName)
      .join(',');
    const timezoneOffset = -new Date().getTimezoneOffset();

    // 并行获取提交状态、书写状态、社交任务状态、打字状态、拼音状态
    const [response, calligraphyRes, socialRes, typingRes, pinyinRes] = await Promise.all([
      submissionAPI.getTodayStatus({ templateNames, timezoneOffset }),
      calligraphyAPI.getTodayStatus({ timezoneOffset }),
      feedAPI.getTodaySocial({ timezoneOffset }).catch(() => ({ data: {} })),
      typingAPI.getTodayStatus({ timezoneOffset }).catch(() => ({ data: {} })),
      pinyinAPI.getTodayStatus({ timezoneOffset }).catch(() => ({ data: {} }))
    ]);

    const todayStatus = response.todayStatus || {};
    const calligraphyStatus = calligraphyRes.data?.status || 'NOT_SUBMITTED';
    const socialStatus = socialRes.data || {};
    const typingStatus = typingRes.data || {};
    const pinyinStatus = pinyinRes.data || {};

    // 映射任务状态
    todayTasks.value = taskConfigs.map(config => {
      let status = 'pending_submit';
      let rejectReason = '';
      let submissionId = null;

      if (config.isCalligraphy) {
        switch (calligraphyStatus) {
          case 'PENDING':
            status = 'pending_review';
            break;
          case 'APPROVED':
            status = 'approved';
            break;
          case 'REJECTED':
            status = 'rejected';
            break;
        }
        submissionId = calligraphyRes.data?.workId;
      } else if (config.isSocial) {
        status = socialStatus[config.isSocial] ? 'completed' : 'pending_complete';
      } else if (config.isTyping) {
        status = typingStatus.completed ? 'completed' : 'pending_complete';
      } else if (config.isPinyin) {
        status = pinyinStatus.completed ? 'completed' : 'pending_complete';
      } else {
        const submission = todayStatus[config.templateName];
        if (submission) {
          switch (submission.status) {
            case 'PENDING':
              status = 'pending_review';
              break;
            case 'APPROVED':
              status = 'approved';
              break;
            case 'REJECTED':
              status = 'rejected';
              rejectReason = submission.reviewNote || '';
              break;
          }
          submissionId = submission.id;
        }
      }

      return {
        ...config,
        status,
        rejectReason,
        submissionId,
      };
    });

    // 提取退回的提交
    rejectedItems.value = todayTasks.value
      .filter(t => t.status === 'rejected')
      .map(t => ({
        id: t.submissionId,
        templateName: t.name,
        reason: t.rejectReason,
        rejectedAt: new Date().toISOString(),
        submissionId: t.submissionId,
      }));
  } catch (error) {
    console.error('加载今日任务状态失败:', error);
  }
}

// 重新提交处理
function handleResubmit(item) {
  console.log('重新提交:', item);
}

// 初始化
onMounted(async () => {
  loadingTasks.value = true;
  await loadTodayStatus();
  loadingTasks.value = false;
});
</script>

<style scoped>
.home {
  max-width: 100%;
}

/* 顶部状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.user-greeting {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
}

.greeting-text {
  color: #6b7280;
}

.username {
  font-weight: 600;
  color: #1f2937;
}

.dashboard-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.dashboard-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 26, 46, 0.3);
}

/* 主内容 */
.home-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 区块 */
.section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-header .link {
  font-size: 13px;
  color: var(--primary-600, #4f46e5);
  text-decoration: none;
}

.section-header .link:hover {
  text-decoration: underline;
}

/* 任务网格 */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* 加载占位 */
.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: #9ca3af;
}
</style>
