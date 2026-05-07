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
              <div v-for="dynamic in dynamics" :key="dynamic.id + dynamic.type" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex gap-3">
                  <AvatarText :username="userInfo.username" size="md" />
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <div class="font-medium">{{ userInfo.profile?.nickname || userInfo.username }}</div>
                      <n-tag size="small" :type="getTypeColor(dynamic.type)">
                        {{ getTypeName(dynamic.type) }}
                      </n-tag>
                    </div>
                    <div class="text-sm text-gray-500">{{ formatTime(dynamic.createdAt) }}</div>

                    <!-- 日记 -->
                    <div v-if="dynamic.type === 'diary'" class="mt-2">
                      <div class="font-medium text-gray-800">{{ dynamic.title }}</div>
                      <div class="text-sm text-gray-600 mt-1 line-clamp-3">{{ dynamic.content }}</div>
                    </div>

                    <!-- 作业 -->
                    <div v-if="dynamic.type === 'homework'" class="mt-2">
                      <div class="font-medium text-gray-800">{{ dynamic.title }}</div>
                      <div class="text-xs text-gray-500">{{ dynamic.subject }}</div>
                      <div class="text-sm text-gray-600 mt-1 line-clamp-2">{{ dynamic.content }}</div>
                    </div>

                    <!-- 笔记 -->
                    <div v-if="dynamic.type === 'note'" class="mt-2">
                      <div class="font-medium text-gray-800">{{ dynamic.title }}</div>
                      <div class="text-xs text-gray-500">{{ dynamic.subject }}</div>
                      <div class="text-sm text-gray-600 mt-1 line-clamp-2">{{ dynamic.content }}</div>
                    </div>

                    <!-- 作品 -->
                    <div v-if="dynamic.type === 'work'" class="mt-2">
                      <div class="font-medium text-gray-800">{{ dynamic.title }}</div>
                      <div class="text-sm text-gray-600 mt-1">{{ dynamic.description }}</div>
                      <div class="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>❤️ {{ dynamic._count?.likes || 0 }}</span>
                        <span>🔀 {{ dynamic._count?.forks || 0 }}</span>
                      </div>
                    </div>

                    <!-- 读书笔记 -->
                    <div v-if="dynamic.type === 'reading'" class="mt-2">
                      <div class="font-medium text-gray-800">📚 {{ dynamic.book?.title }}</div>
                      <div class="text-xs text-gray-500">{{ dynamic.chapterInfo || '全书' }} · 阅读 {{ dynamic.readPages }} 页</div>
                      <div class="text-sm text-gray-600 mt-1 line-clamp-2">{{ dynamic.content }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无动态" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="diaries" tab="日记">
            <div v-if="loadingDiaries" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="diaries.length > 0" class="space-y-3">
              <div v-for="diary in diaries" :key="diary.id" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ getMoodEmoji(diary.mood) }}</span>
                    <div>
                      <div class="font-medium text-gray-800">{{ diary.title }}</div>
                      <div class="text-xs text-gray-500">{{ formatTime(diary.createdAt) }} · {{ diary.weather }}</div>
                    </div>
                  </div>
                </div>
                <p class="text-sm text-gray-600 mt-2 line-clamp-3">{{ diary.content }}</p>
              </div>
            </div>
            <n-empty v-else description="暂无日记" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="homeworks" tab="作业">
            <div v-if="loadingHomeworks" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="homeworks.length > 0" class="space-y-3">
              <div v-for="homework in homeworks" :key="homework.id" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="font-medium text-gray-800">{{ homework.title }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ homework.subject }} · {{ formatTime(homework.createdAt) }}</div>
                <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ homework.content }}</p>
                <div v-if="homework.images && homework.images.length" class="grid grid-cols-3 gap-2 mt-2">
                  <img v-for="(img, idx) in homework.images.slice(0, 3)" :key="idx" :src="img" class="w-full h-20 object-cover rounded" />
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无作业" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="notes" tab="笔记">
            <div v-if="loadingNotes" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="notes.length > 0" class="space-y-3">
              <div v-for="note in notes" :key="note.id" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="font-medium text-gray-800">{{ note.title }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ note.subject }} · {{ formatTime(note.createdAt) }}</div>
                <p class="text-sm text-gray-600 mt-2 line-clamp-3">{{ note.content }}</p>
              </div>
            </div>
            <n-empty v-else description="暂无笔记" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="readings" tab="读书">
            <div v-if="loadingReadings" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="readingLogs.length > 0" class="space-y-3">
              <div v-for="log in readingLogs" :key="log.id" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex gap-3">
                  <img v-if="log.book?.cover" :src="log.book.cover" class="w-16 h-20 object-cover rounded" />
                  <div class="flex-1">
                    <div class="font-medium text-gray-800">{{ log.book?.title }}</div>
                    <div class="text-xs text-gray-500 mt-1">{{ log.book?.author }} · {{ formatTime(log.createdAt) }}</div>
                    <div class="text-xs text-gray-500 mt-1">{{ log.chapterInfo || '全书' }} · 阅读 {{ log.readPages }} 页</div>
                    <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ log.content }}</p>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无读书笔记" class="py-10" />
          </n-tab-pane>

          <n-tab-pane name="questions" tab="勤学好问">
            <div v-if="loadingQuestions" class="flex justify-center py-10">
              <n-spin />
            </div>
            <div v-else-if="questionsSummary.linked" class="space-y-4">
              <div class="flex gap-4 text-sm text-gray-600">
                <span>总提问 <strong>{{ questionsSummary.totalQuestions }}</strong> 次</span>
                <span>会话 <strong>{{ questionsSummary.chatCount }}</strong> 个</span>
              </div>
              <div v-if="questionsSummary.recentMessages?.length" class="space-y-2">
                <div class="text-sm font-medium text-gray-500">最近提问</div>
                <div v-for="(msg, i) in questionsSummary.recentMessages" :key="i" class="border border-gray-200 rounded-lg p-3">
                  <div class="text-sm text-gray-800 line-clamp-2">{{ msg.content }}</div>
                  <div class="text-xs text-gray-400 mt-1">{{ formatTime(msg.createdAt) }}</div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无提问记录" class="py-10" />
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

          <n-tab-pane v-if="isFriend" name="chat" tab="聊天">
            <div v-if="chatLoading" class="flex justify-center py-10"><n-spin /></div>
            <template v-else>
              <div class="chat-messages" ref="chatListRef">
                <div v-if="chatMessages.length === 0" class="text-center text-gray-400 py-10">暂无消息，发一条吧</div>
                <div v-for="msg in chatMessages" :key="msg.id" class="mb-3" :class="msg.fromUserId === authStore.user?.id ? 'text-right' : 'text-left'">
                  <div class="inline-block max-w-[70%] px-3 py-2 rounded-lg text-sm" :class="msg.fromUserId === authStore.user?.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-800'">
                    {{ msg.content }}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">{{ formatTime(msg.createdAt) }}</div>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <n-input v-model:value="chatInput" placeholder="输入消息..." @keyup.enter="sendChatMessage" />
                <n-button type="primary" :loading="chatSending" :disabled="!chatInput.trim()" @click="sendChatMessage">发送</n-button>
              </div>
            </template>
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
import { useMessage, NTag } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import api, { imessageAPI } from '@/api';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'
import PersonAdd from '@vicons/ionicons5/es/PersonAdd'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import GitBranchOutline from '@vicons/ionicons5/es/GitBranchOutline'

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
const diaries = ref([]);
const homeworks = ref([]);
const notes = ref([]);
const readingLogs = ref([]);
const questionsSummary = ref({});
const loadingDynamics = ref(false);
const loadingWorks = ref(false);
const loadingAchievements = ref(false);
const loadingDiaries = ref(false);
const loadingHomeworks = ref(false);
const loadingNotes = ref(false);
const loadingReadings = ref(false);
const loadingQuestions = ref(false);
const chatMessages = ref([]);
const chatInput = ref('');
const chatLoading = ref(false);
const chatSending = ref(false);

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

