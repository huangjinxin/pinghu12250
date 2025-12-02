<template>
  <div class="space-y-6">
    <!-- 返回和操作栏 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <n-button quaternary @click="$router.back()">
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        </n-button>
        <h1 class="text-2xl font-bold text-gray-800">{{ work?.title }}</h1>
      </div>
      <n-space>
        <!-- 老师奖励按钮：只有老师可见且非作者本人 -->
        <n-button v-if="isTeacher && !isOwner" type="success" @click="showTeacherRewardModal = true">
          <template #icon><n-icon><Ribbon /></n-icon></template>
          奖励
        </n-button>
        <!-- 打赏按钮：非作者本人可见 -->
        <n-button v-if="!isOwner && !isTeacher" type="warning" @click="showRewardModal = true">
          <template #icon><n-icon><Gift /></n-icon></template>
          打赏
        </n-button>
        <n-button v-if="isOwner" @click="$router.push(`/works/${workId}/edit`)">
          <template #icon><n-icon><CreateOutline /></n-icon></template>
          编辑
        </n-button>
        <!-- Fork按钮：只有作者本人或已购买用户才能Fork -->
        <n-button v-if="canFork" @click="forkWork">
          <template #icon><n-icon><GitBranchOutline /></n-icon></template>
          Fork
        </n-button>
        <n-button v-else @click="handleForkNotPurchased">
          <template #icon><n-icon><GitBranchOutline /></n-icon></template>
          Fork
        </n-button>
        <n-button v-if="isAdmin" type="error" @click="handleDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          删除
        </n-button>
      </n-space>
    </div>

    <!-- 作品预览 -->
    <div class="card p-0 overflow-hidden relative">
      <div class="h-[400px] bg-white">
        <iframe ref="previewFrame" class="w-full h-full border-0" sandbox="allow-scripts"></iframe>
      </div>
      <!-- 全屏按钮 -->
      <n-button
        circle
        size="large"
        class="absolute bottom-4 right-4 shadow-lg"
        @click="toggleFullscreen"
      >
        <template #icon>
          <n-icon :size="24">
            <ExpandOutline v-if="!isFullscreen" />
            <ContractOutline v-else />
          </n-icon>
        </template>
      </n-button>
    </div>

    <!-- 源代码查看区域 -->
    <div class="card">
      <h3 class="font-medium mb-4 flex items-center gap-2">
        <n-icon><CodeSlashOutline /></n-icon>
        <span>源代码</span>
        <n-tag v-if="work?.isPurchased" type="success" size="small">已购买</n-tag>
      </h3>

      <!-- 有权限：显示源码 -->
      <div v-if="canViewCode">
        <n-tabs type="line">
          <n-tab-pane name="html" tab="HTML">
            <n-code :code="work?.htmlCode || ''" language="html" show-line-numbers />
          </n-tab-pane>
          <n-tab-pane name="css" tab="CSS">
            <n-code :code="work?.cssCode || ''" language="css" show-line-numbers />
          </n-tab-pane>
          <n-tab-pane name="js" tab="JavaScript">
            <n-code :code="work?.jsCode || ''" language="javascript" show-line-numbers />
          </n-tab-pane>
        </n-tabs>
      </div>

      <!-- 无权限：显示锁定遮罩 -->
      <div v-else class="code-locked-overlay">
        <n-icon :size="64" class="text-gray-300"><LockClosedOutline /></n-icon>
        <h3 class="text-xl font-bold text-gray-700 mt-4">源代码已锁定</h3>
        <p class="text-gray-500 mt-2" v-if="work?.isListed">
          购买后可查看完整源代码和Fork此作品
        </p>
        <p class="text-gray-500 mt-2" v-else>
          该作品未上架市集，无法查看源代码
        </p>
        <n-button
          v-if="work?.isListed"
          type="primary"
          size="large"
          class="mt-6"
          @click="handlePurchase"
        >
          <template #icon><n-icon><Cart /></n-icon></template>
          {{ work?.listPrice === 0 ? '免费获取' : `购买（${work?.listPrice} 金币）` }}
        </n-button>
      </div>
    </div>

    <!-- 全屏预览模态框 -->
    <n-modal
      v-model:show="isFullscreen"
      :mask-closable="true"
      preset="card"
      style="width: 100vw; height: 100vh; max-width: 100vw;"
      :bordered="false"
      :segmented="false"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-lg font-semibold">{{ work?.title }} - 全屏预览</span>
          <n-button circle size="small" @click="isFullscreen = false">
            <template #icon>
              <n-icon><CloseOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </template>
      <div class="w-full h-[calc(100vh-120px)] bg-white">
        <iframe ref="fullscreenFrame" class="w-full h-full border-0" sandbox="allow-scripts"></iframe>
      </div>
    </n-modal>

    <!-- 作品信息 -->
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <AvatarText :username="work?.author?.username" size="md" />
          <div>
            <div
              class="font-medium cursor-pointer hover:text-primary-600 transition-colors"
              @click="$router.push(`/users/${work?.author?.id}`)"
            >
              {{ work?.author?.profile?.nickname || work?.author?.username }}
            </div>
            <div class="text-sm text-gray-500">{{ formatDate(work?.createdAt) }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <button class="flex items-center space-x-1" :class="work?.isLiked ? 'text-red-500' : 'text-gray-500'" @click="toggleLike">
            <n-icon :size="20"><Heart v-if="work?.isLiked" /><HeartOutline v-else /></n-icon>
            <span>{{ work?._count?.likes || 0 }}</span>
          </button>
          <span class="flex items-center space-x-1 text-gray-500">
            <n-icon :size="20"><GitBranchOutline /></n-icon>
            <span>{{ work?._count?.forks || 0 }}</span>
          </span>
        </div>
      </div>

      <!-- Fork 来源 -->
      <div v-if="work?.forkedFrom" class="mt-3 text-sm text-gray-500">
        Fork 自 <router-link :to="`/works/${work.forkedFrom.id}`" class="text-primary-500 hover:underline">{{ work.forkedFrom.title }}</router-link>
      </div>
    </div>

    <!-- 评论区 -->
    <div class="card">
      <h3 class="font-medium mb-4">评论 ({{ comments.length }})</h3>

      <!-- 发表评论 -->
      <div class="flex space-x-3 mb-4">
        <n-input v-model:value="newComment" placeholder="写下你的评论..." />
        <n-button type="primary" :disabled="!newComment.trim()" @click="addComment">发送</n-button>
      </div>

      <!-- 评论列表 -->
      <div v-if="comments.length" class="space-y-3">
        <div v-for="comment in comments" :key="comment.id" class="flex space-x-3">
          <AvatarText :username="comment.author?.username" size="md" />
          <div class="flex-1">
            <div class="bg-gray-50 rounded-lg p-3">
              <div
                class="font-medium text-sm cursor-pointer hover:text-primary-600 transition-colors"
                @click="$router.push(`/users/${comment.author?.id}`)"
              >
                {{ comment.author?.profile?.nickname || comment.author?.username }}
              </div>
              <p class="text-gray-700 text-sm mt-1">{{ comment.content }}</p>
            </div>
            <div class="text-xs text-gray-400 mt-1">{{ formatTime(comment.createdAt) }}</div>
          </div>
        </div>
      </div>
      <n-empty v-else description="暂无评论" size="small" />
    </div>

    <!-- 打赏弹窗 -->
    <n-modal
      v-model:show="showRewardModal"
      preset="card"
      title="打赏作者"
      style="width: 450px;"
    >
      <div class="reward-modal">
        <div class="author-info">
          <AvatarText :username="work?.author?.username" size="lg" />
          <div class="mt-3">
            <div class="font-medium text-lg">
              {{ work?.author?.profile?.nickname || work?.author?.username }}
            </div>
            <div class="text-sm text-gray-500">作品：{{ work?.title }}</div>
          </div>
        </div>

        <div class="amount-selection">
          <h4 class="text-sm font-medium text-gray-700 mb-3">选择打赏金额</h4>
          <div class="amount-grid">
            <div
              v-for="amt in presetAmounts"
              :key="amt"
              class="amount-option"
              :class="{ 'selected': selectedAmount === amt }"
              @click="selectedAmount = amt"
            >
              <n-icon :size="20"><Wallet /></n-icon>
              <span class="amount-text">{{ amt }}</span>
            </div>
            <div
              class="amount-option custom"
              :class="{ 'selected': isCustomAmount }"
              @click="handleCustomAmount"
            >
              <n-icon :size="20"><CreateOutline /></n-icon>
              <span class="amount-text">自定义</span>
            </div>
          </div>

          <!-- 自定义金额输入 -->
          <div v-if="isCustomAmount" class="mt-3">
            <n-input-number
              v-model:value="customAmount"
              :min="1"
              :max="1000"
              placeholder="请输入金额"
              style="width: 100%"
            />
          </div>
        </div>

        <div class="message-input mt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">留言（可选）</h4>
          <n-input
            v-model:value="rewardMessage"
            type="textarea"
            placeholder="说点什么吧..."
            :rows="3"
            :maxlength="100"
            show-count
          />
        </div>

        <div class="balance-info mt-4">
          <span class="text-sm text-gray-500">当前余额：</span>
          <span class="text-lg font-bold text-yellow-600">{{ userBalance }} 金币</span>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showRewardModal = false">取消</n-button>
          <n-button
            type="warning"
            :disabled="!finalAmount || finalAmount > userBalance"
            :loading="rewarding"
            @click="handleReward"
          >
            {{ finalAmount > userBalance ? '余额不足' : `打赏 ${finalAmount || 0} 金币` }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 老师奖励弹窗 -->
    <n-modal
      v-model:show="showTeacherRewardModal"
      preset="card"
      title="奖励学生"
      style="width: 450px;"
    >
      <div class="teacher-reward-modal">
        <div class="student-info">
          <AvatarText :username="work.author?.username" size="md" />
          <div class="mt-3">
            <div class="font-medium text-lg">
              {{ work?.author?.profile?.nickname || work?.author?.username }}
            </div>
            <div class="text-sm text-gray-500">作品：{{ work?.title }}</div>
          </div>
        </div>

        <div class="reward-form mt-6">
          <n-form-item label="奖励金额" required>
            <n-input-number
              v-model:value="teacherRewardAmount"
              :min="1"
              :max="100"
              placeholder="请输入奖励金额"
              style="width: 100%"
            >
              <template #suffix>金币</template>
            </n-input-number>
          </n-form-item>

          <n-form-item label="奖励原因" required>
            <n-input
              v-model:value="teacherRewardReason"
              type="textarea"
              placeholder="例如：作品完成度高，代码规范..."
              :rows="4"
              :maxlength="200"
              show-count
            />
          </n-form-item>
        </div>

        <div class="info-text mt-4">
          <n-alert type="info" size="small">
            💡 奖励的积分由系统发放，将直接到达学生账户
          </n-alert>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showTeacherRewardModal = false">取消</n-button>
          <n-button
            type="success"
            :disabled="!teacherRewardAmount || !teacherRewardReason.trim()"
            :loading="rewarding"
            @click="handleTeacherReward"
          >
            确认奖励
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { htmlWorkAPI } from '@/api';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowBackOutline, CreateOutline, GitBranchOutline, HeartOutline, Heart, ExpandOutline, ContractOutline, CloseOutline, TrashOutline, LockClosedOutline, CodeSlashOutline, Cart, Gift, Wallet, Ribbon } from '@vicons/ionicons5';
import api from '@/api';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const workId = route.params.id;
const work = ref(null);
const comments = ref([]);
const newComment = ref('');
const previewFrame = ref(null);
const fullscreenFrame = ref(null);
const isFullscreen = ref(false);

// 打赏相关状态
const showRewardModal = ref(false);
const presetAmounts = [5, 10, 20, 50];
const selectedAmount = ref(null);
const customAmount = ref(null);
const rewardMessage = ref('');
const rewarding = ref(false);
const userBalance = ref(0);

// 老师奖励相关状态
const showTeacherRewardModal = ref(false);
const teacherRewardAmount = ref(null);
const teacherRewardReason = ref('');

const isOwner = computed(() => work.value?.authorId === authStore.user?.id);
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');
const isTeacher = computed(() => authStore.user?.role === 'TEACHER');

// 判断是否可以查看源码：作者本人或已购买用户
const canViewCode = computed(() => {
  if (!work.value) return false;
  // 作者本人可以查看
  if (isOwner.value) return true;
  // 已购买的作品可以查看
  if (work.value.isPurchased) return true;
  return false;
});

// 判断是否可以Fork：作者本人或已购买用户
const canFork = computed(() => {
  if (!work.value) return false;
  // 作者本人可以Fork
  if (isOwner.value) return true;
  // 已购买的作品可以Fork
  if (work.value.isPurchased) return true;
  return false;
});

// 计算属性：是否为自定义金额
const isCustomAmount = computed(() => !presetAmounts.includes(selectedAmount.value) && customAmount.value > 0);

// 计算属性：最终金额
const finalAmount = computed(() => {
  if (selectedAmount.value && presetAmounts.includes(selectedAmount.value)) {
    return selectedAmount.value;
  }
  if (customAmount.value > 0) {
    return customAmount.value;
  }
  return 0;
});

const formatDate = (date) => date ? format(new Date(date), 'yyyy年M月d日') : '';
const formatTime = (date) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });

