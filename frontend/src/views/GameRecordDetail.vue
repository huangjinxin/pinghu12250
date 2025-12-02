<template>
  <div v-if="record" class="space-y-6">
    <!-- 游戏头部 -->
    <div class="card">
      <div class="flex items-start gap-4">
        <img
          v-if="record.game.coverImage"
          :src="record.game.coverImage"
          :alt="record.game.name"
          class="w-32 h-48 object-cover rounded-lg"
        />
        <div class="flex-1">
          <h1 class="text-2xl font-bold mb-2">{{ record.game.name }}</h1>
          <div class="flex items-center gap-4 mb-3">
            <div class="flex items-center gap-1">
              <img :src="record.user.avatar" :alt="record.user.username" class="w-8 h-8 rounded-full" />
              <span class="font-medium">{{ record.user.username }}</span>
            </div>
            <span class="text-sm text-gray-500">{{ formatDate(record.createdAt) }}</span>
          </div>
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <n-rate :value="record.rating" :count="10" readonly size="small" />
              <span class="text-lg font-bold">{{ record.rating }}/10</span>
            </div>
            <n-tag v-if="record.status" :type="getStatusType(record.status)">
              {{ getStatusLabel(record.status) }}
            </n-tag>
            <span v-if="record.playTime" class="text-sm text-gray-600">
              游玩时长：{{ record.playTime }} 小时
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <n-button @click="toggleLike" :type="record.isLiked ? 'error' : 'default'">
            <template #icon>
              <n-icon><component :is="record.isLiked ? Heart : HeartOutline" /></n-icon>
            </template>
            {{ record._count.likes }}
          </n-button>
          <n-dropdown v-if="isOwner" :options="menuOptions" @select="handleMenuSelect">
            <n-button circle quaternary>
              <template #icon><n-icon><EllipsisHorizontalOutline /></n-icon></template>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </div>

    <!-- 游玩感受 -->
    <div class="card">
      <h2 class="text-xl font-bold mb-3">游玩感受</h2>
      <p class="text-gray-700 whitespace-pre-line">{{ record.content }}</p>
    </div>

    <!-- 游戏截图 -->
    <div v-if="record.screenshots?.length" class="card">
      <h2 class="text-xl font-bold mb-3">游戏截图</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="screenshot in record.screenshots"
          :key="screenshot.id"
          class="relative group cursor-pointer"
          @click="previewImage(screenshot.url)"
        >
          <img :src="screenshot.url" :alt="screenshot.description" class="w-full h-32 object-cover rounded-lg" />
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <n-icon size="32" color="#fff"><ImageOutline /></n-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传截图（仅本人） -->
    <div v-if="isOwner" class="card">
      <h2 class="text-xl font-bold mb-3">上传截图</h2>
      <n-upload
        :action="`/api/games/records/${record.id}/screenshots`"
        :headers="{ Authorization: `Bearer ${token}` }"
        list-type="image-card"
        @finish="handleUploadFinish"
      >
        <n-button>
          <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
          选择图片
        </n-button>
      </n-upload>
    </div>

    <!-- 评论区 -->
    <div class="card">
      <h2 class="text-xl font-bold mb-4">评论 ({{ comments.length }})</h2>

      <!-- 添加评论 -->
      <div class="mb-6">
        <n-input
          v-model:value="newComment"
          type="textarea"
          placeholder="写下你的想法..."
          :rows="3"
        />
        <div class="mt-2 flex justify-end">
          <n-button type="primary" @click="addComment" :disabled="!newComment.trim()">
            发表评论
          </n-button>
        </div>
      </div>

      <!-- 评论列表 -->
      <div class="space-y-4">
        <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
          <img :src="comment.author.avatar" :alt="comment.author.username" class="w-10 h-10 rounded-full" />
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium">{{ comment.author.username }}</span>
              <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
            </div>
            <p class="text-gray-700 mb-2">{{ comment.content }}</p>

            <!-- 回复 -->
            <div v-if="comment.replies?.length" class="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
              <div v-for="reply in comment.replies" :key="reply.id" class="flex gap-2">
                <img :src="reply.author.avatar" :alt="reply.author.username" class="w-6 h-6 rounded-full" />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium">{{ reply.author.username }}</span>
                    <span class="text-xs text-gray-500">{{ formatDate(reply.createdAt) }}</span>
                  </div>
                  <p class="text-sm text-gray-700">{{ reply.content }}</p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 mt-2">
              <n-button text size="small" @click="startReply(comment)">回复</n-button>
              <n-button
                v-if="comment.authorId === currentUserId"
                text
                size="small"
                type="error"
                @click="deleteComment(comment.id)"
              >
                删除
              </n-button>
            </div>

            <!-- 回复输入框 -->
            <div v-if="replyingTo?.id === comment.id" class="mt-3">
              <n-input
                v-model:value="replyContent"
                type="textarea"
                :placeholder="`回复 ${comment.author.username}...`"
                :rows="2"
              />
              <div class="mt-2 flex justify-end gap-2">
                <n-button size="small" @click="cancelReply">取消</n-button>
                <n-button size="small" type="primary" @click="submitReply">回复</n-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <n-empty v-if="comments.length === 0" description="暂无评论" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { gameAPI } from '@/api';
