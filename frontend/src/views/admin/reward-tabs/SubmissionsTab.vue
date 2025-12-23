<template>
  <div class="submissions-tab">
    <n-card title="用户提交记录">
      <template #header-extra>
        <n-button @click="resetFilters" size="small" quaternary>重置筛选</n-button>
      </template>

      <!-- 筛选区域 -->
      <n-space vertical :size="12" style="margin-bottom: 16px;">
        <n-space wrap :size="12">
          <n-input
            v-model:value="filters.username"
            placeholder="搜索用户名"
            clearable
            style="width: 150px"
            @update:value="handleFilterChange"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>

          <n-input
            v-model:value="filters.templateName"
            placeholder="搜索规则模板"
            clearable
            style="width: 150px"
            @update:value="handleFilterChange"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>

          <n-select
            v-model:value="filters.typeId"
            :options="typeOptions"
            placeholder="技术类型"
            clearable
            style="width: 150px"
            @update:value="handleFilterChange"
          />

          <n-select
            v-model:value="filters.status"
            :options="statusOptions"
            placeholder="状态"
            clearable
            style="width: 120px"
            @update:value="handleFilterChange"
          />

          <n-date-picker
            v-model:value="filters.dateRange"
            type="daterange"
            clearable
            style="width: 260px"
            @update:value="handleFilterChange"
          />
        </n-space>
      </n-space>

      <n-spin :show="submissionStore.loading">
        <n-data-table
          :columns="columns"
          :data="submissionStore.allSubmissions"
          :pagination="false"
          :scroll-x="1400"
        />
        <div v-if="submissionStore.pagination.totalPages > 1" style="margin-top: 16px; display: flex; justify-content: flex-end">
          <n-pagination
            v-model:page="submissionStore.pagination.page"
            :page-count="submissionStore.pagination.totalPages"
            :page-size="submissionStore.pagination.pageSize"
            show-size-picker
            :page-sizes="[10, 20, 30, 50]"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </n-spin>
    </n-card>

    <!-- 查看详情对话框 -->
    <n-modal
      v-model:show="showDetailDialog"
      preset="card"
      title="提交详情"
      style="width: 600px"
    >
      <n-descriptions v-if="selectedSubmission" label-placement="left" :column="1">
        <n-descriptions-item label="用户">
          {{ selectedSubmission.user.username }}
        </n-descriptions-item>
        <n-descriptions-item label="规则模板">
          {{ selectedSubmission.template.name }}
        </n-descriptions-item>
        <n-descriptions-item label="技术类型">
          {{ selectedSubmission.template.type.name }}
        </n-descriptions-item>
        <n-descriptions-item label="展示标准">
          {{ selectedSubmission.template.standard.name }}
        </n-descriptions-item>
        <n-descriptions-item label="积分">
          {{ selectedSubmission.pointsAwarded || selectedSubmission.template.points }}
        </n-descriptions-item>
        <n-descriptions-item label="状态">
          <n-tag :type="getStatusType(selectedSubmission.status)">
            {{ getStatusText(selectedSubmission.status) }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item v-if="selectedSubmission.content" label="描述">
          {{ selectedSubmission.content }}
        </n-descriptions-item>
        <n-descriptions-item v-if="selectedSubmission.images?.length" label="图片">
          <n-space>
            <n-image
              v-for="(img, index) in selectedSubmission.images"
              :key="index"
              :src="img"
              width="150"
              style="border-radius: 4px"
            />
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="selectedSubmission.audios?.length" label="音频">
          <n-space vertical>
            <audio
              v-for="(audio, index) in selectedSubmission.audios"
              :key="index"
              :src="audio"
              controls
              style="width: 100%; max-width: 400px"
            />
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="selectedSubmission.link" label="链接">
          <a :href="selectedSubmission.link" target="_blank">{{ selectedSubmission.link }}</a>
        </n-descriptions-item>
        <n-descriptions-item v-if="selectedSubmission.reviewNote" label="审核备注">
          {{ selectedSubmission.reviewNote }}
        </n-descriptions-item>
        <n-descriptions-item label="提交时间">
          {{ formatDate(selectedSubmission.createdAt) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="selectedSubmission.reviewedAt" label="审核时间">
          {{ formatDate(selectedSubmission.reviewedAt) }}
        </n-descriptions-item>
      </n-descriptions>

      <template #footer>
        <n-space justify="space-between" align="center">
          <n-popconfirm
            v-if="selectedSubmission && selectedSubmission.status !== 'PENDING'"
            @positive-click="handleDeleteFromDetail"
          >
            <template #trigger>
              <n-button type="error" :loading="deleting">
                删除此记录
              </n-button>
            </template>
            <div style="max-width: 280px">
              <p style="margin: 0 0 8px 0; font-weight: 500;">确定要删除此提交记录吗？</p>
              <p style="margin: 0; color: #666; font-size: 13px;">
                删除后将回滚已发放的积分（{{ selectedSubmission?.pointsAwarded || 0 }}分）
              </p>
            </div>
          </n-popconfirm>
          <span v-else></span>
          <n-button @click="showDetailDialog = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, reactive } from 'vue';
import { NButton, NTag, NImage, NIcon, NTooltip, NPopconfirm, NSpace, useMessage } from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';
import { useSubmissionStore } from '@/stores/submission';
import { useRewardRuleStore } from '@/stores/rewardRule';

const message = useMessage();
const submissionStore = useSubmissionStore();
const rewardRuleStore = useRewardRuleStore();

const showDetailDialog = ref(false);
const selectedSubmission = ref(null);
const deleting = ref(false);

const filters = reactive({
  username: '',
  templateName: '',
  typeId: null,
  status: null,
  dateRange: null
});

const statusOptions = [
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' }
];

const typeOptions = ref([]);

const columns = [
  {
    title: '用户',
    key: 'user.username',
    width: 100,
    ellipsis: { tooltip: true },
    render: (row) => row.user.username
  },
  {
    title: '规则模板',
    key: 'template.name',
    width: 140,
    ellipsis: { tooltip: true },
    render: (row) => row.template.name
  },
  {
    title: '技术类型',
    key: 'template.type.name',
    width: 100,
    render: (row) => h(NTag, { type: 'info', size: 'small' }, { default: () => row.template.type.name })
  },
  {
    title: '描述',
    key: 'content',
    width: 180,
    ellipsis: { tooltip: true },
    render: (row) => {
      if (!row.content) {
        return h('span', { style: 'color: #999; font-size: 12px' }, '无');
      }
      return h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h('span', {
          style: 'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;'
        }, row.content),
        default: () => row.content
      });
    }
  },
  {
    title: '缩略图',
    key: 'images',
    width: 80,
    render: (row) => {
      if (!row.images || row.images.length === 0) {
        return h('span', { style: 'color: #999; font-size: 12px' }, '无');
      }
      return h('div', {
        style: 'width: 60px; height: 60px; overflow: hidden; border-radius: 4px; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5;'
      }, [
        h(NImage, {
          src: row.images[0],
          width: 60,
          height: 60,
          objectFit: 'cover',
          imgProps: {
            style: {
              width: '60px',
              height: '60px',
              objectFit: 'cover'
            }
          }
        })
      ]);
    }
  },
  {
    title: '音频',
    key: 'audios',
    width: 120,
    render: (row) => {
      if (!row.audios || row.audios.length === 0) {
        return h('span', { style: 'color: #999; font-size: 12px' }, '无');
      }
      return h('div', {
        style: 'display: flex; flex-direction: column; gap: 4px;'
      }, row.audios.map((audioUrl, index) =>
        h('audio', {
          src: audioUrl,
          controls: true,
          style: 'width: 100px; height: 30px;',
          key: index
        })
      ));
    }
  },
  {
    title: '积分',
    key: 'points',
    width: 80,
    render: (row) => {
      const points = row.pointsAwarded || row.template.points;
      return h(
        NTag,
        { type: points > 0 ? 'success' : 'error', size: 'small' },
        { default: () => (points > 0 ? '+' : '') + points }
      );
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => h(
      NTag,
      { type: getStatusType(row.status), size: 'small' },
      { default: () => getStatusText(row.status) }
    )
  },
  {
    title: '提交时间',
    key: 'createdAt',
    width: 160,
    render: (row) => formatDate(row.createdAt)
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) => h(
      NSpace,
      { size: 'small', align: 'center' },
      () => [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleViewDetail(row)
          },
          { default: () => '详情' }
        ),
        row.status !== 'PENDING' && (
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDeleteSubmission(row)
            },
            {
              trigger: () => h(
                NButton,
                {
                  size: 'small',
                  type: 'error',
                  quaternary: true
                },
                { default: () => '删除' }
              ),
              default: () => '确定删除此条记录？删除后将回滚积分。'
            }
          )
        )
      ]
    )
  }
];

