<template>
  <div :class="embedded ? '' : 'p-6'">
    <div class="space-y-6">
      <!-- 邀请积分消耗设置 -->
      <n-card title="邀请积分消耗设置">
        <n-form :model="costForm" label-placement="left" label-width="120" class="max-w-xl">
          <n-form-item label="邀请家长消耗积分">
            <n-input-number v-model:value="costForm.parentInviteCost" :min="0" :max="9999" class="w-full" placeholder="每次生成家长邀请码消耗的积分" />
          </n-form-item>
          <n-form-item label="邀请同学消耗积分">
            <n-input-number v-model:value="costForm.classmateInviteCost" :min="0" :max="9999" class="w-full" placeholder="每次生成同学邀请码消耗的积分" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" :loading="savingCost" @click="saveCostSettings">保存设置</n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <!-- 邀请记录列表 -->
      <n-card title="邀请记录">
        <template #header-extra>
          <n-button type="primary" size="small" @click="showModal = true">
            <template #icon><n-icon :component="AddOutline" /></template>
            生成管理员邀请码
          </n-button>
        </template>

        <!-- 统计信息 -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">{{ stats.totalCodes }}</div>
            <div class="text-sm text-gray-500">总邀请码数</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">{{ stats.successfulInvites }}</div>
            <div class="text-sm text-gray-500">成功注册数</div>
          </div>
          <div class="bg-orange-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-orange-600">{{ stats.pendingInvites }}</div>
            <div class="text-sm text-gray-500">待使用</div>
          </div>
          <div class="bg-red-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-red-600">{{ stats.expiredCodes }}</div>
            <div class="text-sm text-gray-500">已过期</div>
          </div>
        </div>

        <!-- 筛选工具栏 -->
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <div class="flex flex-wrap gap-3 items-center">
            <n-input
              v-model:value="searchKeyword"
              placeholder="搜索邀请码/用户名/邮箱"
              clearable
              style="width: 220px"
            >
              <template #prefix>
                <n-icon :component="SearchOutline" />
              </template>
            </n-input>
            <n-select
              v-model:value="filterCreator"
              :options="creatorOptions"
              placeholder="发起邀请人"
              clearable
              filterable
              style="width: 160px"
            />
            <n-select
              v-model:value="filterInviteeRole"
              :options="inviteeRoleOptions"
              placeholder="被邀请人角色"
              clearable
              style="width: 140px"
            />
            <n-select
              v-model:value="filterType"
              :options="filterTypeOptions"
              placeholder="邀请类型"
              clearable
              style="width: 130px"
            />
            <n-select
              v-model:value="filterStatus"
              :options="filterStatusOptions"
              placeholder="状态"
              clearable
              style="width: 130px"
            />
            <n-date-picker
              v-model:value="filterDateRange"
              type="daterange"
              clearable
              placeholder="日期范围"
              style="width: 240px"
            />
            <n-button quaternary @click="resetFilters">
              <template #icon><n-icon :component="CloseCircleOutline" /></template>
              重置
            </n-button>
            <span class="text-sm text-gray-500 ml-auto">共 {{ filteredCodes.length }} 条</span>
          </div>
        </div>

        <n-data-table
          :columns="columns"
          :data="filteredCodes"
          :loading="loading"
          :pagination="pagination"
        />
      </n-card>
    </div>

    <!-- 生成管理员邀请码模态框 -->
    <n-modal v-model:show="showModal" preset="card" title="生成管理员邀请码" style="width: 500px">
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item label="生成数量" path="count">
          <n-input-number v-model:value="form.count" :min="1" :max="100" class="w-full" />
        </n-form-item>
        <n-form-item label="每个邀请码可使用次数" path="maxUses">
          <n-input-number v-model:value="form.maxUses" :min="1" :max="999" class="w-full" />
        </n-form-item>
        <n-form-item label="有效期（小时）" path="expiresInHours">
          <n-input-number v-model:value="form.expiresInHours" :min="1" :max="720" class="w-full" />
        </n-form-item>
        <n-form-item label="限定角色（可选）" path="role">
          <n-select
            v-model:value="form.role"
            :options="roleOptions"
            clearable
            placeholder="不限制"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="handleGenerate" :loading="generating">生成</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, computed, onMounted } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { NButton, NSpace, NTag, NTime, NTooltip, NIcon, NInput, NSelect, NDatePicker, useMessage, useDialog } from 'naive-ui';
