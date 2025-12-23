<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">用户管理</h1>
        <p class="text-gray-500 mt-1">管理所有注册用户</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        <template #icon>
          <n-icon><AddIcon /></n-icon>
        </template>
        创建用户
      </n-button>
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
          @update:value="handleFilterChange"
        />
        <n-select
          v-model:value="filters.role"
          placeholder="用户角色"
          :options="roleOptions"
          clearable
          style="width: 120px"
          @update:value="handleFilterChange"
        />
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索用户名/昵称/邮箱"
          clearable
          style="width: 220px"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
        >
          <template #prefix>
            <n-icon><SearchIcon /></n-icon>
          </template>
        </n-input>
        <n-button @click="handleFilterChange">搜索</n-button>
      </n-space>
    </div>

    <!-- 用户列表 -->
    <div class="card">
      <n-data-table
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="tablePagination"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </div>

    <!-- 创建用户对话框 -->
    <n-modal v-model:show="createModal.show" preset="card" title="创建用户" style="width: 500px">
      <n-form ref="createFormRef" :model="createModal.form" :rules="createFormRules" label-placement="left" label-width="80">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="createModal.form.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="昵称" path="nickname">
          <n-input v-model:value="createModal.form.nickname" placeholder="请输入昵称（可选）" />
        </n-form-item>
        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="createModal.form.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="createModal.form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item label="角色" path="role">
          <n-select
            v-model:value="createModal.form.role"
            :options="roleOptions"
            placeholder="请选择角色"
            @update:value="handleRoleChange"
          />
        </n-form-item>
        <!-- 家长关联孩子 -->
        <n-form-item v-if="createModal.form.role === 'PARENT'" label="关联孩子">
          <n-select
            v-model:value="createModal.form.childrenIds"
            multiple
            filterable
            :options="studentOptions"
            :loading="loadingStudents"
            placeholder="搜索并选择孩子账户"
            :render-label="renderStudentLabel"
            @search="handleStudentSearch"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createModal.show = false">取消</n-button>
          <n-button type="primary" :loading="createModal.loading" @click="handleCreateUser">
            创建
          </n-button>
        </n-space>
      </template>
    </n-modal>

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

    <!-- 管理关联孩子对话框 -->
    <n-modal v-model:show="childrenModal.show" preset="card" title="管理关联孩子" style="width: 500px">
      <n-form>
        <n-form-item label="家长账户">
          <n-input :value="childrenModal.username" readonly disabled />
        </n-form-item>
        <n-form-item label="关联的孩子">
          <n-select
            v-model:value="childrenModal.childrenIds"
            multiple
            filterable
            :options="studentOptions"
            :loading="loadingStudents"
            placeholder="搜索并选择孩子账户"
            :render-label="renderStudentLabel"
            @search="handleStudentSearch"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="childrenModal.show = false">取消</n-button>
          <n-button type="primary" :loading="childrenModal.loading" @click="confirmUpdateChildren">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 删除用户确认对话框 -->
    <n-modal v-model:show="deleteModal.show" preset="dialog" title="确认删除用户">
      <div class="space-y-3">
        <n-alert type="error" title="警告">
          此操作将永久删除该用户及其所有相关数据，包括积分记录、钱包余额、支付记录等，且无法恢复！
        </n-alert>
        <div class="text-center py-2">
          <p class="text-gray-600">确定要删除用户 <span class="font-bold text-red-600">{{ deleteModal.username }}</span> 吗？</p>
        </div>
      </div>
      <template #action>
        <n-button @click="deleteModal.show = false">取消</n-button>
        <n-button type="error" :loading="deleteModal.loading" @click="confirmDeleteUser">
          确认删除
        </n-button>
      </template>
    </n-modal>

    <!-- 用户详情弹窗 -->
    <n-modal v-model:show="detailModal.show" preset="card" title="用户详情" style="width: 600px">
      <div v-if="detailModal.user" class="space-y-6">
        <!-- 用户基本信息 -->
        <div class="flex items-center space-x-4 pb-4 border-b">
          <AvatarText :username="detailModal.user.username" size="lg" />
          <div class="flex-1">
            <h3 class="text-xl font-bold">{{ detailModal.user.profile?.nickname || detailModal.user.username }}</h3>
            <p class="text-gray-500">{{ detailModal.user.email }}</p>
            <div class="flex items-center gap-2 mt-2">
              <n-tag :type="getRoleTag(detailModal.user.role).type" size="small">
                {{ getRoleTag(detailModal.user.role).text }}
              </n-tag>
              <n-tag :type="getStatusTag(detailModal.user.status).type" size="small">
                {{ getStatusTag(detailModal.user.status).text }}
              </n-tag>
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">用户名：</span>
            <span class="font-medium">{{ detailModal.user.username }}</span>
          </div>
          <div>
            <span class="text-gray-500">注册时间：</span>
            <span class="font-medium">{{ formatDateTime(detailModal.user.createdAt) }}</span>
          </div>
          <div v-if="detailModal.user.role === 'PARENT'">
            <span class="text-gray-500">关联孩子：</span>
            <span class="font-medium">
              <template v-if="(detailModal.user.parentRelations || []).length > 0">
                {{ (detailModal.user.parentRelations || []).map(c => c.child?.profile?.nickname || c.child?.username).join('、') }}
              </template>
              <span v-else class="text-gray-400">未关联</span>
            </span>
          </div>
        </div>

        <!-- 操作按钮区域 -->
        <n-divider>操作</n-divider>
        <div class="grid grid-cols-2 gap-3">
          <!-- 审核通过 -->
          <n-button
            v-if="detailModal.user.status === 'PENDING'"
            type="success"
            block
            @click="openStatusModalFromDetail('ACTIVE', '审核通过')"
          >
            审核通过
          </n-button>

          <!-- 禁用用户 -->
          <n-button
            v-if="detailModal.user.status !== 'DISABLED' && detailModal.user.role !== 'ADMIN'"
            type="error"
            block
            @click="openStatusModalFromDetail('DISABLED', '禁用用户')"
          >
            禁用用户
          </n-button>

          <!-- 启用用户 -->
          <n-button
            v-if="detailModal.user.status === 'DISABLED'"
            type="primary"
            block
            @click="openStatusModalFromDetail('ACTIVE', '启用用户')"
          >
            启用用户
          </n-button>

          <!-- 管理孩子 -->
          <n-button
            v-if="detailModal.user.role === 'PARENT'"
            block
            @click="openChildrenModalFromDetail"
          >
            管理关联孩子
          </n-button>

          <!-- 修改注册时间 -->
          <n-button block @click="openJoinedDateModalFromDetail">
            修改注册时间
          </n-button>

          <!-- 重置密码 -->
          <n-button type="warning" block @click="openResetPasswordModalFromDetail">
            重置密码
          </n-button>

          <!-- 删除用户 -->
          <n-button
            v-if="detailModal.user.role !== 'ADMIN'"
            type="error"
            ghost
            block
            @click="openDeleteModalFromDetail"
          >
            删除用户
          </n-button>
        </div>
      </div>
      <template #footer>
        <n-button @click="detailModal.show = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, h, onMounted, reactive } from 'vue';