// 加载动态（聚合所有内容）
async function loadDynamics() {
  loadingDynamics.value = true;
  try {
    const data = await api.get(`/users/${userId.value}/dynamics`);
    dynamics.value = data.dynamics || [];
  } catch (error) {
    console.error('加载动态失败:', error);
    dynamics.value = [];
  } finally {
    loadingDynamics.value = false;
  }
}

// 加载日记
async function loadDiaries() {
  loadingDiaries.value = true;
  try {
    const data = await api.get(`/users/${userId.value}/diaries`);
    diaries.value = data.diaries || [];
  } catch (error) {
    console.error('加载日记失败:', error);
    diaries.value = [];
  } finally {
    loadingDiaries.value = false;
  }
}

// 加载作业
async function loadHomeworks() {
  loadingHomeworks.value = true;
  try {
    const data = await api.get(`/users/${userId.value}/homeworks`);
    homeworks.value = data.homeworks || [];
  } catch (error) {
    console.error('加载作业失败:', error);
    homeworks.value = [];
  } finally {
    loadingHomeworks.value = false;
  }
}

// 加载笔记
async function loadNotes() {
  loadingNotes.value = true;
  try {
    const data = await api.get(`/users/${userId.value}/notes`);
    notes.value = data.notes || [];
  } catch (error) {
    console.error('加载笔记失败:', error);
    notes.value = [];
  } finally {
    loadingNotes.value = false;
  }
}