import { inviteCodeAPI } from '@/api';
import AddOutline from '@vicons/ionicons5/es/AddOutline';
import CopyOutline from '@vicons/ionicons5/es/CopyOutline';
import TrashOutline from '@vicons/ionicons5/es/TrashOutline';
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline';
import CloseCircleOutline from '@vicons/ionicons5/es/CloseCircleOutline';
import TimeOutline from '@vicons/ionicons5/es/TimeOutline';
import InformationCircleOutline from '@vicons/ionicons5/es/InformationCircleOutline';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const generating = ref(false);
const savingCost = ref(false);
const showModal = ref(false);
const codes = ref([]);
const formRef = ref(null);
const filterType = ref(null);
const filterStatus = ref(null);
const searchKeyword = ref('');
const filterCreator = ref(null);
const filterInviteeRole = ref(null);
const filterDateRange = ref(null);

const costForm = ref({ parentInviteCost: 10, classmateInviteCost: 5 });

const form = ref({
  count: 1,
  maxUses: 1,
  expiresInHours: 24,
  role: null,
});

const roleOptions = [
  { label: '学生', value: 'STUDENT' },
  { label: '家长', value: 'PARENT' },
  { label: '老师', value: 'TEACHER' },
];

const rules = {
  count: { required: true, type: 'number', message: '请输入生成数量', trigger: 'blur' },
  maxUses: { required: true, type: 'number', message: '请输入使用次数', trigger: 'blur' },
  expiresInHours: { required: true, type: 'number', message: '请输入有效期', trigger: 'blur' },
};

const filterTypeOptions = [
  { label: '全部', value: null },
  { label: '管理员', value: 'ADMIN' },
  { label: '邀请家长', value: 'PARENT' },
  { label: '邀请同学', value: 'CLASSMATE' },
];

const filterStatusOptions = [
  { label: '全部', value: null },
  { label: '已成功注册', value: 'success' },
  { label: '待使用', value: 'pending' },
  { label: '已过期', value: 'expired' },
];

const inviteeRoleOptions = [
  { label: '全部', value: null },
  { label: '学生', value: 'STUDENT' },
  { label: '家长', value: 'PARENT' },
  { label: '老师', value: 'TEACHER' },
];

const creatorOptions = computed(() => {
  const creators = new Map();
  codes.value.forEach(c => {
    if (c.creator) {
      const key = c.creator.id;
      if (!creators.has(key)) {
        const name = c.creator.profile?.nickname || c.creator.username || '-';
        creators.set(key, { label: name, value: key });
      }
    }
  });
  return [{ label: '全部', value: null }, ...creators.values()];
});

const stats = computed(() => {
  const now = new Date();
  return {
    totalCodes: codes.value.length,
    successfulInvites: codes.value.filter(c => c.usedCount > 0).length,
    pendingInvites: codes.value.filter(c => c.usedCount === 0 && new Date(c.expiresAt) > now).length,
    expiredCodes: codes.value.filter(c => new Date(c.expiresAt) < now).length,
  };
});

