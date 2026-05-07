<template>
  <div class="photos-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <h2>照片分享</h2>
      <n-button type="primary" @click="showPublish = true">
        <template #icon><n-icon><CameraOutline /></n-icon></template>
        发布照片
      </n-button>
    </div>

    <!-- 照片列表 -->
    <n-spin :show="loading">
      <div class="photo-grid" v-if="photos.length > 0">
        <div
          v-for="photo in photos"
          :key="photo.id"
          class="photo-card"
          @click="viewPhoto(photo)"
        >
          <div class="photo-preview">
            <img :src="getImageUrl(photo.images[0])" :alt="photo.content" />
            <div class="photo-count" v-if="photo.images.length > 1">
              +{{ photo.images.length - 1 }}
            </div>
            <div class="mood-tag" v-if="photo.mood">
              {{ getMoodEmoji(photo.mood) }}
            </div>
          </div>
          <div class="photo-info">
            <div class="author">
              <n-avatar :src="photo.author.avatar" :size="24" round />
              <span>{{ photo.author.profile?.nickname || photo.author.username }}</span>
            </div>
            <p class="content" v-if="photo.content">{{ photo.content }}</p>
            <div class="photo-meta">
              <span>{{ formatTime(photo.createdAt) }}</span>
              <span class="stats">
                <span class="likes" :class="{ liked: photo.isLiked }">
                  <n-icon><HeartOutline /></n-icon> {{ photo.likesCount }}
                </span>
                <span class="comments">
                  <n-icon><ChatbubbleOutline /></n-icon> {{ photo.commentsCount }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <n-empty v-else description="还没有照片分享，快来发布第一张吧" />
    </n-spin>

    <!-- 发布弹窗 -->
    <n-modal v-model:show="showPublish" preset="card" title="发布照片" style="width: 500px; max-width: 90vw;">
      <n-form ref="formRef" :model="form" label-placement="top">
        <!-- 照片上传 -->
        <n-form-item label="选择照片（最多9张）">
          <n-upload
            v-model:file-list="form.files"
            list-type="image-card"
            :max="9"
            accept="image/*"
            :default-upload="false"
            @change="handleFileChange"
          >
            <n-icon size="24"><AddOutline /></n-icon>
          </n-upload>
        </n-form-item>

        <!-- 文字描述 -->
        <n-form-item label="说点什么（可选）">
          <n-input
            v-model:value="form.content"
            type="textarea"
            placeholder="此刻的心情..."
            :maxlength="200"
            show-count
            :rows="2"
          />
        </n-form-item>

        <!-- 心情选择 -->
        <n-form-item label="此刻心情">
          <div class="mood-selector">
            <div
              v-for="mood in moodOptions"
              :key="mood.value"
              class="mood-item"
              :class="{ selected: form.mood === mood.value }"
              @click="form.mood = form.mood === mood.value ? null : mood.value"
            >
              <span class="emoji">{{ mood.emoji }}</span>
              <span class="label">{{ mood.label }}</span>
            </div>
          </div>
        </n-form-item>

        <!-- 照片类型 -->
        <n-form-item label="这是一张">
          <n-radio-group v-model:value="form.photoType">
            <n-radio-button
              v-for="type in photoTypeOptions"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </n-radio-button>
          </n-radio-group>
        </n-form-item>

        <!-- 隐私设置 -->
        <n-form-item label="谁可以看">
          <n-switch v-model:value="form.isPublic" />
          <span style="margin-left: 8px;">{{ form.isPublic ? '公开' : '仅自己' }}</span>
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

    <!-- 照片详情弹窗 -->
    <n-modal v-model:show="showDetail" preset="card" style="width: 800px; max-width: 95vw;">
      <template #header>
        <div class="detail-header" v-if="selectedPhoto">
          <n-avatar :src="selectedPhoto.author.avatar" :size="32" round />
          <div class="author-info">
            <span class="name">{{ selectedPhoto.author.profile?.nickname || selectedPhoto.author.username }}</span>
            <span class="time">{{ formatTime(selectedPhoto.createdAt) }}</span>
          </div>
        </div>
      </template>

      <div class="photo-detail" v-if="selectedPhoto">
        <!-- 图片轮播 -->
        <n-carousel v-if="selectedPhoto.images.length > 1" show-arrow>
          <img
            v-for="(img, idx) in selectedPhoto.images"
            :key="idx"
            :src="getImageUrl(img)"
            class="detail-image"
          />
        </n-carousel>
        <img
          v-else
          :src="getImageUrl(selectedPhoto.images[0])"
          class="detail-image single"
        />

        <!-- 信息 -->
        <div class="detail-info">
          <div class="tags">
            <n-tag v-if="selectedPhoto.mood" :bordered="false" type="info">
              {{ getMoodEmoji(selectedPhoto.mood) }} {{ getMoodLabel(selectedPhoto.mood) }}
            </n-tag>
            <n-tag v-if="selectedPhoto.photoType" :bordered="false">
              {{ getPhotoTypeLabel(selectedPhoto.photoType) }}
            </n-tag>
          </div>
          <p class="content" v-if="selectedPhoto.content">{{ selectedPhoto.content }}</p>

          <!-- 互动 -->
          <div class="actions">
            <n-button
              quaternary
              :type="selectedPhoto.isLiked ? 'error' : 'default'"
              @click="handleLike"
            >
              <template #icon><n-icon><HeartOutline /></n-icon></template>
              {{ selectedPhoto.likesCount }}
            </n-button>
            <n-button quaternary @click="focusComment">
              <template #icon><n-icon><ChatbubbleOutline /></n-icon></template>
              {{ selectedPhoto.commentsCount }}
            </n-button>
          </div>

          <!-- 评论列表 -->
          <div class="comments-section" v-if="selectedPhoto.comments?.length > 0">
            <div v-for="comment in selectedPhoto.comments" :key="comment.id" class="comment-item">
              <n-avatar :src="comment.author.avatar" :size="24" round />
              <div class="comment-content">
                <span class="author">{{ comment.author.profile?.nickname || comment.author.username }}</span>
                <span class="text">{{ comment.content }}</span>
              </div>
            </div>
          </div>

          <!-- 评论输入 -->
          <div class="comment-input">
            <n-input
              ref="commentInputRef"
              v-model:value="commentText"
              placeholder="写评论..."
              @keyup.enter="handleComment"
            />
            <n-button type="primary" :disabled="!commentText.trim()" @click="handleComment">
              发送
            </n-button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { photoAPI } from '@/api';
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'

const message = useMessage();

// 心情选项
const moodOptions = [
  { value: 'happy', emoji: '😄', label: '开心' },
  { value: 'excited', emoji: '🤩', label: '兴奋' },
  { value: 'calm', emoji: '😊', label: '平静' },
  { value: 'sad', emoji: '😢', label: '难过' },
  { value: 'angry', emoji: '😠', label: '生气' },
  { value: 'anxious', emoji: '😰', label: '焦虑' },
];

// 照片类型选项
const photoTypeOptions = [
  { value: 'selfie', label: '自拍' },
  { value: 'scenery', label: '风景' },
  { value: 'friends', label: '朋友' },
  { value: 'food', label: '美食' },
  { value: 'pet', label: '宠物' },
  { value: 'activity', label: '活动' },
  { value: 'other', label: '其他' },
];

// 状态
const loading = ref(false);
const photos = ref([]);
const showPublish = ref(false);
const publishing = ref(false);
const showDetail = ref(false);
const selectedPhoto = ref(null);
const commentText = ref('');
const commentInputRef = ref(null);

// 表单
const form = ref({
  files: [],
  content: '',
  mood: null,
  photoType: 'other',
  isPublic: true,
});

// 获取图片URL
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // 使用相对路径，让浏览器自动拼接当前域名
  return path;
};

