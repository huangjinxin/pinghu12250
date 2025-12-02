<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">用户管理</h1>
        <p class="text-gray-500 mt-1">管理所有注册用户</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="card text-center">
        <div class="text-2xl font-bold text-gray-800">{{ stats.totalUsers || 0 }}</div>
        <div class="text-sm text-gray-500">总用户</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-orange-500">{{ stats.pendingUsers || 0 }}</div>
        <div class="text-sm text-gray-500">待审核</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-green-500">{{ stats.activeUsers || 0 }}</div>
        <div class="text-sm text-gray-500">已激活</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-red-500">{{ stats.disabledUsers || 0 }}</div>
        <div class="text-sm text-gray-500">已禁用</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-primary-500">{{ stats.todayLogins || 0 }}</div>
        <div class="text-sm text-gray-500">今日登录</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <n-space>
        <n-select
          v-model:value="filters.status"
          placeholder="用户状态"
          :options="statusOptions"
          clearable
          style="width: 120px"
          @update:value="loadUsers"
        />
        <n-select
          v-model:value="filters.role"
          placeholder="用户角色"
          :options="roleOptions"
          clearable
          style="width: 120px"
          @update:value="loadUsers"
        />
      </n-space>
    </div>

    <!-- 用户列表 -->
    <div class="card">
      <n-data-table
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 状态更新对话框 -->
    <n-modal v-model:show="statusModal.show" preset="dialog" :title="statusModal.title">
      <n-form>
        <n-form-item v-if="statusModal.status === 'DISABLED'" label="禁用原因">
          <n-input v-model:value="statusModal.reason" type="textarea" placeholder="请输入禁用原因（可选）" />
        </n-form-item>
        <p v-else>确定要{{ statusModal.title }}吗？</p>
      </n-form>
      <template #action>
        <n-button @click="statusModal.show = false">取消</n-button>
        <n-button type="primary" :loading="statusModal.loading" @click="confirmStatusUpdate">
          确定
        </n-button>
      </template>
    </n-modal>

    <!-- 修改加入时间对话框 -->
    <n-modal v-model:show="joinedDateModal.show" preset="dialog" title="修改加入时间">
      <n-form>
        <n-form-item label="当前加入时间">
          <n-input :value="joinedDateModal.currentDate" readonly disabled />
        </n-form-item>
        <n-form-item label="新加入时间">
          <n-date-picker
            v-model:value="joinedDateModal.newDate"
            type="datetime"
            clearable
            style="width: 100%"
            :is-date-disabled="(ts) => ts > Date.now()"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="joinedDateModal.show = false">取消</n-button>
        <n-button type="primary" :loading="joinedDateModal.loading" @click="confirmJoinedDateUpdate">
          确定修改
        </n-button>
      </template>
    </n-modal>

    <!-- 重置密码对话框 -->
    <n-modal v-model:show="resetPasswordModal.show" preset="dialog" title="重置密码">
      <n-form>
        <n-form-item label="用户">
          <n-input :value="resetPasswordModal.username" readonly disabled />
        </n-form-item>
        <n-form-item label="新密码">
          <n-input
            v-model:value="resetPasswordModal.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item label="确认密码">
          <n-input
            v-model:value="resetPasswordModal.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password-on="click"
          />
        </n-form-item>
        <n-alert v-if="resetPasswordModal.error" type="error" :title="resetPasswordModal.error" class="mb-3" />
      </n-form>
      <template #action>
        <n-button @click="resetPasswordModal.show = false">取消</n-button>
        <n-button type="primary" :loading="resetPasswordModal.loading" @click="confirmResetPassword">
          确定重置
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, h, onMounted, reactive } from 'vue';
import { useMessage, NTag, NButton, NSpace } from 'naive-ui';
import { adminAPI } from '@/api';
import { format } from 'date-fns';

const message = useMessage();

const loading = ref(false);
const users = ref([]);
const stats = ref({});

const filters = ref({
  status: null,
  role: null,
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  pageCount: 1,
  itemCount: 0,
});

const statusModal = ref({
  show: false,
  title: '',
  userId: '',
  status: '',
  reason: '',
  loading: false,
});

const joinedDateModal = ref({
  show: false,
  userId: '',
  username: '',
  currentDate: '',
  newDate: null,
  loading: false,
});

const resetPasswordModal = ref({
  show: false,
  userId: '',
  username: '',
  newPassword: '',
  confirmPassword: '',
  error: '',
  loading: false,
});

const statusOptions = [
  { label: '待审核', value: 'PENDING' },
  { label: '已激活', value: 'ACTIVE' },
  { label: '已禁用', value: 'DISABLED' },
];

const roleOptions = [
  { label: '学生', value: 'STUDENT' },
  { label: '家长', value: 'PARENT' },
  { label: '老师', value: 'TEACHER' },
  { label: '管理员', value: 'ADMIN' },
];

const getStatusTag = (status) => {
  const config = {
    PENDING: { type: 'warning', text: '待审核' },
    ACTIVE: { type: 'success', text: '已激活' },
    DISABLED: { type: 'error', text: '已禁用' },
  };
  return config[status] || { type: 'default', text: status };
};

