<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">{{ selectedChildName }}自学历程</h1>
        <p class="text-gray-500 mt-1">审核孩子提交的任务，通过后将发放积分</p>
      </div>
      <n-button @click="$router.push('/parent/children')">
        <template #icon>
          <n-icon><ArrowBack /></n-icon>
        </template>
        返回
      </n-button>
    </div>

    <!-- 统计和筛选 -->
    <n-card>
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-4">
          <div class="text-center px-3">
            <div class="text-2xl font-bold text-orange-500">{{ stats.pending }}</div>
            <div class="text-sm text-gray-500">待审核</div>
          </div>
          <div
            class="text-center px-3 cursor-pointer hover:bg-gray-50 rounded-lg py-1 transition"
            @click="goToHistory"
          >
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-sm text-gray-500">总提交</div>
          </div>
          <div
            class="text-center px-3 cursor-pointer hover:bg-gray-50 rounded-lg py-1 transition"
            @click="goToHistory('APPROVED')"
          >
            <div class="text-2xl font-bold text-green-500">{{ stats.approved || 0 }}</div>
            <div class="text-sm text-gray-500">已通过</div>
          </div>
          <div class="text-center px-3">
            <div class="text-2xl font-bold text-red-400">{{ stats.rejected || 0 }}</div>
            <div class="text-sm text-gray-500">已拒绝</div>
          </div>
        </div>
        <n-space align="center">
          <n-select
            v-if="children.length > 1"
            :value="parentStore.selectedChildId"
            placeholder="选择孩子"
            :options="childrenOptions"
            style="width: 150px"
            @update:value="handleChildChange"
          />
          <n-button @click="loadData">
            <template #icon>
              <n-icon><Refresh /></n-icon>
            </template>
            刷新
          </n-button>
        </n-space>
      </div>
    </n-card>

    <!-- 加载状态 -->
    <n-spin :show="loading">
      <!-- 空状态 -->
      <n-empty v-if="!loading && submissions.length === 0" description="暂无待审核任务">
        <template #extra>
          <p class="text-gray-500 text-sm">孩子的待审核任务将显示在这里</p>
        </template>
      </n-empty>

      <!-- 提交记录列表 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <n-card
          v-for="submission in submissions"
          :key="submission.id"
          hoverable
          class="submission-card"
        >
          <!-- 头部：孩子信息和规则名称 -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <n-avatar
                :src="submission.user?.avatar"
                :size="32"
                round
              >
                {{ (submission.user?.profile?.nickname || submission.user?.username)?.[0] }}
              </n-avatar>
              <div>
                <div class="font-medium text-gray-700">
                  {{ submission.user?.profile?.nickname || submission.user?.username }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ formatDate(submission.createdAt) }}
                </div>
              </div>
            </div>
            <n-tag
              :type="submission.template?.points > 0 ? 'success' : 'error'"
              size="small"
              round
            >
              {{ submission.template?.points > 0 ? '+' : '' }}{{ submission.template?.points * (submission.quantity || 1) }} 积分
            </n-tag>
          </div>

          <!-- 规则名称 -->
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ submission.template?.name }}
          </h3>

          <!-- 标签 -->
          <n-space size="small" class="mb-3">
            <n-tag type="info" size="small" round>
              {{ submission.template?.type?.name || '未分类' }}
            </n-tag>
            <n-tag v-if="submission.template?.standard?.name" size="small" round>
              {{ submission.template?.standard?.name }}
            </n-tag>
            <n-tag v-if="submission.quantity > 1" type="warning" size="small" round>
              x {{ submission.quantity }}
            </n-tag>
          </n-space>

          <!-- 提交内容 -->
          <div v-if="submission.content" class="text-gray-600 text-sm mb-3 line-clamp-3 bg-gray-50 p-2 rounded">
            {{ submission.content }}
          </div>

          <!-- 图片预览 -->
          <n-space v-if="submission.images?.length" size="small" class="mb-3">
            <n-image
              v-for="(img, idx) in submission.images.slice(0, 4)"
              :key="idx"
              :src="img"
              width="60"
              height="60"
              object-fit="cover"
              style="border-radius: 4px"
              :preview-src="img"
            />
            <span v-if="submission.images.length > 4" class="text-gray-400 text-sm flex items-center">
              +{{ submission.images.length - 4 }}
            </span>
          </n-space>

          <!-- 音频 -->
          <div v-if="submission.audios?.length" class="mb-3">
            <audio
              v-for="(audio, idx) in submission.audios"
              :key="idx"
              :src="audio"
              controls
              class="w-full h-8"
            />
          </div>

          <!-- 链接 -->
          <div v-if="submission.link" class="mb-3">
            <a :href="submission.link" target="_blank" class="text-primary-500 text-sm hover:underline">
              查看链接
            </a>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <n-button
              type="success"
              size="small"
              class="flex-1"
              :loading="reviewingId === submission.id && reviewAction === 'APPROVED'"
              @click="handleReview(submission, 'APPROVED')"
            >
              <template #icon>
                <n-icon><Checkmark /></n-icon>
              </template>
              通过
            </n-button>
            <n-button
              type="error"
              size="small"
              class="flex-1"
              :loading="reviewingId === submission.id && reviewAction === 'REJECTED'"
              @click="handleReview(submission, 'REJECTED')"
            >
              <template #icon>
                <n-icon><Close /></n-icon>
              </template>
              退回
            </n-button>
          </div>
        </n-card>
      </div>

      <!-- 分页 -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center mt-6">
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.totalPages"
          :page-size="pagination.pageSize"
          @update:page="handlePageChange"
        />
      </div>
    </n-spin>

    <!-- 退回备注弹窗 -->
    <n-modal
      v-model:show="showRejectModal"
      preset="dialog"
      title="退回备注"
      positive-text="确认退回"
      negative-text="取消"
      @positive-click="confirmReject"
      @negative-click="showRejectModal = false"
    >
      <n-input
        v-model:value="rejectNote"
        type="textarea"
        placeholder="请输入退回原因（可选）"
        :rows="3"
      />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { format } from 'date-fns';