const loadWork = async () => {
  try {
    const data = await htmlWorkAPI.getWorkById(workId);
    work.value = data;
    comments.value = data.comments || [];
    renderPreview();
  } catch (error) {
    message.error('加载作品失败');
  }
};

const renderPreview = () => {
  if (!previewFrame.value || !work.value) return;
  const doc = `<!DOCTYPE html><html><head><style>${work.value.cssCode || ''}</style></head><body>${work.value.htmlCode || ''}<script>${work.value.jsCode || ''}<\/script></body></html>`;
  previewFrame.value.srcdoc = doc;
};

const toggleLike = async () => {
  try {
    await htmlWorkAPI.toggleLike(workId);
    work.value.isLiked = !work.value.isLiked;
    work.value._count.likes += work.value.isLiked ? 1 : -1;
  } catch (error) {
    message.error('操作失败');
  }
};

const forkWork = () => {
  // 跳转到编辑器，通过query参数传递fork来源
  // 编辑器会加载源作品内容，但不自动保存
  // 用户需要点击保存按钮才会创建新作品
  router.push({
    path: '/works/create',
    query: { fork: workId }
  });
};

const handleForkNotPurchased = () => {
  dialog.warning({
    title: '购买后可Fork',
    content: '该作品需要购买后才能Fork。购买后你将获得完整源码，并可以自由修改和使用。',
    positiveText: '前往购买',
    negativeText: '取消',
    onPositiveClick: () => {
      if (work.value?.isListed) {
        handlePurchase();
      } else {
        router.push('/market');
      }
    }
  });
};

