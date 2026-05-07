<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-800">{{ pageTitle }}</h1>
        <p class="text-lg text-gray-500 mt-2">{{ pageSubtitle }}</p>
      </div>
      <!-- 多孩子切换选择器 -->
      <n-select
        v-if="children.length > 1"
        v-model:value="selectedChildId"
        :options="childOptions"
        placeholder="切换孩子"
        style="width: 200px; font-size: 20px;"
        size="large"
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="grid grid-cols-1 gap-6">
      <n-skeleton v-for="i in 2" :key="i" height="280px" :sharp="false" />
    </div>

    <!-- 空状态 -->
    <n-empty v-else-if="!children.length" description="暂无关联的孩子">
      <template #extra>
        <p class="text-gray-500 text-sm mb-4">请联系管理员在用户管理中为您关联孩子账户</p>
      </template>
    </n-empty>

    <!-- 孩子卡片列表 -->
    <div v-else class="space-y-6">
      <div
        v-for="child in displayedChildren"
        :key="child.id"
        class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      >
        <!-- 头部：成长数据 -->
        <div class="bg-gradient-to-r from-primary-50 to-blue-50 p-3 sm:p-4">
          <div class="grid grid-cols-4 gap-2 sm:gap-3">
            <div
              class="text-center py-2 px-1 sm:p-3 bg-white/70 rounded-lg cursor-pointer hover:bg-white/90 hover:shadow-md transition"
              @click="showFinancialDetails(child, 'points')"
            >
              <div class="text-lg sm:text-xl font-bold text-amber-600 truncate">
                {{ Math.floor(child.stats?.totalPoints || 0) }}
              </div>
              <div class="text-xs sm:text-sm text-gray-600 font-medium">积分</div>
            </div>
            <div
              class="text-center py-2 px-1 sm:p-3 bg-white/70 rounded-lg cursor-pointer hover:bg-white/90 hover:shadow-md transition"
              @click="showFinancialDetails(child, 'coins')"
            >
              <div class="text-lg sm:text-xl font-bold text-emerald-600 truncate">
                {{ Math.floor(child.stats?.learningCoins || 0) }}
              </div>
              <div class="text-xs sm:text-sm text-gray-600 font-medium">学习币</div>
            </div>
            <div class="text-center py-2 px-1 sm:p-3 bg-white/70 rounded-lg">
              <div class="text-lg sm:text-xl font-bold text-green-600 truncate">
                {{ Math.floor(child.stats?.approvedCount || 0) }}
              </div>
              <div class="text-xs sm:text-sm text-gray-600 font-medium">已通过</div>
            </div>
            <div class="text-center py-2 px-1 sm:p-3 bg-white/70 rounded-lg">
              <div class="text-lg sm:text-xl font-bold text-purple-600 truncate">
                {{ Math.floor(child.stats?.joinedDays || 0) }}
              </div>
              <div class="text-xs sm:text-sm text-gray-600 font-medium">天数</div>
            </div>
          </div>
        </div>

        <!-- 最近动态 -->
        <div class="p-6">
          <h4 class="text-lg font-medium text-gray-600 mb-4">最近动态</h4>
          <div v-if="child.recentActivities?.length" class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="activity in child.recentActivities"
              :key="activity.id"
              class="flex items-center text-base py-3 border-b border-gray-100 last:border-0"
            >
              <!-- 图标 -->
              <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4"
                :class="getActivityIconClass(activity)"
              >
                <n-icon :size="18">
                  <component :is="getActivityIcon(activity)" />
                </n-icon>
              </div>
              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <span class="text-gray-700 truncate block text-base">
                  {{ getActivityText(activity) }}
                </span>
              </div>
              <!-- 积分/状态 -->
              <div v-if="activity.type === 'submission' || activity.type === 'poetry'" class="ml-2">
                <n-tag v-if="activity.status === 'APPROVED'" type="success" size="small" round>
                  +{{ activity.points }}
                </n-tag>
                <n-tag v-else-if="activity.status === 'PENDING'" type="warning" size="small" round>
                  待审核
                </n-tag>
                <n-tag v-else-if="activity.status === 'REJECTED'" type="error" size="small" round>
                  已拒绝
                </n-tag>
              </div>
              <!-- 积分变动标签 -->
              <div v-else-if="activity.type === 'point'" class="ml-2">
                <n-tag :type="activity.amount > 0 ? 'success' : 'error'" size="small" round>
                  {{ activity.amount > 0 ? '+' : '' }}{{ activity.amount }}
                </n-tag>
              </div>
              <!-- 学习币变动标签 -->
              <div v-else-if="activity.type === 'coin'" class="ml-2">
                <n-tag :type="activity.amount > 0 ? 'info' : 'error'" size="small" round>
                  {{ activity.amount > 0 ? '+' : '' }}{{ activity.amount }}
                </n-tag>
              </div>
              <!-- 时间 -->
              <div class="text-sm text-gray-400 ml-3 whitespace-nowrap">
                {{ formatTime(activity.createdAt) }}
              </div>
            </div>
          </div>
          <div v-else class="text-base text-gray-400 py-6 text-center">暂无动态</div>
        </div>

        <!-- 操作按钮 -->
        <div class="px-6 pb-4 flex gap-4">
          <n-button type="primary" size="large" class="flex-1 h-12 text-lg" @click="goToReview">
            <template #icon>
              <n-icon size="24"><ClipboardOutline /></n-icon>
            </template>
            自学成果
            <span v-if="pendingCount > 0" class="ml-2 px-2 py-0.5 bg-white/30 rounded-full text-sm">{{ pendingCount }}待审</span>
          </n-button>
          <n-button size="large" class="flex-1 h-12 text-lg" @click="goToSubmissions(child)">
            <template #icon>
              <n-icon size="24"><CreateOutline /></n-icon>
            </template>
            {{ getChildNickname(child) }}历程
          </n-button>
        </div>

        <!-- 学习圈和排行榜入口 -->
        <div class="px-6 pb-6 flex gap-4">
          <n-button size="large" class="flex-1 h-11" quaternary @click="goToMoments">
            <template #icon>
              <n-icon size="22"><PeopleOutline /></n-icon>
            </template>
            学习圈
          </n-button>
          <n-button size="large" class="flex-1 h-11" quaternary @click="goToLeaderboard">
            <template #icon>
              <n-icon size="22"><PodiumOutline /></n-icon>
            </template>
            排行榜
          </n-button>
        </div>
      </div>
    </div>

    <!-- 积分/学习币明细弹框 -->
    <n-modal
      v-model:show="showFinancialModal"
      preset="card"
      :title="financialModalTitle"
      style="width: 600px; max-width: 90vw"
    >
      <n-spin :show="financialLoading">
        <div class="financial-details">
          <!-- 当前余额 -->
          <div class="balance-card mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div class="text-sm text-gray-500 mb-1">
              {{ financialType === 'points' ? '当前积分' : '当前学习币' }}
            </div>
            <div class="text-3xl font-bold" :class="financialType === 'points' ? 'text-amber-600' : 'text-emerald-600'">
              {{ financialType === 'points' ? financialData.currentPoints : financialData.currentCoins }}
            </div>
          </div>

          <!-- 明细列表 -->
          <div class="details-list max-h-96 overflow-y-auto">
            <template v-if="financialType === 'points' && financialData.points?.logs?.length">
              <div
                v-for="log in financialData.points.logs"
                :key="log.id"
                class="detail-item flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-700">
                    {{ log.reason || formatChangeType(log, 'points') }}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ formatTime(log.createdAt) }}
                  </div>
                </div>
                <div
                  class="text-lg font-bold"
                  :class="log.amount > 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
                </div>
              </div>
            </template>

            <template v-else-if="financialType === 'coins' && financialData.coins?.logs?.length">
              <div
                v-for="log in financialData.coins.logs"
                :key="log.id"
                class="detail-item flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-700">
                    {{ log.description || formatChangeType(log, 'coins') }}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ formatTime(log.createdAt) }}
                  </div>
                </div>
                <div
                  class="text-lg font-bold"
                  :class="log.amount > 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
                </div>
              </div>
            </template>

            <n-empty
              v-else
              :description="financialType === 'points' ? '暂无积分记录' : '暂无学习币记录'"
              size="small"
              class="py-8"
            />
          </div>
        </div>
      </n-spin>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useParentStore } from '@/stores/parent';
