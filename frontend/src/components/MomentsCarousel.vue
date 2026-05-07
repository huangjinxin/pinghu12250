<template>
  <div class="moments-carousel card">
    <div class="carousel-header">
      <div class="header-left">
        <n-icon size="20" color="#ec4899"><People /></n-icon>
        <h2 class="text-lg font-semibold text-gray-800">朋友动态</h2>
      </div>
      <router-link to="/moments" class="view-more">
        查看更多 →
      </router-link>
    </div>

    <n-spin :show="loading">
      <div v-if="moments.length > 0" class="carousel-container" ref="carouselRef">
        <div
          class="carousel-track"
          :class="{ dragging: isDragging }"
          :style="trackStyle"
        >
          <div
            v-for="moment in moments"
            :key="moment.id"
            class="carousel-item"
            @click="handleItemClick(moment)"
          >
            <div class="moment-mini-card">
              <!-- 类型标签（仅作品类型显示） -->
              <div v-if="moment.type && !['post', 'photo'].includes(moment.type)" class="type-badge">
                {{ getTypeName(moment.type) }}
              </div>

              <!-- 作者信息 -->
              <div class="mini-header">
                <n-avatar :src="moment.author?.avatar" :size="32" round />
                <div class="mini-author">
                  <span class="name">{{ moment.author?.name || moment.author?.profile?.nickname || moment.author?.username }}</span>
                  <span class="time">{{ formatTime(moment.createdAt) }}</span>
                </div>
                <span v-if="moment.mood" class="mood">{{ getMoodEmoji(moment.mood) }}</span>
              </div>

              <!-- 标题（作品类型） -->
              <h4 v-if="moment.title && !['post', 'photo'].includes(moment.type)" class="mini-title">{{ moment.title }}</h4>

              <!-- 内容预览 -->
              <p v-if="moment.content" class="mini-content">{{ moment.content }}</p>

              <!-- 图片预览 -->
              <div v-if="getPreviewImage(moment)" class="mini-images">
                <img :src="getImageUrl(getPreviewImage(moment))" :alt="moment.content || moment.title" />
                <span v-if="moment.images?.length > 1" class="image-count">+{{ moment.images.length - 1 }}</span>
              </div>

              <!-- 互动数据 -->
              <div class="mini-stats">
                <span class="stat-item" :class="{ liked: moment.isLiked }">
                  <n-icon size="14"><Heart /></n-icon>
                  {{ moment.likesCount || moment._count?.likes || 0 }}
                </span>
                <span class="stat-item">
                  <n-icon size="14"><ChatbubbleOutline /></n-icon>
                  {{ moment.commentsCount || moment._count?.comments || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 导航点 -->
        <div class="carousel-dots" v-if="moments.length > 1">
          <span
            v-for="(_, idx) in moments"
            :key="idx"
            class="dot"
            :class="{ active: idx === currentIndex }"
            @click="goToSlide(idx)"
          ></span>
        </div>

        <!-- 左右箭头 -->
        <button v-if="moments.length > 1" class="nav-btn prev" @click="prevSlide">
          <n-icon><ChevronBack /></n-icon>
        </button>
        <button v-if="moments.length > 1" class="nav-btn next" @click="nextSlide">
          <n-icon><ChevronForward /></n-icon>
        </button>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <p>还没有动态</p>
        <router-link to="/moments" class="goto-link">去发布第一条 →</router-link>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { publicAPI } from '@/api';
import People from '@vicons/ionicons5/es/People'
import Heart from '@vicons/ionicons5/es/Heart'
import ChatbubbleOutline from '@vicons/ionicons5/es/ChatbubbleOutline'
import ChevronBack from '@vicons/ionicons5/es/ChevronBack'
import ChevronForward from '@vicons/ionicons5/es/ChevronForward'

const router = useRouter();

// 状态
const loading = ref(false);
const moments = ref([]);
const currentIndex = ref(0);
const carouselRef = ref(null);
const isDragging = ref(false);
const dragOffset = ref(0);
let autoPlayTimer = null;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isSwiping = false;
let hasMoved = false;

// 心情映射
const moodEmojis = {
  happy: '😄', excited: '🤩', calm: '😊',
  sad: '😢', angry: '😠', anxious: '😰',
};

// 方法
const getMoodEmoji = (mood) => moodEmojis[mood] || '';

const getTypeName = (type) => {
  const names = {
    'gallery': '画廊',
    'recitation': '朗诵',
    'diary-analysis': '日记分析',
    'poetry': '诗词'
  };
  return names[type] || '';
};

const getPreviewImage = (moment) => {
  // 优先使用 preview，然后是 images 数组
  if (moment.preview) return moment.preview;
  if (moment.images?.length > 0) return moment.images[0];
  return null;
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // 使用相对路径，让浏览器自动拼接当前域名
  return path;
};

// 轮播轨道样式（支持拖动偏移）
const trackStyle = computed(() => {
  const baseOffset = currentIndex.value * 100;
  const dragPercent = carouselRef.value ? (dragOffset.value / carouselRef.value.offsetWidth) * 100 : 0;
  return {
    transform: `translateX(calc(-${baseOffset}% + ${dragOffset.value}px))`
  };
});

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
};

const loadMoments = async () => {
  loading.value = true;
  try {
    const res = await publicAPI.getUnifiedFeed({ limit: 10 });
    if (res.data?.items) {
      moments.value = res.data.items;
    }
  } catch (error) {
    console.error('加载动态失败:', error);
  } finally {
    loading.value = false;
  }
};

const goToSlide = (idx) => {
  currentIndex.value = idx;
  resetAutoPlay();
};

const prevSlide = () => {
  currentIndex.value = currentIndex.value > 0 ? currentIndex.value - 1 : moments.value.length - 1;
  resetAutoPlay();
};

const nextSlide = () => {
  currentIndex.value = currentIndex.value < moments.value.length - 1 ? currentIndex.value + 1 : 0;
  resetAutoPlay();
};

const goToMoment = (moment) => {
  // 根据类型跳转到不同页面
  switch (moment.type) {
    case 'photo':
      router.push(`/photos?id=${moment.id}`);
      break;
    case 'gallery':
    case 'recitation':
      router.push('/works');
      break;
    case 'diary-analysis':
      router.push('/works?tab=diary');
      break;
    case 'poetry':
      router.push('/works?tab=poetry');
      break;
    default:
      router.push('/moments');
  }
};

// 处理点击（滑动时不触发）
const handleItemClick = (moment) => {
  if (!hasMoved) {
    goToMoment(moment);
  }
};

const startAutoPlay = () => {
  if (moments.value.length > 1) {
    autoPlayTimer = setInterval(nextSlide, 5000);
  }
};

const resetAutoPlay = () => {
  clearInterval(autoPlayTimer);
  startAutoPlay();
};

// 触摸滑动支持（优化版）
const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
  isDragging.value = true;
  hasMoved = false;
  isSwiping = false;
  clearInterval(autoPlayTimer);
};