const handlePurchase = () => {
  if (!work.value?.isListed) {
    message.warning('该作品未上架市集');
    return;
  }

  const priceText = work.value.listPrice === 0 ? '免费' : `${work.value.listPrice} 金币`;

  dialog.info({
    title: work.value.listPrice === 0 ? '确认获取' : '确认购买',
    content: `${work.value.title}\n价格：${priceText}\n购买后可查看完整源代码和Fork`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // TODO: 调用购买API
        message.info('购买功能需要后端API支持');
        // await walletAPI.purchaseWork(work.value.id);
        // message.success(work.value.listPrice === 0 ? '获取成功！' : '购买成功！');
        // loadWork(); // 重新加载作品数据
      } catch (error) {
        message.error(error.error || '操作失败');
      }
    }
  });
};

const addComment = async () => {
  if (!newComment.value.trim()) return;
  try {
    await htmlWorkAPI.addComment(workId, newComment.value);
    message.success('评论成功');
    newComment.value = '';
    loadWork();
  } catch (error) {
    message.error(error.error || '评论失败');
  }
};

const handleDelete = () => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除作品《${work.value?.title}》吗？此操作不可恢复。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await htmlWorkAPI.deleteWork(workId);
        message.success('删除成功');
        router.push('/works');
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 加载用户余额
const loadBalance = async () => {
  try {
    const response = await api.get('/reward/balance');
    userBalance.value = response.balance || 0;
  } catch (error) {
    console.error('加载余额失败:', error);
  }
};

