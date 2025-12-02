<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学习时间追踪</h1>
        <p class="text-gray-500 mt-1">记录你的学习时光，见证成长轨迹</p>
      </div>
      <div class="flex space-x-2">
        <n-button @click="router.push('/learning-stats')">
          <template #icon>
            <n-icon><StatsChartOutline /></n-icon>
          </template>
          查看统计
        </n-button>
        <n-button type="primary" @click="showProjectModal = true">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          创建学习项目
        </n-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-blue-600 font-medium">今日学习</p>
            <p class="text-3xl font-bold text-blue-700 mt-1">{{ formatDuration(stats.todayDuration) }}</p>
          </div>
          <div class="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center">
            <n-icon size="28" color="#2563eb"><TimeOutline /></n-icon>
          </div>
        </div>
      </div>

      <div class="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-green-600 font-medium">本周学习</p>
            <p class="text-3xl font-bold text-green-700 mt-1">{{ formatDuration(stats.weekDuration) }}</p>
          </div>
          <div class="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center">
            <n-icon size="28" color="#16a34a"><CalendarOutline /></n-icon>
          </div>
        </div>
      </div>

      <div class="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-purple-600 font-medium">累计学习</p>
            <p class="text-3xl font-bold text-purple-700 mt-1">{{ formatDuration(stats.totalDuration) }}</p>
          </div>
          <div class="w-14 h-14 bg-purple-200 rounded-full flex items-center justify-center">
            <n-icon size="28" color="#9333ea"><TrophyOutline /></n-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 正在学习中 -->
    <div v-if="activeTimer" class="card bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <n-icon size="24"><PlayCircleOutline /></n-icon>
          </div>
          <div>
            <p class="text-white/80 text-sm">正在学习</p>
            <p class="text-xl font-bold">{{ activeTimer.project?.name }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-right">
            <p class="text-3xl font-bold font-mono">{{ currentTimerDisplay }}</p>
            <p class="text-white/80 text-sm">{{ activeTimer.mode === 'POMODORO' ? '番茄钟模式' : '自由计时' }}</p>
          </div>
          <n-button size="large" @click="goToTimer">
            查看详情
          </n-button>
        </div>
      </div>
    </div>

    <!-- 标签页 -->
    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 我的项目 -->
      <n-tab-pane name="projects" tab="我的项目">
        <div class="mt-4">
          <n-empty v-if="projects.length === 0" description="还没有学习项目，点击右上角创建一个吧！" />
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="project in projects"
              :key="project.id"
              class="card hover:shadow-lg transition-all cursor-pointer"
              @click="startLearning(project)"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center"
                    :style="{ backgroundColor: project.color + '20', color: project.color }"
                  >
                    <n-icon size="20"><BookOutline /></n-icon>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ project.name }}</h3>
                    <p class="text-xs text-gray-500">{{ project.category }}</p>
                  </div>
                </div>
                <n-dropdown :options="projectActions(project)" @select="handleProjectAction($event, project)">
                  <n-button text>
                    <n-icon><EllipsisVerticalOutline /></n-icon>
                  </n-button>
                </n-dropdown>
              </div>
              <div class="flex items-center justify-between text-sm">
                <div class="text-gray-600">
                  <span class="font-medium">{{ formatDuration(project.totalDuration) }}</span>
                  <span class="text-gray-400 mx-1">·</span>
                  <span>{{ project.sessionCount }} 次</span>
                </div>
                <n-button size="small" type="primary" @click.stop="startLearning(project)">
                  开始学习
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- 学习动态 -->
      <n-tab-pane name="feed" tab="学习动态">
        <div class="mt-4 space-y-4">
          <n-empty v-if="sessions.length === 0" description="还没有学习动态" />
          <div
            v-for="session in sessions"
            :key="session.id"
            class="card hover:shadow-md transition-shadow"
          >
            <div class="flex items-start space-x-3">
              <AvatarText :username="session.user?.username" size="md" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="font-semibold text-gray-800">{{ session.user?.username }}</span>
                  <span class="text-gray-400">·</span>
                  <span class="text-sm text-gray-500">{{ formatTime(session.createdAt) }}</span>
                </div>
                <div class="flex items-center space-x-2 mb-2">
                  <n-tag
                    size="small"
                    :bordered="false"
                    :style="{ backgroundColor: session.project?.color + '20', color: session.project?.color }"
                  >
                    {{ session.project?.name }}
                  </n-tag>
                  <n-tag size="small" type="info">
                    {{ session.mode === 'POMODORO' ? '番茄钟' : '自由计时' }}
                  </n-tag>
                  <span class="text-sm font-medium text-blue-600">{{ formatDuration(session.duration) }}</span>
                </div>
                <p class="text-gray-700 text-sm mb-2">{{ session.content }}</p>
                <div v-if="session.tags && session.tags.length > 0" class="flex flex-wrap gap-1 mb-2">
                  <n-tag v-for="tag in session.tags" :key="tag" size="small" :bordered="false">
                    {{ tag }}
                  </n-tag>
                </div>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <button
                    class="flex items-center space-x-1 hover:text-red-500 transition-colors"
                    :class="{ 'text-red-500': session.isLiked }"
                    @click="toggleLike(session)"
                  >
                    <n-icon size="18">
                      <HeartOutline v-if="!session.isLiked" />
                      <Heart v-else />
                    </n-icon>
                    <span>{{ session.likesCount || 0 }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="text-center">
            <n-button @click="loadMoreSessions" :loading="loadingMore">
              加载更多
            </n-button>
          </div>
        </div>
      </n-tab-pane>

      <!-- 学习统计 -->
      <n-tab-pane name="stats" tab="学习统计">
        <div class="mt-4 space-y-6">
          <!-- 项目时长占比 -->
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">项目时长占比</h3>
            <div class="space-y-3">
              <div v-for="project in stats.projectStats" :key="project.id" class="flex items-center">
                <span class="w-24 text-sm text-gray-600 truncate">{{ project.name }}</span>
                <div class="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden mx-3">
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{
                      width: `${(project.totalDuration / stats.totalDuration * 100) || 0}%`,
                      backgroundColor: project.color
                    }"
                  ></div>
                </div>
                <span class="w-20 text-sm text-gray-600 text-right">
                  {{ formatDuration(project.totalDuration) }}
                </span>
              </div>
              <n-empty v-if="stats.projectStats?.length === 0" description="暂无数据" size="small" />
            </div>
          </div>

          <!-- 学习排行榜 -->
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">本周学习排行榜</h3>
            <div class="space-y-3">
              <div
                v-for="(user, index) in leaderboard"
                :key="user.user.id"
                class="flex items-center space-x-3"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                  :class="{
                    'bg-yellow-100 text-yellow-600': index === 0,
                    'bg-gray-100 text-gray-600': index === 1,
                    'bg-orange-100 text-orange-600': index === 2,
                    'bg-blue-50 text-blue-600': index > 2
                  }"
                >
                  {{ index + 1 }}
                </div>
                <AvatarText :username="session.user?.username" size="md" />
                <span class="flex-1 text-gray-800">{{ user.user.username }}</span>
                <span class="font-semibold text-blue-600">{{ formatDuration(user.totalDuration) }}</span>
              </div>
              <n-empty v-if="leaderboard.length === 0" description="暂无数据" size="small" />
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- 创建项目弹窗 -->
    <n-modal v-model:show="showProjectModal" preset="card" title="创建学习项目" style="max-width: 500px">
      <n-form ref="projectFormRef" :model="projectForm" :rules="projectRules">
        <n-form-item label="项目名称" path="name">
          <n-input v-model:value="projectForm.name" placeholder="如：可汗学院数学" />
        </n-form-item>
        <n-form-item label="学习分类" path="category">
          <n-select v-model:value="projectForm.category" :options="categoryOptions" placeholder="选择分类" />
        </n-form-item>
        <n-form-item label="项目颜色" path="color">
          <div class="flex space-x-2">
            <div
              v-for="color in colorOptions"
              :key="color"
              class="w-10 h-10 rounded-lg cursor-pointer border-2 transition-all"
              :class="{ 'border-gray-800 scale-110': projectForm.color === color, 'border-transparent': projectForm.color !== color }"
              :style="{ backgroundColor: color }"
              @click="projectForm.color = color"
            ></div>
          </div>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end space-x-2">
          <n-button @click="showProjectModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreateProject" :loading="creating">创建</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { learningAPI } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  AddOutline,
  TimeOutline,
  CalendarOutline,
  TrophyOutline,
  PlayCircleOutline,
  BookOutline,
  EllipsisVerticalOutline,
  HeartOutline,
  Heart,
  HeartCircleOutline,
  StatsChartOutline
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const activeTab = ref('projects');
const projects = ref([]);
const sessions = ref([]);
const stats = ref({
  todayDuration: 0,
  weekDuration: 0,
  totalDuration: 0,
  projectStats: [],
});
const leaderboard = ref([]);
const activeTimer = ref(null);
const currentTimerDisplay = ref('00:00:00');
let timerInterval = null;