import { useMessage, NTag, NButton, NSpace, NIcon } from 'naive-ui';
import { adminAPI } from '@/api';
import { format } from 'date-fns';
import { Add as AddIcon, Search as SearchIcon } from '@vicons/ionicons5';

const message = useMessage();

const loading = ref(false);
const users = ref([]);
const stats = ref({});
const createFormRef = ref(null);
const loadingStudents = ref(false);
const studentOptions = ref([]);

const filters = ref({
  status: null,
  role: null,
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  pageCount: 1,
  itemCount: 0,
});

// 表格分页配置
const tablePagination = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  itemCount: 0,
  prefix: ({ itemCount }) => `共 ${itemCount} 条`,
});

const createModal = ref({
  show: false,
  loading: false,
  form: {
    username: '',
    nickname: '',
    email: '',
    password: '',
    role: 'STUDENT',
    childrenIds: [],
  },
});

const createFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度2-20个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' },
  ],
};

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

const childrenModal = ref({
  show: false,
  userId: '',
  username: '',
  childrenIds: [],
  loading: false,
});

const deleteModal = ref({
  show: false,
  userId: '',
  username: '',
  loading: false,
});

const detailModal = ref({
  show: false,
  user: null,
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

const renderStudentLabel = (option) => {
  return h('div', { class: 'flex items-center justify-between w-full' }, [
    h('span', {}, option.label),
    option.parentCount > 0
      ? h(NTag, { size: 'small', type: 'warning' }, () => `已有${option.parentCount}位家长`)
      : null,
  ]);
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
    title: '关联孩子',
    key: 'children',
    width: 150,
    render: (row) => {
      if (row.role !== 'PARENT') return '-';
      const children = row.parentRelations || [];
      if (children.length === 0) {
        return h(NTag, { size: 'small', type: 'default' }, () => '未关联');
      }
      return h('div', { class: 'flex flex-wrap gap-1' },
        children.slice(0, 2).map(c =>
          h(NTag, { size: 'small', type: 'info' }, () => c.child?.profile?.nickname || c.child?.username)
        ).concat(
          children.length > 2 ? h('span', { class: 'text-xs text-gray-500' }, `+${children.length - 2}`) : []
        )
      );
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
    width: 100,
    render: (row) => {
      return h(NButton, {
        size: 'small',
        type: 'primary',
        onClick: () => openDetailModal(row),
      }, () => '查看详情');
    },
  },
];

const openCreateModal = () => {
  createModal.value = {
    show: true,
    loading: false,
    form: {
      username: '',
      nickname: '',
      email: '',
      password: '',
      role: 'STUDENT',
      childrenIds: [],
    },
  };
  loadStudents();
};

const handleRoleChange = (role) => {
  if (role === 'PARENT') {
    loadStudents();
  }
};

const loadStudents = async (keyword = '') => {
  loadingStudents.value = true;
  try {
    const data = await adminAPI.getStudents({ keyword, limit: 50 });
    studentOptions.value = data.students.map(s => ({
      label: s.profile?.nickname || s.username,
      value: s.id,
      parentCount: s.parentCount || 0,
    }));
  } catch (error) {
    console.error('加载学生列表失败:', error);
  } finally {
    loadingStudents.value = false;
  }
};

const handleStudentSearch = (keyword) => {
  loadStudents(keyword);
};

const handleCreateUser = async () => {
  try {
    await createFormRef.value?.validate();
  } catch (e) {
    return;
  }

  createModal.value.loading = true;
  try {
    await adminAPI.createUser(createModal.value.form);
    message.success('用户创建成功');
    createModal.value.show = false;
    loadUsers();
    loadStats();
  } catch (error) {
    message.error(error.error || '创建失败');
  } finally {
    createModal.value.loading = false;
  }
};

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
    detailModal.value.show = false; // 关闭详情弹窗
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
    detailModal.value.show = false; // 关闭详情弹窗
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
    detailModal.value.show = false; // 关闭详情弹窗
  } catch (error) {
    resetPasswordModal.value.error = error.error || '重置密码失败';
  } finally {
    resetPasswordModal.value.loading = false;
  }
};