onMounted(async () => {
  await Promise.all([
    submissionStore.fetchAllSubmissions(),
    loadTypeOptions()
  ]);
});

async function loadTypeOptions() {
  try {
    await rewardRuleStore.fetchTypes();
    typeOptions.value = rewardRuleStore.types.map(type => ({
      label: type.name,
      value: type.id
    }));
  } catch (error) {
    console.error('加载技术类型失败:', error);
  }
}

let filterTimeout = null;
function handleFilterChange() {
  // 防抖处理
  if (filterTimeout) clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    fetchWithFilters();
  }, 300);
}

function fetchWithFilters(page = 1) {
  const params = {};
  if (filters.username) params.username = filters.username;
  if (filters.templateName) params.templateName = filters.templateName;
  if (filters.typeId) params.typeId = filters.typeId;
  if (filters.status) params.status = filters.status;
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.startDate = new Date(filters.dateRange[0]).toISOString().split('T')[0];
    params.endDate = new Date(filters.dateRange[1]).toISOString().split('T')[0];
  }
  submissionStore.fetchAllSubmissions(page, params);
}

function resetFilters() {
  filters.username = '';
  filters.templateName = '';
  filters.typeId = null;
  filters.status = null;
  filters.dateRange = null;
  submissionStore.fetchAllSubmissions(1);
}