import api from '@/api';
import { submissionAPI } from '@/api';
import EaselOutline from '@vicons/ionicons5/es/EaselOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import CodeSlashOutline from '@vicons/ionicons5/es/CodeSlashOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import WalletOutline from '@vicons/ionicons5/es/WalletOutline'
import TrendingUpOutline from '@vicons/ionicons5/es/TrendingUpOutline'
import CashOutline from '@vicons/ionicons5/es/CashOutline'
import ClipboardOutline from '@vicons/ionicons5/es/ClipboardOutline'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import PodiumOutline from '@vicons/ionicons5/es/PodiumOutline'
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const message = useMessage();
const parentStore = useParentStore();

const loading = ref(false);
const pendingCount = ref(0);

// 使用 store 中的数据
const children = computed(() => parentStore.children);
const selectedChildId = computed({
  get: () => parentStore.selectedChildId,
  set: (val) => parentStore.selectChild(val)
});

// 获取孩子昵称
const getChildNickname = (child) => {
  return parentStore.getChildNickname(child);
};

// 孩子选项列表（用于下拉选择，不包含"全部孩子"选项）
const childOptions = computed(() => {
  return children.value.map(child => ({
    label: getChildNickname(child),
    value: child.id
  }));
});

// 当前选中的孩子对象
const selectedChild = computed(() => parentStore.selectedChild);

// 显示的孩子（只显示一个）
const displayedChildren = computed(() => {
  if (selectedChild.value) {
    return [selectedChild.value];
  }
  return [];
});

// 页面标题 - 始终显示"我的+孩子名字"
const pageTitle = computed(() => {
  if (selectedChild.value) {
    const childName = getChildNickname(selectedChild.value);
    return `我的${childName}`;
  }
  return '我的孩子';
});

