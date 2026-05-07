<template>
  <div class="textbook-public" :class="{ 'fullscreen': isFullscreen, 'sidebar-collapsed': sidebarCollapsed }">
    <!-- 顶部导航栏 -->
    <header class="top-nav" v-show="!isFullscreen || showControls">
      <div class="nav-left">
        <h1>📚 电子课本</h1>
      </div>
      <div class="nav-right">
        <template v-if="!selectedTextbook">
          <n-button v-if="isLoggedIn" type="primary" size="small" @click="goToWorkspace">
            共建工具区
          </n-button>
          <n-button v-else text @click="goToLogin">
            登录
          </n-button>
        </template>
        <n-button text @click="toggleFullscreen" v-if="selectedTextbook">
          <n-icon :component="isFullscreen ? Contract : Expand" />
        </n-button>
      </div>
    </header>

    <!-- 教材选择页面 -->
    <div class="textbook-select" v-if="!selectedTextbook">
      <n-spin :show="loadingTextbooks">
        <n-empty v-if="!loadingTextbooks && textbooks.length === 0" description="暂无可用教材" />

        <div class="textbook-grid" v-else>
          <div
            v-for="textbook in textbooks"
            :key="textbook.id"
            class="book-slot"
            @click="selectTextbook(textbook)"
          >
            <!-- 书本主体（背景层） -->
            <div class="book-body">
              <img
                v-if="coverImages[textbook.id]"
                :src="coverImages[textbook.id]"
                class="cover-image"
                alt="封面"
              />
              <div v-else class="cover-placeholder" :class="textbook.subject.toLowerCase()">
                <div class="subject-badge">
                  {{ subjectIcon[textbook.subject] }}
                </div>
                <span class="loading-text">{{ textbook.pdfUrl ? '加载中...' : '暂无封面' }}</span>
              </div>
            </div>

            <!-- 插槽前挡板（前景层） -->
            <div class="slot-front">
              <h3 class="book-title">{{ textbook.title }}</h3>
              <p class="book-meta">{{ textbook.version }} · {{ textbook.grade }}年级{{ semesterMap[textbook.semester] }}</p>
              <div class="lesson-count">{{ getTotalLessons(textbook) }} 篇课文</div>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 阅读界面 -->
    <div class="reader-container" v-else>
      <!-- 左侧目录 -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-header">
          <div class="sidebar-title" v-show="!sidebarCollapsed">
            <n-button text size="small" @click="backToSelect">
              <n-icon><ArrowBack /></n-icon>
            </n-button>
            <span>{{ selectedTextbook.title }}</span>
          </div>
          <n-button text @click="toggleSidebar" class="toggle-btn">
            <n-icon :component="sidebarCollapsed ? MenuOutline : CloseOutline" />
          </n-button>
        </div>

        <div class="sidebar-content" v-show="!sidebarCollapsed">
          <div
            v-for="unit in selectedTextbook.units"
            :key="unit.id"
            class="toc-unit"
          >
            <div class="unit-title">{{ unit.title }}</div>
            <div class="lesson-list">
              <div
                v-for="lesson in unit.lessons"
                :key="lesson.id"
                class="lesson-item"
                :class="{ active: currentLesson?.id === lesson.id }"
                @click="selectLesson(lesson)"
              >
                <span class="lesson-num">{{ lesson.lessonNumber }}</span>
                <span class="lesson-name">{{ lesson.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="content-area" @click="handleContentClick">
        <n-spin :show="loadingLesson">
          <div v-if="currentLesson" class="lesson-content">
            <!-- 课文标题 -->
            <div class="content-header">
              <h2>{{ currentLesson.title }}</h2>
              <p class="breadcrumb">
                {{ selectedTextbook.title }} > {{ currentLesson.unit?.title }}
              </p>
            </div>

            <!-- 课文HTML内容 -->
            <div class="html-content" v-html="currentLesson.htmlContent"></div>

            <!-- 底部导航 -->
            <div class="lesson-nav">
              <n-button
                :disabled="!prevLesson"
                @click="goToLesson(prevLesson)"
                size="large"
              >
                <template #icon>
                  <n-icon><ChevronBack /></n-icon>
                </template>
                上一课
              </n-button>

              <span class="page-info">
                {{ currentLessonIndex + 1 }} / {{ allLessons.length }}
              </span>

              <n-button
                :disabled="!nextLesson"
                @click="goToLesson(nextLesson)"
                size="large"
              >
                下一课
                <template #icon>
                  <n-icon><ChevronForward /></n-icon>
                </template>
              </n-button>
            </div>
          </div>

          <n-empty v-else description="请从左侧目录选择课文" class="empty-hint" />
        </n-spin>
      </main>
    </div>

    <!-- 全屏模式下的控制条 -->
    <div class="fullscreen-controls" v-if="isFullscreen && showControls">
      <n-button text @click="toggleSidebar">
        <n-icon><MenuOutline /></n-icon>
      </n-button>
      <span class="lesson-title">{{ currentLesson?.title }}</span>
      <n-button text @click="toggleFullscreen">
        <n-icon><Contract /></n-icon>
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import ArrowBack from '@vicons/ionicons5/es/ArrowBack'
import Expand from '@vicons/ionicons5/es/Expand'
import Contract from '@vicons/ionicons5/es/Contract'
import ChevronBack from '@vicons/ionicons5/es/ChevronBack'
import ChevronForward from '@vicons/ionicons5/es/ChevronForward'
import MenuOutline from '@vicons/ionicons5/es/MenuOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// 计算是否已登录
const isLoggedIn = computed(() => authStore.isAuthenticated);

// 状态
const loadingTextbooks = ref(false);
const loadingLesson = ref(false);
const textbooks = ref([]);
const selectedTextbook = ref(null);
const currentLesson = ref(null);

// UI 状态
const sidebarCollapsed = ref(false);
const isFullscreen = ref(false);
const showControls = ref(true);
let controlsTimer = null;

// 映射
const subjectIcon = {
  CHINESE: '语',
  MATH: '数',
  ENGLISH: '英',
  SCIENCE: '科',
  PHYSICS: '物',
  CHEMISTRY: '化',
  BIOLOGY: '生',
  HISTORY: '史',
  GEOGRAPHY: '地',
  POLITICS: '政',
  MUSIC: '音',
  ART: '美',
  PE: '体',
  IT: '信',
  MORAL: '德',
};

const semesterMap = {
  UP: '上册',
  DOWN: '下册',
  FULL: '全册',
};

// 封面图片
const coverImages = ref({});

// 计算属性
const allLessons = computed(() => {
  if (!selectedTextbook.value) return [];
  const lessons = [];
  selectedTextbook.value.units.forEach(unit => {
    unit.lessons.forEach(lesson => {
      lessons.push({ ...lesson, unit });
    });
  });
  return lessons;
});

const currentLessonIndex = computed(() => {
  if (!currentLesson.value) return -1;
  return allLessons.value.findIndex(l => l.id === currentLesson.value.id);
});

const prevLesson = computed(() => {
  if (currentLessonIndex.value <= 0) return null;
  return allLessons.value[currentLessonIndex.value - 1];
});

const nextLesson = computed(() => {
  if (currentLessonIndex.value < 0 || currentLessonIndex.value >= allLessons.value.length - 1) return null;
  return allLessons.value[currentLessonIndex.value + 1];
});

// 方法
const goToLogin = () => {
  router.push('/login');
};

const goToWorkspace = () => {
  router.push('/textbook/workspace');
};

const loadTextbooks = async () => {
  loadingTextbooks.value = true;
  try {
    const response = await axios.get('/api/textbooks/public');
    textbooks.value = response.data.textbooks || [];
    // 加载封面图片
    loadAllCovers();
  } catch (error) {
    console.error('加载教材列表失败:', error);
  } finally {
    loadingTextbooks.value = false;
  }
};

// 加载所有封面
const loadAllCovers = () => {
  textbooks.value.forEach(textbook => {
    // 使用数据库已保存的封面
    if (textbook.coverImage) {
      coverImages.value[textbook.id] = textbook.coverImage;
    }
  });
};

const getTotalLessons = (textbook) => {
  let count = 0;
  textbook.units.forEach(unit => {
    count += unit.lessons.length;
  });
  return count;
};

const selectTextbook = async (textbook) => {
  // 如果教材有 PDF，直接跳转到阅读器
  if (textbook.pdfUrl) {
    router.push(`/textbook/reader/${textbook.id}`);
    return;
  }

  // 否则加载目录和课文
  try {
    const response = await axios.get(`/api/textbooks/public/${textbook.id}/toc`);
    selectedTextbook.value = response.data.textbook;

    // 自动选择第一课
    if (allLessons.value.length > 0) {
      selectLesson(allLessons.value[0]);
    }
  } catch (error) {
    console.error('加载教材详情失败:', error);
  }
};

const backToSelect = () => {
  selectedTextbook.value = null;
  currentLesson.value = null;
};

const selectLesson = async (lesson) => {
  loadingLesson.value = true;
  try {
    const response = await axios.get(`/api/textbooks/public/lesson/${lesson.id}`);
    currentLesson.value = response.data.lesson;

    // 移动端自动收起侧边栏
    if (window.innerWidth < 768) {
      sidebarCollapsed.value = true;
    }
  } catch (error) {
    console.error('加载课文失败:', error);
  } finally {
    loadingLesson.value = false;
  }
};

const goToLesson = (lesson) => {
  if (lesson) {
    selectLesson(lesson);
  }
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    // 尝试进入浏览器全屏
    document.documentElement.requestFullscreen?.();
    startControlsTimer();
  } else {
    document.exitFullscreen?.();
  }
};

const handleContentClick = () => {
  if (isFullscreen.value) {
    showControls.value = true;
    startControlsTimer();
  }
};

const startControlsTimer = () => {
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    showControls.value = false;
  }, 3000);
};