function handlePageChange(page) {
  fetchWithFilters(page);
}

function handlePageSizeChange(pageSize) {
  submissionStore.pagination.pageSize = pageSize;
  fetchWithFilters(1);
}

function handleViewDetail(submission) {
  selectedSubmission.value = submission;
  showDetailDialog.value = true;
}

function getStatusType(status) {
  const types = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error'
  };
  return types[status] || 'default';
}

function getStatusText(status) {
  const texts = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝'
  };
  return texts[status] || status;
}

// 删除提交记录
async function handleDeleteSubmission(submission) {
  try {
    await submissionStore.deleteSubmission(submission.id);
    message.success('删除成功');
    // 重新加载当前页数据
    fetchWithFilters(submissionStore.pagination.page);
    // 更新统计
    submissionStore.fetchStats();
  } catch (error) {
    message.error(error.response?.data?.error || '删除失败');
  }
}

// 从详情对话框删除
async function handleDeleteFromDetail() {
  if (!selectedSubmission.value) return;

  deleting.value = true;
  try {
    await submissionStore.deleteSubmission(selectedSubmission.value.id);
    message.success('删除成功，已回滚积分');
    showDetailDialog.value = false;
    // 重新加载当前页数据
    fetchWithFilters(submissionStore.pagination.page);
    // 更新统计
    submissionStore.fetchStats();
  } catch (error) {
    message.error(error.response?.data?.error || '删除失败');
  } finally {
    deleting.value = false;
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>

<style scoped>
.submissions-tab {
  padding: 20px 0;
}
</style>
