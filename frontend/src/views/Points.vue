<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">积分中心</h1>
      <p class="text-gray-500 mt-1">查看你的积分获得情况和积分排行榜</p>
    </div>

    <!-- 选项卡 -->
    <n-tabs v-model:value="activeTab" type="segment" animated>
      <!-- 管理员功能 -->
      <n-tab-pane v-if="isAdmin" name="admin" tab="积分管理">
        <div class="space-y-6 mt-6">
          <!-- 快捷操作 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100" @click="showRuleDialog = true">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <n-icon :size="24"><SettingsOutline /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-gray-600">管理规则</div>
                  <div class="text-xl font-bold text-gray-800">{{ pointRules.length }} 条</div>
                </div>
              </div>
            </div>
            <div class="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-green-100" @click="showAdjustDialog = true">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <n-icon :size="24"><TrendingUpOutline /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-gray-600">调整积分</div>
                  <div class="text-xl font-bold text-gray-800">手动调整</div>
                </div>
              </div>
            </div>
            <div class="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100" @click="activeTab = 'logs'">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center">
                  <n-icon :size="24"><ListOutline /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-gray-600">积分日志</div>
                  <div class="text-xl font-bold text-gray-800">查看记录</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 积分规则列表 -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-800">积分规则设置</h2>
              <n-button type="primary" @click="handleAddRule">
                <template #icon>
                  <n-icon><AddOutline /></n-icon>
                </template>
                新增规则
              </n-button>
            </div>
            <n-data-table
              :columns="ruleColumns"
              :data="pointRules"
              :pagination="false"
              :bordered="false"
            />
          </div>
        </div>
      </n-tab-pane>

      <!-- 我的积分 -->
      <n-tab-pane name="my" tab="我的积分">
        <div class="space-y-6 mt-6">
          <!-- 积分概览卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="card text-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
              <div class="text-sm opacity-90 mb-2">总积分</div>
              <div class="text-4xl font-bold">{{ pointStats.totalPoints || 0 }}</div>
              <div class="text-xs opacity-75 mt-2">累计获得</div>
            </div>
            <div class="card text-center bg-gradient-to-br from-blue-400 to-blue-600 text-white">
              <div class="text-sm opacity-90 mb-2">本周积分</div>
              <div class="text-4xl font-bold">{{ pointStats.weekPoints || 0 }}</div>
              <div class="text-xs opacity-75 mt-2">最近7天</div>
            </div>
            <div class="card text-center bg-gradient-to-br from-purple-400 to-purple-600 text-white">
              <div class="text-sm opacity-90 mb-2">本月积分</div>
              <div class="text-4xl font-bold">{{ pointStats.monthPoints || 0 }}</div>
              <div class="text-xs opacity-75 mt-2">最近30天</div>
            </div>
          </div>

          <!-- 积分规则说明 -->
          <div class="card">
            <div
              class="flex items-center justify-between cursor-pointer"
              @click="rulesExpanded = !rulesExpanded"
            >
              <h2 class="text-lg font-semibold text-gray-800 flex items-center">
                <n-icon :component="InformationCircleOutline" size="20" class="mr-2" />
                积分获得规则
              </h2>
              <n-icon
                :component="rulesExpanded ? ChevronUpOutline : ChevronDownOutline"
                size="20"
                class="text-gray-500"
              />
            </div>
            <transition name="expand">
              <div v-show="rulesExpanded" class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div
                  v-for="rule in pointRules"
                  :key="rule.actionKey"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                      <n-icon :component="getRuleIcon(rule.actionKey)" size="20" />
                    </div>
                    <span class="text-sm text-gray-700">{{ rule.description }}</span>
                  </div>
                  <span class="text-lg font-bold text-primary-600">
                    {{ typeof rule.points === 'number' ? `+${rule.points}` : rule.points }}
                  </span>
                </div>
              </div>
            </transition>
          </div>

          <!-- 积分统计 -->
          <div class="card" v-if="detailedStats.actionStats && detailedStats.actionStats.length > 0">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">积分来源统计</h2>
            <div class="space-y-3">
              <div v-for="stat in detailedStats.actionStats" :key="stat.action" class="flex items-center">
                <span class="w-32 text-sm text-gray-600">{{ getActionName(stat.action) }}</span>
                <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden mx-3">
                  <div
                    class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                    :style="{ width: `${getPercentage(stat.totalPoints)}%` }"
                  ></div>
                </div>
                <span class="w-20 text-sm text-gray-600 text-right">{{ stat.totalPoints }} 分</span>
                <span class="w-16 text-xs text-gray-400 text-right">{{ stat.count }} 次</span>
              </div>
            </div>
          </div>

          <!-- 积分明细 -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-800">积分明细</h2>
              <n-select
                v-model:value="selectedPeriod"
                :options="periodOptions"
                style="width: 120px"
                @update:value="loadRecords"
              />
            </div>

            <div class="space-y-2">
              <div
                v-for="record in pointRecords"
                :key="record.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center"
                    :class="record.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
                  >
                    <n-icon
                      :component="record.points > 0 ? TrendingUpOutline : TrendingDownOutline"
                      size="20"
                    />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">{{ record.description }}</div>
                    <div class="text-xs text-gray-500">{{ formatDate(record.createdAt) }}</div>
                  </div>
                </div>
                <div
                  class="text-lg font-bold"
                  :class="record.points > 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ record.points > 0 ? '+' : '' }}{{ record.points }}
                </div>
              </div>

              <n-empty v-if="pointRecords.length === 0" description="暂无积分记录" class="py-8" />

              <!-- 分页 -->
              <div v-if="pagination.totalPages > 1" class="flex justify-center mt-4">
                <n-pagination
                  v-model:page="pagination.page"
                  :page-count="pagination.totalPages"
                  @update:page="loadRecords"
                />
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- 积分排行榜 -->
      <n-tab-pane name="leaderboard" tab="积分排行榜">
        <div class="space-y-6 mt-6">
          <!-- 我的排名 -->
          <div class="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm opacity-90">我的排名</div>
                <div class="text-3xl font-bold mt-1">#{{ leaderboardData.currentUserRank || '-' }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm opacity-90">我的积分</div>
                <div class="text-3xl font-bold mt-1">{{ pointStats.totalPoints || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- 排行榜 -->
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">积分排行榜</h2>
            <div class="space-y-2">
              <div
                v-for="user in leaderboardData.leaderboard"
                :key="user.id"
                class="flex items-center justify-between p-4 rounded-lg transition-colors"
                :class="user.id === currentUserId ? 'bg-primary-50 border-2 border-primary-200' : 'bg-gray-50 hover:bg-gray-100'"
              >
                <div class="flex items-center space-x-4">
                  <!-- 排名 -->
                  <div class="w-12 text-center">
                    <div
                      v-if="user.rank <= 3"
                      class="text-2xl font-bold"
                      :class="{
                        'text-yellow-500': user.rank === 1,
                        'text-gray-400': user.rank === 2,
                        'text-orange-600': user.rank === 3,
                      }"
                    >
                      {{ user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉' }}
                    </div>
                    <div v-else class="text-lg font-semibold text-gray-500">
                      {{ user.rank }}
                    </div>
                  </div>

                  <!-- 用户信息 -->
                  <AvatarText :username="authStore.user?.username" size="md" />
                  <div>
                    <div class="font-medium text-gray-800">
                      {{ user.displayName }}
                      <span v-if="user.id === currentUserId" class="text-xs text-primary-600 ml-2">(我)</span>
                    </div>
                    <div class="text-xs text-gray-500">@{{ user.username }}</div>
                  </div>
                </div>

                <!-- 积分 -->
                <div class="text-right">
                  <div class="text-xl font-bold text-primary-600">{{ user.totalPoints }}</div>
                  <div class="text-xs text-gray-500">积分</div>
                </div>
              </div>

              <n-empty v-if="leaderboardData.leaderboard.length === 0" description="暂无排名数据" class="py-8" />

              <!-- 分页 -->
              <div v-if="leaderboardPagination.totalPages > 1" class="flex justify-center mt-4">
                <n-pagination
                  v-model:page="leaderboardPagination.page"
                  :page-count="leaderboardPagination.totalPages"
                  @update:page="loadLeaderboard"
                />
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- 积分日志（管理员） -->
      <n-tab-pane v-if="isAdmin" name="logs" tab="积分日志">
        <div class="space-y-6 mt-6">
          <!-- 筛选条件 -->
          <div class="card">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <n-select
                v-model:value="logFilters.actionKey"
                placeholder="筛选操作类型"
                clearable
                :options="actionOptions"
                @update:value="loadAdminLogs"
              />
              <n-input
                v-model:value="logFilters.userId"
                placeholder="用户ID"
                clearable
                @keyup.enter="loadAdminLogs"
              />
              <n-button type="primary" @click="loadAdminLogs">
                <template #icon>
                  <n-icon><SearchOutline /></n-icon>
                </template>
                查询
              </n-button>
            </div>
          </div>

          <!-- 日志列表 -->
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">积分操作日志</h2>
            <div class="space-y-2">
              <div
                v-for="log in adminLogs"
                :key="log.id"
                class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="flex items-center space-x-4 flex-1">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center"
                    :class="log.pointsChanged > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
                  >
                    <n-icon
                      :component="log.pointsChanged > 0 ? TrendingUpOutline : TrendingDownOutline"
                      size="20"
                    />
                  </div>
                  <AvatarText :username="authStore.user?.username" size="md" />
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800">
                      {{ log.user?.username }} - {{ getActionName(log.actionKey) }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ log.remark || log.rule?.description || '无备注' }}
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      {{ formatDate(log.createdAt) }}
                    </div>
                  </div>
                  <div
                    class="text-lg font-bold"
                    :class="log.pointsChanged > 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ log.pointsChanged > 0 ? '+' : '' }}{{ log.pointsChanged }}
                  </div>
                </div>
              </div>

              <n-empty v-if="adminLogs.length === 0" description="暂无日志记录" class="py-8" />

              <!-- 分页 -->
              <div v-if="logPagination.totalPages > 1" class="flex justify-center mt-4">
                <n-pagination
                  v-model:page="logPagination.page"
                  :page-count="logPagination.totalPages"
                  @update:page="loadAdminLogs"
                />
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- 规则编辑弹窗 -->
    <n-modal v-model:show="showRuleDialog" preset="dialog" title="积分规则" style="width: 600px">
      <n-form :model="currentRule" label-placement="left" label-width="120px">
        <n-form-item label="规则标识" required>
          <n-input
            v-model:value="currentRule.actionKey"
            placeholder="如: POST_CREATE"
            :disabled="!!currentRule.id"
          />
        </n-form-item>
        <n-form-item label="规则描述" required>
          <n-input
            v-model:value="currentRule.description"
            placeholder="如: 发布动态"
          />
        </n-form-item>
        <n-form-item label="积分值" required>
          <n-input-number
            v-model:value="currentRule.points"
            placeholder="积分值"
            :min="-1000"
            :max="1000"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="启用状态">
          <n-switch v-model:value="currentRule.active" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showRuleDialog = false">取消</n-button>
        <n-button type="primary" @click="handleSaveRule">保存</n-button>
      </template>
    </n-modal>

    <!-- 积分调整弹窗 -->
    <n-modal v-model:show="showAdjustDialog" preset="dialog" title="手动调整积分" style="width: 600px">
      <n-form :model="adjustForm" label-placement="left" label-width="120px">
        <n-form-item label="目标用户" required>
          <n-input
            v-model:value="adjustForm.targetUserId"
            placeholder="输入用户ID"
          />
        </n-form-item>
        <n-form-item label="调整积分" required>
          <n-input-number
            v-model:value="adjustForm.points"
            placeholder="正数为增加，负数为扣除"
            :min="-10000"
            :max="10000"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="备注说明">
          <n-input
            v-model:value="adjustForm.remark"
            type="textarea"
            placeholder="调整原因说明"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showAdjustDialog = false">取消</n-button>
        <n-button type="primary" @click="handleAdjustPoints">确认调整</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted, computed, h } from 'vue';
import { pointAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useMessage } from 'naive-ui';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { NButton, NSwitch, NTag } from 'naive-ui';
import {
  InformationCircleOutline,
  TrendingUpOutline,
  TrendingDownOutline,
  CreateOutline,
  BookOutline,
  SchoolOutline,
  DocumentTextOutline,
  CodeSlashOutline,
  ChatbubbleOutline,
  CheckmarkCircleOutline,
  LogInOutline,
  CalendarOutline,
  TrophyOutline,
  RemoveCircleOutline,
  ChevronUpOutline,
  ChevronDownOutline,
  SettingsOutline,
  AddOutline,
  CreateSharp,
  TrashOutline,
  ListOutline,
  SearchOutline,
} from '@vicons/ionicons5';

const authStore = useAuthStore();
const message = useMessage();
const currentUserId = computed(() => authStore.user?.id);
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');


const activeTab = ref(isAdmin.value ? 'admin' : 'my');
const pointStats = ref({});
const detailedStats = ref({});
const pointRules = ref([]);
const pointRecords = ref([]);
const selectedPeriod = ref(null);
const rulesExpanded = ref(false);

// 管理员功能相关
const showRuleDialog = ref(false);
const showAdjustDialog = ref(false);
const currentRule = ref({
  id: null,
  actionKey: '',
  description: '',
  points: 0,
  active: true,
});
const adjustForm = ref({
  targetUserId: '',
  points: 0,
  remark: '',
});
const adminLogs = ref([]);
const logPagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});
const logFilters = ref({
  actionKey: null,
  userId: '',
});