// 键盘导航
const handleKeydown = (e) => {
  if (e.key === 'ArrowLeft' && prevLesson.value) {
    goToLesson(prevLesson.value);
  } else if (e.key === 'ArrowRight' && nextLesson.value) {
    goToLesson(nextLesson.value);
  } else if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen();
  }
};

// 触摸滑动
let touchStartX = 0;
const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX;
};

const handleTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchEndX - touchStartX;

  if (Math.abs(diff) > 50) {
    if (diff > 0 && prevLesson.value) {
      goToLesson(prevLesson.value);
    } else if (diff < 0 && nextLesson.value) {
      goToLesson(nextLesson.value);
    }
  }
};

onMounted(() => {
  loadTextbooks();
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchend', handleTouchEnd);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchend', handleTouchEnd);
  clearTimeout(controlsTimer);
});
</script>

<style scoped>
.textbook-public {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.top-nav h1 {
  font-size: 20px;
  font-weight: 600;
}

/* 教材选择 */
.textbook-select {
  flex: 1;
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* 教材列表 - 书架布局 */
.textbook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 180px));
  gap: 32px 24px;
  justify-content: start;
  padding: 20px 0;
}

/* 书本插槽容器 */
.book-slot {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 5;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.book-slot:hover {
  transform: translateY(-8px);
}

.book-slot:hover .book-body {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

/* 书本主体（背景层） */
.book-body {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 4px 8px 8px 4px;
  overflow: hidden;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    -2px 0 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease;
}

/* 书脊效果 */
.book-body::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  background: linear-gradient(90deg,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.05) 40%,
    rgba(255,255,255,0.1) 50%,
    rgba(0,0,0,0.05) 60%,
    transparent 100%
  );
  z-index: 10;
}

