<template>
  <div class="space-y-6">
    <n-spin :show="loading">
      <div v-if="review">
        <!--返回按钮 -->
        <div class="mb-4">
          <n-button @click="$router.back()">
            <template #icon>
              <n-icon><ArrowBackOutline /></n-icon>
            </template>
            返回
          </n-button>
        </div>

        <!-- 长评内容 -->
        <div class="card">
          <!--游戏信息 -->
          <div class="flex items-center gap-3 mb-4 pb-4 border-b">
            <img
              v-if="review.game.coverUrl"
              :src="review.game.coverUrl"
              :alt="review.game.name"
              class="w-16 h-20 object-cover rounded cursor-pointer"
              @click="$router.push(`/games/${review.game.id}`)"
            />
            <div>
              <h3
                class="font-bold text-lg cursor-pointer hover:text-blue-500"
                @click="$router.push(`/games/${review.game.id}`)"
              >
                {{ review.game.name }}
              </h3>
              <div class="text-sm text-gray-500">
                <n-tag size="tiny" type="info">{{ review.game.gameType }}</n-tag>
                <span class="ml-2">{{ review.game.platform }}</span>
              </div>
            </div>
          </div>

          <!-- 作者信息 -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <AvatarText :username="review.user?.username" size="md" />
              <div>
                <div class="font-medium text-lg">{{ review.user.username }}</div>
                <div class="text-sm text-gray-500">{{ formatTime(review.createdAt) }}</div>
              </div>
            </div>

            <!-- 点赞按钮 -->
            <n-button
              :type="review.isLiked ? 'error' : 'default'"
              @click="handleLike"
              :loading="likingLoading"
            >
              <template #icon>
                <n-icon>
                  <component :is="review.isLiked ? Heart : HeartOutline" />
                </n-icon>
              </template>
              {{ review.likesCount }}
            </n-button>
          </div>

          <!-- 标题 -->
          <h1 class="text-2xl font-bold mb-4">{{ review.title }}</h1>

          <!-- 评分和游玩时长 -->
          <div class="flex items-center gap-4 mb-6">
            <div class="flex items-center gap-2">
              <n-rate :value="review.score / 2" readonly />
              <span class="text-lg font-medium">{{ review.score }}/10</span>
            </div>
            <div class="text-sm text-gray-500">
              <n-icon><TimeOutline /></n-icon>
              游玩时长：{{ formatPlayTime(review.playTime) }}
            </div>
          </div>

          <!-- 正文 -->
          <div class="prose max-w-none mb-6">
            <div class="text-gray-700 whitespace-pre-wrap leading-relaxed">{{ review.content }}</div>
          </div>
        </div>

        <!-- 评论区 -->
        <div class="card">
          <h3 class="font-bold text-lg mb-4">评论 ({{ review.commentsCount }})</h3>

          <!-- 发表评论 -->
          <div class="mb-6">
            <n-input
              v-model:value="commentContent"
              type="textarea"
              placeholder="写下你的评论..."
              :rows="3"
              class="mb-2"
            />
            <div class="flex justify-end">
              <n-button
                type="primary"
                @click="handleSubmitComment"
                :loading="commenting"
                :disabled="!commentContent.trim()"
              >
                发表评论
              </n-button>
            </div>
          </div>

          <!-- 评论列表 -->
          <div class="space-y-4">
            <div v-for="comment in review.comments" :key="comment.id" class="flex gap-3">
              <AvatarText :username="review.user?.username" size="md" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium">{{ comment.user.username }}</span>
                  <span class="text-xs text-gray-400">{{ formatTime(comment.createdAt) }}</span>
                </div>
                <p class="text-gray-700">{{ comment.content }}</p>
              </div>
            </div>

            <n-empty v-if="review.comments.length === 0" description="还没有评论" />
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { gameAPI } from '@/api';
import {
  ArrowBackOutline,
  HeartOutline,
  Heart,
  TimeOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const review = ref(null);
const loading = ref(false);
const likingLoading = ref(false);
const commenting = ref(false);
const commentContent = ref('');

// 加载长评详情
const loadReview = async () => {
  loading.value = true;
  try {
    review.value = await gameAPI.getLongReviewDetail(route.params.id);
  } catch (error) {
    console.error('加载长评失败', error);
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 点赞/取消点赞
const handleLike = async () => {
  likingLoading.value = true;
  try {
    const result = await gameAPI.likeLongReview(route.params.id);
    review.value.isLiked = result.isLiked;
    review.value.likesCount = result.isLiked
      ? review.value.likesCount + 1
      : review.value.likesCount - 1;
    message.success(result.message);
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    likingLoading.value = false;
  }
};

// 提交评论
const handleSubmitComment = async () => {
  if (!commentContent.value.trim()) return;

  commenting.value = true;
  try {
    const result = await gameAPI.commentLongReview(route.params.id, {
      content: commentContent.value,
    });
    message.success('评论成功');
    commentContent.value = '';
    // 重新加载评论
    loadReview();
  } catch (error) {
    message.error(error.error || '评论失败');
  } finally {
    commenting.value = false;
  }
};

// 格式化游玩时长
const formatPlayTime = (minutes) => {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
};

// 格式化时间
const formatTime = (date) => {
  const now = new Date();
  const created = new Date(date);
  const diff = now - created;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return created.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

onMounted(() => {
  loadReview();
});
</script>
