<template>
  <div class="space-y-6">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <n-spin size="large" />
    </div>

    <!-- 用户主页内容 -->
    <div v-else-if="userInfo">
      <!-- 用户信息卡片 -->
      <div class="card">
        <div class="flex flex-col md:flex-row gap-6">
          <!-- 左侧：头像 -->
          <div class="flex-shrink-0">
            <AvatarText :username="userInfo.username" size="lg" />
          </div>

          <!-- 右侧：用户信息 -->
          <div class="flex-1">
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 class="text-2xl font-bold text-gray-800">
                  {{ userInfo.profile?.nickname || userInfo.username }}
                </h1>
                <p class="text-gray-500 mt-1">@{{ userInfo.username }}</p>
                <p v-if="userInfo.profile?.bio" class="text-gray-600 mt-3">
                  {{ userInfo.profile.bio }}
                </p>
              </div>

              <!-- 操作按钮组 -->
              <div class="flex gap-2">
                <!-- 发消息按钮（仅好友可见） -->
                <n-button v-if="isFriend" type="primary" @click="handleSendMessage">
                  <template #icon>
                    <n-icon><ChatbubbleOutline /></n-icon>
                  </template>
                  发消息
                </n-button>

                <!-- 关注按钮 -->
                <n-button
                  v-if="!isCurrentUser"
                  :type="relationshipStatus.isFriend ? 'success' : relationshipStatus.isFollowing ? 'default' : 'primary'"
                  :loading="followLoading"
                  @click="handleFollowToggle"
                >
                  <template #icon>
                    <n-icon>
                      <PersonAdd v-if="!relationshipStatus.isFollowing" />
                      <CheckmarkCircleOutline v-else />
                    </n-icon>
                  </template>
                  {{ relationshipStatus.isFriend ? '好友' : relationshipStatus.isFollowing ? '已关注' : '关注' }}
                </n-button>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="flex gap-6 mt-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-primary-600">{{ userInfo.followingCount || 0 }}</div>
                <div class="text-sm text-gray-500">关注</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primary-600">{{ userInfo.followersCount || 0 }}</div>
                <div class="text-sm text-gray-500">粉丝</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primary-600">{{ userInfo.friendsCount || 0 }}</div>
                <div class="text-sm text-gray-500">好友</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab切换 -->
      <n-card>
        <n-tabs v-model:value="activeTab" type="line">
          <n-tab-pane name="dynamics" tab="动态">
            <!-- 动态列表 -->
            <div v-if="loadingDynamics" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="dynamics.length > 0" class="space-y-4">
              <div v-for="dynamic in dynamics" :key="dynamic.id" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex gap-3">
                  <AvatarText :username="userInfo.username" size="md" />
                  <div class="flex-1">
                    <div class="font-medium">{{ userInfo.profile?.nickname || userInfo.username }}</div>
                    <div class="text-sm text-gray-500">{{ formatTime(dynamic.createdAt) }}</div>
                    <div class="mt-2 text-gray-700">{{ dynamic.content }}</div>

                    <!-- 图片展示 -->
                    <div v-if="dynamic.images && dynamic.images.length" class="grid grid-cols-3 gap-2 mt-3">
                      <img
                        v-for="(img, idx) in dynamic.images"
                        :key="idx"
                        :src="img"
                        class="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                        @click="previewImage(img)"
                      />
                    </div>

                    <!-- 互动数据 -->
                    <div class="flex gap-4 mt-3 text-sm text-gray-500">
                      <span class="flex items-center gap-1">
                        <n-icon><HeartOutline /></n-icon>
                        {{ dynamic._count?.likes || 0 }}
                      </span>
                      <span class="flex items-center gap-1">
                        <n-icon><ChatbubbleOutline /></n-icon>
                        {{ dynamic._count?.comments || 0 }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无动态" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="works" tab="作品">
            <!-- 作品列表 -->
            <div v-if="loadingWorks" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="works.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="work in works"
                :key="work.id"
                class="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                @click="$router.push(`/works/${work.id}`)"
              >
                <!-- 预览缩略图 -->
                <div class="h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                  <iframe
                    :srcdoc="getPreviewHtml(work)"
                    class="w-full h-full border-0 pointer-events-none scale-50 origin-top-left"
                    style="width: 200%; height: 200%"
                  ></iframe>
                </div>

                <h3 class="font-medium text-gray-800 truncate">{{ work.title }}</h3>
                <div class="flex items-center gap-3 mt-2 text-sm text-gray-400">
                  <span class="flex items-center gap-1">
                    <n-icon size="14"><HeartOutline /></n-icon>
                    {{ work._count?.likes || 0 }}
                  </span>
                  <span class="flex items-center gap-1">
                    <n-icon size="14"><GitBranchOutline /></n-icon>
                    {{ work._count?.forks || 0 }}
                  </span>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无作品" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="achievements" tab="成就">
            <!-- 成就墙 -->
            <div v-if="loadingAchievements" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="achievements.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                v-for="achievement in achievements"
                :key="achievement.id"
                class="border border-gray-200 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer"
                :class="{
                  'bg-gradient-to-br from-yellow-50 to-orange-50': achievement.achievement.rarity === 'LEGENDARY',
                  'bg-gradient-to-br from-purple-50 to-pink-50': achievement.achievement.rarity === 'EPIC',
                  'bg-gradient-to-br from-blue-50 to-cyan-50': achievement.achievement.rarity === 'RARE'
                }"
                @click="$router.push(`/achievements/${achievement.achievement.id}`)"
              >
                <div class="text-4xl mb-2">{{ achievement.achievement.icon }}</div>
                <div class="font-medium text-gray-800">{{ achievement.achievement.name }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ achievement.achievement.description }}</div>
                <div class="text-xs text-gray-400 mt-2">
                  {{ formatDate(achievement.unlockedAt) }}
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无成就" class="py-10" />
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </div>

    <!-- 用户不存在 -->
    <n-empty v-else description="用户不存在" class="py-20">
      <template #extra>
        <n-button @click="$router.push('/')">返回首页</n-button>
      </template>
    </n-empty>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import api from '@/api';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChatbubbleOutline,
  PersonAdd,
  CheckmarkCircleOutline,
  HeartOutline,
  GitBranchOutline
} from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const chatStore = useChatStore();

