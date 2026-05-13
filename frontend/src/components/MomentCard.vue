<template>
  <div class="moment-card" :class="{ 'is-folded': isFolded }">
    <!-- 作者信息 -->
    <div class="moment-header">
      <n-avatar
        :src="moment.author?.avatar"
        :size="40"
        round
        class="cursor-pointer"
        @click="goToProfile"
      />
      <div class="author-info">
        <div class="author-name" @click="goToProfile">
          {{ moment.author?.profile?.nickname || moment.author?.username }}
        </div>
        <div class="moment-meta">
          <span class="time">{{ formatTime(moment.createdAt) }}</span>
          <span v-if="moment.mood" class="mood-tag">{{ getMoodEmoji(moment.mood) }}</span>
          <span v-if="moment.photoType" class="type-tag">{{ getPhotoTypeLabel(moment.photoType) }}</span>
        </div>
      </div>
      <n-dropdown v-if="isOwner" :options="dropdownOptions" @select="handleDropdown">
        <n-button quaternary circle size="small">
          <template #icon><n-icon><EllipsisHorizontal /></n-icon></template>
        </n-button>
      </n-dropdown>
    </div>

    <!-- 内容区域 -->
    <div class="moment-content" @click="goToDetail">
      <p v-if="moment.content" class="text-content">{{ moment.content }}</p>

      <!-- 图片展示 -->
      <div v-if="moment.images?.length > 0" class="image-grid" :class="getImageGridClass(moment.images.length)">
        <div
          v-for="(img, idx) in displayImages"
          :key="idx"
          class="image-item"
          @click.stop="previewImage(idx)"
        >
          <img :src="getThumbUrl(img, 'card')" :alt="`图片${idx + 1}`" loading="lazy" />
          <div v-if="idx === 3 && moment.images.length > 4" class="more-overlay">
            +{{ moment.images.length - 4 }}
          </div>
        </div>
      </div>

      <!-- 关联内容 -->
      <div v-if="moment.diary" class="linked-content diary" @click.stop="goToDiary">
        <n-icon><BookOutline /></n-icon>
        <span>日记：{{ moment.diary.title }}</span>
      </div>
      <div v-if="moment.htmlWork" class="linked-content work" @click.stop="goToWork">
        <n-icon><CodeSlashOutline /></n-icon>
        <span>作品：{{ moment.htmlWork.title }}</span>
      </div>
    </div>

    <!-- 互动区域 -->
    <div class="moment-actions">
      <div class="action-btn" :class="{ active: isLiked }" @click="handleLike">
        <n-icon><Heart /></n-icon>
        <span>{{ moment.likesCount || moment._count?.likes || 0 }}</span>
      </div>
      <div class="action-btn" @click="toggleComments">
        <n-icon><ChatbubbleOutline /></n-icon>
        <span>{{ moment.commentsCount || moment._count?.comments || 0 }}</span>
      </div>
      <div class="action-btn" @click="handleShare">
        <n-icon><ShareSocialOutline /></n-icon>
      </div>
    </div>

    <!-- 评论区域 -->
    <div v-if="showComments" class="moment-comments">
      <!-- 点赞用户 -->
      <div v-if="likedUsers.length > 0" class="likes-row">
        <n-icon size="14"><Heart /></n-icon>
        <span>{{ likedUsers.slice(0, 5).map(u => u.nickname || u.username).join('、') }}</span>
        <span v-if="likedUsers.length > 5">等{{ likedUsers.length }}人</span>
      </div>

      <!-- 评论列表 -->
      <div v-if="displayComments.length > 0" class="comments-list">
        <div v-for="comment in displayComments" :key="comment.id" class="comment-item">
          <span class="comment-author" @click.stop="goToUserProfile(comment.author.id)">
            {{ comment.author.profile?.nickname || comment.author.username }}
          </span>
          <span v-if="comment.replyTo" class="reply-to">
            回复 <span class="comment-author">{{ comment.replyTo.profile?.nickname || comment.replyTo.username }}</span>
          </span>
          <span class="comment-text">：{{ comment.content }}</span>
        </div>
        <div v-if="totalComments > 3" class="view-more-comments" @click="goToDetail">
          查看全部{{ totalComments }}条评论
        </div>
      </div>

      <!-- 评论输入 -->
      <div class="comment-input">
        <n-input
          v-model:value="commentText"
          placeholder="写评论..."
          size="small"
          @keyup.enter="submitComment"
        />
        <n-button
          type="primary"
          size="small"
          :disabled="!commentText.trim()"
          @click="submitComment"
        >
          发送
        </n-button>
      </div>
    </div>

    <!-- 折叠提示 -->
    <div v-if="isFolded" class="fold-indicator" @click="$emit('unfold')">
      <span>还有 {{ foldCount }} 条动态</span>
      <n-icon><ChevronDown /></n-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { postAPI, photoAPI } from '@/api';