// 规则表格列配置
const ruleColumns = [
  {
    title: '规则标识',
    key: 'actionKey',
    width: 200,
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: true,
  },
  {
    title: '积分值',
    key: 'points',
    width: 100,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.points > 0 ? 'success' : row.points < 0 ? 'error' : 'default',
        },
        { default: () => (row.points > 0 ? '+' : '') + row.points }
      );
    },
  },
  {
    title: '状态',
    key: 'active',
    width: 100,
    render: (row) => {
      return h(NSwitch, {
        value: row.active,
        onUpdateValue: (value) => handleToggleRuleStatus(row.id, value),
      });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => {
      return h('div', { class: 'flex space-x-2' }, [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleEditRule(row),
          },
          { default: () => '编辑' }
        ),
      ]);
    },
  },
];

// 操作类型选项
const actionOptions = computed(() => {
  return pointRules.value.map((rule) => ({
    label: rule.description,
    value: rule.actionKey,
  }));
});
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

const leaderboardData = ref({
  leaderboard: [],
  currentUserRank: 0,
});
const leaderboardPagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
});

const periodOptions = [
  { label: '全部', value: null },
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
];

const getRuleIcon = (action) => {
  const icons = {
    POST_CREATE: CreateOutline,
    DIARY_CREATE: BookOutline,
    HOMEWORK_CREATE: SchoolOutline,
    NOTE_CREATE: DocumentTextOutline,
    READING_NOTE_CREATE: BookOutline,
    HTML_WORK_CREATE: CodeSlashOutline,
    COMMENT_CREATE: ChatbubbleOutline,
    TASK_COMPLETE: CheckmarkCircleOutline,
    DAILY_LOGIN: LogInOutline,
    CONTINUOUS_LOGIN: CalendarOutline,
    ADMIN_REWARD: TrophyOutline,
    ADMIN_DEDUCT: RemoveCircleOutline,
  };
  return icons[action] || DocumentTextOutline;
};