const getRoleTag = (role) => {
  const config = {
    STUDENT: { type: 'info', text: '学生' },
    PARENT: { type: 'default', text: '家长' },
    TEACHER: { type: 'success', text: '老师' },
    ADMIN: { type: 'error', text: '管理员' },
  };
  return config[role] || { type: 'default', text: role };
};

const columns = [
  {
    title: '用户',
    key: 'user',
    render: (row) => h('div', { class: 'flex items-center space-x-3' }, [
      h(AvatarText, { username: row.username, size: 'sm' }),
      h('div', [
        h('div', { class: 'font-medium' }, row.profile?.nickname || row.username),
        h('div', { class: 'text-xs text-gray-500' }, row.email),
      ]),
    ]),
  },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render: (row) => {
      const tag = getRoleTag(row.role);
      return h(NTag, { type: tag.type, size: 'small' }, () => tag.text);
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const tag = getStatusTag(row.status);
      return h(NTag, { type: tag.type, size: 'small' }, () => tag.text);
    },
  },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 160,
    render: (row) => format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    render: (row) => {
      const buttons = [];

      if (row.status === 'PENDING') {
        buttons.push(
          h(NButton, {
            size: 'small',
            type: 'success',
            onClick: () => openStatusModal(row, 'ACTIVE', '审核通过'),
          }, () => '通过')
        );
      }

      if (row.status !== 'DISABLED' && row.role !== 'ADMIN') {
        buttons.push(
          h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => openStatusModal(row, 'DISABLED', '禁用用户'),
          }, () => '禁用')
        );
      }

      if (row.status === 'DISABLED') {
        buttons.push(
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => openStatusModal(row, 'ACTIVE', '启用用户'),
          }, () => '启用')
        );
      }

      // 添加修改加入时间按钮
      buttons.push(
        h(NButton, {
          size: 'small',
          onClick: () => openJoinedDateModal(row),
        }, () => '修改时间')
      );

      // 添加重置密码按钮
      buttons.push(
        h(NButton, {
          size: 'small',
          type: 'warning',
          onClick: () => openResetPasswordModal(row),
        }, () => '重置密码')
      );

      return h(NSpace, { size: 'small' }, () => buttons);
    },
  },
];

const openStatusModal = (user, status, title) => {
  statusModal.value = {
    show: true,
    title,
    userId: user.id,
    status,
    reason: '',
    loading: false,
  };
};

const confirmStatusUpdate = async () => {
  statusModal.value.loading = true;
  try {
    await adminAPI.updateUserStatus(statusModal.value.userId, {
      status: statusModal.value.status,
      reason: statusModal.value.reason,
    });
    message.success('操作成功');
    statusModal.value.show = false;
    loadUsers();
    loadStats();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    statusModal.value.loading = false;
  }
};

const openJoinedDateModal = (user) => {
  joinedDateModal.value = {
    show: true,
    userId: user.id,
    username: user.username,
    currentDate: format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    newDate: new Date(user.createdAt).getTime(),
    loading: false,
  };
};

const confirmJoinedDateUpdate = async () => {
  if (!joinedDateModal.value.newDate) {
    message.warning('请选择新的加入时间');
    return;
  }

  joinedDateModal.value.loading = true;
  try {
    await adminAPI.updateUserJoinedDate(joinedDateModal.value.userId, {
      createdAt: new Date(joinedDateModal.value.newDate).toISOString(),
    });
    message.success(`已将 ${joinedDateModal.value.username} 的加入时间修改成功`);
    joinedDateModal.value.show = false;
    loadUsers();
  } catch (error) {
    message.error(error.error || '修改失败');
  } finally {
    joinedDateModal.value.loading = false;
  }
};

const openResetPasswordModal = (user) => {
  resetPasswordModal.value = {
    show: true,
    userId: user.id,
    username: user.profile?.nickname || user.username,
    newPassword: '',
    confirmPassword: '',
    error: '',
    loading: false,
  };
};

const confirmResetPassword = async () => {
  // 清除之前的错误
  resetPasswordModal.value.error = '';

  // 验证密码
  if (!resetPasswordModal.value.newPassword) {
    resetPasswordModal.value.error = '请输入新密码';
    return;
  }

  if (resetPasswordModal.value.newPassword.length < 6) {
    resetPasswordModal.value.error = '密码长度至少6位';
    return;
  }

  if (resetPasswordModal.value.newPassword !== resetPasswordModal.value.confirmPassword) {
    resetPasswordModal.value.error = '两次输入的密码不一致';
    return;
  }

  resetPasswordModal.value.loading = true;
  try {
    await adminAPI.resetUserPassword(resetPasswordModal.value.userId, {
      newPassword: resetPasswordModal.value.newPassword,
    });
    message.success(`已成功重置 ${resetPasswordModal.value.username} 的密码`);
    resetPasswordModal.value.show = false;
  } catch (error) {
    resetPasswordModal.value.error = error.error || '重置密码失败';
  } finally {
    resetPasswordModal.value.loading = false;
  }
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadUsers();
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    };
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.role) params.role = filters.value.role;

    const data = await adminAPI.getUsers(params);
    users.value = data.users;
    pagination.itemCount = data.pagination.total;
    pagination.pageCount = data.pagination.totalPages;
  } catch (error) {
    message.error('加载用户失败');
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const data = await adminAPI.getStats();
    stats.value = data;
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

onMounted(() => {
  loadUsers();
  loadStats();
});
</script>