const filteredCodes = computed(() => {
  let result = codes.value;
  const now = new Date();

  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase();
    result = result.filter(c => {
      const codeMatch = c.code.toLowerCase().includes(kw);
      const creatorMatch = (c.creator?.profile?.nickname || c.creator?.username || '').toLowerCase().includes(kw)
        || (c.creator?.email || '').toLowerCase().includes(kw);
      const inviteeMatch = (c.users || []).some(u =>
        (u.profile?.nickname || u.username || '').toLowerCase().includes(kw)
        || (u.email || '').toLowerCase().includes(kw)
      );
      return codeMatch || creatorMatch || inviteeMatch;
    });
  }

  if (filterCreator.value) {
    result = result.filter(c => c.creator?.id === filterCreator.value);
  }

  if (filterInviteeRole.value) {
    result = result.filter(c =>
      (c.users || []).some(u => u.role === filterInviteeRole.value)
    );
  }

  if (filterType.value) {
    result = result.filter(c => c.inviteType === filterType.value);
  }

  if (filterStatus.value) {
    if (filterStatus.value === 'success') {
      result = result.filter(c => c.usedCount > 0);
    } else if (filterStatus.value === 'pending') {
      result = result.filter(c => c.usedCount === 0 && new Date(c.expiresAt) > now);
    } else if (filterStatus.value === 'expired') {
      result = result.filter(c => new Date(c.expiresAt) < now);
    }
  }

  if (filterDateRange.value && filterDateRange.value.length === 2) {
    const [start, end] = filterDateRange.value;
    result = result.filter(c => {
      const createdAt = new Date(c.createdAt).getTime();
      return createdAt >= start && createdAt <= end + 86400000 - 1;
    });
  }

  return result;
});

const resetFilters = () => {
  searchKeyword.value = '';
  filterCreator.value = null;
  filterInviteeRole.value = null;
  filterType.value = null;
  filterStatus.value = null;
  filterDateRange.value = null;
};

const pagination = { pageSize: 20 };

