<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">活动日志</h1>
      <p class="text-gray-500 mt-1">查看系统所有用户的操作记录</p>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <n-space>
        <n-select
          v-model:value="filters.action"
          placeholder="操作类型"
          :options="actionOptions"
          clearable
          style="width: 140px"
          @update:value="loadLogs"
        />
        <n-date-picker
          v-model:value="filters.dateRange"
          type="daterange"
          clearable
          @update:value="loadLogs"
        />
        <n-button @click="loadLogs">
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 日志列表 -->
    <div class="card">
      <n-skeleton v-if="loading" text :repeat="10" />
      <n-empty v-else-if="logs.length === 0" description="暂无活动日志" />
      <div v-else class="space-y-3">
        <div
          v-for="log in logs"
          :key="log.id"
          class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
        >
          <AvatarText :username="log.user?.username" size="md" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="font-medium text-gray-800">
                  {{ log.user?.profile?.nickname || log.user?.username }}
                </span>
                <n-tag :type="getActionType(log.action)" size="tiny">
                  {{ getActionLabel(log.action) }}
                </n-tag>
              </div>
              <span class="text-xs text-gray-400">
                {{ formatTime(log.createdAt) }}
              </span>
            </div>
            <p v-if="log.description" class="text-sm text-gray-600 mt-1">
              {{ log.description }}
            </p>
            <div class="flex items-center space-x-4 mt-1 text-xs text-gray-400">
              <span v-if="log.targetType">
                目标: {{ log.targetType }}
              </span>
              <span v-if="log.ipAddress">
                IP: {{ log.ipAddress }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="pagination.pageCount > 1" class="flex justify-center mt-4">
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.pageCount"
          @update:page="loadLogs"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { adminAPI } from '@/api';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const message = useMessage();

const loading = ref(false);
const logs = ref([]);

const filters = ref({
  action: null,
  dateRange: null,
});

const pagination = reactive({
  page: 1,
  pageSize: 50,
  pageCount: 1,
});

const actionOptions = [
  { label: '登录', value: 'login' },
  { label: '注册', value: 'register' },
  { label: '创建日记', value: 'create_diary' },
  { label: '创建作品', value: 'create_work' },
  { label: '点赞', value: 'like' },
  { label: '评论', value: 'comment' },
  { label: '更新状态', value: 'update_user_status' },
];

const getActionType = (action) => {
  const types = {
    login: 'success',
    register: 'info',
    create_diary: 'warning',
    create_work: 'primary',
    like: 'error',
    comment: 'info',
    update_user_status: 'warning',
  };
  return types[action] || 'default';
};

const getActionLabel = (action) => {
  const labels = {
    login: '登录',
    register: '注册',
    create_diary: '创建日记',
    create_work: '创建作品',
    like: '点赞',
    comment: '评论',
    update_user_status: '更新状态',
  };
  return labels[action] || action;
};

const formatTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
  }
  return format(d, 'yyyy-MM-dd HH:mm');
};

const loadLogs = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    };

    if (filters.value.action) {
      params.action = filters.value.action;
    }

    if (filters.value.dateRange) {
      params.startDate = new Date(filters.value.dateRange[0]).toISOString();
      params.endDate = new Date(filters.value.dateRange[1]).toISOString();
    }

    const data = await adminAPI.getActivityLogs(params);
    logs.value = data.logs;
    pagination.pageCount = data.pagination.totalPages;
  } catch (error) {
    message.error('加载日志失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadLogs();
});
</script>
