<template>
  <div class="credit-rule-management">
    <!-- 头部区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">信用规则管理</h1>
        <p class="page-subtitle">配置系统信用分计算规则，通过多维度行为激励学生成长。</p>
      </div>
      <n-button type="primary" size="large" @click="openCreateModal" class="add-btn">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        新增规则
      </n-button>
    </div>

    <n-tabs type="line" animated>
      <!-- 规则管理 Tab -->
      <n-tab-pane name="rules" tab="规则管理">
        <!-- 过滤器区域 -->
        <n-card class="filter-card glass-morphism" size="small" style="margin-top: 16px;">
          <n-space align="center" :size="24">
            <div class="filter-item">
              <label>行为类型</label>
              <n-select
                v-model:value="filters.behaviorType"
                :options="behaviorOptions"
                placeholder="全部类型"
                clearable
                style="width: 180px"
              />
            </div>
            <div class="filter-item">
              <label>信用维度</label>
              <n-select
                v-model:value="filters.dimension"
                :options="dimensionOptions"
                placeholder="全部维度"
                clearable
                style="width: 180px"
              />
            </div>
          </n-space>
        </n-card>

        <!-- 数据列表 -->
        <n-card class="table-card glass-morphism" content-style="padding: 0">
          <n-data-table
            :loading="loading"
            :columns="columns"
            :data="filteredRules"
            :pagination="pagination"
            :bordered="false"
            class="custom-table"
          />
        </n-card>
      </n-tab-pane>

      <!-- 用户信用 Tab -->
      <n-tab-pane name="users" tab="用户信用情况">
        <n-card class="filter-card glass-morphism" size="small" style="margin-top: 16px;">
          <n-space align="center">
            <div class="filter-item">
              <label>搜索用户</label>
              <n-input
                v-model:value="userKeyword"
                placeholder="搜索用户名或昵称"
                clearable
                @keyup.enter="fetchUserProfiles"
                style="width: 240px"
              >
                <template #suffix>
                  <n-icon @click="fetchUserProfiles" class="cursor-pointer"><SearchOutline /></n-icon>
                </template>
              </n-input>
            </div>
          </n-space>
        </n-card>

        <n-card class="table-card glass-morphism" content-style="padding: 0">
          <n-data-table
            :loading="usersLoading"
            :columns="userColumns"
            :data="userProfiles"
            :pagination="userPagination"
            :bordered="false"
            class="custom-table"
          />
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <!-- 编辑/创建弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="isEditing ? '编辑规则' : '新增规则'"
      style="width: 600px"
      class="glass-morphism animate-pop"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-placement="top"
      >
        <n-grid :cols="2" :x-gap="12">
          <n-form-item-gi label="行为类型" path="behaviorType">
            <n-select v-model:value="form.behaviorType" :options="behaviorOptions.slice(1)" />
          </n-form-item-gi>
          <n-form-item-gi label="信用维度" path="dimension">
            <n-select v-model:value="form.dimension" :options="dimensionOptions.slice(1)" />
          </n-form-item-gi>
        </n-grid>

        <n-form-item label="动作名称 (Action)" path="action">
          <n-input v-model:value="form.action" placeholder="例如: diary_submission" />
        </n-form-item>

        <n-form-item label="积分值" path="points">
          <n-input-number v-model:value="form.points" step="0.1" style="width: 100%" />
          <template #feedback>
            <span class="text-xs text-gray-400">正数表示奖励，负数表示惩罚</span>
          </template>
        </n-form-item>

        <n-form-item label="规则描述" path="description">
          <n-input
            v-model:value="form.description"
            type="textarea"
            :rows="3"
            placeholder="描述该规则的触发条件或意义"
          />
        </n-form-item>

        <n-form-item label="状态">
          <n-space align="center">
            <n-switch v-model:value="form.isEnabled" />
            <span class="text-sm text-gray-500">{{ form.isEnabled ? '已启用' : '已禁用' }}</span>
          </n-space>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            提交保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 用户明细弹窗 -->
    <n-drawer v-model:show="showUserDrawer" width="600" placement="right">
      <n-drawer-content :title="`${currentUser?.user?.profile?.nickname || currentUser?.user?.username} 的信用档案`">
        <n-spin :show="userDetailLoading">
          <div v-if="currentUserDetail" class="space-y-6">
            <div class="text-center py-4 bg-indigo-50 rounded-xl">
              <div class="text-gray-500 mb-1">总信用分</div>
              <div class="text-4xl font-bold text-indigo-600">{{ currentUserDetail.profile.totalScore }}</div>
            </div>
            
            <n-card size="small" title="能力雷达图" :bordered="false" class="shadow-sm">
              <div ref="adminRadarChartRef" class="w-full h-64"></div>
            </n-card>

            <n-card size="small" title="近期行为记录" :bordered="false" class="shadow-sm">
              <n-timeline>
                <n-timeline-item
                  v-for="impact in currentUserDetail.recentImpacts"
                  :key="impact.id"
                  type="info"
                  :title="impact.behavior?.description || impact.behavior?.action || '系统动作'"
                  :time="formatDate(impact.createdAt)"
                >
                  <div class="flex items-center gap-2 mt-1">
                    <n-tag size="small" type="success" v-if="impact.rawPoints > 0">
                      +{{ impact.rawPoints }} ({{ formatDimension(impact.dimension) }})
                    </n-tag>
                    <n-tag size="small" type="error" v-else-if="impact.rawPoints < 0">
                      {{ impact.rawPoints }} ({{ formatDimension(impact.dimension) }})
                    </n-tag>
                    <span v-if="impact.behavior?.behaviorType === 'APPROVED_SUBMISSION'" class="text-xs text-indigo-500 font-medium">
                      [审核通过]
                    </span>
                  </div>
                </n-timeline-item>
                <n-empty v-if="!currentUserDetail.recentImpacts?.length" description="暂无近期记录" />
              </n-timeline>
            </n-card>
          </div>
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, h, onBeforeUnmount } from 'vue';
import { adminCreditAPI } from '@/api';
import { useMessage, useDialog, NTag, NButton, NIcon, NSpace, NTabs, NTabPane, NInput, NDrawer, NDrawerContent, NSpin, NTimeline, NTimelineItem, NEmpty } from 'naive-ui';
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  SearchOutline,
  EyeOutline
} from '@vicons/ionicons5';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TitleComponent, TooltipComponent, RadarComponent, RadarChart, CanvasRenderer]);