// 获取心情emoji
const getMoodEmoji = (mood) => {
  return moodOptions.find(m => m.value === mood)?.emoji || '';
};

// 获取心情标签
const getMoodLabel = (mood) => {
  return moodOptions.find(m => m.value === mood)?.label || '';
};

// 获取照片类型标签
const getPhotoTypeLabel = (type) => {
  return photoTypeOptions.find(t => t.value === type)?.label || '';
};

// 格式化时间
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 加载照片列表
const loadPhotos = async () => {
  loading.value = true;
  try {
    const res = await photoAPI.getList({ limit: 50 });
    if (res.success) {
      photos.value = res.data;
    }
  } catch (error) {
    console.error('加载照片失败:', error);
  } finally {
    loading.value = false;
  }
};

// 处理文件变化
const handleFileChange = ({ fileList }) => {
  form.value.files = fileList;
};

// 发布照片
const handlePublish = async () => {
  if (form.value.files.length === 0) {
    message.warning('请选择至少一张照片');
    return;
  }

  publishing.value = true;
  try {
    const formData = new FormData();

    // 添加照片文件
    form.value.files.forEach(file => {
      formData.append('photos', file.file);
    });

    // 添加其他字段
    formData.append('content', form.value.content);
    if (form.value.mood) formData.append('mood', form.value.mood);
    formData.append('photoType', form.value.photoType);
    formData.append('isPublic', form.value.isPublic);

    const res = await photoAPI.create(formData);
    if (res.success) {
      message.success('发布成功');
      showPublish.value = false;
      // 重置表单
      form.value = {
        files: [],
        content: '',
        mood: null,
        photoType: 'other',
        isPublic: true,
      };
      // 刷新列表
      loadPhotos();
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

// 查看照片详情
const viewPhoto = async (photo) => {
  try {
    const res = await photoAPI.getDetail(photo.id);
    if (res.success) {
      selectedPhoto.value = res.data;
      showDetail.value = true;
    }
  } catch (error) {
    console.error('获取详情失败:', error);
  }
};

// 点赞
const handleLike = async () => {
  if (!selectedPhoto.value) return;
  try {
    const res = await photoAPI.toggleLike(selectedPhoto.value.id);
    if (res.success) {
      selectedPhoto.value.isLiked = res.liked;
      selectedPhoto.value.likesCount += res.liked ? 1 : -1;
      // 更新列表
      const idx = photos.value.findIndex(p => p.id === selectedPhoto.value.id);
      if (idx !== -1) {
        photos.value[idx].isLiked = res.liked;
        photos.value[idx].likesCount = selectedPhoto.value.likesCount;
      }
    }
  } catch (error) {
    console.error('点赞失败:', error);
  }
};

// 聚焦评论输入
const focusComment = () => {
  commentInputRef.value?.focus();
};

// 发送评论
const handleComment = async () => {
  if (!commentText.value.trim() || !selectedPhoto.value) return;
  try {
    const res = await photoAPI.comment(selectedPhoto.value.id, {
      content: commentText.value.trim(),
    });
    if (res.success) {
      selectedPhoto.value.comments = [res.data, ...(selectedPhoto.value.comments || [])];
      selectedPhoto.value.commentsCount++;
      commentText.value = '';
      // 更新列表
      const idx = photos.value.findIndex(p => p.id === selectedPhoto.value.id);
      if (idx !== -1) {
        photos.value[idx].commentsCount = selectedPhoto.value.commentsCount;
      }
    }
  } catch (error) {
    console.error('评论失败:', error);
  }
};

onMounted(() => {
  loadPhotos();
});
</script>

<style scoped>
.photos-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.photo-card {
  background: var(--n-card-color);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--n-border-color);
}

.photo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.photo-preview {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.mood-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 24px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.photo-info {
  padding: 12px;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.author span {
  font-size: 14px;
  font-weight: 500;
}

.content {
  font-size: 14px;
  color: var(--n-text-color-2);
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.stats {
  display: flex;
  gap: 12px;
}

.stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.likes.liked {
  color: #f56c6c;
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

/* 详情弹窗 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-info .name {
  font-weight: 500;
}

.author-info .time {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.detail-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  background: #000;
  border-radius: 8px;
}

.detail-image.single {
  display: block;
}

.detail-info {
  margin-top: 16px;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--n-border-color);
  border-bottom: 1px solid var(--n-border-color);
  margin: 12px 0;
}

.comments-section {
  max-height: 200px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
}

.comment-content {
  flex: 1;
}

.comment-content .author {
  font-weight: 500;
  margin-right: 8px;
}

.comment-content .text {
  color: var(--n-text-color-2);
}

.comment-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.comment-input .n-input {
  flex: 1;
}
</style>