// 处理自定义金额点击
const handleCustomAmount = () => {
  selectedAmount.value = null;
  if (!customAmount.value) {
    customAmount.value = 10;
  }
};

// 处理打赏
const handleReward = async () => {
  if (!finalAmount.value || finalAmount.value <= 0) {
    message.warning('请选择打赏金额');
    return;
  }

  if (finalAmount.value > userBalance.value) {
    message.error('金币余额不足');
    return;
  }

  rewarding.value = true;
  try {
    await api.post('/reward/send', {
      toUserId: work.value.authorId,
      amount: finalAmount.value,
      relatedType: 'work',
      relatedId: workId,
      message: rewardMessage.value.trim() || undefined,
    });

    message.success(`打赏成功！已向作者发送 ${finalAmount.value} 金币`);

    // 重置状态
    showRewardModal.value = false;
    selectedAmount.value = null;
    customAmount.value = null;
    rewardMessage.value = '';

    // 重新加载余额
    await loadBalance();
  } catch (error) {
    message.error(error.error || error.message || '打赏失败');
  } finally {
    rewarding.value = false;
  }
};

// 处理老师奖励
const handleTeacherReward = async () => {
  if (!teacherRewardAmount.value || teacherRewardAmount.value <= 0) {
    message.warning('请输入奖励金额');
    return;
  }

  if (!teacherRewardReason.value.trim()) {
    message.warning('请填写奖励原因');
    return;
  }

  rewarding.value = true;
  try {
    await api.post('/reward/teacher', {
      studentId: work.value.authorId,
      amount: teacherRewardAmount.value,
      reason: teacherRewardReason.value.trim(),
      relatedType: 'work',
      relatedId: workId,
    });

    message.success(`奖励成功！已向学生发放 ${teacherRewardAmount.value} 积分`);

    // 重置状态
    showTeacherRewardModal.value = false;
    teacherRewardAmount.value = null;
    teacherRewardReason.value = '';
  } catch (error) {
    message.error(error.error || error.message || '奖励失败');
  } finally {
    rewarding.value = false;
  }
};