const message = useMessage();
const dialog = useDialog();
const loading = ref(true);
const submitting = ref(false);
const rules = ref([]);
const showModal = ref(false);
const isEditing = ref(false);
const formRef = ref(null);

const behaviorTypeLabels = {
  LEARNING: '学习行为',
  SOCIAL: '社交互动',
  OFFLINE: '线下活动',
  SYSTEM: '系统奖励'
};

const dimensionLabels = {
  MORALITY: '德 (Morality)',
  INTELLIGENCE: '智 (Intelligence)',
  PHYSIQUE: '体 (Physique)',
  AESTHETICS: '美 (Aesthetics)',
  LABOR: '劳 (Labor)',
  SOCIETY: '群 (Society)'
};

const behaviorOptions = [
  { label: '全部类型', value: null },
  ...Object.entries(behaviorTypeLabels).map(([key, label]) => ({ label, value: key }))
];

const dimensionOptions = [
  { label: '全部维度', value: null },
  ...Object.entries(dimensionLabels).map(([key, label]) => ({ label, value: key }))
];

const filters = reactive({
  behaviorType: null,
  dimension: null
});

const form = reactive({
  id: null,
  behaviorType: 'LEARNING',
  action: '',
  dimension: 'INTELLIGENCE',
  points: 1,
  description: '',
  isEnabled: true,
  conditions: null
});

const formRules = {
  action: { required: true, message: '请输入动作名称', trigger: 'blur' },
  points: { type: 'number', required: true, message: '请输入积分值', trigger: 'blur' }
};

const filteredRules = computed(() => {
  return rules.value.filter(rule => {
    const matchType = !filters.behaviorType || rule.behaviorType === filters.behaviorType;
    const matchDim = !filters.dimension || rule.dimension === filters.dimension;
    return matchType && matchDim;
  });
});