const openChildrenModal = (user) => {
  childrenModal.value = {
    show: true,
    userId: user.id,
    username: user.profile?.nickname || user.username,
    childrenIds: (user.parentRelations || []).map(c => c.child?.id).filter(Boolean),
    loading: false,
  };
  loadStudents();
};

const confirmUpdateChildren = async () => {
  childrenModal.value.loading = true;
  try {
    await adminAPI.updateUserChildren(childrenModal.value.userId, {
      childrenIds: childrenModal.value.childrenIds,
    });
    message.success('关联更新成功');
    childrenModal.value.show = false;
    detailModal.value.show = false; // 关闭详情弹窗
    loadUsers();
  } catch (error) {
    message.error(error.error || '更新失败');
  } finally {
    childrenModal.value.loading = false;
  }
};

const openDeleteModal = (user) => {
  deleteModal.value = {
    show: true,
    userId: user.id,
    username: user.profile?.nickname || user.username,
    loading: false,
  };
};

// 打开用户详情弹窗
const openDetailModal = (user) => {
  detailModal.value = {
    show: true,
    user: user,
  };
};

// 从详情弹窗打开状态修改弹窗
const openStatusModalFromDetail = (status, title) => {
  openStatusModal(detailModal.value.user, status, title);
};

// 从详情弹窗打开管理孩子弹窗
const openChildrenModalFromDetail = () => {
  openChildrenModal(detailModal.value.user);
};

// 从详情弹窗打开修改时间弹窗
const openJoinedDateModalFromDetail = () => {
  openJoinedDateModal(detailModal.value.user);
};

// 从详情弹窗打开重置密码弹窗
const openResetPasswordModalFromDetail = () => {
  openResetPasswordModal(detailModal.value.user);
};

// 从详情弹窗打开删除弹窗
const openDeleteModalFromDetail = () => {
  openDeleteModal(detailModal.value.user);
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
};

const confirmDeleteUser = async () => {
  deleteModal.value.loading = true;
  try {
    await adminAPI.deleteUser(deleteModal.value.userId);
    message.success('用户删除成功');
    deleteModal.value.show = false;
    detailModal.value.show = false; // 关闭详情弹窗
    loadUsers();
    loadStats();
  } catch (error) {
    message.error(error.error || '删除失败');
  } finally {
    deleteModal.value.loading = false;
  }
};

const handlePageChange = (page) => {
  pagination.page = page;
  tablePagination.page = page;
  loadUsers();
};

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize;
  tablePagination.pageSize = pageSize;
  pagination.page = 1;
  tablePagination.page = 1;
  loadUsers();
};

// 筛选条件变化时重置到第一页
const handleFilterChange = () => {
  pagination.page = 1;
  tablePagination.page = 1;
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
    if (filters.value.keyword) params.keyword = filters.value.keyword;

    const data = await adminAPI.getUsers(params);
    users.value = data.users;
    pagination.itemCount = data.pagination.total;
    pagination.pageCount = data.pagination.totalPages;
    // 同步更新表格分页
    tablePagination.itemCount = data.pagination.total;
    tablePagination.page = pagination.page;
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