// 监听全屏状态变化，自动渲染预览内容
watch(isFullscreen, async (newValue) => {
  if (newValue && work.value) {
    // 等待 DOM 更新完成后再渲染 iframe
    await nextTick();
    if (fullscreenFrame.value) {
      const doc = `<!DOCTYPE html><html><head><style>${work.value.cssCode || ''}</style></head><body>${work.value.htmlCode || ''}<script>${work.value.jsCode || ''}<\/script></body></html>`;
      fullscreenFrame.value.srcdoc = doc;
    }
  }
});

onMounted(() => {
  loadWork();
  loadBalance();
});
</script>

<style scoped>
.code-locked-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
  text-align: center;
}

/* 打赏弹窗样式 */
.reward-modal {
  padding: 10px 0;
}

.author-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.amount-selection {
  margin: 20px 0;
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.amount-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.amount-option:hover {
  border-color: #fbbf24;
  background: #fef3c7;
}

.amount-option.selected {
  border-color: #f59e0b;
  background: #fef3c7;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.amount-option .amount-text {
  margin-top: 8px;
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.amount-option.custom {
  background: #f3f4f6;
}

.amount-option.custom:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.amount-option.custom.selected {
  border-color: #6b7280;
  background: #e5e7eb;
  box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
}

.balance-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #fffbeb;
  border-radius: 8px;
  border: 1px solid #fef3c7;
}

/* 老师奖励弹窗样式 */
.teacher-reward-modal {
  padding: 10px 0;
}

.student-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}
</style>