const getActionName = (action) => {
  const names = {
    POST_CREATE: '发布动态',
    DIARY_CREATE: '写日记',
    HOMEWORK_CREATE: '提交作业',
    NOTE_CREATE: '写笔记',
    READING_NOTE_CREATE: '写读书笔记',
    HTML_WORK_CREATE: '发布HTML作品',
    COMMENT_CREATE: '发表评论',
    TASK_COMPLETE: '完成任务',
    DAILY_LOGIN: '每日登录',
    CONTINUOUS_LOGIN: '连续登录奖励',
    ADMIN_REWARD: '管理员奖励',
    ADMIN_DEDUCT: '管理员扣除',
  };
  return names[action] || action;
};

const getPercentage = (points) => {
  if (!detailedStats.value.actionStats || detailedStats.value.actionStats.length === 0) return 0;
  const max = Math.max(...detailedStats.value.actionStats.map(s => s.totalPoints));
  return max > 0 ? (points / max * 100).toFixed(1) : 0;
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

const loadPointStats = async () => {
  try {
    const data = await pointAPI.getMy();
    pointStats.value = data;
  } catch (error) {
    console.error('加载积分统计失败:', error);
  }
};

const loadDetailedStats = async () => {
  try {
    const data = await pointAPI.getStats();
    detailedStats.value = data;
  } catch (error) {
    console.error('加载详细统计失败:', error);
  }
};

const loadRules = async () => {
  try {
    const data = await pointAPI.getRules();
    pointRules.value = data.rules || [];
  } catch (error) {
    console.error('加载积分规则失败:', error);
  }
};

const loadRecords = async () => {
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };
    if (selectedPeriod.value) {
      params.period = selectedPeriod.value;
    }
    const data = await pointAPI.getRecords(params);
    pointRecords.value = data.records || [];
    pagination.value = data.pagination;
  } catch (error) {
    console.error('加载积分明细失败:', error);
  }
};

