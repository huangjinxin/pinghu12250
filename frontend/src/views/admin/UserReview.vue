<template>
  <div :class="embedded ? '' : 'p-6'">
    <n-card v-if="!embedded" title="用户审核">
      <template #header-extra>
        <n-badge :value="pendingCount" :max="99" type="warning">
          <n-button @click="loadUsers" :loading="loading">
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
            刷新
          </n-button>
        </n-badge>
      </template>
    </n-card>
    <div class="mb-3 flex justify-end" v-if="embedded">
      <n-badge :value="pendingCount" :max="99" type="warning">
        <n-button @click="loadUsers" :loading="loading" size="small">
          <template #icon><n-icon :component="RefreshOutline" /></template>
          刷新
        </n-button>
      </n-badge>
    </div>

      <n-space vertical :size="16">
        <n-tabs v-model:value="activeTab" type="line">
          <n-tab-pane name="pending" tab="待审核">
            <n-data-table
              :columns="columns"
              :data="pendingUsers"
              :loading="loading"
              :pagination="false"
            />
          </n-tab-pane>
          <n-tab-pane name="all" tab="全部用户">
            <n-data-table
              :columns="columns"
              :data="allUsers"
              :loading="loading"
              :pagination="false"
            />
          </n-tab-pane>
        </n-tabs>
      </n-space>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { NButton, NSpace, NTag, NTime, useMessage, useDialog } from 'naive-ui';
import { userReviewAPI } from '@/api';
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const activeTab = ref('pending');
const users = ref([]);

const pendingUsers = computed(() =>
  users.value.filter(u => u.status === 'PENDING' || u.needsReview)
);

const allUsers = computed(() => users.value);
const pendingCount = computed(() => pendingUsers.value.length);

const columns = [
  {
    title: '真实姓名',
    key: 'realName',
    width: 100,
  },
  {
    title: '用户名',
    key: 'username',
    width: 120,
  },
  {
    title: '邮箱',
    key: 'email',
    width: 180,
  },
  {
    title: '出生日期',
    key: 'birthDate',
    width: 120,
    render: (row) => {
      if (!row.birthDate) return '-';
      return new Date(row.birthDate).toLocaleDateString('zh-CN');
    },
  },
  {
    title: '学号',
    key: 'studentNumber',
    width: 100,
    render: (row) => row.studentNumber || '-',
  },
  {
    title: '班级',
    key: 'class',
    width: 100,
    render: (row) => row.class?.name || '-',
  },
  {
    title: '邀请码',
    key: 'inviteCode',
    width: 150,
    render: (row) => {
      if (!row.inviteCode) return '-';
      return h('div', [
        h('div', { class: 'text-xs text-gray-500' }, row.inviteCode.code),
        h('div', { class: 'text-xs text-gray-400' },
          `创建者: ${row.inviteCode.creator?.username || '-'}`
        ),
      ]);
    },
  },
  {
    title: '注册时间',
    key: 'registeredAt',
    width: 100,
    render: (row) => h(NTime, { time: new Date(row.registeredAt), type: 'relative' }),
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => {
      const statusMap = {
        PENDING: { type: 'warning', text: '待审核' },
        ACTIVE: { type: 'success', text: row.needsReview ? '试用中' : '已激活' },
        DISABLED: { type: 'error', text: '已禁用' },
      };
      const status = statusMap[row.status] || { type: 'default', text: row.status };
      return h(NTag, { type: status.type, size: 'small' }, { default: () => status.text });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) => {
      if (row.status === 'ACTIVE' && !row.needsReview) {
        return h('span', { class: 'text-gray-400 text-sm' }, '已审核');
      }
      return h(NSpace, {}, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'success',
            onClick: () => handleApprove(row),
          }, { default: () => '通过' }),
          h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => handleReject(row),
          }, { default: () => '拒绝' }),
        ],
      });
    },
  },
];

const loadUsers = async () => {
  loading.value = true;
  try {
    const res = await userReviewAPI.getPendingUsers();
    users.value = res.data || [];
  } catch (err) {
    message.error(err.error || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleApprove = (user) => {
  dialog.warning({
    title: '审核通过',
    content: `确认通过用户 ${user.realName}（${user.username}）的注册申请？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await userReviewAPI.approve(user.id);
        message.success('审核通过');
        loadUsers();
      } catch (err) {
        message.error(err.error || '操作失败');
      }
    },
  });
};

const handleReject = (user) => {
  dialog.error({
    title: '拒绝注册',
    content: `确认拒绝用户 ${user.realName}（${user.username}）的注册申请？账号将被禁用。`,
    positiveText: '确认拒绝',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await userReviewAPI.reject(user.id, { reason: '审核未通过' });
        message.success('已拒绝');
        loadUsers();
      } catch (err) {
        message.error(err.error || '操作失败');
      }
    },
  });
};

onMounted(() => {
  loadUsers();
});
</script>