import {
  HeartOutline,
  Heart,
  EllipsisHorizontalOutline,
  ImageOutline,
  CloudUploadOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const record = ref(null);
const comments = ref([]);
const newComment = ref('');
const replyingTo = ref(null);
const replyContent = ref('');

const currentUserId = computed(() => authStore.user?.id);
const token = computed(() => localStorage.getItem('token'));
const isOwner = computed(() => record.value?.userId === currentUserId.value);

const menuOptions = [
  { label: '编辑', key: 'edit' },
  { label: '删除', key: 'delete' },
];

const statusLabels = {
  WANT_TO_PLAY: '想玩',
  PLAYING: '在玩',
  COMPLETED: '已完成',
  DROPPED: '已放弃',
};

const getStatusLabel = (status) => statusLabels[status] || status;

const getStatusType = (status) => {
  const types = {
    WANT_TO_PLAY: 'info',
    PLAYING: 'warning',
    COMPLETED: 'success',
    DROPPED: 'default',
  };
  return types[status] || 'default';
};

const loadRecord = async () => {
  try {
    record.value = await gameAPI.getRecordDetail(route.params.id);
  } catch (error) {
    message.error('加载失败');
  }
};

const loadComments = async () => {
  try {
    comments.value = await gameAPI.getComments(route.params.id);
  } catch (error) {
    message.error('加载评论失败');
  }
};

const toggleLike = async () => {
  try {
    const result = await gameAPI.likeRecord(route.params.id);
    record.value.isLiked = result.isLiked;
    record.value._count.likes += result.isLiked ? 1 : -1;
  } catch (error) {
    message.error('操作失败');
  }
};

const addComment = async () => {
  try {
    await gameAPI.addComment(route.params.id, { content: newComment.value });
    message.success('评论成功');
    newComment.value = '';
    loadComments();
  } catch (error) {
    message.error('评论失败');
  }
};

const startReply = (comment) => {
  replyingTo.value = comment;
  replyContent.value = '';
};

const cancelReply = () => {
  replyingTo.value = null;
  replyContent.value = '';
};

const submitReply = async () => {
  try {
    await gameAPI.addComment(route.params.id, {
      content: replyContent.value,
      parentId: replyingTo.value.id,
    });
    message.success('回复成功');
    cancelReply();
    loadComments();
  } catch (error) {
    message.error('回复失败');
  }
};

const deleteComment = async (id) => {
  if (!confirm('确定删除此评论？')) return;
  try {
    await gameAPI.deleteComment(id);
    message.success('删除成功');
    loadComments();
  } catch (error) {
    message.error('删除失败');
  }
};

const handleMenuSelect = (key) => {
  if (key === 'edit') {
    router.push(`/games/records/${record.value.id}/edit`);
  } else if (key === 'delete') {
    deleteRecord();
  }
};

const deleteRecord = async () => {
  if (!confirm('确定删除此记录？')) return;
  try {
    await gameAPI.deleteRecord(record.value.id);
    message.success('删除成功');
    router.push('/games');
  } catch (error) {
    message.error('删除失败');
  }
};

const handleUploadFinish = ({ event }) => {
  const response = JSON.parse(event.target.response);
  if (response) {
    message.success('上传成功');
    loadRecord();
  }
};

const previewImage = (url) => {
  window.open(url, '_blank');
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

onMounted(() => {
  loadRecord();
  loadComments();
});
</script>