const loadLeaderboard = async () => {
  try {
    const params = {
      page: leaderboardPagination.value.page,
      limit: leaderboardPagination.value.limit,
    };
    const data = await pointAPI.getLeaderboard(params);
    leaderboardData.value = {
      leaderboard: data.leaderboard || [],
      currentUserRank: data.currentUserRank || 0,
    };
    leaderboardPagination.value = data.pagination;
  } catch (error) {
    console.error('加载积分排行榜失败:', error);
  }
};

// 管理员功能方法
const loadAdminLogs = async () => {
  if (!isAdmin.value) return;
  try {
    const params = {
      page: logPagination.value.page,
      limit: logPagination.value.limit,
    };
    if (logFilters.value.actionKey) {
      params.actionKey = logFilters.value.actionKey;
    }
    if (logFilters.value.userId) {
      params.userId = logFilters.value.userId;
    }
    const data = await pointAPI.adminGetLogs(params);
    adminLogs.value = data.logs || [];
    logPagination.value = data.pagination;
  } catch (error) {
    console.error('加载积分日志失败:', error);
    message.error('加载积分日志失败');
  }
};

const handleAddRule = () => {
  currentRule.value = {
    id: null,
    actionKey: '',
    description: '',
    points: 0,
    active: true,
  };
  showRuleDialog.value = true;
};