const showProjectModal = ref(false);
const projectForm = ref({
  name: '',
  category: '',
  color: '#3B82F6',
});
const projectFormRef = ref(null);
const creating = ref(false);

const sessionPage = ref(1);
const hasMore = ref(true);
const loadingMore = ref(false);

const categoryOptions = [
  { label: '数学', value: '数学' },
  { label: '语言', value: '语言' },
  { label: '编程', value: '编程' },
  { label: '阅读', value: '阅读' },
  { label: '科学', value: '科学' },
  { label: '艺术', value: '艺术' },
  { label: '其他', value: '其他' },
];

const colorOptions = [
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // yellow
  '#EF4444', // red
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

const projectRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
};

const formatDuration = (minutes) => {
  if (!minutes) return '0分钟';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

const formatTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

const updateTimerDisplay = () => {
  if (!activeTimer.value) return;
  const now = new Date();
  const start = new Date(activeTimer.value.startTime);
  const diff = Math.floor((now - start) / 1000); // 秒
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  currentTimerDisplay.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const loadProjects = async () => {
  try {
    const data = await learningAPI.getProjects();
    projects.value = data.projects || [];
  } catch (error) {
    message.error('加载项目失败');
  }
};

const loadStats = async () => {
  try {
    const data = await learningAPI.getStats();
    stats.value = data;
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

const loadLeaderboard = async () => {
  try {
    const data = await learningAPI.getLeaderboard();
    leaderboard.value = data.leaderboard || [];
  } catch (error) {
    console.error('加载排行榜失败:', error);
  }
};

const loadActiveTimer = async () => {
  try {
    const data = await learningAPI.getActiveTimer();
    activeTimer.value = data.timer;
    if (activeTimer.value) {
      updateTimerDisplay();
      timerInterval = setInterval(updateTimerDisplay, 1000);
    }
  } catch (error) {
    console.error('加载计时器失败:', error);
  }
};

const loadSessions = async (loadMore = false) => {
  try {
    if (loadMore) {
      loadingMore.value = true;
    }
    const data = await learningAPI.getFeed({ page: sessionPage.value, pageSize: 10 });
    if (loadMore) {
      sessions.value = [...sessions.value, ...(data.sessions || [])];
    } else {
      sessions.value = data.sessions || [];
    }
    hasMore.value = sessions.value.length < data.total;
  } catch (error) {
    message.error('加载学习动态失败');
  } finally {
    loadingMore.value = false;
  }
};

const loadMoreSessions = () => {
  sessionPage.value++;
  loadSessions(true);
};

const handleCreateProject = async () => {
  try {
    await projectFormRef.value?.validate();
    creating.value = true;
    await learningAPI.createProject(projectForm.value);
    message.success('项目创建成功');
    showProjectModal.value = false;
    projectForm.value = { name: '', category: '', color: '#3B82F6' };
    loadProjects();
  } catch (error) {
    if (error.message) {
      message.error(error.message);
    }
  } finally {
    creating.value = false;
  }
};

const startLearning = async (project) => {
  if (activeTimer.value) {
    message.warning('已有进行中的学习计时，请先完成或停止');
    return;
  }
  try {
    await learningAPI.startTimer({ projectId: project.id, mode: 'FREE' });
    message.success('开始学习计时');
    router.push(`/timer/${project.id}`);
  } catch (error) {
    message.error(error.error || '开始学习失败');
  }
};

const goToTimer = () => {
  if (activeTimer.value) {
    router.push(`/timer/${activeTimer.value.projectId}`);
  }
};

const toggleLike = async (session) => {
  try {
    const data = await learningAPI.toggleSessionLike(session.id);
    session.isLiked = data.isLiked;
    session.likesCount = (session.likesCount || 0) + (data.isLiked ? 1 : -1);
  } catch (error) {
    message.error('操作失败');
  }
};

const projectActions = (project) => [
  {
    label: '编辑',
    key: 'edit',
  },
  {
    label: '删除',
    key: 'delete',
  },
];

const handleProjectAction = async (key, project) => {
  if (key === 'delete') {
    try {
      await learningAPI.deleteProject(project.id);
      message.success('项目已删除');
      loadProjects();
    } catch (error) {
      message.error('删除失败');
    }
  }
};

onMounted(() => {
  loadProjects();
  loadStats();
  loadLeaderboard();
  loadSessions();
  loadActiveTimer();
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>
