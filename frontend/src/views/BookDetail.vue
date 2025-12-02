<template>
  <div class="book-detail-container">
    <n-spin :show="loadingBook">
      <div v-if="book">
        <!-- 书籍信息卡片 -->
        <n-card :bordered="false" class="mb-4">
          <div class="flex gap-6">
            <img
              :src="book.coverUrl || 'https://via.placeholder.com/200x280?text=No+Cover'"
              :alt="book.title"
              class="w-48 h-64 object-cover rounded-lg shadow-md"
            />
            <div class="flex-1">
              <h1 class="text-3xl font-bold mb-2">{{ book.title }}</h1>
              <p class="text-lg text-gray-600 mb-4">{{ book.author }}</p>

              <div class="space-y-2 mb-4">
                <div v-if="book.totalPages" class="text-gray-700">
                  <span class="font-semibold">总页数:</span> {{ book.totalPages }} 页
                </div>
                <div v-if="book.sourceType" class="text-gray-700">
                  <span class="font-semibold">类型:</span>
                  <n-tag size="small" class="ml-2">{{ book.sourceType === 'ebook' ? '电子书' : '纸质书' }}</n-tag>
                </div>
                <div v-if="book.sourceUrl" class="text-gray-700">
                  <span class="font-semibold">来源:</span>
                  <a :href="book.sourceUrl" target="_blank" class="text-primary-600 hover:underline ml-2">
                    查看原链接
                  </a>
                </div>
                <div v-if="book.description" class="text-gray-700 mt-3">
                  <p class="font-semibold mb-1">简介:</p>
                  <p class="text-gray-600 leading-relaxed">{{ book.description }}</p>
                </div>
              </div>

              <div class="flex gap-3 mt-6 flex-wrap">
                <n-button
                  v-if="!myBookshelf"
                  type="primary"
                  @click="showAddToShelfModal = true"
                >
                  <template #icon>
                    <n-icon><AddOutline /></n-icon>
                  </template>
                  添加到我的书架
                </n-button>
                <n-button
                  v-else
                  type="default"
                  @click="showAddToShelfModal = true"
                >
                  <template #icon>
                    <n-icon><CreateOutline /></n-icon>
                  </template>
                  修改状态: {{ getStatusLabel(myBookshelf.status) }}
                </n-button>
                <n-button type="primary" @click="showWriteLogModal = true">
                  <template #icon>
                    <n-icon><BookOutline /></n-icon>
                  </template>
                  写阅读记录
                </n-button>

                <!-- 编辑和删除按钮（仅创建者可见） -->
                <template v-if="canEditBook">
                  <n-button type="default" @click="showEditBookModal = true">
                    <template #icon>
                      <n-icon><CreateOutline /></n-icon>
                    </template>
                    编辑书籍
                  </n-button>
                  <n-button type="error" @click="handleDeleteBook">
                    <template #icon>
                      <n-icon><TrashOutline /></n-icon>
                    </template>
                    删除书籍
                  </n-button>
                </template>
              </div>

              <!-- 阅读进度 -->
              <div v-if="myBookshelf" class="mt-4 p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600 mb-2">
                  我的阅读进度: {{ myBookshelf.totalReadPages }} / {{ book.totalPages || '?' }} 页
                </div>
                <n-progress
                  type="line"
                  :percentage="getReadingProgress(myBookshelf)"
                  :show-indicator="true"
                />
              </div>
            </div>
          </div>
        </n-card>

        <!-- 阅读记录 -->
        <n-card title="阅读记录" :bordered="false">
          <n-tabs type="line" animated>
            <n-tab-pane name="my" tab="我的记录">
              <n-spin :show="loadingMyLogs">
                <div v-if="myReadingLogs.length > 0" class="space-y-4">
                  <n-card
                    v-for="log in myReadingLogs"
                    :key="log.id"
                    class="reading-log-card"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <n-tag size="small" type="info">{{ log.chapterInfo }}</n-tag>
                          <span class="text-sm text-gray-500">{{ log.readPages }} 页</span>
                          <span class="text-sm text-gray-400">{{ formatDate(log.createdAt) }}</span>
                        </div>
                        <p class="text-gray-800 mb-3">{{ log.content }}</p>
                        <div class="flex items-center gap-3 text-sm text-gray-500">
                          <div class="flex items-center gap-1">
                            <n-icon :size="18"><ThumbsUpOutline /></n-icon>
                            <span>{{ log.likesCount }}</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <n-icon :size="18"><ThumbsDownOutline /></n-icon>
                            <span>{{ log.dislikesCount }}</span>
                          </div>
                        </div>
                      </div>
                      <n-button
                        text
                        type="error"
                        @click="handleDeleteLog(log.id)"
                      >
                        <template #icon>
                          <n-icon><TrashOutline /></n-icon>
                        </template>
                      </n-button>
                    </div>
                  </n-card>
                </div>
                <n-empty v-else description="还没有阅读记录，快去写一篇吧" class="py-8" />
              </n-spin>
            </n-tab-pane>

            <n-tab-pane name="all" tab="所有记录">
              <n-spin :show="loadingAllLogs">
                <div v-if="allReadingLogs.length > 0" class="space-y-4">
                  <n-card
                    v-for="log in allReadingLogs"
                    :key="log.id"
                    class="reading-log-card"
                  >
                    <div class="flex items-start gap-3">
                      <AvatarText :username="log.user.username" size="md" />
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="font-semibold">{{ log.user.profile?.nickname || log.user.username }}</span>
                          <n-tag size="small" type="info">{{ log.chapterInfo }}</n-tag>
                          <span class="text-sm text-gray-500">{{ log.readPages }} 页</span>
                          <span class="text-sm text-gray-400">{{ formatDate(log.createdAt) }}</span>
                        </div>
                        <p class="text-gray-800 mb-3">{{ log.content }}</p>
                        <div class="flex items-center gap-3 text-sm text-gray-500">
                          <button
                            class="flex items-center gap-1 hover:text-primary-600 transition-colors"
                            :class="{ 'text-primary-600': log.myLikeStatus === 'like' }"
                            @click="toggleLike(log.id, true)"
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
                            @click="toggleLike(log.id, false)"
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
                  </n-card>
                </div>
                <n-empty v-else description="还没有人写过阅读记录" class="py-8" />
              </n-spin>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>
    </n-spin>

    <!-- 添加到书架/修改状态弹窗 -->
    <n-modal v-model:show="showAddToShelfModal" preset="card" :title="myBookshelf ? '修改阅读状态' : '添加到我的书架'" style="width: 500px">
      <n-form>
        <n-form-item label="阅读状态">
          <n-radio-group v-model:value="shelfStatus">
            <n-space vertical>
              <n-radio value="WANT_TO_READ">想读</n-radio>
              <n-radio value="READING">在读</n-radio>
              <n-radio value="COMPLETED">读完</n-radio>
              <n-radio value="DROPPED">弃读</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddToShelfModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddToShelf" :loading="submittingShelf">
            {{ myBookshelf ? '保存' : '添加' }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 写阅读记录弹窗 -->
    <n-modal v-model:show="showWriteLogModal" preset="card" title="写阅读记录" style="width: 600px">
      <n-form ref="writeLogFormRef" :model="newLog" :rules="writeLogRules">
        <n-form-item label="章节信息" path="chapterInfo">
          <n-input v-model:value="newLog.chapterInfo" placeholder="例如：第1-3章" />
        </n-form-item>
        <n-form-item label="阅读页数" path="readPages">
          <n-input-number v-model:value="newLog.readPages" placeholder="本次阅读的页数" :min="1" class="w-full" />
        </n-form-item>
        <n-form-item label="阅读感想" path="content">
          <n-input
            v-model:value="newLog.content"
            type="textarea"
            placeholder="写下你的读书感想（必填）"
            :rows="6"
            show-count
          />
        </n-form-item>
        <n-form-item label="公开">
          <n-switch v-model:value="newLog.isPublic" />
          <span class="ml-2 text-sm text-gray-500">是否公开显示</span>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showWriteLogModal = false">取消</n-button>
          <n-button type="primary" @click="handleWriteLog" :loading="submittingLog">发布 (+5积分)</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 编辑书籍弹窗 -->
    <n-modal v-model:show="showEditBookModal" preset="card" title="编辑书籍" style="width: 600px">
      <n-form ref="editBookFormRef" :model="editBookData" :rules="bookFormRules">
        <n-form-item label="书名" path="title">
          <n-input v-model:value="editBookData.title" placeholder="请输入书名" />
        </n-form-item>
        <n-form-item label="作者" path="author">
          <n-input v-model:value="editBookData.author" placeholder="请输入作者" />
        </n-form-item>
        <n-form-item label="封面URL" path="coverUrl">
          <n-input v-model:value="editBookData.coverUrl" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>
        <n-form-item label="来源类型" path="sourceType">
          <n-radio-group v-model:value="editBookData.sourceType">
            <n-radio value="paper">纸质书</n-radio>
            <n-radio value="ebook">电子书</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="来源链接" path="sourceUrl">
          <n-input v-model:value="editBookData.sourceUrl" placeholder="请输入来源链接（可选）" />
        </n-form-item>
        <n-form-item label="总页数" path="totalPages">
          <n-input-number v-model:value="editBookData.totalPages" placeholder="请输入总页数" :min="1" class="w-full" />
        </n-form-item>
        <n-form-item label="简介" path="description">
          <n-input
            v-model:value="editBookData.description"
            type="textarea"
            placeholder="请输入简介（可选）"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showEditBookModal = false">取消</n-button>
          <n-button type="primary" @click="handleUpdateBook" :loading="updatingBook">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';
import {
  AddOutline,
  BookOutline,
  CreateOutline,
  ThumbsUpOutline,
  ThumbsUp,
  ThumbsDownOutline,
  ThumbsDown,
  TrashOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

// 检查是否可以编辑书籍（仅创建者或管理员）
const canEditBook = computed(() => {
  if (!book.value || !authStore.user) return false;
  return book.value.createdBy === authStore.user.id || authStore.user.role === 'ADMIN';
});

// 书籍详情
const book = ref(null);
const myBookshelf = ref(null);
const loadingBook = ref(false);

// 阅读记录
const myReadingLogs = ref([]);
const allReadingLogs = ref([]);
const loadingMyLogs = ref(false);
const loadingAllLogs = ref(false);

// 添加到书架
const showAddToShelfModal = ref(false);
const shelfStatus = ref('WANT_TO_READ');
const submittingShelf = ref(false);

// 写阅读记录
const showWriteLogModal = ref(false);
const submittingLog = ref(false);
const writeLogFormRef = ref(null);
const newLog = ref({
  chapterInfo: '',
  readPages: null,
  content: '',
  isPublic: true,
});

const writeLogRules = {
  chapterInfo: { required: true, message: '请输入章节信息', trigger: 'blur' },
  readPages: { required: true, type: 'number', message: '请输入阅读页数', trigger: 'blur' },
  content: { required: true, message: '请写下你的读书感想', trigger: 'blur' },
};

// 编辑书籍
const showEditBookModal = ref(false);
const updatingBook = ref(false);
const editBookFormRef = ref(null);
const editBookData = ref({
  title: '',
  author: '',
  coverUrl: '',
  sourceType: 'paper',
  sourceUrl: '',
  totalPages: null,
  description: '',
});

const bookFormRules = {
  title: { required: true, message: '请输入书名', trigger: 'blur' },
  author: { required: true, message: '请输入作者', trigger: 'blur' },
  totalPages: { required: true, type: 'number', message: '请输入总页数', trigger: 'blur' },
};

// 获取书籍详情
const fetchBookDetail = async () => {
  try {
    loadingBook.value = true;
    const response = await api.get(`/books/${route.params.id}`);
    // 后端返回的是 { ...book字段, myBookshelf }
    myBookshelf.value = response.myBookshelf;
    book.value = response;
    if (myBookshelf.value) {
      shelfStatus.value = myBookshelf.value.status;
    }
    // 填充编辑表单数据
    editBookData.value = {
      title: book.value.title || '',
      author: book.value.author || '',
      coverUrl: book.value.coverUrl || '',
      sourceType: book.value.sourceType || 'paper',
      sourceUrl: book.value.sourceUrl || '',
      totalPages: book.value.totalPages || null,
      description: book.value.description || '',
    };
  } catch (error) {
    console.error('获取书籍详情失败:', error);
    message.error(error.error || '获取书籍详情失败');
  } finally {
    loadingBook.value = false;
  }
};

// 获取我的阅读记录
const fetchMyReadingLogs = async () => {
  try {
    loadingMyLogs.value = true;
    const response = await api.get('/books/reading-logs', {
      params: {
        bookId: route.params.id,
        onlyMine: true,
      },
    });
    myReadingLogs.value = response.readingLogs;
  } catch (error) {
    console.error('获取我的阅读记录失败:', error);
    message.error(error.error || '获取我的阅读记录失败');
  } finally {
    loadingMyLogs.value = false;
  }
};

// 获取所有阅读记录
const fetchAllReadingLogs = async () => {
  try {
    loadingAllLogs.value = true;
    const response = await api.get('/books/reading-logs', {
      params: {
        bookId: route.params.id,
      },
    });
    allReadingLogs.value = response.readingLogs;
  } catch (error) {
    console.error('获取阅读记录失败:', error);
    message.error(error.error || '获取阅读记录失败');
  } finally {
    loadingAllLogs.value = false;
  }
};

// 添加到书架或修改状态
const handleAddToShelf = async () => {
  try {
    submittingShelf.value = true;
    if (myBookshelf.value) {
      // 修改状态
      await api.put(`/books/bookshelf/${myBookshelf.value.id}`, {
        status: shelfStatus.value,
      });
      message.success(shelfStatus.value === 'COMPLETED' ? '修改成功，奖励 +20 积分' : '修改成功');
    } else {
      // 添加到书架
      await api.post('/books/bookshelf', {
        bookId: route.params.id,
        status: shelfStatus.value,
      });
      message.success('添加成功');
    }
    showAddToShelfModal.value = false;
    await fetchBookDetail();
  } catch (error) {
    console.error('操作失败:', error);
    message.error(error.error || '操作失败');
  } finally {
    submittingShelf.value = false;
  }
};

// 写阅读记录
const handleWriteLog = async () => {
  try {
    await writeLogFormRef.value?.validate();
    submittingLog.value = true;
    await api.post('/books/reading-logs', {
      bookId: route.params.id,
      ...newLog.value,
    });
    message.success('发布成功，奖励 +5 积分');
    showWriteLogModal.value = false;
    // 重置表单
    newLog.value = {
      chapterInfo: '',
      readPages: null,
      content: '',
      isPublic: true,
    };
    // 刷新数据
    await Promise.all([
      fetchBookDetail(),
      fetchMyReadingLogs(),
      fetchAllReadingLogs(),
    ]);
  } catch (error) {
    if (error.error) {
      message.error(error.error);
    } else {
      console.error('发布失败:', error);
    }
  } finally {
    submittingLog.value = false;
  }
};

// 删除阅读记录
const handleDeleteLog = (logId) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条阅读记录吗？将扣除 -5 积分',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/books/reading-logs/${logId}`);
        message.success('删除成功');
        await Promise.all([
          fetchBookDetail(),
          fetchMyReadingLogs(),
          fetchAllReadingLogs(),
        ]);
      } catch (error) {
        console.error('删除失败:', error);
        message.error(error.error || '删除失败');
      }
    },
  });
};