// 页面副标题
const pageSubtitle = computed(() => {
  if (selectedChild.value) {
    const childName = getChildNickname(selectedChild.value);
    return `查看${childName}的学习情况和成长动态`;
  }
  return '查看孩子的学习情况和成长动态';
});

const loadChildren = async () => {
  loading.value = true;
  try {
    await parentStore.loadChildren();
  } catch (error) {
    message.error('加载孩子列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 加载待审核数量
const loadPendingCount = async () => {
  try {
    const data = await submissionAPI.getParentPending({ pageSize: 1 });
    pendingCount.value = data.stats?.pending || 0;
  } catch (error) {
    console.error('加载待审核数量失败:', error);
  }
};

// 格式化时间
const formatTime = (date) => {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN,
    });
  } catch {
    return '';
  }
};

// 获取动态图标
const getActivityIcon = (activity) => {
  if (activity.type === 'work') return CodeSlashOutline;
  if (activity.type === 'poetry') return BookOutline;
  if (activity.type === 'point') return TrendingUpOutline;
  if (activity.type === 'coin') return CashOutline;
  return DocumentTextOutline;
};

// 获取动态图标样式
const getActivityIconClass = (activity) => {
  if (activity.type === 'work') {
    return 'bg-blue-100 text-blue-600';
  }
  if (activity.type === 'poetry') {
    if (activity.status === 'APPROVED') return 'bg-purple-100 text-purple-600';
    if (activity.status === 'REJECTED') return 'bg-red-100 text-red-600';
    return 'bg-amber-100 text-amber-600';
  }
  if (activity.type === 'point') {
    return activity.amount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600';
  }
  if (activity.type === 'coin') {
    return activity.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600';
  }
  if (activity.status === 'APPROVED') {
    return 'bg-green-100 text-green-600';
  }
  if (activity.status === 'REJECTED') {
    return 'bg-red-100 text-red-600';
  }
  return 'bg-amber-100 text-amber-600';
};

// 获取动态文本
const getActivityText = (activity) => {
  if (activity.type === 'work') {
    return `发布了作品「${activity.title}」`;
  }
  if (activity.type === 'poetry') {
    if (activity.status === 'APPROVED') return `诗词「${activity.title}」通过审核`;
    if (activity.status === 'REJECTED') return `诗词「${activity.title}」未通过`;
    return `提交了诗词「${activity.title}」`;
  }
  if (activity.type === 'point') {
    const prefix = activity.amount > 0 ? '+' : '';
    return `${activity.title}（${prefix}${activity.amount}积分）`;
  }
  if (activity.type === 'coin') {
    const prefix = activity.amount > 0 ? '+' : '';
    return `${activity.title}（${prefix}${activity.amount}学习币）`;
  }
  if (activity.status === 'APPROVED') {
    return `完成「${activity.title}」`;
  }
  if (activity.status === 'REJECTED') {
    return `「${activity.title}」未通过`;
  }
  return `提交了「${activity.title}」`;
};

// 跳转到审核页面
const goToReview = () => {
  router.push({ path: '/parent/review' });
};

// 跳转到历程页面
const goToSubmissions = (child) => {
  router.push({ path: '/parent/submissions', query: { childId: child.id } });
};

// 跳转到学习圈
const goToMoments = () => {
  router.push({ path: '/moments' });
};

// 跳转到排行榜
const goToLeaderboard = () => {
  router.push({ path: '/leaderboard' });
};

// 积分/学习币明细弹框
const showFinancialModal = ref(false);
const financialModalTitle = ref('');
const financialLoading = ref(false);
const financialType = ref('points'); // 'points' or 'coins'
const financialData = ref({
  currentPoints: 0,
  currentCoins: 0,
  points: null,
  coins: null,
});
const selectedChildForFinancial = ref(null);

// 显示积分/学习币明细
const showFinancialDetails = async (child, type) => {
  selectedChildForFinancial.value = child;
  financialType.value = type;
  financialModalTitle.value = type === 'points'
    ? `${getChildNickname(child)}的积分明细`
    : `${getChildNickname(child)}的学习币明细`;
  showFinancialModal.value = true;

  financialLoading.value = true;
  try {
    const response = await api.get(`/users/me/children/${child.id}/financial`, {
      params: { type }
    });
    financialData.value = response;
  } catch (error) {
    message.error('加载明细失败');
    console.error(error);
  } finally {
    financialLoading.value = false;
  }
};

// 格式化积分/学习币变动类型
const formatChangeType = (log, type) => {
  if (type === 'points') {
    // 积分类型
    const typeMap = {
      EARN: '获得积分',
      SPEND: '消费积分',
      REWARD: '奖励积分',
      PENALTY: '扣除积分',
      ADJUST: '调整积分',
    };
    return typeMap[log.type] || log.type || '积分变动';
  } else {
    // 学习币类型
    const typeMap = {
      RECHARGE: '充值',
      REWARD: '奖励',
      SPEND: '消费',
      WITHDRAW: '提现',
      TRANSFER: '转账',
      ADJUST: '调整',
    };
    return typeMap[log.type] || log.type || '余额变动';
  }
};

onMounted(() => {
  loadChildren();
  loadPendingCount();
});
</script>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