.book-body .cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 无封面时的占位 */
.book-body .cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.book-body .cover-placeholder.chinese {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.book-body .cover-placeholder.math {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
}

.book-body .cover-placeholder.english {
  background: linear-gradient(135deg, #45b7d1 0%, #2980b9 100%);
}

.book-body .cover-placeholder.science {
  background: linear-gradient(135deg, #a8e6cf 0%, #56ab2f 100%);
}

.book-body .cover-placeholder.physics {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.book-body .cover-placeholder.chemistry {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.book-body .cover-placeholder.biology {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.book-body .cover-placeholder.history {
  background: linear-gradient(135deg, #c79081 0%, #dfa579 100%);
}

.book-body .cover-placeholder.geography {
  background: linear-gradient(135deg, #3a7bd5 0%, #00d2ff 100%);
}

.book-body .cover-placeholder.politics {
  background: linear-gradient(135deg, #e53935 0%, #e35d5b 100%);
}

.book-body .cover-placeholder.music {
  background: linear-gradient(135deg, #9d50bb 0%, #6e48aa 100%);
}

.book-body .cover-placeholder.art {
  background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);
}

.book-body .cover-placeholder.pe {
  background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
}

.book-body .cover-placeholder.it {
  background: linear-gradient(135deg, #4776e6 0%, #8e54e9 100%);
}

.book-body .cover-placeholder.moral {
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
}

.book-body .subject-badge {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  font-size: 20px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.book-body .loading-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 插槽前挡板（前景层） */
.slot-front {
  position: absolute;
  bottom: 0;
  left: -6px;
  right: -6px;
  height: 35%;
  z-index: 2;
  background: #fafafa;
  border-radius: 8px 8px 10px 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  box-shadow:
    0 -4px 12px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 插槽顶部边缘阴影线 */
.slot-front::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 8px;
  right: 8px;
  height: 3px;
  background: linear-gradient(180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.08) 50%,
    transparent 100%
  );
  border-radius: 2px 2px 0 0;
}

.slot-front .book-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-front .book-meta {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-front .lesson-count {
  font-size: 10px;
  color: #999;
}

/* 阅读界面 */
.reader-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  transition: width 0.3s, transform 0.3s;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 50px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  min-height: 56px;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-btn {
  flex-shrink: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.toc-unit {
  margin-bottom: 20px;
}

.unit-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lesson-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.lesson-item:hover {
  background: #f0f5ff;
}

.lesson-item.active {
  background: #e6f7ff;
  color: #1890ff;
}

.lesson-num {
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.lesson-item.active .lesson-num {
  background: #1890ff;
  color: white;
}

.lesson-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 主内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: #fafafa;
}

.lesson-content {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.content-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.content-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.breadcrumb {
  font-size: 14px;
  color: #999;
}

/* HTML内容样式 */
.html-content {
  font-size: 18px;
  line-height: 2;
  color: #333;
}

.html-content :deep(.textbook-lesson) {
  max-width: 100%;
}

.html-content :deep(.lesson-header) {
  display: none; /* 已经有标题了 */
}

.html-content :deep(.paragraph) {
  text-indent: 2em;
  margin-bottom: 1.5em;
}

.html-content :deep(ruby rt) {
  font-size: 10px;
  color: #666;
}

.html-content :deep(.lesson-vocabulary) {
  margin-top: 40px;
  padding: 24px;
  background: #f9f9f9;
  border-radius: 12px;
}

.html-content :deep(.vocab-grid table) {
  width: 100%;
  border-collapse: collapse;
}

.html-content :deep(.vocab-grid td) {
  padding: 16px;
  text-align: center;
  font-size: 28px;
  border: 1px solid #e8e8e8;
}

.html-content :deep(.lesson-exercises) {
  margin-top: 40px;
}

.html-content :deep(.exercise-item) {
  margin-bottom: 20px;
  padding-left: 28px;
  position: relative;
}

.html-content :deep(.exercise-item::before) {
  content: "◆";
  position: absolute;
  left: 0;
  color: #1890ff;
}

.html-content :deep(.word-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 12px;
  padding-left: 28px;
}

.html-content :deep(.lesson-footnote) {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
  font-size: 13px;
  color: #999;
}

/* 底部导航 */
.lesson-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.page-info {
  font-size: 14px;
  color: #999;
}

.empty-hint {
  margin-top: 100px;
}

/* 全屏模式 */
.textbook-public.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: white;
}

.textbook-public.fullscreen .top-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
}

.textbook-public.fullscreen .sidebar {
  position: absolute;
  top: 56px;
  left: 0;
  bottom: 0;
  z-index: 10;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.textbook-public.fullscreen.sidebar-collapsed .sidebar {
  transform: translateX(-100%);
  width: 0;
}

.fullscreen-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 24px;
  color: white;
  z-index: 10000;
}

.fullscreen-controls .lesson-title {
  font-size: 14px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    z-index: 100;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
    width: 280px;
  }

  .content-area {
    padding: 16px;
  }

  .lesson-content {
    padding: 24px;
  }

  .content-header h2 {
    font-size: 22px;
  }

  .html-content {
    font-size: 16px;
  }

  .textbook-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 160px));
    gap: 20px 16px;
  }

  .book-slot {
    aspect-ratio: 3 / 4.5;
  }

  .slot-front {
    height: 38%;
    padding: 8px 10px 6px;
  }

  .slot-front .book-title {
    font-size: 11px;
  }

  .slot-front .book-meta {
    font-size: 10px;
  }

  .book-body .subject-badge {
    padding: 8px 18px;
    font-size: 16px;
  }
}
</style>
