<template>
  <div class="space-y-6">
    <!-- 发布框（仅在动态 tab 显示） -->
    <div v-if="activeTab !== 'works'" class="card">
      <div class="flex space-x-3">
        <AvatarText :username="authStore.user?.username" size="md" />
        <div class="flex-1">
          <n-input
            v-model:value="newPost.content"
            type="textarea"
            placeholder="分享你的想法..."
            :rows="3"
          />
          <div class="flex items-center justify-between mt-3">
            <n-checkbox v-model:checked="newPost.isPublic">公开到广场</n-checkbox>
            <n-button type="primary" :loading="posting" :disabled="!newPost.content.trim()" @click="createPost">
              发布
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页切换 -->
    <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
      <n-tab-pane name="personal" tab="我的动态" />
      <n-tab-pane name="public" tab="公共广场" />
      <n-tab-pane name="works" tab="作品动态" />
    </n-tabs>

    <!-- 作品动态列表 -->
    <template v-if="activeTab === 'works'">
      <div v-if="worksLoading" class="space-y-4">
        <n-skeleton v-for="i in 3" :key="i" height="120px" :sharp="false" />
      </div>

      <n-empty v-else-if="!worksFeed.length" description="暂无作品动态" />

      <div v-else class="space-y-4">
        <div
          v-for="item in worksFeed"
          :key="`${item.type}-${item.id}`"
          class="card cursor-pointer hover:shadow-md transition-shadow"
          @click="openDetail(item)"
        >
          <div class="flex gap-4">
            <!-- 预览图 -->
            <div v-if="item.preview" class="flex-shrink-0">
              <img :src="item.preview" class="w-20 h-20 object-cover rounded-lg" />
            </div>
            <div v-else class="flex-shrink-0 w-20 h-20 rounded-lg flex items-center justify-center" :class="getWorkTypeClass(item.type)">
              <n-icon :size="32">
                <component :is="getWorkTypeIcon(item.type)" />
              </n-icon>
            </div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <n-tag :type="getWorkTagType(item.type)" size="small">
                  {{ getWorkTypeName(item.type) }}
                </n-tag>
                <span v-if="item.meta?.category" class="text-xs text-gray-500">
                  {{ item.meta.category }}
                </span>
              </div>
              <h4 class="font-medium text-gray-800 truncate mb-1">{{ item.title }}</h4>
              <p v-if="item.content" class="text-sm text-gray-500 line-clamp-2">{{ item.content }}</p>

              <!-- 作者和时间 -->
              <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <AvatarText :username="item.author?.name" size="xs" />
                <span>{{ item.author?.name }}</span>
                <span>·</span>
                <span>{{ formatTime(item.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多（作品动态） -->
      <div v-if="worksHasMore" class="text-center">
        <n-button :loading="worksLoadingMore" @click="loadMoreWorks">加载更多</n-button>
      </div>
    </template>

    <!-- 普通动态列表 -->
    <template v-else>
      <div v-if="loading" class="space-y-4">
        <n-skeleton v-for="i in 3" :key="i" height="150px" :sharp="false" />
      </div>

      <n-empty v-else-if="!posts.length" :description="activeTab === 'personal' ? '还没有发布动态' : '暂无公开动态'" />

      <div v-else class="space-y-4">
      <div v-for="post in posts" :key="post.id" class="card">
        <!-- 用户信息 -->
        <div class="flex items-center space-x-3 mb-3">
          <AvatarText :username="post.author.username" size="md" />
          <div class="flex-1">
            <div class="font-medium cursor-pointer hover:text-primary-600 transition-colors" @click.stop="$router.push(`/users/${post.author.id}`)">
              {{ post.author.profile?.nickname || post.author.username }}
            </div>
            <div class="text-sm text-gray-500">{{ formatTime(post.createdAt) }}</div>
          </div>
          <n-button v-if="post.authorId === authStore.user?.id" size="small" quaternary type="error" @click="deletePost(post)">
            删除
          </n-button>
        </div>

        <!-- 内容 -->
        <p class="text-gray-700 whitespace-pre-wrap mb-3">{{ post.content }}</p>

        <!-- 图片 -->
        <div v-if="post.images?.length" class="grid grid-cols-3 gap-2 mb-3">
          <img v-for="(img, i) in post.images" :key="i" :src="img" class="w-full h-24 object-cover rounded" />
        </div>

        <!-- 操作栏 -->
        <div class="flex items-center space-x-6 pt-3 border-t border-gray-100">
          <button class="flex items-center space-x-1 text-gray-500 hover:text-red-500" @click="toggleLike(post)">
            <n-icon :size="18"><HeartOutline v-if="!post.isLiked" /><Heart v-else class="text-red-500" /></n-icon>
            <span>{{ post._count?.likes || 0 }}</span>
          </button>
          <button class="flex items-center space-x-1 text-gray-500 hover:text-primary-500" @click="toggleComments(post)">
            <n-icon :size="18"><ChatbubbleOutline /></n-icon>
            <span>{{ post._count?.comments || 0 }}</span>
          </button>
        </div>

        <!-- 评论区 -->
        <div v-if="post.showComments" class="mt-4 pt-4 border-t border-gray-100">
          <div v-if="post.comments?.length" class="space-y-3 mb-3">
            <div v-for="comment in post.comments" :key="comment.id" class="flex space-x-2">
              <AvatarText :username="comment.author.username" size="sm" />
              <div class="flex-1 bg-gray-50 rounded-lg p-2">
                <span
                  class="font-medium text-sm cursor-pointer hover:text-primary-600 transition-colors"
                  @click.stop="$router.push(`/users/${comment.author.id}`)"
                >
                  {{ comment.author.profile?.nickname || comment.author.username }}
                </span>
                <p class="text-sm text-gray-700">{{ comment.content }}</p>
              </div>
            </div>
          </div>
          <div class="flex space-x-2">
            <n-input v-model:value="post.newComment" placeholder="写评论..." size="small" />
            <n-button size="small" type="primary" :disabled="!post.newComment?.trim()" @click="addComment(post)">
              发送
            </n-button>
          </div>
        </div>
      </div>
    </div>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="text-center">
        <n-button :loading="loadingMore" @click="loadMore">加载更多</n-button>
      </div>
    </template>

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
        <div class="flex items-center gap-3 mb-4 pb-4 border-b">
          <n-tag :type="getWorkTagType(selectedItem.type)" size="small">
            {{ getWorkTypeName(selectedItem.type) }}
          </n-tag>
          <div class="flex-1"></div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <AvatarText :username="selectedItem.author?.name" size="sm" />
            <span>{{ selectedItem.author?.name }}</span>
          </div>
          <span class="text-xs text-gray-500">{{ formatTime(selectedItem.createdAt) }}</span>
        </div>

        <!-- 画廊作品 -->
        <template v-if="selectedItem.type === 'gallery'">
          <div v-if="selectedItem.images?.length" class="space-y-4">
            <n-image-group>
              <div class="grid grid-cols-2 gap-2">
                <n-image
                  v-for="(img, idx) in selectedItem.images"
                  :key="idx"
                  :src="img"
                  object-fit="cover"
                  class="rounded-lg"
                  :style="{ height: selectedItem.images.length === 1 ? '400px' : '200px' }"
                />
              </div>
            </n-image-group>
          </div>
          <p v-if="selectedItem.content" class="mt-4 text-gray-700">{{ selectedItem.content }}</p>
        </template>

        <!-- 朗诵作品 -->
        <template v-else-if="selectedItem.type === 'recitation'">
          <div v-if="selectedItem.audios?.length" class="space-y-3">
            <div v-for="(audio, idx) in selectedItem.audios" :key="idx" class="bg-gray-50 rounded-lg p-3">
              <audio :src="audio" controls class="w-full" />
            </div>
          </div>
          <p v-if="selectedItem.content" class="mt-4 text-gray-700">{{ selectedItem.content }}</p>
          <div v-if="selectedItem.meta?.standardName" class="mt-3 text-sm text-gray-500">
            朗诵内容：{{ selectedItem.meta.standardName }}
          </div>
        </template>

        <!-- 日记分析 -->
        <template v-else-if="selectedItem.type === 'diary-analysis'">
          <!-- 日记快照 -->
          <div v-if="selectedItem.diarySnapshot" class="mb-4">
            <h4 class="font-bold text-gray-700 mb-2">日记信息</h4>
            <div class="bg-gray-50 rounded-lg p-3 text-sm">
              <template v-if="Array.isArray(selectedItem.diarySnapshot)">
                <div v-for="(diary, idx) in selectedItem.diarySnapshot" :key="idx" class="mb-2 last:mb-0">
                  <span class="font-medium">{{ idx + 1 }}. {{ diary.title || '无标题' }}</span>
                </div>
              </template>
              <template v-else>
                <span class="font-medium">{{ selectedItem.diarySnapshot.title || '无标题' }}</span>
              </template>
            </div>
          </div>

          <!-- AI 分析结果 -->
          <div>
            <h4 class="font-bold text-gray-700 mb-2">AI 分析</h4>
            <div class="analysis-content prose prose-sm max-w-none" v-html="renderedAnalysis"></div>
          </div>

          <!-- 元信息 -->
          <div v-if="selectedItem.meta" class="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
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
              class="w-full rounded-lg border"
              style="height: 500px;"
              sandbox="allow-scripts"
            />
          </div>
          <div v-if="selectedItem.meta?.category" class="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span v-if="selectedItem.meta.categoryIcon">{{ selectedItem.meta.categoryIcon }}</span>
            <span>{{ selectedItem.meta.category }}</span>
          </div>
        </template>
      </div>
      <template #footer>
        <div class="flex justify-between items-center">
          <n-button text @click="$router.push(selectedItem?.link)">
            查看完整页面
          </n-button>
          <n-button @click="closeDetail">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { postAPI, publicAPI } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import Heart from '@vicons/ionicons5/es/Heart'
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'
import ImagesOutline from '@vicons/ionicons5/es/ImagesOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import BrushOutline from '@vicons/ionicons5/es/BrushOutline'
import MicOutline from '@vicons/ionicons5/es/MicOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import { marked } from 'marked';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const loadingMore = ref(false);
const posting = ref(false);
const posts = ref([]);
const activeTab = ref('personal');
const page = ref(1);
const hasMore = ref(false);

// 作品动态状态
const worksFeed = ref([]);
const worksLoading = ref(false);
const worksLoadingMore = ref(false);
const worksPage = ref(1);
const worksHasMore = ref(false);

// 详情弹窗状态
const showDetailModal = ref(false);
const selectedItem = ref(null);

const newPost = ref({ content: '', isPublic: false });

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

  // 移除 JSON 代码块（评分数据部分）
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
      limit: 10
    });
    const items = response.data?.items || [];

    if (reset) {
      worksFeed.value = items;
    } else {
      worksFeed.value.push(...items);
    }
    worksHasMore.value = items.length === 10;
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

// Tab 切换处理
const handleTabChange = (tab) => {
  if (tab === 'works') {
    if (worksFeed.value.length === 0) {
      loadWorksFeed();
    }
  } else {
    loadPosts();
  }
};

const loadPosts = async (reset = true) => {
  if (reset) {
    page.value = 1;
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const params = { page: page.value, limit: 10 };
    if (activeTab.value === 'personal') {
      params.type = 'personal';
    } else {
      params.type = 'public';
    }
    const data = await postAPI.getPosts(params);
    const newPosts = (data.posts || data).map(p => ({ ...p, showComments: false, newComment: '' }));

    if (reset) {
      posts.value = newPosts;
    } else {
      posts.value.push(...newPosts);
    }
    hasMore.value = newPosts.length === 10;
  } catch (error) {
    message.error('加载动态失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  page.value++;
  loadPosts(false);
};

const createPost = async () => {
  posting.value = true;
  try {
    await postAPI.createPost(newPost.value);
    message.success('发布成功');
    newPost.value = { content: '', isPublic: false };
    loadPosts();
  } catch (error) {
    message.error(error.error || '发布失败');
  } finally {
    posting.value = false;
  }
};

const deletePost = (post) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条动态吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await postAPI.deletePost(post.id);
        message.success('删除成功');
        loadPosts();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const toggleLike = async (post) => {
  try {
    await postAPI.toggleLike(post.id);
    post.isLiked = !post.isLiked;
    post._count.likes += post.isLiked ? 1 : -1;
  } catch (error) {
    message.error('操作失败');
  }
};

const toggleComments = async (post) => {
  post.showComments = !post.showComments;
  if (post.showComments && !post.comments) {
    try {
      const data = await postAPI.getPostById(post.id);
      post.comments = data.comments || [];
    } catch (error) {
      console.error('加载评论失败');
    }
  }
};

const addComment = async (post) => {
  if (!post.newComment?.trim()) return;
  try {
    await postAPI.addComment(post.id, post.newComment);
    message.success('评论成功');
    post.newComment = '';
    post._count.comments++;
    // 重新加载评论
    const data = await postAPI.getPostById(post.id);
    post.comments = data.comments || [];
  } catch (error) {
    message.error(error.error || '评论失败');
  }
};

onMounted(() => {
  loadPosts();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-content {
  max-height: calc(85vh - 180px);
  overflow-y: auto;
}

/* AI 分析内容样式 */
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

.analysis-content :deep(h3) {
  font-size: 1.15em;
}

.analysis-content :deep(p) {
  margin-bottom: 1em;
  text-align: justify;
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

/* 唐诗宋词预览 */
.poetry-preview iframe {
  border: 1px solid #e5e7eb;
}
</style>