const columns = [
  {
    title: '行为类型',
    key: 'behaviorType',
    render(row) {
      const typeMap = {
        LEARNING: 'info',
        SOCIAL: 'success',
        OFFLINE: 'warning',
        SYSTEM: 'error'
      };
      return h(
        NTag,
        { type: typeMap[row.behaviorType], size: 'small', round: true },
        { default: () => behaviorTypeLabels[row.behaviorType] }
      );
    }
  },
  {
    title: '具体动作',
    key: 'action',
    render(row) {
      return h('div', { class: 'action-cell' }, [
        h('div', { class: 'font-bold text-gray-800' }, row.action),
        row.description ? h('div', { class: 'text-xs text-gray-400 mt-0.5' }, row.description) : null
      ]);
    }
  },
  {
    title: '信用维度',
    key: 'dimension',
    render(row) {
      const dimMap = {
        MORALITY: 'error',
        INTELLIGENCE: 'info',
        PHYSIQUE: 'success',
        AESTHETICS: 'warning',
        LABOR: 'primary',
        SOCIETY: 'default'
      };
      return h(
        NTag,
        { type: dimMap[row.dimension], size: 'small', bordered: false },
        { default: () => dimensionLabels[row.dimension] }
      );
    }
  },
  {
    title: '积分',
    key: 'points',
    render(row) {
      const isPositive = row.points >= 0;
      return h(
        'span',
        { class: ['points-text', isPositive ? 'positive' : 'negative'] },
        `${isPositive ? '+' : ''}${row.points}`
      );
    }
  },
  {
    title: '状态',
    key: 'isEnabled',
    render(row) {
      return h(
        NSpace,
        { align: 'center', size: 4 },
        {
          default: () => [
            h(NIcon, {
              color: row.isEnabled ? '#18a058' : '#d03050',
              component: row.isEnabled ? CheckmarkCircleOutline : CloseCircleOutline,
              size: 18
            }),
            h('span', { class: 'text-xs' }, row.isEnabled ? '启用' : '禁用')
          ]
        }
      );
    }
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    render(row) {
      return formatDate(row.updatedAt);
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(NSpace, {}, {
        default: () => [
          h(
            NButton,
            { size: 'small', quaternary: true, onClick: () => openEditModal(row) },
            { icon: () => h(NIcon, { component: CreateOutline }) }
          ),
          h(
            NButton,
            { size: 'small', quaternary: true, type: 'error', onClick: () => confirmDelete(row) },
            { icon: () => h(NIcon, { component: TrashOutline }) }
          )
        ]
      });
    }
  }
];

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page) => { pagination.page = page; },
  onUpdatePageSize: (pageSize) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
  }
});

const fetchRules = async () => {
  loading.value = true;
  try {
    const res = await adminCreditAPI.getRules();
    if (res.success) {
      rules.value = res.rules;
    }
  } catch (error) {
    message.error('获取规则失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  Object.assign(form, {
    id: null,
    behaviorType: 'LEARNING',
    action: '',
    dimension: 'INTELLIGENCE',
    points: 1,
    description: '',
    isEnabled: true,
    conditions: null
  });
  showModal.value = true;
};

const openEditModal = (rule) => {
  isEditing.value = true;
  Object.assign(form, { ...rule });
  showModal.value = true;
};

const handleSubmit = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      submitting.value = true;
      try {
        let res;
        if (isEditing.value) {
          res = await adminCreditAPI.updateRule(form.id, form);
        } else {
          res = await adminCreditAPI.createRule(form);
        }
        
        if (res.success) {
          message.success(isEditing.value ? '更新成功' : '创建成功');
          await fetchRules();
          showModal.value = false;
        }
      } catch (error) {
        message.error('保存失败: ' + (error.message || '未知错误'));
      } finally {
        submitting.value = false;
      }
    }
  });
};