import { submissionAPI } from '@/api';
import { useParentStore } from '@/stores/parent';
import ArrowBack from '@vicons/ionicons5/es/ArrowBack'
import Refresh from '@vicons/ionicons5/es/Refresh'
import Checkmark from '@vicons/ionicons5/es/Checkmark'
import Close from '@vicons/ionicons5/es/Close'

const router = useRouter();
const message = useMessage();
const parentStore = useParentStore();

// 状态
const loading = ref(false);
const submissions = ref([]);
const stats = ref({ total: 0, pending: 0 });
const reviewingId = ref(null);
const reviewAction = ref(null);

// 使用 parentStore 中的数据
const children = computed(() => parentStore.children);
const selectedChildName = computed(() => parentStore.selectedChildName);

// 退回弹窗
const showRejectModal = ref(false);
const rejectNote = ref('');
const pendingRejectSubmission = ref(null);

// 筛选条件 - 使用 parentStore 中选中的孩子
const filters = computed(() => ({
  childId: parentStore.selectedChildId,
}));

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
});

// 孩子选项（用于切换孩子，不包含"全部孩子"）
const childrenOptions = computed(() => {
  return children.value.map(child => ({
    label: child.profile?.nickname || child.username,
    value: child.id,
  }));
});

// 加载待审核列表
const loadSubmissions = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (filters.childId) params.childId = filters.childId;

    const data = await submissionAPI.getParentPending(params);
    submissions.value = data.submissions || [];
    stats.value = data.stats || { total: 0, pending: 0 };
    pagination.total = data.pagination?.total || 0;
    pagination.totalPages = data.pagination?.totalPages || 0;
  } catch (error) {
    message.error('加载待审核列表失败');
    console.error('加载待审核列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 加载数据
const loadData = async () => {
  // 先确保 parentStore 中的孩子列表已加载
  if (!parentStore.loaded) {
    await parentStore.loadChildren();
  }
  await loadSubmissions();
};

// 跳转到历程页面
const goToHistory = (status) => {
  const query = {};
  if (parentStore.selectedChildId) query.childId = parentStore.selectedChildId;
  if (status) query.status = status;
  router.push({ path: '/parent/submissions', query });
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm');
};

// 处理审核
const handleReview = async (submission, action) => {
  if (action === 'REJECTED') {
    pendingRejectSubmission.value = submission;
    rejectNote.value = '';
    showRejectModal.value = true;
    return;
  }

  await doReview(submission, action, '');
};

// 确认退回
const confirmReject = async () => {
  if (pendingRejectSubmission.value) {
    await doReview(pendingRejectSubmission.value, 'REJECTED', rejectNote.value);
    showRejectModal.value = false;
    pendingRejectSubmission.value = null;
  }
};

// 执行审核
const doReview = async (submission, action, reviewNote) => {
  reviewingId.value = submission.id;
  reviewAction.value = action;

  try {
    await submissionAPI.parentReview(submission.id, { action, reviewNote });
    message.success(action === 'APPROVED' ? '审核通过' : '已退回');

    // 从列表中移除
    submissions.value = submissions.value.filter(s => s.id !== submission.id);
    stats.value.pending = Math.max(0, stats.value.pending - 1);
  } catch (error) {
    message.error(error.response?.data?.error || '审核失败');
    console.error('审核失败:', error);
  } finally {
    reviewingId.value = null;
    reviewAction.value = null;
  }
};

// 孩子切换变化 - 更新 store 并重新加载数据
const handleChildChange = (childId) => {
  parentStore.selectChild(childId);
  pagination.page = 1;
  loadSubmissions();
};

// 分页变化
const handlePageChange = (page) => {
  pagination.page = page;
  loadSubmissions();
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.submission-card {
  transition: all 0.2s ease;
}

.submission-card:hover {
  transform: translateY(-2px);
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