const handleEditRule = (rule) => {
  currentRule.value = { ...rule };
  showRuleDialog.value = true;
};

const handleSaveRule = async () => {
  try {
    if (!currentRule.value.actionKey || !currentRule.value.description || currentRule.value.points === undefined) {
      message.error('请填写完整信息');
      return;
    }

    if (currentRule.value.id) {
      // 更新规则
      await pointAPI.adminUpdateRule(currentRule.value.id, {
        description: currentRule.value.description,
        points: currentRule.value.points,
        active: currentRule.value.active,
      });
      message.success('规则更新成功');
    } else {
      // 创建规则
      await pointAPI.adminCreateRule(currentRule.value);
      message.success('规则创建成功');
    }

    showRuleDialog.value = false;
    loadRules();
  } catch (error) {
    console.error('保存规则失败:', error);
    message.error(error.error || '保存规则失败');
  }
};

const handleToggleRuleStatus = async (ruleId, active) => {
  try {
    await pointAPI.adminUpdateRule(ruleId, { active });
    message.success('状态更新成功');
    loadRules();
  } catch (error) {
    console.error('更新状态失败:', error);
    message.error('更新状态失败');
  }
};

const handleAdjustPoints = async () => {
  try {
    if (!adjustForm.value.targetUserId || adjustForm.value.points === 0) {
      message.error('请填写用户ID和调整积分');
      return;
    }

    await pointAPI.adminAdjust({
      targetUserId: adjustForm.value.targetUserId,
      points: adjustForm.value.points,
      remark: adjustForm.value.remark || '管理员手动调整',
    });

    message.success('积分调整成功');
    showAdjustDialog.value = false;
    adjustForm.value = {
      targetUserId: '',
      points: 0,
      remark: '',
    };

    // 刷新日志
    if (activeTab.value === 'logs') {
      loadAdminLogs();
    }
  } catch (error) {
    console.error('调整积分失败:', error);
    message.error(error.error || '调整积分失败');
  }
};

onMounted(() => {
  loadPointStats();
  loadDetailedStats();
  loadRules();
  loadRecords();
  loadLeaderboard();

  // 管理员加载日志
  if (isAdmin.value && activeTab.value === 'logs') {
    loadAdminLogs();
  }
});
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
