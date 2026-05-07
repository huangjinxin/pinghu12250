<template>
  <div class="public-poetry-page">
    <!-- 顶部导航栏 -->
    <header class="nav-header">
      <div class="header-content">
        <div class="logo-section" @click="$router.push('/poetry')">
          <span class="logo-icon">📜</span>
          <span class="logo-text">苹湖诗词馆</span>
        </div>
        <div class="nav-actions">
          <n-button quaternary @click="$router.push('/login')">登录</n-button>
          <n-button type="primary" @click="$router.push('/gallery')">进入系统</n-button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 搜索筛选区 -->
      <div class="filter-section">
        <div class="filter-row">
          <n-input
            v-model:value="searchQuery"
            placeholder="搜索诗词标题..."
            clearable
            @keyup.enter="handleSearch"
            class="search-input"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>

          <n-select
            v-model:value="sortBy"
            :options="sortOptions"
            class="sort-select"
            @update:value="handleSortChange"
          />

          <n-select
            v-model:value="selectedAuthor"
            :options="authorOptions"
            placeholder="全部作者"
            clearable
            class="author-select"
            @update:value="handleAuthorChange"
          />

          <n-select
            v-model:value="selectedType"
            :options="typeOptions"
            placeholder="全部类型"
            clearable
            class="sort-select"
            @update:value="handleTypeChange"
          />
        </div>

        <!-- 统计信息 -->
        <div class="stats-info" v-if="pagination.total > 0">
          共 {{ pagination.total }} 首诗词作品
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="skeleton-grid">
          <n-skeleton v-for="i in 6" :key="i" height="280px" :sharp="false" />
        </div>
      </div>

      <!-- 空状态 -->
      <n-empty v-else-if="!works.length" description="暂无诗词作品" class="empty-state">
        <template #extra>
          <n-button type="primary" @click="$router.push('/register')">
            登录创作你的诗词
          </n-button>
        </template>
      </n-empty>

      <!-- 诗词卡片网格 -->
      <div v-else class="poetry-grid">
        <div
          v-for="work in works"
          :key="work.id"
          class="poetry-card"
          @click="openPreview(work)"
        >
          <!-- 作品预览 -->
          <div class="preview-container">
            <iframe
              :srcdoc="getPreviewHtml(work.htmlCode)"
              class="preview-frame"
              sandbox="allow-scripts"
            ></iframe>
            <div class="preview-overlay">
              <n-icon size="32" color="#fff"><EyeOutline /></n-icon>
              <span>点击预览</span>
            </div>
          </div>

          <!-- 作品信息 -->
          <div class="card-info">
            <h3 class="work-title">{{ work.title }}</h3>
            <div class="meta-row">
              <span class="author-name">
                {{ work.author?.profile?.nickname || work.author?.username }}
              </span>
              <span class="like-count" v-if="work._count?.likes > 0">
                <n-icon><HeartOutline /></n-icon>
                {{ work._count.likes }}
              </span>
            </div>
            <div class="date-row">
              {{ formatDate(work.createdAt) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container" v-if="pagination.totalPages > 1">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pagination.totalPages"
          :page-slot="5"
          @update:page="handlePageChange"
        />
      </div>
    </main>

    <!-- 全屏预览遮罩 -->
    <div v-if="showPreview" class="fullscreen-preview">
      <!-- 全屏iframe展示 -->
      <iframe
        v-if="previewWork"
        ref="previewFrame"
        class="preview-iframe"
        sandbox="allow-scripts"
      ></iframe>

      <!-- 悬浮操作栏 -->
      <div class="preview-topbar">
        <div class="topbar-left">
          <n-button type="warning" @click="showPreview = false">
            <template #icon><n-icon><CloseOutline /></n-icon></template>
            关闭预览
          </n-button>
        </div>
        <div class="topbar-center">
          <span class="preview-title">{{ previewWork?.title }}</span>
          <span class="preview-author">{{ previewWork?.author?.profile?.nickname || previewWork?.author?.username }}</span>
        </div>
        <div class="topbar-right">
          <n-button type="primary" @click="handleShare">
            <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
            分享
          </n-button>
          <n-button @click="goToFullPage">
            <template #icon><n-icon><OpenOutline /></n-icon></template>
            独立页面
          </n-button>
        </div>
      </div>
    </div>

    <!-- 底部Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-main">
          <h3>苹湖少儿空间</h3>
          <p>探索孩子们的诗词世界</p>
        </div>
        <div class="footer-actions">
          <n-button type="primary" @click="$router.push('/register')">
            想创作自己的诗词？立即注册
          </n-button>
        </div>
        <div class="footer-links">
          <a @click="$router.push('/gallery')">作品画廊</a>
          <span class="divider">|</span>
          <a @click="$router.push('/login')">用户登录</a>
        </div>
        <div class="footer-copyright">
          © {{ new Date().getFullYear() }} 苹湖少儿空间 版权所有
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import EyeOutline from '@vicons/ionicons5/es/EyeOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import ShareSocialOutline from '@vicons/ionicons5/es/ShareSocialOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import OpenOutline from '@vicons/ionicons5/es/OpenOutline'
import axios from 'axios';

const message = useMessage();
const router = useRouter();

// 数据状态
const loading = ref(false);
const works = ref([]);
const authors = ref([]);
const pagination = ref({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
});

// 筛选状态
const searchQuery = ref('');
const sortBy = ref('latest');
const selectedAuthor = ref(null);
const selectedType = ref(null);
const currentPage = ref(1);

// 预览状态
const showPreview = ref(false);
const previewWork = ref(null);
const previewFrame = ref(null);

// 排序选项
const sortOptions = [
  { label: '最新发布', value: 'latest' },
  { label: '最多点赞', value: 'popular' },
];

const typeOptions = [
  { label: '诗', value: '诗' },
  { label: '词', value: '词' },
  { label: '古文', value: '古文' },
  { label: '现代文', value: '现代文' },
  { label: '其他', value: '其他' },
];

// 生成预览用的 HTML（注入覆盖样式让内容铺开）
const getPreviewHtml = (htmlCode) => {
  if (!htmlCode) return '';

  // 注入覆盖样式，让诗词内容在预览卡片中铺开显示
  const overrideStyles = `
    <style id="preview-override">
      /* 覆盖居中布局，让内容铺开 */
      body {
        display: block !important;
        justify-content: initial !important;
        align-items: initial !important;
        padding: 12px 16px !important;
        margin: 0 !important;
        min-height: auto !important;
      }
      /* 移除容器的最大宽度限制和居中 */
      .box, .poem-container, .container, .content, .card, .main, .wrapper {
        max-width: none !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 16px !important;
        box-sizing: border-box !important;
      }
      /* 文字左对齐，充分利用宽度 */
      .poem, .poem-content, .content, .text, p, div {
        text-align: left !important;
        max-width: none !important;
      }
      /* 标题可以保持居中 */
      .title, .poem-title, h1, h2 {
        text-align: center !important;
      }
      /* 作者信息居中 */
      .author, .poem-author {
        text-align: center !important;
      }
    </style>
  `;

  // 在 </head> 前或 <body> 后注入样式
  if (htmlCode.includes('</head>')) {
    return htmlCode.replace('</head>', overrideStyles + '</head>');
  } else if (htmlCode.includes('<body')) {
    return htmlCode.replace(/<body([^>]*)>/, '<body$1>' + overrideStyles);
  } else {
    return overrideStyles + htmlCode;
  }
};

// 作者选项
const authorOptions = computed(() => {
  return authors.value.map(a => ({
    label: a.name,
    value: a.id,
  }));
});

// 加载诗词作品
const loadWorks = async () => {
  loading.value = true;
  try {
    const params = {
      category: 'poetry',
      page: currentPage.value,
      limit: pagination.value.limit,
      sort: sortBy.value,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    if (selectedAuthor.value) {
      params.author = selectedAuthor.value;
    }

    if (selectedType.value) {
      params.type = selectedType.value;
    }

    const response = await axios.get('/api/creative-works/public', { params });
    works.value = response.data?.data?.works || [];
    authors.value = response.data?.data?.authors || [];
    pagination.value = {
      ...pagination.value,
      ...response.data?.data?.pagination,
    };
  } catch (error) {
    console.error('加载诗词作品失败:', error);
    message.error('加载失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadWorks();
};

// 排序变化
const handleSortChange = () => {
  currentPage.value = 1;
  loadWorks();
};

// 作者筛选变化
const handleAuthorChange = () => {
  currentPage.value = 1;
  loadWorks();
};

const handleTypeChange = () => {
  currentPage.value = 1;
  loadWorks();
};

// 分页变化
const handlePageChange = () => {
  loadWorks();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 打开预览
const openPreview = (work) => {
  previewWork.value = work;
  showPreview.value = true;
  // 使用 nextTick 确保 DOM 更新后再设置 iframe 内容
  nextTick(() => {
    if (previewFrame.value && work.htmlCode) {
      // 直接使用原始HTML代码
      previewFrame.value.srcdoc = work.htmlCode;
    }
  });
};

// 跳转到独立页面
const goToFullPage = () => {
  if (previewWork.value) {
    router.push(`/poetry/${previewWork.value.id}`);
  }
};

// 分享
const handleShare = async () => {
  if (!previewWork.value) return;

  const shareUrl = `${window.location.origin}/poetry/${previewWork.value.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    message.success('分享链接已复制');
  } catch (err) {
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('分享链接已复制');
  }
};

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 监听搜索输入（防抖）
let searchTimeout;
watch(searchQuery, (newVal, oldVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (newVal !== oldVal) {
      handleSearch();
    }
  }, 500);
});

onMounted(() => {
  loadWorks();
});
</script>

<style scoped>
.public-poetry-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
}

/* 顶部导航 */
.nav-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-actions {
  display: flex;
  gap: 12px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 24px;
  width: 100%;
  box-sizing: border-box;
}

/* 筛选区 */
.filter-section {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.filter-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.sort-select {
  width: 140px;
}

.author-select {
  width: 160px;
}

.stats-info {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

/* 加载状态 */
.loading-container {
  padding: 20px 0;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* 空状态 */
.empty-state {
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
}

/* 诗词卡片网格 */
.poetry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.poetry-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
}

.poetry-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.poetry-card:hover .preview-overlay {
  opacity: 1;
}

.preview-container {
  height: 220px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  position: relative;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: none;
  background: white;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.card-info {
  padding: 16px;
}

.work-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.author-name {
  font-size: 14px;
  color: #666;
}

.like-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #e74c3c;
}

.date-row {
  font-size: 12px;
  color: #999;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

/* 全屏预览 */
.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.preview-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar-left,
.topbar-right {
  display: flex;
  gap: 12px;
}

.topbar-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.preview-author {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

/* 底部Footer */
.footer {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 50px 24px;
  margin-top: 40px;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.footer-main h3 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.footer-main p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 24px 0;
}

.footer-actions {
  margin-bottom: 24px;
}

.footer-links {
  margin-bottom: 20px;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  text-decoration: none;
}

.footer-links a:hover {
  color: white;
  text-decoration: underline;
}

.footer-links .divider {
  margin: 0 16px;
  opacity: 0.5;
}

.footer-copyright {
  font-size: 14px;
  opacity: 0.7;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .poetry-grid,
  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 12px 16px;
  }

  .logo-text {
    font-size: 18px;
  }

  .main-content {
    padding: 20px 16px;
  }

  .filter-section {
    padding: 16px;
  }

  .filter-row {
    flex-direction: column;
    gap: 12px;
  }

  .search-input,
  .sort-select,
  .author-select {
    width: 100%;
  }

  .poetry-grid,
  .skeleton-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .modal-container {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .footer {
    padding: 30px 16px;
  }

  .footer-main h3 {
    font-size: 22px;
  }
}

/* 平板横屏优化 */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .poetry-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