const handleTouchMove = (e) => {
  if (!isDragging.value) return;

  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;
  const diffX = touchX - touchStartX;
  const diffY = touchY - touchStartY;

  // 判断是水平滑动还是垂直滑动
  if (!isSwiping && Math.abs(diffX) > 5) {
    isSwiping = Math.abs(diffX) > Math.abs(diffY);
  }

  if (isSwiping) {
    e.preventDefault(); // 阻止页面滚动
    hasMoved = true;

    // 边界阻尼效果
    let offset = diffX;
    if ((currentIndex.value === 0 && diffX > 0) ||
        (currentIndex.value === moments.value.length - 1 && diffX < 0)) {
      offset = diffX * 0.3; // 边界时阻力更大
    }
    dragOffset.value = offset;
  }
};

const handleTouchEnd = (e) => {
  if (!isDragging.value) return;

  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;
  const duration = Date.now() - touchStartTime;
  const velocity = Math.abs(diff) / duration;

  isDragging.value = false;
  dragOffset.value = 0;

  // 快速滑动或滑动距离超过阈值时切换
  const threshold = carouselRef.value ? carouselRef.value.offsetWidth * 0.2 : 50;
  const shouldSwitch = Math.abs(diff) > threshold || (velocity > 0.3 && Math.abs(diff) > 20);

  if (shouldSwitch && isSwiping) {
    if (diff > 0 && currentIndex.value < moments.value.length - 1) {
      nextSlide();
    } else if (diff < 0 && currentIndex.value > 0) {
      prevSlide();
    } else {
      startAutoPlay();
    }
  } else {
    startAutoPlay();
  }
};

onMounted(() => {
  loadMoments();
  if (carouselRef.value) {
    carouselRef.value.addEventListener('touchstart', handleTouchStart, { passive: true });
    carouselRef.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    carouselRef.value.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
});

onUnmounted(() => {
  clearInterval(autoPlayTimer);
  if (carouselRef.value) {
    carouselRef.value.removeEventListener('touchstart', handleTouchStart);
    carouselRef.value.removeEventListener('touchmove', handleTouchMove);
    carouselRef.value.removeEventListener('touchend', handleTouchEnd);
  }
});
</script>

<style scoped>
.moments-carousel {
  padding: 16px;
}

.carousel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h2 {
  margin: 0;
}

.view-more {
  font-size: 12px;
  color: var(--n-primary-color);
  text-decoration: none;
}

.view-more:hover {
  text-decoration: underline;
}

.carousel-container {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  touch-action: pan-y pinch-zoom;
  user-select: none;
  -webkit-user-select: none;
}

.carousel-track {
  display: flex;
  transition: transform 0.3s ease;
  will-change: transform;
}

.carousel-track.dragging {
  transition: none;
}

.carousel-item {
  min-width: 100%;
  cursor: pointer;
}

.moment-mini-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 14px;
  transition: transform 0.2s;
}

.moment-mini-card:hover {
  transform: scale(1.01);
}

.type-badge {
  display: inline-block;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 8px;
  font-weight: 500;
}

.mini-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mini-author {
  flex: 1;
  min-width: 0;
}

.mini-author .name {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--n-text-color);
}

.mini-author .time {
  font-size: 11px;
  color: var(--n-text-color-3);
}

.mood {
  font-size: 18px;
}

.mini-content {
  font-size: 14px;
  line-height: 1.5;
  color: var(--n-text-color);
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mini-images {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
  max-height: 160px;
}

.mini-images img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
}

.image-count {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.mini-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.stat-item.liked {
  color: #f56c6c;
}

/* 导航点 */
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d1d5db;
  cursor: pointer;
  transition: all 0.2s;
}

.dot.active {
  width: 18px;
  border-radius: 3px;
  background: var(--n-primary-color);
}

/* 导航箭头 */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.carousel-container:hover .nav-btn {
  opacity: 1;
}

.nav-btn.prev {
  left: 8px;
}

.nav-btn.next {
  right: 8px;
}

.nav-btn:hover {
  background: white;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--n-text-color-3);
}

.goto-link {
  color: var(--n-primary-color);
  text-decoration: none;
  font-size: 13px;
}
</style>