import { useImageUrl } from '@/composables/useImageUrl';
import EllipsisHorizontal from '@vicons/ionicons5/es/EllipsisHorizontal'
import Heart from '@vicons/ionicons5/es/Heart'
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'
import ShareSocialOutline from '@vicons/ionicons5/es/ShareSocialOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import CodeSlashOutline from '@vicons/ionicons5/es/CodeSlashOutline'
import ChevronDown from '@vicons/ionicons5/es/ChevronDown'

const props = defineProps({
  moment: { type: Object, required: true },
  isFolded: { type: Boolean, default: false },
  foldCount: { type: Number, default: 0 },
  currentUserId: { type: String, default: '' },
});

const emit = defineEmits(['refresh', 'unfold', 'deleted']);

const router = useRouter();
const message = useMessage();

// 状态
const showComments = ref(false);
const commentText = ref('');
const isLiked = ref(props.moment.isLiked || props.moment.likes?.some(l => l.userId === props.currentUserId));
const likedUsers = ref([]);

// 心情选项
const moodOptions = {
  happy: '😄', excited: '🤩', calm: '😊',
  sad: '😢', angry: '😠', anxious: '😰',
};

// 照片类型选项
const photoTypeLabels = {
  selfie: '自拍', scenery: '风景', friends: '朋友',
  food: '美食', pet: '宠物', activity: '活动', other: '其他',
};

// 计算属性
const isOwner = computed(() => props.moment.authorId === props.currentUserId || props.moment.author?.id === props.currentUserId);
const displayImages = computed(() => props.moment.images?.slice(0, 4) || []);
const displayComments = computed(() => props.moment.comments?.slice(0, 3) || []);
const totalComments = computed(() => props.moment.commentsCount || props.moment._count?.comments || 0);

const dropdownOptions = [
  { label: '删除', key: 'delete' },
];

// 方法
const getMoodEmoji = (mood) => moodOptions[mood] || '';
const getPhotoTypeLabel = (type) => photoTypeLabels[type] || '';

const { getThumbUrl, getImageUrl } = useImageUrl();

const getImageGridClass = (count) => {
  if (count === 1) return 'grid-1';
  if (count === 2) return 'grid-2';
  if (count === 3) return 'grid-3';
  return 'grid-4';
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (year === now.getFullYear()) {
    return `${month}月${day}日`;
  }
  return `${year}年${month}月${day}日`;
};

const goToProfile = () => {
  router.push(`/user/${props.moment.author?.id || props.moment.authorId}`);
};

const goToUserProfile = (userId) => {
  router.push(`/user/${userId}`);
};

const goToDetail = () => {
  if (props.moment.dynamicType === 'photo') {
    router.push(`/photos?id=${props.moment.id}`);
  } else {
    router.push(`/timeline?id=${props.moment.id}`);
  }
};

const goToDiary = () => {
  if (props.moment.diary?.id) {
    router.push(`/diaries/${props.moment.diary.id}`);
  }
};

const goToWork = () => {
  if (props.moment.htmlWork?.id) {
    router.push(`/works/${props.moment.htmlWork.id}`);
  }
};

const previewImage = (idx) => {
  // 可以使用 naive-ui 的图片预览组件
  window.open(getImageUrl(props.moment.images[idx]), '_blank');
};