// 加载读书笔记
async function loadReadingLogs() {
  loadingReadings.value = true;
  try {
    const data = await api.get(`/users/${userId.value}/reading-logs`);
    readingLogs.value = data.readingLogs || [];
  } catch (error) {
    console.error('加载读书笔记失败:', error);
    readingLogs.value = [];
  } finally {
    loadingReadings.value = false;
  }
}

// 加载提问摘要
async function loadQuestions() {
  loadingQuestions.value = true;
  try {
    const res = await imessageAPI.getUserSummary(userId.value);
    questionsSummary.value = res.success ? res.data : {};
  } catch {
    questionsSummary.value = {};
  } finally {
    loadingQuestions.value = false;
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

// 发送消息 - 切换到聊天tab
function handleSendMessage() {
  if (!isFriend.value) {
    message.warning('只能向好友发送消息');
    return;
  }
  activeTab.value = 'chat';
}

// 加载聊天记录
async function loadChatMessages() {
  chatLoading.value = true;
  try {
    const data = await api.get(`/messages/${userId.value}`);
    chatMessages.value = data.messages || [];
  } catch (e) {
    chatMessages.value = [];
  } finally {
    chatLoading.value = false;
  }
}

// 发送聊天消息
async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatSending.value = true;
  try {
    chatStore.sendMessage(userId.value, text);
    chatMessages.value.push({
      id: Date.now(),
      fromUserId: authStore.user.id,
      toUserId: userId.value,
      content: text,
      createdAt: new Date().toISOString()
    });
    chatInput.value = '';
  } catch (e) {
    message.error('发送失败');
  } finally {
    chatSending.value = false;
  }
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

// 获取内容类型名称
function getTypeName(type) {
  const names = {
    diary: '日记',
    homework: '作业',
    note: '笔记',
    work: '作品',
    reading: '读书'
  };
  return names[type] || type;
}

// 获取内容类型颜色
function getTypeColor(type) {
  const colors = {
    diary: 'warning',
    homework: 'info',
    note: 'success',
    work: 'primary',
    reading: 'default'
  };
  return colors[type] || 'default';
}

// 获取心情emoji
function getMoodEmoji(mood) {
  const emojis = {
    happy: '😊',
    neutral: '😐',
    sad: '😢',
    angry: '😠',
    tired: '😴'
  };
  return emojis[mood] || '😊';
}

// 监听Tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'dynamics' && dynamics.value.length === 0) {
    loadDynamics();
  } else if (newTab === 'diaries' && diaries.value.length === 0) {
    loadDiaries();
  } else if (newTab === 'homeworks' && homeworks.value.length === 0) {
    loadHomeworks();
  } else if (newTab === 'notes' && notes.value.length === 0) {
    loadNotes();
  } else if (newTab === 'readings' && readingLogs.value.length === 0) {
    loadReadingLogs();
  } else if (newTab === 'questions' && !questionsSummary.value.linked) {
    loadQuestions();
  } else if (newTab === 'works' && works.value.length === 0) {
    loadWorks();
  } else if (newTab === 'achievements' && achievements.value.length === 0) {
    loadAchievements();
  } else if (newTab === 'chat') {
    loadChatMessages();
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
  diaries.value = [];
  homeworks.value = [];
  notes.value = [];
  readingLogs.value = [];
  questionsSummary.value = {};
  chatMessages.value = [];
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

.chat-messages {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}
</style>