const userId = computed(() => route.params.userId);
const loading = ref(false);
const userInfo = ref(null);
const activeTab = ref('dynamics');
const relationshipStatus = ref({
  isFollowing: false,
  isFollowedBy: false,
  isFriend: false
});
const followLoading = ref(false);

// 动态、作品、成就数据
const dynamics = ref([]);
const works = ref([]);
const achievements = ref([]);
const loadingDynamics = ref(false);
const loadingWorks = ref(false);
const loadingAchievements = ref(false);

const isCurrentUser = computed(() => userInfo.value?.id === authStore.user?.id);
const isFriend = computed(() => relationshipStatus.value.isFriend);

// 加载用户信息
async function loadUserInfo() {
  loading.value = true;
  try {
    const data = await api.get(`/users/${userId.value}`);
    userInfo.value = data;
  } catch (error) {
    console.error('加载用户信息失败:', error);
    message.error('加载用户信息失败');
    userInfo.value = null;
  } finally {
    loading.value = false;
  }
}

// 加载关系状态
async function loadRelationshipStatus() {
  if (isCurrentUser.value) return;

  try {
    const data = await api.get(`/follows/status/${userId.value}`);
    relationshipStatus.value = data;
  } catch (error) {
    console.error('加载关系状态失败:', error);
  }
}

// 加载动态
async function loadDynamics() {
  loadingDynamics.value = true;
  try {
    const data = await api.get(`/users/${userId.value}/dynamics`);
    dynamics.value = data.dynamics || data.posts || data || [];
  } catch (error) {
    console.error('加载动态失败:', error);
    dynamics.value = [];
  } finally {
    loadingDynamics.value = false;
  }
}

// 加载作品
async function loadWorks() {
  loadingWorks.value = true;
  try {
    const data = await api.get(`/html-works`, {
      params: {
        authorId: userId.value,
        page: 1,
        limit: 12
      }
    });
    works.value = data.works || data || [];
  } catch (error) {
    console.error('加载作品失败:', error);
    works.value = [];
  } finally {
    loadingWorks.value = false;
  }
}

// 加载成就
async function loadAchievements() {
  loadingAchievements.value = true;
  try {
    const data = await api.get(`/achievements/user/${userId.value}`);
    achievements.value = data.achievements || data || [];
  } catch (error) {
    console.error('加载成就失败:', error);
    achievements.value = [];
  } finally {
    loadingAchievements.value = false;
  }
}

// 关注/取消关注
async function handleFollowToggle() {
  followLoading.value = true;
  try {
    if (relationshipStatus.value.isFollowing) {
      // 取消关注
      await api.delete(`/follows/${userId.value}`);
      message.success('已取消关注');
      relationshipStatus.value.isFollowing = false;
      relationshipStatus.value.isFriend = false;
    } else {
      // 关注
      const data = await api.post(`/follows/${userId.value}`);
      if (data.isFriend) {
        message.success('关注成功，你们已成为好友！');
        relationshipStatus.value.isFriend = true;
      } else {
        message.success('关注成功');
      }
      relationshipStatus.value.isFollowing = true;
    }

    // 刷新用户信息（更新粉丝数等）
    loadUserInfo();
  } catch (error) {
    console.error('操作失败:', error);
    message.error(error.error || '操作失败');
  } finally {
    followLoading.value = false;
  }
}

// 发送消息
function handleSendMessage() {
  if (!isFriend.value) {
    message.warning('只能向好友发送消息');
    return;
  }

  // 打开聊天窗口
  chatStore.openChat({
    id: userInfo.value.id,
    username: userInfo.value.username,
    avatar: userInfo.value.avatar,
    nickname: userInfo.value.profile?.nickname
  });

  message.success('已打开聊天窗口');
}

// 格式化时间
function formatTime(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
}

function formatDate(date) {
  return format(new Date(date), 'yyyy年M月d日', { locale: zhCN });
}

// 预览图片
function previewImage(url) {
  window.open(url, '_blank');
}

// 生成作品预览HTML
function getPreviewHtml(work) {
  return `<!DOCTYPE html><html><head><style>${work.cssCode || ''}</style></head><body>${work.htmlCode || ''}</body></html>`;
}

// 监听Tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'dynamics' && dynamics.value.length === 0) {
    loadDynamics();
  } else if (newTab === 'works' && works.value.length === 0) {
    loadWorks();
  } else if (newTab === 'achievements' && achievements.value.length === 0) {
    loadAchievements();
  }
});

// 监听路由参数变化
watch(userId, () => {
  loadUserInfo();
  loadRelationshipStatus();
  // 重置数据
  dynamics.value = [];
  works.value = [];
  achievements.value = [];
  activeTab.value = 'dynamics';
});

onMounted(() => {
  loadUserInfo();
  loadRelationshipStatus();
  loadDynamics(); // 默认加载动态
});
</script>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