// 点赞/点踩
const toggleLike = async (logId, isLike) => {
  try {
    await api.post(`/books/reading-logs/${logId}/like`, { isLike });
    // 刷新所有阅读记录
    await fetchAllReadingLogs();
  } catch (error) {
    console.error('操作失败:', error);
    message.error(error.error || '操作失败');
  }
};

// 更新书籍信息
const handleUpdateBook = async () => {
  try {
    await editBookFormRef.value?.validate();
    updatingBook.value = true;
    await api.put(`/books/${route.params.id}`, editBookData.value);
    message.success('更新成功');
    showEditBookModal.value = false;
    await fetchBookDetail();
  } catch (error) {
    if (error.error) {
      message.error(error.error);
    } else {
      console.error('更新失败:', error);
    }
  } finally {
    updatingBook.value = false;
  }
};

// 删除书籍
const handleDeleteBook = () => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这本书吗？如果已有用户添加或写了阅读记录则无法删除。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/books/${route.params.id}`);
        message.success('删除成功');
        router.push('/books');
      } catch (error) {
        console.error('删除失败:', error);
        message.error(error.error || '删除失败');
      }
    },
  });
};

// 工具函数
const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_READ: '想读',
    READING: '在读',
    COMPLETED: '读完',
    DROPPED: '弃读',
  };
  return labels[status] || status;
};

const getReadingProgress = (bookshelf) => {
  if (!book.value?.totalPages) return 0;
  return Math.min(Math.round((bookshelf.totalReadPages / book.value.totalPages) * 100), 100);
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

// 初始化
onMounted(() => {
  fetchBookDetail();
  fetchMyReadingLogs();
  fetchAllReadingLogs();
});
</script>

<style scoped>
.book-detail-container {
  max-width: 1200px;
  margin: 0 auto;
}

.reading-log-card {
  border-left: 3px solid var(--n-color-target);
}
</style>