const columns = [
  {
    title: '邀请类型',
    key: 'inviteType',
    width: 100,
    render: (row) => {
      const typeMap = { ADMIN: '管理员', PARENT: '家长', CLASSMATE: '同学' };
      const typeColor = { ADMIN: 'default', PARENT: 'warning', CLASSMATE: 'info' };
      return h(NTag, { size: 'small', type: typeColor[row.inviteType] || 'default' }, { default: () => typeMap[row.inviteType] || '管理员' });
    },
  },
  {
    title: '发起邀请人',
    key: 'creator',
    width: 140,
    render: (row) => {
      const name = row.creator?.profile?.nickname || row.creator?.username || '-';
      const roleMap = { STUDENT: '学生', PARENT: '家长', TEACHER: '老师', ADMIN: '管理员' };
      const roleLabel = roleMap[row.creator?.role] || '';
      return h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h('div', { class: 'text-sm font-medium truncate max-w-[120px] cursor-help' }, name),
        default: () => h('div', {}, [
          h('div', { class: 'font-medium' }, name),
          h('div', { class: 'text-xs text-gray-500' }, `${roleLabel} · ID: ${row.creator?.id?.slice(0, 8) || '-'}`),
        ]),
      });
    },
  },
  {
    title: '邀请码',
    key: 'code',
    width: 160,
    render: (row) => h('code', { class: 'text-xs bg-gray-100 px-2 py-1 rounded font-mono' }, row.code),
  },
  {
    title: '被邀请人（注册状态）',
    key: 'invitee',
    width: 200,
    render: (row) => {
      if (!row.users || row.users.length === 0) {
        const expired = new Date(row.expiresAt) < new Date();
        const statusIcon = expired
          ? h(NIcon, { component: CloseCircleOutline, class: 'text-gray-300', size: 14 })
          : h(NIcon, { component: TimeOutline, class: 'text-orange-400', size: 14 });
        return h('div', { class: 'flex items-center gap-1 text-gray-400 text-sm' }, [
          statusIcon,
          h('span', {}, expired ? '已过期，未注册' : '待使用'),
        ]);
      }
      return row.users.map(u => {
        const name = u.profile?.nickname || u.username;
        const roleMap = { STUDENT: '学生', PARENT: '家长', TEACHER: '老师' };
        const roleLabel = roleMap[u.role] || u.role;
        const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '';
        return h('div', { class: 'flex items-center gap-2 text-sm mb-1' }, [
          h(NIcon, { component: CheckmarkCircleOutline, class: 'text-green-500', size: 14 }),
          h('span', { class: 'font-medium' }, name),
          h(NTag, { size: 'tiny', type: 'info' }, { default: () => roleLabel }),
          h('span', { class: 'text-xs text-gray-400' }, regDate),
        ]);
      });
    },
  },
  {
    title: '使用情况',
    key: 'usage',
    width: 90,
    render: (row) => h('span', { class: 'text-sm font-mono' }, `${row.usedCount}/${row.maxUses}`),
  },
  {
    title: '限定角色',
    key: 'role',
    width: 80,
    render: (row) => {
      if (!row.role) return h('span', { class: 'text-gray-400 text-sm' }, '不限');
      const roleMap = { STUDENT: '学生', PARENT: '家长', TEACHER: '老师' };
      return h(NTag, { size: 'tiny' }, { default: () => roleMap[row.role] });
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => {
      const expired = new Date(row.expiresAt) < new Date();
      const exhausted = row.usedCount >= row.maxUses;
      if (exhausted) {
        return h(NTag, { type: 'success', size: 'small' }, { icon: () => h(CheckmarkCircleOutline), default: () => '已完成' });
      }
      if (expired) {
        return h(NTag, { type: 'error', size: 'small' }, { icon: () => h(CloseCircleOutline), default: () => '已过期' });
      }
      if (row.usedCount > 0) {
        return h(NTag, { type: 'warning', size: 'small' }, { icon: () => h(TimeOutline), default: () => '进行中' });
      }
      return h(NTag, { type: 'info', size: 'small' }, { icon: () => h(InformationCircleOutline), default: () => '待使用' });
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 120,
    render: (row) => h(NTime, { time: new Date(row.createdAt), type: 'relative' }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) => h(NSpace, {}, {
      default: () => [
        h(NButton, {
          size: 'small',
          onClick: () => copyCode(row.code),
        }, {
          icon: () => h(CopyOutline),
        }),
        h(NButton, {
          size: 'small',
          type: 'error',
          onClick: () => handleDelete(row),
        }, {
          icon: () => h(TrashOutline),
        }),
      ],
    }),
  },
];

const loadCodes = async () => {
  loading.value = true;
  try {
    const res = await inviteCodeAPI.list();
    codes.value = res.data || [];
  } catch (err) {
    message.error(err.error || '加载失败');
  } finally {
    loading.value = false;
  }
};

const loadCostSettings = async () => {
  try {
    const res = await inviteCodeAPI.getCostSettings();
    costForm.value.parentInviteCost = res.data.parentInviteCost ?? 10;
    costForm.value.classmateInviteCost = res.data.classmateInviteCost ?? 5;
  } catch {
    // 使用默认值
  }
};

const saveCostSettings = async () => {
  savingCost.value = true;
  try {
    await inviteCodeAPI.saveCostSettings(costForm.value);
    message.success('保存成功');
  } catch (err) {
    message.error(err.error || '保存失败');
  } finally {
    savingCost.value = false;
  }
};

const handleGenerate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  generating.value = true;
  try {
    await inviteCodeAPI.generate(form.value);
    message.success(`成功生成 ${form.value.count} 个邀请码`);
    showModal.value = false;
    loadCodes();
  } catch (err) {
    message.error(err.error || '生成失败');
  } finally {
    generating.value = false;
  }
};

const copyCode = (code) => {
  navigator.clipboard.writeText(code);
  message.success('已复制到剪贴板');
};

const handleDelete = (code) => {
  dialog.warning({
    title: '删除邀请码',
    content: `确认删除邀请码 ${code.code}？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await inviteCodeAPI.delete(code.id);
        message.success('删除成功');
        loadCodes();
      } catch (err) {
        message.error(err.error || '删除失败');
      }
    },
  });
};

onMounted(() => {
  loadCodes();
  loadCostSettings();
});
</script>
