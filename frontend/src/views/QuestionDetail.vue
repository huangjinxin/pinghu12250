<template>
  <div class="space-y-6">
    <!-- 返回按钮 -->
    <div class="flex items-center gap-2">
      <n-button text @click="router.back()">
        <template #icon>
          <n-icon><ArrowBack /></n-icon>
        </template>
        返回
      </n-button>
    </div>

    <n-spin :show="loading">
      <n-card v-if="question">
        <!-- 问题头部 -->
        <div class="question-header mb-6">
          <div class="flex items-center gap-3 mb-4">
            <AvatarText :username="question.author?.username" size="lg" />
            <div class="flex-1">
              <div class="font-medium text-base">{{ question.author?.name }}</div>
              <div class="text-sm text-gray-500">{{ formatTime(question.createdAt) }}</div>
            </div>
            <n-tag v-if="question.status === 'OPEN'" type="success">进行中</n-tag>
            <n-tag v-else type="default">已解决</n-tag>
            <!-- 管理员删除按钮 -->
            <n-popconfirm
              v-if="authStore.user?.role === 'ADMIN'"
              @positive-click="handleAdminDelete"
            >
              <template #trigger>
                <n-button type="error" size="small">
                  <template #icon>
                    <n-icon><TrashOutline /></n-icon>
                  </template>
                  强制删除
                </n-button>
              </template>
              确定要强制删除此问题吗？此操作不可恢复，将删除问题及所有回答。
            </n-popconfirm>
          </div>

          <h2 class="text-2xl font-bold mb-4">{{ question.title }}</h2>

          <div class="text-base mb-4 whitespace-pre-wrap">{{ question.content }}</div>

          <!-- 补充内容 -->
          <div v-if="question.appendContent" class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <n-text strong class="text-blue-700">问题补充：</n-text>
            <div class="mt-2 whitespace-pre-wrap text-gray-700">{{ question.appendContent }}</div>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-500 mt-4">
            <span class="flex items-center gap-1">
              <n-icon><Diamond /></n-icon>
              悬赏 {{ question.rewardPoints }} 积分
            </span>
            <span class="flex items-center gap-1">
              <n-icon><Eye /></n-icon>
              {{ question.viewsCount }} 浏览
            </span>
          </div>
        </div>

        <n-divider />

        <!-- 回答列表 -->
        <div class="answers-section">
          <h3 class="text-lg font-medium mb-4">{{ answers.length }} 个回答</h3>

          <div v-if="answers.length > 0" class="space-y-4">
            <div
              v-for="answer in answers"
              :key="answer.id"
              class="answer-item p-4 rounded-lg"
              :class="{ 'bg-green-50 border border-green-200': answer.isBest }"
            >
              <div class="flex items-start gap-3">
                <AvatarText :username="answer.author?.username" size="md" />
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="font-medium">{{ answer.author?.name }}</span>
                    <n-tag v-if="answer.isBest" type="success" size="small">
                      <template #icon>
                        <n-icon><Checkmark /></n-icon>
                      </template>
                      最佳答案
                    </n-tag>
                    <span class="text-sm text-gray-500">{{ formatTime(answer.createdAt) }}</span>
                  </div>
                  <div class="mb-3 whitespace-pre-wrap">{{ answer.content }}</div>
                  <div class="flex items-center gap-4">
                    <n-button
                      text
                      :type="answer.isLiked ? 'primary' : 'default'"
                      @click="handleLikeAnswer(answer.id)"
                    >
                      <template #icon>
                        <n-icon>
                          <ThumbsUp :filled="answer.isLiked" />
                        </n-icon>
                      </template>
                      {{ answer.likesCount }}
                    </n-button>
                    <n-button
                      v-if="canAdoptAnswer"
                      type="primary"
                      size="small"
                      @click="handleAcceptAnswer(answer.id)"
                    >
                      采纳为最佳答案
                      <span v-if="question.rewardPoints > 0">（奖励 {{ question.rewardPoints }} 积分）</span>
                    </n-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <n-empty v-else description="暂无回答" class="py-8" />
        </div>

        <n-divider />

        <!-- 回答输入框 -->
        <div v-if="question.status === 'OPEN'" class="answer-form">
          <h3 class="text-lg font-medium mb-3">我来回答</h3>
          <n-input
            type="textarea"
            v-model:value="answerContent"
            :rows="4"
            placeholder="分享你的见解..."
            :maxlength="1000"
            show-count
          />
          <n-button
            type="primary"
            class="mt-3"
            :disabled="!answerContent.trim()"
            :loading="submittingAnswer"
            @click="handleSubmitAnswer"
          >
            提交回答
          </n-button>
        </div>
        <div v-else>
          <n-alert type="info">该问题已解决</n-alert>
        </div>
      </n-card>

      <n-empty v-else-if="!loading" description="问题不存在" />
    </n-spin>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { questionAPI } from '@/api';
