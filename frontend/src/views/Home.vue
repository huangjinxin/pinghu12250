<template>
  <div class="space-y-6">
    <!-- 欢迎区域 -->
    <div class="card card-clickable bg-gradient-to-r from-primary-500 to-primary-600 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-2">
            {{ greeting }}，{{ authStore.user?.profile?.nickname || authStore.user?.username }}！
          </h1>
          <p class="text-primary-100">
            你已经加入 <span class="font-semibold text-white">{{ joinedDays }}</span> 天了，继续加油！
          </p>
        </div>
        <div class="hidden sm:block">
          <n-statistic label="今日完成" :value="todayCompleted">
            <template #suffix>
              <span class="text-primary-100 text-sm">项</span>
            </template>
          </n-statistic>
        </div>
      </div>
    </div>

    <!-- 三栏布局 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- 左侧：今日待办 + 快捷操作 -->
      <div class="lg:col-span-3 space-y-6">
        <!-- 今日待办 -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-800">今日待办</h2>
            <n-badge :value="tasks.length" :max="99" type="warning" />
          </div>

          <n-skeleton v-if="loading.tasks" text :repeat="3" />
          <n-empty v-else-if="tasks.length === 0" description="暂无待办任务" size="small" />
          <div v-else class="space-y-2">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
            >
              <div class="flex items-start justify-between">
                <div class="font-medium text-sm text-gray-800 group-hover:text-primary-600">
                  {{ task.title }}
                </div>
                <n-tag size="small" :type="getTaskTagType(task)">
                  {{ getTaskStatus(task) }}
                </n-tag>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                截止：{{ formatDate(task.dueDate) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">快捷操作</h2>
          <div class="space-y-2">
            <router-link
              to="/diaries"
              class="flex items-center space-x-3 p-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <n-icon size="20"><CreateOutline /></n-icon>
              <span class="text-sm font-medium">写日记</span>
            </router-link>
            <router-link
              to="/homeworks"
              class="flex items-center space-x-3 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <n-icon size="20"><BookOutline /></n-icon>
              <span class="text-sm font-medium">记录作业</span>
            </router-link>
            <router-link
              to="/works/create"
              class="flex items-center space-x-3 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <n-icon size="20"><CodeSlashOutline /></n-icon>
              <span class="text-sm font-medium">创作作品</span>
            </router-link>
            <router-link
              to="/notes"
              class="flex items-center space-x-3 p-3 bg-accent-50 text-accent-700 rounded-lg hover:bg-accent-100 transition-colors"
            >
              <n-icon size="20"><DocumentTextOutline /></n-icon>
              <span class="text-sm font-medium">写笔记</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- 中间：双时间轴 -->
      <div class="lg:col-span-6">
        <div class="card">
          <n-tabs v-model:value="timelineType" type="line" animated>
            <n-tab-pane name="personal" tab="我的动态">
              <div class="pt-4">
                <n-skeleton v-if="loading.posts" text :repeat="5" />
                <n-empty v-else-if="posts.length === 0" description="暂无动态" />
                <div v-else class="space-y-4">
                  <div
                    v-for="post in posts"
                    :key="post.id"
                    class="p-4 border border-gray-100 rounded-xl hover:shadow-card transition-all"
                  >
                    <div class="flex items-start space-x-3">
                      <AvatarText :username="post.author?.username" size="md" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                          <span class="font-medium text-gray-800">
                            {{ post.author?.profile?.nickname || post.author?.username }}
                          </span>
                          <span class="text-xs text-gray-400">{{ formatDate(post.createdAt) }}</span>
                        </div>
                        <p class="mt-2 text-gray-700 whitespace-pre-wrap">{{ post.content }}</p>

                        <!-- 关联内容 -->
                        <div v-if="post.htmlWork" class="mt-3 p-3 bg-purple-50 rounded-lg">
                          <router-link
                            :to="`/works/${post.htmlWork.id}`"
                            class="flex items-center space-x-2 text-purple-700 font-medium hover:text-purple-800"
                          >
                            <n-icon><CodeSlashOutline /></n-icon>
                            <span>{{ post.htmlWork.title }}</span>
                          </router-link>
                        </div>

                        <!-- 互动 -->
                        <div class="flex items-center space-x-6 mt-3">
                          <button
                            class="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                            @click="toggleLike(post)"
                          >
                            <n-icon :component="post.isLiked ? Heart : HeartOutline" />
                            <span>{{ post._count?.likes || 0 }}</span>
                          </button>
                          <button class="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary-500 transition-colors">
                            <n-icon :component="ChatbubbleOutline" />
                            <span>{{ post._count?.comments || 0 }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>
            <n-tab-pane name="public" tab="公共动态">
              <div class="pt-4">
                <n-skeleton v-if="loading.posts" text :repeat="5" />
                <n-empty v-else-if="posts.length === 0" description="暂无公共动态" />
                <div v-else class="space-y-4">
                  <div
                    v-for="post in posts"
                    :key="post.id"
                    class="p-4 border border-gray-100 rounded-xl hover:shadow-card transition-all"
                  >
                    <div class="flex items-start space-x-3">
                      <AvatarText :username="post.author?.username" size="md" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                          <span class="font-medium text-gray-800">
                            {{ post.author?.profile?.nickname || post.author?.username }}
                          </span>
                          <span class="text-xs text-gray-400">{{ formatDate(post.createdAt) }}</span>
                        </div>
                        <p class="mt-2 text-gray-700 whitespace-pre-wrap">{{ post.content }}</p>

                        <div v-if="post.htmlWork" class="mt-3 p-3 bg-purple-50 rounded-lg">
                          <router-link
                            :to="`/works/${post.htmlWork.id}`"
                            class="flex items-center space-x-2 text-purple-700 font-medium hover:text-purple-800"
                          >
                            <n-icon><CodeSlashOutline /></n-icon>
                            <span>{{ post.htmlWork.title }}</span>
                          </router-link>
                        </div>

                        <div class="flex items-center space-x-6 mt-3">
                          <button
                            class="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                            @click="toggleLike(post)"
                          >
                            <n-icon :component="post.isLiked ? Heart : HeartOutline" />
                            <span>{{ post._count?.likes || 0 }}</span>
                          </button>
                          <button class="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary-500 transition-colors">
                            <n-icon :component="ChatbubbleOutline" />
                            <span>{{ post._count?.comments || 0 }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>

      <!-- 右侧：统计 + 热门作品 -->
      <div class="lg:col-span-3 space-y-6">
        <!-- 统计数据 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">我的数据</h2>
          <n-skeleton v-if="loading.stats" text :repeat="4" />
          <div v-else class="grid grid-cols-2 gap-3">
            <div class="text-center p-3 bg-primary-50 rounded-lg">
              <div class="text-2xl font-bold text-primary-600">{{ stats.diaryCount || 0 }}</div>
              <div class="text-xs text-gray-600 mt-1">日记</div>
            </div>
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{{ stats.htmlWorkCount || 0 }}</div>
              <div class="text-xs text-gray-600 mt-1">作品</div>
            </div>
            <div class="text-center p-3 bg-purple-50 rounded-lg">
              <div class="text-2xl font-bold text-purple-600">{{ stats.booksCount || 0 }}</div>
              <div class="text-xs text-gray-600 mt-1">书籍</div>
            </div>
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">{{ stats.totalLikes || 0 }}</div>
              <div class="text-xs text-gray-600 mt-1">点赞</div>
            </div>
          </div>
        </div>

        <!-- 学习热力图 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">学习热力图</h2>
          <Heatmap :data="heatmapData" />
        </div>

        <!-- 热门作品 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">热门作品</h2>
          <n-skeleton v-if="loading.works" text :repeat="3" />
          <n-empty v-else-if="popularWorks.length === 0" description="暂无作品" size="small" />
          <div v-else class="space-y-3">
            <router-link
              v-for="work in popularWorks"
              :key="work.id"
              :to="`/works/${work.id}`"
              class="block p-3 border border-gray-100 rounded-lg hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              <div class="font-medium text-sm text-gray-800 truncate">{{ work.title }}</div>
              <div class="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>{{ work.author?.username }}</span>
                <span class="flex items-center space-x-1">
                  <n-icon :component="Heart" class="text-red-500" />
                  <span>{{ work._count?.likes || 0 }}</span>
                </span>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { postAPI, taskAPI, statsAPI, htmlWorkAPI } from '@/api';
import {
  CreateOutline,
  BookOutline,
  CodeSlashOutline,
  DocumentTextOutline,
  HeartOutline,
  Heart,
  ChatbubbleOutline,
} from '@vicons/ionicons5';
import Heatmap from '@/components/Heatmap.vue';

const authStore = useAuthStore();

const timelineType = ref('personal');
const posts = ref([]);
const tasks = ref([]);
const stats = ref({});
const popularWorks = ref([]);
const heatmapData = ref({});
const todayCompleted = ref(0);

const loading = ref({
  posts: true,
  tasks: true,
  stats: true,
  works: true,
});


const joinedDays = computed(() => {
  return authStore.user?.profile?.joinedDays || 0;
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
});

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  }
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (year === now.getFullYear()) {
    return `${month}月${day}日`;
  }
  return `${year}年${month}月${day}日`;
};

const getTaskTagType = (task) => {
  const status = task.assignment?.status;
  if (status === 'COMPLETED') return 'success';
  if (status === 'OVERDUE') return 'error';
  return 'warning';
};

const getTaskStatus = (task) => {
  const status = task.assignment?.status;
  const labels = {
    PENDING: '待完成',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完成',
    OVERDUE: '已逾期',
  };
  return labels[status] || '待完成';
};

const toggleLike = async (post) => {
  // TODO: Implement like toggle
  post.isLiked = !post.isLiked;
};

const loadPosts = async () => {
  loading.value.posts = true;
  try {
    const response = await postAPI.getPosts({
      type: timelineType.value,
      limit: 10,
    });
    posts.value = response.posts || [];
  } catch (error) {
    console.error('加载动态失败:', error);
  } finally {
    loading.value.posts = false;
  }
};

const loadTasks = async () => {
  loading.value.tasks = true;
  try {
    const response = await taskAPI.getTasks();
    tasks.value = (response.tasks || []).filter(t => t.assignment?.status === 'PENDING').slice(0, 5);
  } catch (error) {
    console.error('加载任务失败:', error);
  } finally {
    loading.value.tasks = false;
  }
};

const loadStats = async () => {
  loading.value.stats = true;
  try {
    const data = await statsAPI.getOverview();
    stats.value = data;
  } catch (error) {
    console.error('加载统计失败:', error);
  } finally {
    loading.value.stats = false;
  }
};

const loadPopularWorks = async () => {
  loading.value.works = true;
  try {
    const response = await htmlWorkAPI.getWorks({ limit: 5 });
    popularWorks.value = response.works || [];
  } catch (error) {
    console.error('加载热门作品失败:', error);
  } finally {
    loading.value.works = false;
  }
};

const loadHeatmap = async () => {
  try {
    const data = await statsAPI.getHeatmap({ year: new Date().getFullYear() });
    heatmapData.value = data.heatmapData || data;
  } catch (error) {
    console.error('加载热力图失败:', error);
  }
};

watch(timelineType, loadPosts);

onMounted(() => {
  loadPosts();
  loadTasks();
  loadStats();
  loadPopularWorks();
  loadHeatmap();
});
</script>
