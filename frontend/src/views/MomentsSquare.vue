<template>
  <div class="moments-square">
    <!-- 顶部区域 -->
    <div class="square-header">
      <div class="header-content">
        <h1>学习圈</h1>
        <p class="subtitle">看看大家的学习成果</p>
      </div>
      <div class="header-actions">
        <n-button @click="showFriendManager = true">
          <template #icon><n-icon><PersonAdd /></n-icon></template>
          学伴管理
        </n-button>
        <n-button type="primary" @click="showPublish = true">
          <template #icon><n-icon><CameraOutline /></n-icon></template>
          分享成果
        </n-button>
      </div>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <div
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: currentFilter === tab.value }"
        @click="currentFilter = tab.value"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 动态列表 -->
    <template v-if="currentFilter !== 'works' && currentFilter !== 'leaderboard'">
      <n-spin :show="loading">
        <!-- 统一动态视图（包含所有类型） -->
        <template v-if="currentFilter === 'all'">
          <div class="unified-list" v-if="moments.length > 0">
            <template v-for="item in moments" :key="`${item.type}-${item.id}`">
              <!-- 普通动态/照片 -->
              <div v-if="item.type === 'post' || item.type === 'photo'" class="unified-card" @click="goToMomentDetail(item)">
                <div class="unified-header">
                  <n-avatar :src="item.author?.avatar" :size="40" round />
                  <div class="unified-author">
                    <span class="name">{{ item.author?.name }}</span>
                    <span class="time">{{ formatTime(item.createdAt) }}</span>
                  </div>
                  <span v-if="item.mood" class="mood">{{ getMoodEmoji(item.mood) }}</span>
                  <n-tag v-if="item.photoType" size="tiny" :bordered="false">{{ getPhotoTypeLabel(item.photoType) }}</n-tag>
                </div>
                <p v-if="item.content" class="unified-text">{{ item.content }}</p>
                <div v-if="item.images?.length > 0" class="unified-images">
                  <img :src="item.images[0]" />
                  <span v-if="item.images.length > 1" class="image-count">+{{ item.images.length - 1 }}</span>
                </div>
                <div class="unified-stats">
                  <span><n-icon><Heart /></n-icon> {{ item.likesCount || 0 }}</span>
                  <span><n-icon><ChatbubbleOutline /></n-icon> {{ item.commentsCount || 0 }}</span>
                </div>
              </div>

              <!-- 作品类型（gallery, recitation, diary-analysis, poetry） -->
              <div v-else class="work-card" @click="openDetail(item)">
                <div class="work-card-inner">
                  <div v-if="item.preview || item.images?.[0]" class="work-preview">
                    <img :src="item.preview || item.images[0]" />
                  </div>
                  <div v-else class="work-icon" :class="getWorkTypeClass(item.type)">
                    <n-icon :size="28">
                      <component :is="getWorkTypeIcon(item.type)" />
                    </n-icon>
                  </div>
                  <div class="work-content">
                    <div class="work-header">
                      <n-tag :type="getWorkTagType(item.type)" size="small">
                        {{ getWorkTypeName(item.type) }}
                      </n-tag>
                      <span v-if="item.meta?.category" class="work-category">
                        {{ item.meta.categoryIcon }} {{ item.meta.category }}
                      </span>
                    </div>
                    <h4 class="work-title">{{ item.title }}</h4>
                    <p v-if="item.content" class="work-desc">{{ item.content }}</p>
                    <div class="work-footer">
                      <div class="work-author">
                        <AvatarText :username="item.author?.name" size="xs" />
                        <span>{{ item.author?.name }}</span>
                      </div>
                      <span class="work-time">{{ formatTime(item.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="hasMore" class="load-more" @click="loadMore">
              <n-spin v-if="loadingMore" size="small" />
              <span v-else>加载更多</span>
            </div>
          </div>
          <n-empty v-else-if="!loading" description="还没有动态" />
        </template>

        <!-- 照片/关注视图（使用原有分组逻辑） -->
        <template v-else>
          <div class="moments-list" v-if="groupedMoments.length > 0">
            <template v-for="group in groupedMoments" :key="group.authorId">
              <div class="user-group" v-if="group.moments.length > 0">
                <MomentCard
                  :moment="group.moments[0]"
                  :current-user-id="currentUserId"
                  @refresh="loadMoments"
                  @deleted="handleDeleted"
                />
                <template v-if="group.moments.length > 1">
                  <div v-if="!expandedUsers.has(group.authorId)" class="folded-hint" @click="expandUser(group.authorId)">
                    <n-avatar :src="group.author?.avatar" :size="24" round />
                    <span>{{ group.author?.profile?.nickname || group.author?.username }} 还有 {{ group.moments.length - 1 }} 条动态</span>
                    <n-icon><ChevronDown /></n-icon>
                  </div>
                  <template v-else>
                    <MomentCard
                      v-for="moment in group.moments.slice(1)"
                      :key="moment.id"
                      :moment="moment"
                      :current-user-id="currentUserId"
                      @refresh="loadMoments"
                      @deleted="handleDeleted"
                    />
                    <div class="collapse-hint" @click="collapseUser(group.authorId)">
                      <span>收起</span>
                      <n-icon><ChevronUp /></n-icon>
                    </div>
                  </template>
                </template>
              </div>
            </template>

            <div v-if="hasMore" class="load-more" @click="loadMore">
              <n-spin v-if="loadingMore" size="small" />
              <span v-else>加载更多</span>
            </div>
          </div>
          <n-empty v-else-if="!loading" description="还没有动态，快来发布第一条吧" />
        </template>
      </n-spin>
    </template>

    <!-- 作品动态列表 -->
    <template v-else-if="currentFilter === 'works'">
      <n-spin :show="worksLoading">
        <div v-if="worksFeed.length > 0" class="works-list">
          <div
            v-for="item in worksFeed"
            :key="`${item.type}-${item.id}`"
            class="work-card"
            @click="openDetail(item)"
          >
            <div class="work-card-inner">
              <!-- 预览图/图标 -->
              <div v-if="item.preview" class="work-preview">
                <img :src="item.preview" />
              </div>
              <div v-else class="work-icon" :class="getWorkTypeClass(item.type)">
                <n-icon :size="28">
                  <component :is="getWorkTypeIcon(item.type)" />
                </n-icon>
              </div>

              <!-- 内容 -->
              <div class="work-content">
                <div class="work-header">
                  <n-tag :type="getWorkTagType(item.type)" size="small">
                    {{ getWorkTypeName(item.type) }}
                  </n-tag>
                  <span v-if="item.meta?.category" class="work-category">
                    {{ item.meta.categoryIcon }} {{ item.meta.category }}
                  </span>
                </div>
                <h4 class="work-title">{{ item.title }}</h4>
                <p v-if="item.content" class="work-desc">{{ item.content }}</p>

                <!-- 作者和时间 -->
                <div class="work-footer">
                  <div class="work-author">
                    <AvatarText :username="item.author?.name" size="xs" />
                    <span>{{ item.author?.name }}</span>
                  </div>
                  <span class="work-time">{{ formatTime(item.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="worksHasMore" class="load-more" @click="loadMoreWorks">
            <n-spin v-if="worksLoadingMore" size="small" />
            <span v-else>加载更多</span>
          </div>
        </div>
        <n-empty v-else-if="!worksLoading" description="暂无作品动态" />
      </n-spin>
    </template>

    <!-- 排行榜 -->
    <template v-else-if="currentFilter === 'leaderboard'">
      <div class="leaderboard-section">
        <n-tabs v-model:value="lbDimension" type="segment" size="small" @update:value="loadLeaderboard">
          <n-tab-pane name="points" tab="积分" />
          <n-tab-pane name="diary" tab="日记" />
          <n-tab-pane name="streak" tab="连续" />
          <n-tab-pane name="learning" tab="学习" />
          <n-tab-pane name="works" tab="作品" />
          <n-tab-pane name="questions" tab="好问" />
        </n-tabs>
        <div class="lb-period">
          <n-radio-group v-model:value="lbPeriod" size="small" @update:value="loadLeaderboard">
            <n-radio-button value="daily">今日</n-radio-button>
            <n-radio-button value="weekly">本周</n-radio-button>
            <n-radio-button value="monthly">本月</n-radio-button>
          </n-radio-group>
        </div>
        <n-spin :show="lbLoading">
          <div v-if="lbData.length > 0" class="lb-list">
            <div v-for="item in lbData" :key="item.rank" class="lb-item" @click="router.push(`/users/${item.user?.id}`)">
              <div class="lb-rank" :class="{ 'rank-1': item.rank === 1, 'rank-2': item.rank === 2, 'rank-3': item.rank === 3 }">
                {{ item.rank }}
              </div>
              <AvatarText :username="item.user?.username" size="md" />
              <div class="lb-info">
                <span class="lb-name">{{ item.user?.profile?.nickname || item.user?.username }}</span>
                <span class="lb-extra" v-if="item.extra">{{ item.extra }}</span>
              </div>
              <div class="lb-value">{{ item.value }}<span class="lb-unit">{{ item.label }}</span></div>
            </div>
          </div>
          <n-empty v-else-if="!lbLoading" description="暂无排行数据" />
        </n-spin>
      </div>
    </template>

    <!-- 发布弹窗 -->
    <n-modal v-model:show="showPublish" preset="card" title="发布动态" style="width: 500px; max-width: 90vw;">
      <n-form :model="publishForm" label-placement="top">
        <!-- 内容 -->
        <n-form-item label="说点什么">
          <n-input
            v-model:value="publishForm.content"
            type="textarea"
            placeholder="分享你的想法、生活..."
            :maxlength="500"
            show-count
            :rows="4"
          />
        </n-form-item>

        <!-- 照片 -->
        <n-form-item label="添加照片（可选）">
          <n-upload
            v-model:file-list="publishForm.files"
            list-type="image-card"
            :max="9"
            accept="image/*"
            :default-upload="false"
          >
            <n-icon size="24"><AddOutline /></n-icon>
          </n-upload>
        </n-form-item>

        <!-- 心情 -->
        <n-form-item label="此刻心情">
          <div class="mood-selector">
            <div
              v-for="mood in moodOptions"
              :key="mood.value"
              class="mood-item"
              :class="{ selected: publishForm.mood === mood.value }"
              @click="publishForm.mood = publishForm.mood === mood.value ? null : mood.value"
            >
              <span class="emoji">{{ mood.emoji }}</span>
              <span class="label">{{ mood.label }}</span>
            </div>
          </div>
        </n-form-item>

        <!-- 隐私 -->
        <n-form-item label="谁可以看">
          <n-switch v-model:value="publishForm.isPublic" />
          <span style="margin-left: 8px;">{{ publishForm.isPublic ? '公开' : '仅自己' }}</span>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showPublish = false">取消</n-button>
          <n-button type="primary" :loading="publishing" @click="handlePublish">
            发布
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 作品详情弹窗 -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      :title="selectedItem?.title || '作品详情'"
      style="width: 90vw; max-width: 800px; max-height: 85vh;"
      @close="closeDetail"
    >
      <div v-if="selectedItem" class="detail-content">
        <!-- 作者信息 -->
        <div class="detail-meta">
          <n-tag :type="getWorkTagType(selectedItem.type)" size="small">
            {{ getWorkTypeName(selectedItem.type) }}
          </n-tag>
          <div class="detail-author">
            <AvatarText :username="selectedItem.author?.name" size="sm" />
            <span>{{ selectedItem.author?.name }}</span>
          </div>
          <span class="detail-time">{{ formatTime(selectedItem.createdAt) }}</span>
        </div>

        <!-- 画廊作品 -->
        <template v-if="selectedItem.type === 'gallery'">
          <div v-if="selectedItem.images?.length" class="gallery-images">
            <n-image-group>
              <div class="image-grid" :class="{ single: selectedItem.images.length === 1 }">
                <n-image
                  v-for="(img, idx) in selectedItem.images"
                  :key="idx"
                  :src="img"
                  object-fit="cover"
                  class="gallery-image"
                />
              </div>
            </n-image-group>
          </div>
          <p v-if="selectedItem.content" class="detail-text">{{ selectedItem.content }}</p>
        </template>

        <!-- 朗诵作品 -->
        <template v-else-if="selectedItem.type === 'recitation'">
          <div v-if="selectedItem.audios?.length" class="audio-list">
            <div v-for="(audio, idx) in selectedItem.audios" :key="idx" class="audio-item">
              <audio :src="audio" controls class="audio-player" />
            </div>
          </div>
          <p v-if="selectedItem.content" class="detail-text">{{ selectedItem.content }}</p>
          <div v-if="selectedItem.meta?.standardName" class="recitation-info">
            朗诵内容：{{ selectedItem.meta.standardName }}
          </div>
        </template>

        <!-- 日记分析 -->
        <template v-else-if="selectedItem.type === 'diary-analysis'">
          <!-- 日记快照 -->
          <div v-if="selectedItem.diarySnapshot" class="diary-snapshot">
            <h4>日记信息</h4>
            <div class="snapshot-content">
              <template v-if="Array.isArray(selectedItem.diarySnapshot)">
                <div v-for="(diary, idx) in selectedItem.diarySnapshot" :key="idx" class="snapshot-item">
                  <span class="snapshot-title">{{ idx + 1 }}. {{ diary.title || '无标题' }}</span>
                </div>
              </template>
              <template v-else>
                <span class="snapshot-title">{{ selectedItem.diarySnapshot.title || '无标题' }}</span>
              </template>
            </div>
          </div>

          <!-- AI 分析结果 -->
          <div class="analysis-section">
            <h4>AI 分析</h4>
            <div class="analysis-content" v-html="renderedAnalysis"></div>
          </div>

          <!-- 元信息 -->
          <div v-if="selectedItem.meta" class="analysis-meta">
            <span v-if="selectedItem.meta.diaryCount">{{ selectedItem.meta.diaryCount }}篇日记</span>
            <span v-if="selectedItem.meta.modelName">模型: {{ selectedItem.meta.modelName }}</span>
            <span v-if="selectedItem.meta.tokensUsed">Token: {{ selectedItem.meta.tokensUsed }}</span>
          </div>
        </template>

        <!-- 诗词文章 -->
        <template v-else-if="selectedItem.type === 'poetry'">
          <div v-if="selectedItem.htmlCode" class="poetry-preview">
            <iframe
              :srcdoc="selectedItem.htmlCode"
              class="poetry-iframe"
              sandbox="allow-scripts"
            />
          </div>
          <div v-if="selectedItem.meta?.category" class="poetry-category">
            <span v-if="selectedItem.meta.categoryIcon">{{ selectedItem.meta.categoryIcon }}</span>
            <span>{{ selectedItem.meta.category }}</span>
          </div>
        </template>
      </div>
      <template #footer>
        <div class="modal-footer">
          <n-button text @click="router.push(selectedItem?.link)">
            查看完整页面
          </n-button>
          <n-button @click="closeDetail">关闭</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 学伴管理抽屉 -->
    <n-drawer v-model:show="showFriendManager" :width="400" placement="right">
      <n-drawer-content title="学伴管理">
        <n-input v-model:value="searchQuery" placeholder="搜索用户" clearable class="mb-4" @update:value="handleFriendSearch">
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-tabs v-model:value="friendTab" type="line" size="small">
          <n-tab-pane name="friends" tab="学伴" />
          <n-tab-pane name="following" tab="关注" />
          <n-tab-pane name="followers" tab="粉丝" />
          <n-tab-pane name="recommended" tab="推荐" />
        </n-tabs>
        <n-spin :show="friendLoading">
          <div v-if="searchQuery && searchResults.length > 0" class="friend-list">
            <UserCard v-for="u in searchResults" :key="u.id" :user="u" :is-friend="false" />
          </div>
          <div v-else-if="!searchQuery && friendUsers.length > 0" class="friend-list">
            <UserCard v-for="u in friendUsers" :key="u.id" :user="u" :tab-status="u._tabStatus" />
          </div>
          <n-empty v-else description="暂无用户" class="py-8" />
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { postAPI, photoAPI, publicAPI, feedAPI } from '@/api';
import api from '@/api';
import MomentCard from '@/components/MomentCard.vue';
import AvatarText from '@/components/AvatarText.vue';
import UserCard from '@/components/UserCard.vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { marked } from 'marked';
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import ChevronDown from '@vicons/ionicons5/es/ChevronDown'
import ChevronUp from '@vicons/ionicons5/es/ChevronUp'
import ImagesOutline from '@vicons/ionicons5/es/ImagesOutline'
import MicOutline from '@vicons/ionicons5/es/MicOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import BrushOutline from '@vicons/ionicons5/es/BrushOutline'
import Heart from '@vicons/ionicons5/es/Heart'
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import PersonAdd from '@vicons/ionicons5/es/PersonAdd'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

// 状态
const loading = ref(false);
const loadingMore = ref(false);
const moments = ref([]);
const page = ref(1);
const hasMore = ref(true);
const showPublish = ref(false);
const publishing = ref(false);
const currentFilter = ref('all');
const expandedUsers = ref(new Set());

// 作品动态状态
const worksFeed = ref([]);
const worksLoading = ref(false);
const worksLoadingMore = ref(false);
const worksPage = ref(1);
const worksHasMore = ref(false);

// 学习榜状态
const lbDimension = ref('points');
const lbPeriod = ref('weekly');
const lbLoading = ref(false);
const lbData = ref([]);

const loadLeaderboard = async () => {
  lbLoading.value = true;
  try {
    const res = await feedAPI.getLeaderboard({ dimension: lbDimension.value, period: lbPeriod.value, limit: 20 });
    lbData.value = res.data?.leaderboard || [];
  } catch (e) {
    console.error('排行榜加载失败:', e);
  } finally {
    lbLoading.value = false;
  }
};

// 学伴管理状态
const showFriendManager = ref(false);
const friendTab = ref('friends');
const friendUsers = ref([]);
const friendLoading = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
let searchTimer = null;

const loadFriendList = async () => {
  friendLoading.value = true;
  try {
    const endpoints = { friends: '/follows/friends', following: '/follows/following', followers: '/follows/followers', recommended: '/follows/recommended' };
    const res = await api.get(endpoints[friendTab.value], { params: { limit: 20 } });
    friendUsers.value = (res.users || res.recommendations || []).map(u => ({ ...u, _tabStatus: friendTab.value }));
  } catch (e) {
    console.error('加载好友列表失败:', e);
  } finally {
    friendLoading.value = false;
  }
};

const handleFriendSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  if (!searchQuery.value?.trim()) { searchResults.value = []; return; }
  searchTimer = setTimeout(async () => {
    try {
      const res = await api.get('/follows/recommendations', { params: { search: searchQuery.value.trim(), limit: 20 } });
      searchResults.value = res.users || [];
    } catch (e) { console.error('搜索失败:', e); }
  }, 500);
};

// 详情弹窗状态
const showDetailModal = ref(false);
const selectedItem = ref(null);

// 当前用户ID
const currentUserId = computed(() => authStore.user?.id);

// 筛选选项
const filterTabs = [
  { value: 'all', label: '动态' },
  { value: 'photo', label: '照片' },
  { value: 'following', label: '关注' },
  { value: 'works', label: '作品展廊' },
  { value: 'leaderboard', label: '学习榜' },
];

// 心情选项
const moodOptions = [
  { value: 'happy', emoji: '😄', label: '开心' },
  { value: 'excited', emoji: '🤩', label: '兴奋' },
  { value: 'calm', emoji: '😊', label: '平静' },
  { value: 'sad', emoji: '😢', label: '难过' },
  { value: 'angry', emoji: '😠', label: '生气' },
  { value: 'anxious', emoji: '😰', label: '焦虑' },
];

// 发布表单
const publishForm = ref({
  content: '',
  files: [],
  mood: null,
  isPublic: true,
});

// 按用户分组（同一用户连续发的内容折叠）
const groupedMoments = computed(() => {
  const groups = [];
  let currentGroup = null;

  // 按时间排序的动态列表
  const sortedMoments = [...moments.value].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  for (const moment of sortedMoments) {
    const authorId = moment.authorId || moment.author?.id;

    // 检查是否是同一用户在1小时内发的
    if (currentGroup && currentGroup.authorId === authorId) {
      const lastMoment = currentGroup.moments[currentGroup.moments.length - 1];
      const timeDiff = new Date(lastMoment.createdAt) - new Date(moment.createdAt);
      const oneHour = 60 * 60 * 1000;

      if (timeDiff < oneHour) {
        currentGroup.moments.push(moment);
        continue;
      }
    }

    // 开始新的分组
    currentGroup = {
      authorId,
      author: moment.author,
      moments: [moment],
    };
    groups.push(currentGroup);
  }

  return groups;
});

// 时间格式化
const formatTime = (date) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });

// 作品类型映射
const getWorkTypeName = (type) => {
  const map = {
    'gallery': '少儿画廊',
    'recitation': '少儿朗诵',
    'diary-analysis': '日记分析',
    'poetry': '诗词文章'
  };
  return map[type] || '作品';
};

const getWorkTagType = (type) => {
  const map = {
    'gallery': 'info',
    'recitation': 'success',
    'diary-analysis': 'warning',
    'poetry': 'error'
  };
  return map[type] || 'default';
};

const getWorkTypeClass = (type) => {
  const map = {
    'gallery': 'bg-blue-100 text-blue-500',
    'recitation': 'bg-green-100 text-green-500',
    'diary-analysis': 'bg-yellow-100 text-yellow-500',
    'poetry': 'bg-red-100 text-red-500'
  };
  return map[type] || 'bg-gray-100 text-gray-500';
};

const getWorkTypeIcon = (type) => {
  const map = {
    'gallery': ImagesOutline,
    'recitation': MicOutline,
    'diary-analysis': DocumentTextOutline,
    'poetry': BrushOutline
  };
  return map[type] || DocumentTextOutline;
};

// 心情表情映射
const getMoodEmoji = (mood) => {
  const moodEmojis = { happy: '😄', excited: '🤩', calm: '😊', sad: '😢', angry: '😠', anxious: '😰' };
  return moodEmojis[mood] || '';
};

// 照片类型标签
const getPhotoTypeLabel = (type) => {
  const labels = { selfie: '自拍', scenery: '风景', friends: '朋友', food: '美食', pet: '宠物', activity: '活动', other: '其他' };
  return labels[type] || '';
};

// 跳转到动态详情
const goToMomentDetail = (item) => {
  if (item.type === 'photo') {
    router.push(`/photos?id=${item.id}`);
  }
  // post 类型暂不支持跳转详情页
};

// 打开作品详情弹窗
const openDetail = (item) => {
  selectedItem.value = item;
  showDetailModal.value = true;
};

// 关闭弹窗
const closeDetail = () => {
  showDetailModal.value = false;
  selectedItem.value = null;
};

// 渲染日记分析的 Markdown 内容
const renderedAnalysis = computed(() => {
  if (!selectedItem.value?.analysis) return '';

  let content = selectedItem.value.analysis;
  content = content.replace(/##\s*📊\s*评分数据[\s\S]*$/i, '');
  content = content.replace(/```json[\s\S]*?```/g, '');
  content = content.replace(/---\s*$/g, '');
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  if (!content.trim()) return '';
  return marked(content);
});

// 加载作品动态
const loadWorksFeed = async (reset = true) => {
  if (reset) {
    worksPage.value = 1;
    worksLoading.value = true;
  } else {
    worksLoadingMore.value = true;
  }

  try {
    const response = await publicAPI.getWorksFeed({
      page: worksPage.value,
      limit: 20
    });
    const items = response.data?.items || [];

    if (reset) {
      worksFeed.value = items;
    } else {
      worksFeed.value.push(...items);
    }
    worksHasMore.value = items.length === 20;
  } catch (error) {
    message.error('加载作品动态失败');
  } finally {
    worksLoading.value = false;
    worksLoadingMore.value = false;
  }
};

const loadMoreWorks = () => {
  worksPage.value++;
  loadWorksFeed(false);
};

// 加载动态
const loadMoments = async (reset = true) => {
  if (reset) {
    loading.value = true;
    page.value = 1;
    moments.value = [];
  } else {
    loadingMore.value = true;
  }

  try {
    let res;
    let newMoments = [];

    if (currentFilter.value === 'all') {
      // 统一动态（包含所有类型）
      res = await publicAPI.getUnifiedFeed({ page: page.value, limit: 20 });
      newMoments = res.data?.items || [];
    } else if (currentFilter.value === 'photo') {
      res = await photoAPI.getList({ page: page.value, limit: 20 });
      newMoments = res.data || [];
    } else if (currentFilter.value === 'following') {
      res = await postAPI.getPosts({ type: 'following', page: page.value, limit: 20 });
      newMoments = res.posts || [];
    }

    if (reset) {
      moments.value = newMoments;
    } else {
      moments.value = [...moments.value, ...newMoments];
    }
    hasMore.value = newMoments.length >= 20;
  } catch (error) {
    console.error('加载动态失败:', error);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

// 加载更多
const loadMore = () => {
  page.value++;
  loadMoments(false);
};

// 展开用户动态
const expandUser = (authorId) => {
  expandedUsers.value.add(authorId);
};

// 收起用户动态
const collapseUser = (authorId) => {
  expandedUsers.value.delete(authorId);
};

// 删除处理
const handleDeleted = (id) => {
  moments.value = moments.value.filter(m => m.id !== id);
};

// 发布动态
const handlePublish = async () => {
  if (!publishForm.value.content.trim() && publishForm.value.files.length === 0) {
    message.warning('请输入内容或添加照片');
    return;
  }

  publishing.value = true;
  try {
    let res;

    if (publishForm.value.files.length > 0) {
      // 有照片，使用照片API
      const formData = new FormData();
      publishForm.value.files.forEach(file => {
        formData.append('photos', file.file);
      });
      formData.append('content', publishForm.value.content);
      if (publishForm.value.mood) formData.append('mood', publishForm.value.mood);
      formData.append('photoType', 'activity');
      formData.append('isPublic', publishForm.value.isPublic);
      res = await photoAPI.create(formData);
    } else {
      // 纯文字，使用动态API
      res = await postAPI.createPost({
        content: publishForm.value.content,
        isPublic: publishForm.value.isPublic,
        mood: publishForm.value.mood,
      });
    }

    if (res.success !== false) {
      message.success('发布成功');
      showPublish.value = false;
      publishForm.value = { content: '', files: [], mood: null, isPublic: true };
      loadMoments();
    } else {
      message.error(res.error || '发布失败');
    }
  } catch (error) {
    console.error('发布失败:', error);
    message.error('发布失败');
  } finally {
    publishing.value = false;
  }
};

// 监听筛选变化
watch(currentFilter, (newVal) => {
  expandedUsers.value.clear();
  if (newVal === 'works') {
    if (worksFeed.value.length === 0) loadWorksFeed();
  } else if (newVal === 'leaderboard') {
    if (lbData.value.length === 0) loadLeaderboard();
  } else {
    loadMoments();
  }
});

watch(friendTab, loadFriendList);
watch(showFriendManager, (v) => { if (v) loadFriendList(); });

onMounted(() => {
  const tab = router.currentRoute.value.query.tab;
  const dim = router.currentRoute.value.query.dimension;
  if (tab === 'leaderboard') {
    currentFilter.value = 'leaderboard';
    if (dim) lbDimension.value = dim;
    loadLeaderboard();
  } else {
    loadMoments();
  }
});
</script>

<style scoped>
.moments-square {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.square-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-actions { display: flex; gap: 8px; }
.friend-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.mb-4 { margin-bottom: 16px; }
.py-8 { padding: 32px 0; }

.header-content h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

.subtitle {
  margin: 0;
  color: var(--n-text-color-3);
  font-size: 14px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--n-border-color);
}

.filter-tab {
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f3f4f6;
  color: #6b7280;
  font-weight: 500;
}

.filter-tab:hover {
  background: #e5e7eb;
  color: #374151;
}

.filter-tab.active {
  background: #6366f1;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.moments-list {
  min-height: 200px;
}

.user-group {
  margin-bottom: 8px;
}

.folded-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--n-action-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--n-text-color-2);
  margin-top: -4px;
  margin-bottom: 12px;
}

.folded-hint:hover {
  background: var(--n-border-color);
}

.collapse-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--n-text-color-3);
}

.collapse-hint:hover {
  color: var(--n-primary-color);
}

.load-more {
  text-align: center;
  padding: 16px;
  color: var(--n-text-color-3);
  cursor: pointer;
}

.load-more:hover {
  color: var(--n-primary-color);
}

/* 心情选择器 */
.mood-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.mood-item:hover {
  background: var(--n-action-color);
}

.mood-item.selected {
  border-color: var(--n-primary-color);
  background: var(--n-primary-color-suppl);
}

.mood-item .emoji {
  font-size: 24px;
}

.mood-item .label {
  font-size: 12px;
  margin-top: 4px;
}

/* 作品列表样式 */
.works-list {
  min-height: 200px;
}

.work-card {
  background: var(--n-card-color);
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  height: 240px;
  border: 1px solid var(--n-border-color);
}

.work-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.work-card-inner {
  display: flex;
  gap: 12px;
  padding: 16px;
  height: 100%;
}

.work-preview {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.work-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.work-icon {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.work-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  justify-content: space-between;
}

.work-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.work-category {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.work-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-desc {
  margin: 0;
  font-size: 15px;
  color: var(--n-text-color-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.work-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.work-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--n-text-color-2);
}

.work-time {
  font-size: 12px;
  color: var(--n-text-color-3);
}

/* Tailwind-like utility classes */
.bg-blue-100 { background-color: #dbeafe; }
.text-blue-500 { color: #3b82f6; }
.bg-green-100 { background-color: #dcfce7; }
.text-green-500 { color: #22c55e; }
.bg-yellow-100 { background-color: #fef9c3; }
.text-yellow-500 { color: #eab308; }
.bg-red-100 { background-color: #fee2e2; }
.text-red-500 { color: #ef4444; }
.bg-gray-100 { background-color: #f3f4f6; }
.text-gray-500 { color: #6b7280; }

/* 详情弹窗样式 */
.detail-content {
  max-height: calc(85vh - 180px);
  overflow-y: auto;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--n-border-color);
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  flex: 1;
}

.detail-time {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.detail-text {
  margin: 16px 0;
  line-height: 1.6;
}

/* 画廊样式 */
.gallery-images {
  margin: 16px 0;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.image-grid.single {
  grid-template-columns: 1fr;
}

.gallery-image {
  border-radius: 8px;
  height: 200px;
  width: 100%;
}

.image-grid.single .gallery-image {
  height: 400px;
}

/* 音频样式 */
.audio-list {
  margin: 16px 0;
}

.audio-item {
  background: var(--n-action-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.audio-player {
  width: 100%;
}

.recitation-info {
  margin-top: 12px;
  font-size: 14px;
  color: var(--n-text-color-2);
}

/* 日记分析样式 */
.diary-snapshot {
  margin-bottom: 16px;
}

.diary-snapshot h4 {
  margin: 0 0 8px;
  font-weight: 600;
}

.snapshot-content {
  background: var(--n-action-color);
  border-radius: 8px;
  padding: 12px;
}

.snapshot-item {
  margin-bottom: 4px;
}

.snapshot-item:last-child {
  margin-bottom: 0;
}

.snapshot-title {
  font-weight: 500;
}

.analysis-section h4 {
  margin: 0 0 8px;
  font-weight: 600;
}

.analysis-content {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  line-height: 1.9;
  font-size: 15px;
  color: #374151;
}

.analysis-content :deep(h1),
.analysis-content :deep(h2),
.analysis-content :deep(h3),
.analysis-content :deep(h4) {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5em;
}

.analysis-content :deep(h2) {
  font-size: 1.3em;
}

.analysis-content :deep(p) {
  margin-bottom: 1em;
}

.analysis-content :deep(ul),
.analysis-content :deep(ol) {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

.analysis-content :deep(li) {
  margin-bottom: 0.5em;
}

.analysis-content :deep(strong) {
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.8em 1em;
  border-left: 4px solid #6366f1;
  background-color: #f8fafc;
  color: #4b5563;
  font-style: italic;
}

.analysis-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--n-border-color);
  font-size: 12px;
  color: var(--n-text-color-3);
}

/* 诗词文章样式 */
.poetry-preview {
  margin: 16px 0;
}

.poetry-iframe {
  width: 100%;
  height: 500px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
}

.poetry-category {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--n-text-color-2);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 统一动态列表样式 */
.unified-list {
  min-height: 200px;
}

.unified-card {
  background: var(--n-card-color);
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--n-border-color);
}

.unified-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.unified-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.unified-author {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.unified-author .name {
  font-weight: 600;
  font-size: 14px;
}

.unified-author .time {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.unified-header .mood {
  font-size: 18px;
}

.unified-text {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--n-text-color);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.unified-images {
  position: relative;
  margin-bottom: 12px;
  max-width: 280px;
  border-radius: 8px;
  overflow: hidden;
}

.unified-images img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
}

.unified-images .image-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.unified-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--n-text-color-3);
}

.unified-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 排行榜 */
.leaderboard-section { margin-top: 4px; }
.lb-period { margin: 12px 0; }
.lb-list { display: flex; flex-direction: column; gap: 8px; }
.lb-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: var(--n-card-color);
  border-radius: 10px; border: 1px solid var(--n-border-color);
  cursor: pointer; transition: all 0.2s;
}
.lb-item:hover { background: #eef2ff; transform: translateY(-1px); }
.lb-rank {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; background: #e5e7eb; color: #666;
  flex-shrink: 0;
}
.lb-rank.rank-1 { background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; }
.lb-rank.rank-2 { background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #333; }
.lb-rank.rank-3 { background: linear-gradient(135deg, #cd7f32, #daa520); color: #fff; }
.lb-info { flex: 1; min-width: 0; }
.lb-name { font-weight: 600; font-size: 14px; display: block; }
.lb-extra { font-size: 12px; color: var(--n-text-color-3); }
.lb-value { font-size: 20px; font-weight: 700; color: #1f2937; white-space: nowrap; }
.lb-unit { font-size: 12px; font-weight: 400; color: #9ca3af; margin-left: 2px; }
</style>
