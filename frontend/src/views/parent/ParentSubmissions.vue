<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">孩子历程</h1>
      <p class="text-gray-500 mt-1">查看孩子的提交记录和成长轨迹</p>
    </div>

    <!-- 筛选栏 -->
    <n-card>
      <n-space align="center" :wrap="true">
        <n-select
          v-model:value="filters.childId"
          placeholder="选择孩子"
          :options="childrenOptions"
          clearable
          style="width: 150px"
          @update:value="handleFilterChange"
        />
        <n-select
          v-model:value="filters.status"
          placeholder="状态筛选"
          :options="statusOptions"
          clearable
          style="width: 120px"
          @update:value="handleFilterChange"
        />
        <n-button @click="handleReset">重置</n-button>
      </n-space>
    </n-card>

    <!-- 加载状态 -->
    <n-spin :show="loading">
      <!-- 空状态 -->
      <n-empty v-if="!loading && submissions.length === 0" description="暂无提交记录">
        <template #extra>
          <p class="text-gray-500 text-sm">孩子的提交记录将会显示在这里</p>
        </template>
      </n-empty>

      <!-- 提交记录列表 -->
      <div v-else class="space-y-4">
        <n-card
          v-for="submission in submissions"
          :key="submission.id"
          hoverable
          class="submission-card"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- 孩子信息 -->
              <div class="flex items-center gap-2 mb-2">
                <n-avatar
                  :src="submission.user?.avatar"
                  :size="28"
                  round
                >
                  {{ (submission.user?.profile?.nickname || submission.user?.username)?.[0] }}
                </n-avatar>
                <span class="text-sm font-medium text-gray-700">
                  {{ submission.user?.profile?.nickname || submission.user?.username }}
                </span>
              </div>

              <!-- 规则名称 -->
              <h3 class="text-lg font-semibold text-gray-800 mb-2">
                {{ submission.template?.name }}
              </h3>

              <!-- 标签 -->
              <n-space size="small" class="mb-3">
                <n-tag type="info" size="small" round>
                  {{ submission.template?.type?.name }}
                </n-tag>
                <n-tag size="small" round>
                  {{ submission.template?.standard?.name }}
                </n-tag>
                <n-tag
                  :type="submission.template?.points > 0 ? 'success' : 'error'"
                  size="small"
                  round
                >
                  {{ submission.template?.points > 0 ? '+' : '' }}{{ submission.template?.points }} 积分
                </n-tag>
                <n-tag v-if="submission.quantity > 1" type="warning" size="small" round>
                  × {{ submission.quantity }}
                </n-tag>
              </n-space>

              <!-- 提交内容 -->
              <p v-if="submission.content" class="text-gray-600 text-sm mb-3 line-clamp-2">
                {{ submission.content }}
              </p>

              <!-- 图片预览 -->
              <n-space v-if="submission.images?.length" size="small" class="mb-3">
                <n-image
                  v-for="(img, idx) in submission.images.slice(0, 3)"
                  :key="idx"
                  :src="img"
                  width="60"
                  height="60"
                  object-fit="cover"
                  style="border-radius: 4px"
                  :preview-src="img"
                />
                <span v-if="submission.images.length > 3" class="text-gray-400 text-sm flex items-center">
                  +{{ submission.images.length - 3 }}
                </span>
              </n-space>

              <!-- 音频 -->
              <div v-if="submission.audios?.length" class="mb-3">
                <n-tag size="small" type="info">
                  {{ submission.audios.length }} 个音频
                </n-tag>
              </div>

              <!-- 链接 -->
              <div v-if="submission.link" class="mb-3">
                <a :href="submission.link" target="_blank" class="text-primary-500 text-sm hover:underline">
                  查看链接
                </a>
              </div>

              <!-- 时间和状态 -->
              <div class="flex items-center gap-4 text-xs text-gray-400">
                <span>{{ formatDate(submission.createdAt) }}</span>
              </div>
            </div>

            <!-- 右侧状态 -->
            <div class="flex flex-col items-end gap-2">
              <n-tag :type="getStatusType(submission.status)" size="medium">
                {{ getStatusText(submission.status) }}
              </n-tag>
              <n-button size="small" @click="viewDetail(submission)">
                查看详情
              </n-button>
            </div>
          </div>
        </n-card>

        <!-- 分页 -->
        <div v-if="pagination.totalPages > 1" class="flex justify-center mt-4">
          <n-pagination
            v-model:page="pagination.page"
            :page-count="pagination.totalPages"
            :page-size="pagination.pageSize"
            show-size-picker
            :page-sizes="[10, 20, 30]"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </div>
    </n-spin>

    <!-- 详情弹窗 -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="提交详情"
      style="width: 600px; max-width: 95vw"
    >
      <n-descriptions v-if="currentSubmission" label-placement="left" :column="1">
        <n-descriptions-item label="孩子">
          <div class="flex items-center gap-2">
            <n-avatar :src="currentSubmission.user?.avatar" :size="24" round>
              {{ (currentSubmission.user?.profile?.nickname || currentSubmission.user?.username)?.[0] }}
            </n-avatar>
            {{ currentSubmission.user?.profile?.nickname || currentSubmission.user?.username }}
          </div>
        </n-descriptions-item>
        <n-descriptions-item label="规则名称">
          {{ currentSubmission.template?.name }}
        </n-descriptions-item>
        <n-descriptions-item label="技术类型">
          <n-tag type="info" size="small">{{ currentSubmission.template?.type?.name }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="展示标准">
          <n-tag size="small">{{ currentSubmission.template?.standard?.name }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="积分">
          <n-tag
            :type="currentSubmission.template?.points > 0 ? 'success' : 'error'"
            size="small"
          >
            {{ currentSubmission.template?.points > 0 ? '+' : '' }}{{ currentSubmission.template?.points }} 积分
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="状态">
          <n-tag :type="getStatusType(currentSubmission.status)" size="small">
            {{ getStatusText(currentSubmission.status) }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="提交时间">
          {{ formatDate(currentSubmission.createdAt) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.content" label="说明内容">
          {{ currentSubmission.content }}
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.images?.length" label="图片">
          <n-space>
            <n-image
              v-for="(img, index) in currentSubmission.images"
              :key="index"
              :src="img"
              width="100"
              style="border-radius: 4px"
            />
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.audios?.length" label="音频">
          <n-space vertical>
            <audio
              v-for="(audio, index) in currentSubmission.audios"
              :key="index"
              :src="audio"
              controls
              style="width: 100%; max-width: 400px"
            />
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.link" label="链接">
          <a :href="currentSubmission.link" target="_blank" class="text-primary-500">
            {{ currentSubmission.link }}
          </a>
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.quantity > 1" label="数量">
          <n-tag size="small">
            × {{ currentSubmission.quantity }}（单个{{ currentSubmission.template?.points }}分）
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.reviewNote" label="审核备注">
          <div class="bg-gray-50 p-2 rounded text-sm">
            {{ currentSubmission.reviewNote }}
          </div>
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.reviewedAt" label="审核时间">
          {{ formatDate(currentSubmission.reviewedAt) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="currentSubmission.pointsAwarded !== null" label="实际获得积分">
          <n-tag
            :type="currentSubmission.pointsAwarded > 0 ? 'success' : 'error'"
            size="small"
          >
            {{ currentSubmission.pointsAwarded > 0 ? '+' : '' }}{{ currentSubmission.pointsAwarded }} 积分
          </n-tag>
        </n-descriptions-item>
      </n-descriptions>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { format } from 'date-fns';
import api from '@/api';

const message = useMessage();

// 状态
const loading = ref(false);
const submissions = ref([]);
const children = ref([]);
const showDetailModal = ref(false);
const currentSubmission = ref(null);

// 筛选条件
const filters = reactive({
  childId: null,
  status: null
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
});

// 孩子选项
const childrenOptions = computed(() => {
  return [
    { label: '全部孩子', value: null },
    ...children.value.map(child => ({
      label: child.profile?.nickname || child.username,
      value: child.id
    }))
  ];
});

// 状态选项
const statusOptions = [
  { label: '全部状态', value: null },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' }
];

// 加载孩子列表
const loadChildren = async () => {
  try {
    const data = await api.get('/users/children');
    children.value = data.children || [];
  } catch (error) {
    console.error('加载孩子列表失败:', error);
  }
};

// 加载提交记录
const loadSubmissions = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    if (filters.childId) params.childId = filters.childId;
    if (filters.status) params.status = filters.status;

    const data = await api.get('/submissions/children', { params });
    submissions.value = data.submissions || [];
    pagination.total = data.pagination?.total || 0;
    pagination.totalPages = data.pagination?.totalPages || 0;
  } catch (error) {
    message.error('加载提交记录失败');
    console.error('加载提交记录失败:', error);
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm');
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error'
  };
  return types[status] || 'default';
};

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝'
  };
  return texts[status] || status;
};

// 查看详情
const viewDetail = (submission) => {
  currentSubmission.value = submission;
  showDetailModal.value = true;
};

// 筛选变化
const handleFilterChange = () => {
  pagination.page = 1;
  loadSubmissions();
};

// 重置筛选
const handleReset = () => {
  filters.childId = null;
  filters.status = null;
  pagination.page = 1;
  loadSubmissions();
};

// 分页变化
const handlePageChange = (page) => {
  pagination.page = page;
  loadSubmissions();
};

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  loadSubmissions();
};

onMounted(() => {
  loadChildren();
  loadSubmissions();
});
</script>

<style scoped>
.submission-card {
  transition: all 0.2s ease;
}

.submission-card:hover {
  transform: translateY(-2px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