const handleLike = async () => {
  try {
    const api = props.moment.dynamicType === 'photo' ? photoAPI : postAPI;
    const res = await api.toggleLike(props.moment.id);
    if (res.success !== false) {
      isLiked.value = res.liked ?? !isLiked.value;
    }
  } catch (error) {
    console.error('点赞失败:', error);
  }
};

const toggleComments = () => {
  showComments.value = !showComments.value;
};

const submitComment = async () => {
  if (!commentText.value.trim()) return;
  try {
    let res;
    if (props.moment.dynamicType === 'photo') {
      res = await photoAPI.comment(props.moment.id, { content: commentText.value.trim() });
    } else {
      res = await postAPI.addComment(props.moment.id, commentText.value.trim());
    }
    if (res.success !== false) {
      commentText.value = '';
      emit('refresh');
    }
  } catch (error) {
    console.error('评论失败:', error);
  }
};

const handleShare = () => {
  const url = `${window.location.origin}/timeline?id=${props.moment.id}`;
  navigator.clipboard?.writeText(url);
  message.success('链接已复制');
};

const handleDropdown = async (key) => {
  if (key === 'delete') {
    try {
      if (props.moment.dynamicType === 'photo') {
        await photoAPI.delete(props.moment.id);
      } else {
        await postAPI.deletePost(props.moment.id);
      }
      message.success('删除成功');
      emit('deleted', props.moment.id);
    } catch (error) {
      message.error('删除失败');
    }
  }
};
</script>

<style scoped>
.moment-card {
  background: var(--n-card-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--n-border-color);
  min-height: 160px;
  max-height: 360px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.moment-card.is-folded {
  opacity: 0.6;
}

.moment-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  color: var(--n-text-color);
}

.author-name:hover {
  color: var(--n-primary-color);
}

.moment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.mood-tag {
  font-size: 14px;
}

.type-tag {
  background: var(--n-action-color);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.moment-content {
  cursor: pointer;
  flex: 1;
  overflow: hidden;
}

.text-content {
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 8px;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 图片网格 */
.image-grid {
  display: grid;
  gap: 4px;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
}

.image-grid.grid-1 {
  grid-template-columns: 1fr;
  max-width: 300px;
}

.image-grid.grid-2 {
  grid-template-columns: repeat(2, 1fr);
  max-width: 400px;
}

.image-grid.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.image-grid.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  max-width: 400px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.image-item:hover img {
  transform: scale(1.05);
}

.more-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
}

/* 关联内容 */
.linked-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-top: 12px;
  background: var(--n-action-color);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.linked-content:hover {
  background: var(--n-border-color);
}

/* 互动区域 */
.moment-actions {
  display: flex;
  gap: 24px;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px solid var(--n-border-color);
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--n-text-color-3);
  font-size: 13px;
  transition: color 0.2s;
}

.action-btn:hover {
  color: var(--n-primary-color);
}

.action-btn.active {
  color: #f56c6c;
}

/* 评论区域 */
.moment-comments {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--n-border-color);
}

.likes-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--n-text-color-2);
  margin-bottom: 8px;
}

.likes-row .n-icon {
  color: #f56c6c;
}

.comments-list {
  font-size: 14px;
}

.comment-item {
  margin-bottom: 6px;
  line-height: 1.5;
}

.comment-author {
  color: var(--n-primary-color);
  cursor: pointer;
}

.comment-author:hover {
  text-decoration: underline;
}

.reply-to {
  color: var(--n-text-color-3);
}

.comment-text {
  color: var(--n-text-color);
}

.view-more-comments {
  color: var(--n-text-color-3);
  cursor: pointer;
  font-size: 13px;
  margin-top: 8px;
}

.view-more-comments:hover {
  color: var(--n-primary-color);
}

.comment-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.comment-input .n-input {
  flex: 1;
}

/* 折叠提示 */
.fold-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  margin-top: 8px;
  color: var(--n-primary-color);
  cursor: pointer;
  font-size: 13px;
}

.fold-indicator:hover {
  background: var(--n-action-color);
  border-radius: 8px;
}
</style>