import { Diamond, Eye, ThumbsUp, Checkmark, ArrowBack, TrashOutline } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// 数据
const question = ref(null);
const answers = ref([]);
const loading = ref(false);
const answerContent = ref('');
const submittingAnswer = ref(false);

// 计算属性
const isQuestionAuthor = computed(() => {
  return question.value?.userId === authStore.user?.id;
});

// 是否可以采纳答案
const canAdoptAnswer = computed(() => {
  if (!question.value) return false;

  return (
    isQuestionAuthor.value && // 是提问者
    question.value.status === 'OPEN' && // 问题状态为OPEN
    answers.value.length > 0 && // 至少有1个回答
    !question.value.bestAnswerId // 尚未采纳最佳答案
  );
});

// 加载问题详情
const loadQuestionDetail = async () => {
  loading.value = true;
  try {
    const response = await questionAPI.getQuestionDetail(route.params.id);
    question.value = response;
    answers.value = response.answers || [];
  } catch (error) {
    message.error(error.message || '加载问题详情失败');
    // 如果问题不存在，返回列表页
    if (error.status === 404) {
      router.push('/questions');
    }
  } finally {
    loading.value = false;
  }
};

// 提交回答
const handleSubmitAnswer = async () => {
  if (!answerContent.value.trim()) {
    message.warning('请输入回答内容');
    return;
  }

  submittingAnswer.value = true;
  try {
    const response = await questionAPI.createAnswer(route.params.id, {
      content: answerContent.value,
    });
    message.success('回答成功');
    answerContent.value = '';

    // 重新加载问题详情
    await loadQuestionDetail();
  } catch (error) {
    message.error(error.message || '回答失败');
  } finally {
    submittingAnswer.value = false;
  }
};

// 采纳最佳答案
const handleAcceptAnswer = async (answerId) => {
  try {
    await new Promise((resolve, reject) => {
      dialog.warning({
        title: '确认采纳',
        content: `采纳后将奖励回答者 ${question.value.rewardPoints} 积分，且无法撤销，是否确认？`,
        positiveText: '确认采纳',
        negativeText: '取消',
        onPositiveClick: resolve,
        onNegativeClick: reject,
      });
    });

    const response = await questionAPI.acceptAnswer(route.params.id, {
      answer_id: answerId,
    });
    message.success(response.message || '采纳成功');

    // 重新加载问题详情
    await loadQuestionDetail();
  } catch (error) {
    if (error?.message) {
      message.error(error.message);
    }
  }
};

// 点赞回答
const handleLikeAnswer = async (answerId) => {
  try {
    const response = await questionAPI.likeAnswer(answerId);
    message.success(response.message);

    // 更新点赞状态
    const answer = answers.value.find(a => a.id === answerId);
    if (answer) {
      answer.isLiked = response.liked;
      answer.likesCount += response.liked ? 1 : -1;
    }
  } catch (error) {
    message.error(error.message || '操作失败');
  }
};

// 管理员强制删除问题
const handleAdminDelete = async () => {
  try {
    const result = await questionAPI.adminDeleteQuestion(route.params.id);

    if (result.refundPoints > 0) {
      message.success(`问题已删除，已退还 ${result.refundPoints} 积分给提问者`);
    } else {
      message.success('问题已删除');
    }

    // 返回问题列表
    router.push('/questions');
  } catch (error) {
    message.error(error.error || error.message || '删除失败');
  }
};

// 格式化时间
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleString('zh-CN');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
};

// 页面加载
onMounted(() => {
  loadQuestionDetail();
});
</script>

<style scoped>
.question-header {
  line-height: 1.6;
}

.answer-item {
  transition: all 0.2s;
}

.answer-item:not(.bg-green-50):hover {
  background-color: #f9fafb;
}
</style>