const confirmDelete = (rule) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除规则 "${rule.action}" 吗？`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await adminCreditAPI.deleteRule(rule.id);
        if (res.success) {
          message.success('已删除');
          await fetchRules();
        }
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDimension = (dim) => {
  const map = {
    MORALITY: '品德',
    INTELLIGENCE: '智慧',
    PHYSIQUE: '体质',
    AESTHETICS: '审美',
    LABOR: '劳动',
    SOCIETY: '社交'
  };
  return map[dim] || dim;
};

// ==================== 用户信用逻辑 ====================
const usersLoading = ref(false);
const userProfiles = ref([]);
const userKeyword = ref('');
const userPagination = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  itemCount: 0,
  onChange: (page) => { userPagination.page = page; fetchUserProfiles(); },
  onUpdatePageSize: (pageSize) => {
    userPagination.pageSize = pageSize;
    userPagination.page = 1;
    fetchUserProfiles();
  }
});

const userColumns = [
  {
    title: '用户',
    key: 'user',
    render(row) {
      return h('div', { class: 'font-medium' }, row.user?.profile?.nickname || row.user?.username || '未知用户');
    }
  },
  { title: '总分', key: 'totalScore', render: row => h('span', { class: 'font-bold text-indigo-600' }, row.totalScore) },
  { title: '品德', key: 'moralityScore' },
  { title: '智慧', key: 'intelligenceScore' },
  { title: '体质', key: 'physiqueScore' },
  { title: '审美', key: 'aestheticsScore' },
  { title: '劳动', key: 'laborScore' },
  { title: '社交', key: 'societyScore' },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(
        NButton,
        { size: 'small', type: 'primary', quaternary: true, onClick: () => openUserDetail(row) },
        { icon: () => h(NIcon, { component: EyeOutline }), default: () => '查看明细' }
      );
    }
  }
];

const fetchUserProfiles = async () => {
  usersLoading.value = true;
  try {
    const res = await adminCreditAPI.getProfiles({
      page: userPagination.page,
      limit: userPagination.pageSize,
      keyword: userKeyword.value
    });
    if (res.success) {
      userProfiles.value = res.profiles;
      userPagination.itemCount = res.pagination.total;
    }
  } catch (error) {
    message.error('获取用户信用列表失败');
  } finally {
    usersLoading.value = false;
  }
};

const showUserDrawer = ref(false);
const currentUser = ref(null);
const currentUserDetail = ref(null);
const userDetailLoading = ref(false);
const adminRadarChartRef = ref(null);
let adminRadarChart = null;

const openUserDetail = async (row) => {
  currentUser.value = row;
  showUserDrawer.value = true;
  userDetailLoading.value = true;
  currentUserDetail.value = null;
  
  try {
    const res = await adminCreditAPI.getUserCreditDetail(row.userId);
    if (res.success) {
      currentUserDetail.value = res;
      await nextTick();
      initAdminRadarChart();
    }
  } catch (error) {
    message.error('获取用户信用明细失败');
  } finally {
    userDetailLoading.value = false;
  }
};

const initAdminRadarChart = () => {
  if (adminRadarChartRef.value) {
    if (adminRadarChart) adminRadarChart.dispose();
    adminRadarChart = echarts.init(adminRadarChartRef.value);
    const profile = currentUserDetail.value.profile;
    const maxScore = 500;

    const scores = [
      Math.min(profile.moralityScore || 0, maxScore),
      Math.min(profile.intelligenceScore || 0, maxScore),
      Math.min(profile.physiqueScore || 0, maxScore),
      Math.min(profile.aestheticsScore || 0, maxScore),
      Math.min(profile.laborScore || 0, maxScore),
      Math.min(profile.societyScore || 0, maxScore)
    ];

    const colors = [
      '#f59e0b', // 品德 - 橙色
      '#3b82f6', // 智慧 - 蓝色
      '#10b981', // 体质 - 绿色
      '#ec4899', // 审美 - 粉色
      '#8b5cf6', // 劳动 - 紫色
      '#f97316'  // 社交 - 橙色
    ];

    adminRadarChart.setOption({
      tooltip: { trigger: 'item' },
      radar: {
        indicator: [
          { name: '品德', max: maxScore },
          { name: '智慧', max: maxScore },
          { name: '体质', max: maxScore },
          { name: '审美', max: maxScore },
          { name: '劳动', max: maxScore },
          { name: '社交', max: maxScore }
        ],
        radius: '60%',
        splitNumber: 4,
        axisName: {
          color: '#6b7280',
          fontSize: 12,
          padding: [3, 5]
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { areaStyle: { color: ['#f9fafb', '#fff'] } },
        axisLine: { lineStyle: { color: '#d1d5db' } }
      },
      series: [{
        name: '信用分布',
        type: 'radar',
        data: [{
          value: scores,
          name: '当前得分',
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: {
            color: (params) => {
              const color = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(79, 70, 229, 0.6)' },
                { offset: 1, color: 'rgba(79, 70, 229, 0.2)' }
              ]);
              return color;
            }
          },
          lineStyle: { color: '#4f46e5', width: 3 },
          itemStyle: { color: '#4f46e5', borderWidth: 2, borderColor: '#fff' }
        }]
      }]
    });
  }
};

const handleResize = () => {
  if (adminRadarChart) adminRadarChart.resize();
};

onMounted(() => {
  fetchRules();
  fetchUserProfiles();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (adminRadarChart) adminRadarChart.dispose();
});
</script>

<style scoped>
.credit-rule-management {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.page-subtitle {
  color: #6b7280;
  font-size: 14px;
}

.glass-morphism {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.filter-card {
  margin-bottom: 24px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.points-text {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-weight: 700;
  font-size: 15px;
}

.points-text.positive { color: #18a058; }
.points-text.negative { color: #d03050; }

.animate-pop {
  animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

:deep(.custom-table .n-data-table-th) {
  background-color: rgba(249, 250, 251, 0.5);
  font-weight: 600;
  color: #4b5563;
}

:deep(.custom-table .n-data-table-td) {
  padding: 12px 16px;
}

.add-btn {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(24, 160, 88, 0.2);
}
</style>
