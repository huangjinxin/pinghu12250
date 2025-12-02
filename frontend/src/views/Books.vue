<template>
  <div class="books-container">
    <n-card title="读书笔记" :bordered="false">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- Tab 1: 我的书架 -->
        <n-tab-pane name="bookshelf" tab="我的书架">
          <div class="mb-4 flex items-center justify-between">
            <n-radio-group v-model:value="shelfStatus" name="status">
              <n-radio-button value="all">全部</n-radio-button>
              <n-radio-button value="WANT_TO_READ">想读</n-radio-button>
              <n-radio-button value="READING">在读</n-radio-button>
              <n-radio-button value="COMPLETED">读完</n-radio-button>
              <n-radio-button value="DROPPED">弃读</n-radio-button>
            </n-radio-group>
            <n-button type="primary" @click="showAddBookModal = true">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加书籍
            </n-button>
          </div>

          <n-spin :show="loadingBookshelf">
            <div v-if="bookshelfList.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <n-card
                v-for="item in bookshelfList"
                :key="item.id"
                class="book-card cursor-pointer hover:shadow-lg transition-shadow"
                @click="$router.push(`/books/${item.book.id}`)"
              >
                <div class="flex gap-4">
                  <img
                    :src="item.book.coverUrl || 'https://via.placeholder.com/100x140?text=No+Cover'"
                    :alt="item.book.title"
                    class="w-20 h-28 object-cover rounded"
                  />
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold mb-1 line-clamp-1">{{ item.book.title }}</h3>
                    <p class="text-sm text-gray-500 mb-2">{{ item.book.author }}</p>
                    <n-tag :type="getStatusType(item.status)" size="small">
                      {{ getStatusLabel(item.status) }}
                    </n-tag>
                    <div class="mt-2 text-xs text-gray-600">
                      <div>已读: {{ item.totalReadPages }} / {{ item.book.totalPages || '?' }} 页</div>
                      <div class="mt-1">
                        <n-progress
                          type="line"
                          :percentage="getReadingProgress(item)"
                          :show-indicator="false"
                          :height="4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="暂无书籍，快去添加吧" class="py-8" />
          </n-spin>
        </n-tab-pane>

        <!-- Tab 2: 阅读动态 -->
        <n-tab-pane name="feed" tab="阅读动态">
          <n-spin :show="loadingFeed">
            <div v-if="readingLogsList.length > 0" class="space-y-4">
              <n-card
                v-for="log in readingLogsList"
                :key="log.id"
                class="reading-log-card"
              >
                <div class="flex items-start gap-3">
                  <AvatarText :username="log.user.username" size="md" />
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="font-semibold">{{ log.user.profile?.nickname || log.user.username }}</span>
                      <span class="text-gray-400 text-sm">读了</span>
                      <span
                        class="text-primary-600 hover:underline cursor-pointer"
                        @click="$router.push(`/books/${log.book.id}`)"
                      >
                        《{{ log.book.title }}》
                      </span>
                    </div>
                    <div v-if="log.chapterInfo" class="text-sm text-gray-600 mb-1">
                      {{ log.chapterInfo }} · {{ log.readPages }} 页
                    </div>
                    <p class="text-gray-800 mb-3">{{ log.content }}</p>
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                      <span>{{ formatDate(log.createdAt) }}</span>
                      <div class="flex items-center gap-3">
                        <button
                          class="flex items-center gap-1 hover:text-primary-600 transition-colors"
                          :class="{ 'text-primary-600': log.myLikeStatus === 'like' }"
                          @click.stop="toggleLike(log.id, true)"
                        >
                          <n-icon :size="18">
                            <ThumbsUpOutline v-if="log.myLikeStatus !== 'LIKE'" />
                            <ThumbsUp v-else />
                          </n-icon>
                          <span>{{ log.likesCount }}</span>
                        </button>
                        <button
                          class="flex items-center gap-1 hover:text-red-600 transition-colors"
                          :class="{ 'text-red-600': log.myLikeStatus === 'dislike' }"
                          @click.stop="toggleLike(log.id, false)"
                        >
                          <n-icon :size="18">
                            <ThumbsDownOutline v-if="log.myLikeStatus !== 'DISLIKE'" />
                            <ThumbsDown v-else />
                          </n-icon>
                          <span>{{ log.dislikesCount }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="还没有阅读动态" class="py-8" />
          </n-spin>
        </n-tab-pane>

        <!-- Tab 3: 书库搜索 -->
        <n-tab-pane name="search" tab="书库搜索">
          <div class="mb-4">
            <n-input
              v-model:value="searchKeyword"
              placeholder="搜索书名或作者"
              clearable
              @keyup.enter="handleBookSearch"
            >
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
              <template #suffix>
                <n-button text @click="handleBookSearch">搜索</n-button>
              </template>
            </n-input>
          </div>

          <!-- 顶部分页 -->
          <div v-if="!loadingSearch && searchTotal > searchPageSize" class="mb-4">
            <n-card>
              <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-sm text-gray-600">
                  共 <span class="font-semibold text-primary-600">{{ searchTotal }}</span> 本书，
                  当前第 <span class="font-semibold text-primary-600">{{ searchPage }}</span> 页，
                  共 <span class="font-semibold text-primary-600">{{ Math.ceil(searchTotal / searchPageSize) }}</span> 页
                </div>
                <n-pagination
                  v-model:page="searchPage"
                  :page-count="Math.ceil(searchTotal / searchPageSize)"
                  :page-size="searchPageSize"
                  show-size-picker
                  :page-sizes="[9, 18, 27, 36]"
                  show-quick-jumper
                  @update:page="loadBooks"
                  @update:page-size="handleSearchPageSizeChange"
                >
                  <template #prefix>
                    <n-button size="small" @click="goToSearchFirstPage" :disabled="searchPage === 1">首页</n-button>
                  </template>
                  <template #suffix>
                    <n-button size="small" @click="goToSearchLastPage" :disabled="searchPage === Math.ceil(searchTotal / searchPageSize)">尾页</n-button>
                  </template>
                </n-pagination>
              </div>
            </n-card>
          </div>

          <n-spin :show="loadingSearch">
            <div v-if="loadingSearch" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <n-skeleton v-for="i in 9" :key="i" height="140px" :sharp="false" />
            </div>

            <n-empty v-else-if="!searchResults.length" description="还没有任何书籍" class="py-8" />

            <div v-else>
              <div v-if="searchKeyword && searchKeyword.trim()" class="mb-3 text-sm text-gray-500">
                搜索结果
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <n-card
                  v-for="book in searchResults"
                  :key="book.id"
                  class="book-card cursor-pointer hover:shadow-lg transition-shadow"
                  @click="$router.push(`/books/${book.id}`)"
                >
                  <div class="flex gap-4">
                    <img
                      :src="book.coverUrl || 'https://via.placeholder.com/100x140?text=No+Cover'"
                      :alt="book.title"
                      class="w-20 h-28 object-cover rounded"
                    />
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold mb-1 line-clamp-2">{{ book.title }}</h3>
                      <p class="text-sm text-gray-500 mb-2">{{ book.author }}</p>
                      <div class="text-xs text-gray-600">
                        <div v-if="book.totalPages">共 {{ book.totalPages }} 页</div>
                        <div v-if="book.sourceType" class="mt-1">
                          <n-tag size="tiny">{{ book.sourceType === 'ebook' ? '电子书' : '纸质书' }}</n-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </n-card>
              </div>
            </div>
          </n-spin>

          <!-- 底部分页 -->
          <div v-if="!loadingSearch && searchTotal > searchPageSize" class="mt-4">
            <n-card>
              <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-sm text-gray-600">
                  共 <span class="font-semibold text-primary-600">{{ searchTotal }}</span> 本书，
                  当前第 <span class="font-semibold text-primary-600">{{ searchPage }}</span> 页，
                  共 <span class="font-semibold text-primary-600">{{ Math.ceil(searchTotal / searchPageSize) }}</span> 页
                </div>
                <n-pagination
                  v-model:page="searchPage"
                  :page-count="Math.ceil(searchTotal / searchPageSize)"
                  :page-size="searchPageSize"
                  show-size-picker
                  :page-sizes="[9, 18, 27, 36]"
                  show-quick-jumper
                  @update:page="loadBooks"
                  @update:page-size="handleSearchPageSizeChange"
                >
                  <template #prefix>
                    <n-button size="small" @click="goToSearchFirstPage" :disabled="searchPage === 1">首页</n-button>
                  </template>
                  <template #suffix>
                    <n-button size="small" @click="goToSearchLastPage" :disabled="searchPage === Math.ceil(searchTotal / searchPageSize)">尾页</n-button>
                  </template>
                </n-pagination>
              </div>
            </n-card>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 添加书籍弹窗 -->
    <n-modal v-model:show="showAddBookModal" preset="card" title="添加书籍到书库" style="width: 600px">
      <n-form ref="addBookFormRef" :model="newBook" :rules="addBookRules">
        <n-form-item label="书名" path="title">
          <n-input v-model:value="newBook.title" placeholder="请输入书名" />
        </n-form-item>
        <n-form-item label="作者" path="author">
          <n-input v-model:value="newBook.author" placeholder="请输入作者" />
        </n-form-item>
        <n-form-item label="封面URL" path="coverUrl">
          <n-input v-model:value="newBook.coverUrl" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>
        <n-form-item label="来源类型" path="sourceType">
          <n-radio-group v-model:value="newBook.sourceType">
            <n-radio value="paper">纸质书</n-radio>
            <n-radio value="ebook">电子书</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="来源链接" path="sourceUrl">
          <n-input v-model:value="newBook.sourceUrl" placeholder="请输入来源链接（可选）" />
        </n-form-item>
        <n-form-item label="总页数" path="totalPages">
          <n-input-number v-model:value="newBook.totalPages" placeholder="请输入总页数" :min="1" class="w-full" />
        </n-form-item>
        <n-form-item label="简介" path="description">
          <n-input
            v-model:value="newBook.description"
            type="textarea"
            placeholder="请输入简介（可选）"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddBookModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddBook" :loading="submittingBook">提交</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';
import {
  SearchOutline,
  AddOutline,
  ThumbsUpOutline,
  ThumbsUp,
  ThumbsDownOutline,
  ThumbsDown,
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

// Tab状态
const activeTab = ref('bookshelf');

// 我的书架
const shelfStatus = ref('all');
const bookshelfList = ref([]);
const loadingBookshelf = ref(false);

// 阅读动态
const readingLogsList = ref([]);
const loadingFeed = ref(false);

// 书库搜索
const searchKeyword = ref('');
const searchResults = ref([]);
const searchPage = ref(1);
const searchPageSize = ref(9); // 每页显示数量（默认9个，3x3布局）
const searchTotal = ref(0);
const loadingSearch = ref(false);

// 添加书籍
const showAddBookModal = ref(false);
const submittingBook = ref(false);
const addBookFormRef = ref(null);
const newBook = ref({
  title: '',
  author: '',
  coverUrl: '',
  sourceType: 'paper',
  sourceUrl: '',
  totalPages: null,
  description: '',
});

const addBookRules = {
  title: { required: true, message: '请输入书名', trigger: 'blur' },
  author: { required: true, message: '请输入作者', trigger: 'blur' },
  totalPages: { required: true, type: 'number', message: '请输入总页数', trigger: 'blur' },
};

// 获取我的书架
const fetchBookshelf = async () => {
  try {
    loadingBookshelf.value = true;
    const params = {};
    if (shelfStatus.value !== 'all') {
      params.status = shelfStatus.value;
    }
    const response = await api.get('/books/bookshelf/my', { params });
    bookshelfList.value = response.bookshelves;
  } catch (error) {
    console.error('获取书架失败:', error);
    message.error(error.error || '获取书架失败');
  } finally {
    loadingBookshelf.value = false;
  }
};

// 获取阅读动态
const fetchReadingLogs = async () => {
  try {
    loadingFeed.value = true;
    const response = await api.get('/books/reading-logs');
    readingLogsList.value = response.readingLogs;
  } catch (error) {
    console.error('获取阅读动态失败:', error);
    message.error(error.error || '获取阅读动态失败');
  } finally {
    loadingFeed.value = false;
  }
};

// 搜索按钮点击
const handleBookSearch = () => {
  // 搜索时重置到第一页
  searchPage.value = 1;
  loadBooks();
};

// 分页控制函数
const goToSearchFirstPage = () => {
  searchPage.value = 1;
  loadBooks();
};

const goToSearchLastPage = () => {
  searchPage.value = Math.ceil(searchTotal.value / searchPageSize.value);
  loadBooks();
};

const handleSearchPageSizeChange = (newPageSize) => {
  searchPageSize.value = newPageSize;
  searchPage.value = 1; // 改变每页数量时重置到第一页
  loadBooks();
};

// 加载书籍（包括搜索和分页）
const loadBooks = async () => {
  try {
    loadingSearch.value = true;
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const params = {
      page: searchPage.value,
      limit: searchPageSize.value,
    };

    // 如果有搜索关键词，添加到参数中
    if (searchKeyword.value && searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim();
    }

    const response = await api.get('/books/search', { params });
    searchResults.value = response.books || [];
    // 从响应中获取总数
    searchTotal.value = response.total || response.pagination?.total || 0;
  } catch (error) {
    console.error('加载书籍失败:', error);
    message.error(error.error || '加载书籍失败');
  } finally {
    loadingSearch.value = false;
  }
};

// 添加书籍
const handleAddBook = async () => {
  try {
    await addBookFormRef.value?.validate();
    submittingBook.value = true;
    await api.post('/books', newBook.value);
    message.success('添加书籍成功，奖励 +2 积分');
    showAddBookModal.value = false;
    // 重置表单
    newBook.value = {
      title: '',
      author: '',
      coverUrl: '',
      sourceType: 'paper',
      sourceUrl: '',
      totalPages: null,
      description: '',
    };
    // 刷新搜索结果
    loadBooks();
  } catch (error) {
    if (error.error) {
      message.error(error.error);
    } else {
      console.error('添加书籍失败:', error);
    }
  } finally {
    submittingBook.value = false;
  }
};

// 点赞/点踩
const toggleLike = async (logId, isLike) => {
  try {
    await api.post(`/books/reading-logs/${logId}/like`, { isLike });
    // 刷新阅读动态
    await fetchReadingLogs();
  } catch (error) {
    console.error('操作失败:', error);
    message.error(error.error || '操作失败');
  }
};

// 工具函数
const getStatusType = (status) => {
  const types = {
    WANT_TO_READ: 'default',
    READING: 'info',
    COMPLETED: 'success',
    DROPPED: 'warning',
  };
  return types[status] || 'default';
};

const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_READ: '想读',
    READING: '在读',
    COMPLETED: '读完',
    DROPPED: '弃读',
  };
  return labels[status] || status;
};

const getReadingProgress = (item) => {
  if (!item.book.totalPages) return 0;
  return Math.min(Math.round((item.totalReadPages / item.book.totalPages) * 100), 100);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN');
};

// 监听书架状态变化
watch(shelfStatus, () => {
  fetchBookshelf();
});

// 监听tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'bookshelf' && bookshelfList.value.length === 0) {
    fetchBookshelf();
  } else if (newTab === 'feed' && readingLogsList.value.length === 0) {
    fetchReadingLogs();
  } else if (newTab === 'search' && searchResults.value.length === 0) {
    loadBooks();
  }
});

// 初始化
onMounted(() => {
  fetchBookshelf();
});
</script>

<style scoped>
.books-container {
  max-width: 1200px;
  margin: 0 auto;
}

.book-card {
  transition: all 0.3s ease;
}

.book-card:hover {
  transform: translateY(-2px);
}

.reading-log-card {
  border-left: 3px solid var(--n-color-target);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
