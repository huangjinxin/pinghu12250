<template>
  <div class="space-y-6">
    <n-card>
      <!-- Tab切换和发布按钮 -->
      <div class="flex justify-between items-center mb-4">
        <n-tabs v-model:value="currentTab" type="line" @update:value="handleTabChange">
          <n-tab-pane name="solved" tab="已解决" />
          <n-tab-pane name="open" tab="进行中" />
          <n-tab-pane name="my" tab="我的提问" />
          <n-tab-pane name="answered" tab="我的回答" />
        </n-tabs>
        <n-button type="primary" @click="showPublishModal = true">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          发起悬赏
        </n-button>
      </div>

      <!-- 搜索框 -->
      <div class="mb-4">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索问题标题..."
          clearable
          @keyup.enter="handleSearch"
        >
          <template #suffix>
            <n-icon class="cursor-pointer" @click="handleSearch"><Search /></n-icon>
          </template>
        </n-input>
      </div>

      <!-- 问题列表 -->
      <n-spin :show="loading">
        <!-- 普通问题列表（已解决、进行中、我的提问） -->
        <n-list v-if="currentTab !== 'answered' && questions.length > 0">
          <n-list-item
            v-for="q in questions"
            :key="q.id"
            class="hover:bg-gray-50 transition relative"
          >
            <n-thing class="cursor-pointer" @click="router.push(`/questions/${q.id}`)">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <n-tag v-if="q.deletedAt" type="error" size="small">已删除</n-tag>
                    <n-tag v-else-if="q.status === 'OPEN'" type="success" size="small">进行中</n-tag>
                    <n-tag v-else type="default" size="small">已解决</n-tag>
                    <span class="font-medium text-base">{{ q.title }}</span>
                  </div>
                  <!-- 我的提问Tab显示操作按钮 -->
                  <n-dropdown
                    v-if="currentTab === 'my' && !q.deletedAt"
                    :options="getQuestionActions(q)"
                    @select="(key) => handleQuestionAction(key, q)"
                    @click.stop
                  >
                    <n-button text @click.stop>
                      <n-icon size="20"><EllipsisHorizontal /></n-icon>
                    </n-button>
                  </n-dropdown>
                </div>
              </template>
              <template #description>
                <div class="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span v-if="q.rewardPoints > 0" class="flex items-center gap-1">
                    <n-icon><Diamond /></n-icon>
                    悬赏 {{ q.rewardPoints }} 积分
                  </span>
                  <span class="flex items-center gap-1">
                    <n-icon><ChatbubbleEllipses /></n-icon>
                    {{ q.answersCount }} 个回答
                  </span>
                  <span class="flex items-center gap-1">
                    <n-icon><Eye /></n-icon>
                    {{ q.viewsCount }} 浏览
                  </span>
                  <span>{{ formatTime(q.createdAt) }}</span>
                </div>
              </template>
              <template #avatar>
                <AvatarText :username="q.author?.username" size="md" />
              </template>
            </n-thing>
          </n-list-item>
        </n-list>

        <!-- 我的回答Tab列表 -->
        <n-list v-else-if="currentTab === 'answered' && questions.length > 0">
          <n-list-item
            v-for="q in questions"
            :key="q.id"
            class="hover:bg-gray-50 transition cursor-pointer"
            @click="router.push(`/questions/${q.id}`)"
          >
            <n-thing>
              <template #header>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-base">{{ q.title }}</span>
                  <n-tag v-if="q.myAnswer?.isBest" type="success" size="small">✓ 已采纳</n-tag>
                </div>
              </template>
              <template #description>
                <div class="text-sm text-gray-500">
                  提问者：{{ q.author?.name }} · {{ formatTime(q.answeredAt) }}
                </div>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>

        <n-empty v-else description="暂无问题" class="py-8" />
      </n-spin>

      <!-- 分页 -->
      <div v-if="pagination.totalPages > 1" class="flex justify-center mt-4">
        <n-pagination
          v-model:page="page"
          :page-count="pagination.totalPages"
          @update:page="handlePageChange"
        />
      </div>
    </n-card>

    <!-- 发布问题弹窗 -->
    <n-modal v-model:show="showPublishModal" preset="card" title="发起悬赏问答" style="max-width: 600px">
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item label="问题标题" path="title">
          <n-input
            v-model:value="form.title"
            placeholder="简洁描述你的问题"
            :maxlength="100"
            show-count
          />
        </n-form-item>
        <n-form-item label="问题详情" path="content">
          <n-input
            type="textarea"
            v-model:value="form.content"
            :rows="6"
            placeholder="详细描述问题背景和你的疑惑"
            :maxlength="1000"
            show-count
          />
        </n-form-item>
        <n-form-item label="问题类型" path="category">
          <n-select
            v-model:value="form.category"
            :options="categoryOptions.slice(1)"
            placeholder="选择问题类型"
          />
        </n-form-item>
        <n-form-item label="悬赏积分" path="reward_points">
          <n-input-number
            v-model:value="form.reward_points"
            :min="0"
            :max="5000"
            :step="1"
            placeholder="设置悬赏积分（0-5000，0为无悬赏）"
            style="width: 100%"
          />
          <template #feedback>
            <div class="flex items-center justify-between text-sm mt-1">
              <n-text depth="3">
                当前可用积分：<span :class="{ 'text-red-500': availablePoints < form.reward_points && form.reward_points > 0 }">{{ availablePoints }}</span>
              </n-text>
              <n-text v-if="form.reward_points > 0 && availablePoints < form.reward_points" type="error">
                积分不足！还需 {{ form.reward_points - availablePoints }} 积分
              </n-text>
              <n-text v-else-if="form.reward_points === 0" type="info">
                发布无悬赏问题
              </n-text>
              <n-text v-else type="success">
                发布后剩余 {{ availablePoints - form.reward_points }} 积分
              </n-text>
            </div>
          </template>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPublishModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handlePublish"
            :loading="publishing"
            :disabled="availablePoints < form.reward_points"
          >
            {{ availablePoints < form.reward_points ? '积分不足' : (form.reward_points === 0 ? '发布' : `发布（扣除 ${form.reward_points} 积分）`) }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 编辑问题弹窗 -->
    <n-modal v-model:show="showEditModal" preset="card" title="编辑问题" style="max-width: 600px">
      <n-form ref="editFormRef" :model="editForm" :rules="rules">
        <n-form-item label="问题标题" path="title">
          <n-input
            v-model:value="editForm.title"
            placeholder="简洁描述你的问题"
            :maxlength="100"
            show-count
          />
        </n-form-item>
        <n-form-item label="问题详情" path="content">
          <n-input
            type="textarea"
            v-model:value="editForm.content"
            :rows="6"
            placeholder="详细描述问题背景和你的疑惑"
            :maxlength="1000"
            show-count
          />
        </n-form-item>
        <n-alert type="info" :bordered="false">
          注意：编辑问题时无法修改悬赏积分
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="handleEditSubmit" :loading="editing">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 增加悬赏弹窗 -->
    <n-modal v-model:show="showAddRewardModal" preset="card" title="增加悬赏积分" style="max-width: 500px">
      <n-form>
        <n-form-item label="追加积分">
          <n-input-number
            v-model:value="addRewardPoints"
            :min="1"
            :max="5000"
            :step="10"
            placeholder="输入追加积分"
            style="width: 100%"
          />
        </n-form-item>
        <n-alert type="info" :bordered="false">
          当前悬赏：{{ selectedQuestion?.rewardPoints || 0 }} 积分<br>
          可用积分：{{ availablePoints }} 积分
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddRewardModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handleAddReward"
            :loading="submitting"
            :disabled="!addRewardPoints || availablePoints < addRewardPoints"
          >
            确认追加（扣除 {{ addRewardPoints || 0 }} 积分）
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 补充内容弹窗 -->
    <n-modal v-model:show="showAppendModal" preset="card" title="补充问题内容" style="max-width: 600px">
      <n-form>
        <n-form-item label="补充说明">
          <n-input
            type="textarea"
            v-model:value="appendText"
            :rows="6"
            placeholder="详细补充问题描述..."
            :maxlength="500"
            show-count
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAppendModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handleAppend"
            :loading="submitting"
            :disabled="!appendText.trim()"
          >
            保存补充
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 手动关闭确认弹窗 -->
    <n-modal v-model:show="showCloseModal" preset="card" title="关闭问题" style="max-width: 500px">
      <n-alert type="warning" :bordered="false">
        关闭后悬赏 {{ selectedQuestion?.rewardPoints || 0 }} 积分将作废，确定关闭吗？
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCloseModal = false">取消</n-button>
          <n-button type="error" @click="handleClose" :loading="submitting">
            确认关闭
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, reactive, computed, onMounted, h } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { questionAPI, pointAPI } from '@/api';
import { Add, Diamond, ChatbubbleEllipses, Eye, EllipsisHorizontal, CreateOutline, TrashOutline, Search, Close as CloseIcon, TrendingUp } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const authStore = useAuthStore();

// Tab状态
const currentTab = ref('solved'); // solved | open | my | answered
const searchQuery = ref('');

// 实时积分数据
const availablePoints = ref(0);

// 数据
const questions = ref([]);
const loading = ref(false);
const page = ref(1);
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

const categoryOptions = [
  { label: '全部类型', value: 'all' },
  { label: '语言', value: 'language' },
  { label: '数学', value: 'math' },
  { label: '生活', value: 'life' },
  { label: '科技', value: 'technology' },
  { label: '其他', value: 'other' },
];

// 发布问题
const showPublishModal = ref(false);
const publishing = ref(false);
const formRef = ref(null);
const form = reactive({
  title: '',
  content: '',
  category: 'other',
  reward_points: 0,
});

// 编辑问题
const showEditModal = ref(false);
const editing = ref(false);
const editFormRef = ref(null);
const editForm = reactive({
  id: '',
  title: '',
  content: '',
});

// 新增功能弹窗
const showAddRewardModal = ref(false);
const showAppendModal = ref(false);
const showCloseModal = ref(false);
const selectedQuestion = ref(null);
const addRewardPoints = ref(10);
const appendText = ref('');
const submitting = ref(false);

const rules = {
  title: [
    { required: true, message: '请输入问题标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在5-100个字符之间', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入问题详情', trigger: 'blur' },
    { min: 10, max: 1000, message: '详情长度在10-1000个字符之间', trigger: 'blur' },
  ],
  category: [
    { required: true, message: '请选择问题类型', trigger: 'blur' },
  ],
  reward_points: [
    { type: 'number', min: 0, max: 5000, message: '悬赏积分在0-5000之间', trigger: 'blur' },
  ],
};

// 加载问题列表
const loadQuestions = async () => {
  loading.value = true;
  try {
    let response;

    if (currentTab.value === 'answered') {
      // 我的回答Tab使用单独的API
      response = await questionAPI.getMyAnswers({
        page: page.value,
        limit: 20,
        search: searchQuery.value,
      });
      questions.value = response.answers || [];
      Object.assign(pagination, response.pagination);
    } else {
      // 其他Tab使用统一的问题列表API
      const params = {
        tab: currentTab.value,
        page: page.value,
        limit: 20,
      };

      if (searchQuery.value) {
        params.search = searchQuery.value;
      }

      response = await questionAPI.getQuestions(params);
      questions.value = response.questions || [];
      Object.assign(pagination, response.pagination);
    }
  } catch (error) {
    message.error(error.message || '加载问题列表失败');
  } finally {
    loading.value = false;
  }
};

// 处理搜索
const handleSearch = () => {
  page.value = 1;
  loadQuestions();
};

// 处理Tab切换
const handleTabChange = (tab) => {
  currentTab.value = tab;
  page.value = 1;
  loadQuestions();
};

// 处理分页变化
const handlePageChange = () => {
  loadQuestions();
};

// 获取问题操作选项
const getQuestionActions = (question) => {
  const actions = [
    {
      label: '增加悬赏',
      key: 'add_reward',
      icon: () => h(TrendingUp),
      disabled: question.status === 'CLOSED',
    },
    {
      label: '补充内容',
      key: 'append_content',
      icon: () => h(CreateOutline),
    },
  ];

  if (question.status === 'OPEN') {
    actions.push({
      label: '手动关闭',
      key: 'close',
      icon: () => h(CloseIcon),
    });
  }

  if (question.answersCount === 0) {
    actions.push({
      label: '删除',
      key: 'delete',
      icon: () => h(TrashOutline),
    });
  }

  return actions;
};

// 处理问题操作
const handleQuestionAction = (action, question) => {
  selectedQuestion.value = question;

  switch (action) {
    case 'add_reward':
      showAddRewardModal.value = true;
      addRewardPoints.value = 10;
      break;
    case 'append_content':
      showAppendModal.value = true;
      appendText.value = '';
      break;
    case 'close':
      showCloseModal.value = true;
      break;
    case 'delete':
      handleDelete(question);
      break;
  }
};

// 编辑问题
const handleEdit = (question) => {
  editForm.id = question.id;
  editForm.title = question.title;
  editForm.content = question.content;
  showEditModal.value = true;
};

// 提交编辑
const handleEditSubmit = async () => {
  try {
    await editFormRef.value?.validate();

    editing.value = true;
    await questionAPI.updateQuestion(editForm.id, {
      title: editForm.title,
      content: editForm.content,
    });

    message.success('问题更新成功');
    showEditModal.value = false;

    // 重新加载列表
    await loadQuestions();
  } catch (error) {
    console.error('编辑问题失败:', error);

    let errorMsg = '编辑失败，请重试';
    if (Array.isArray(error)) {
      const firstError = error[0]?.[0];
      errorMsg = firstError?.message || '请检查表单填写是否正确';
    } else if (error?.error) {
      errorMsg = error.error;
    } else if (error?.message) {
      errorMsg = error.message;
    }

    message.error(errorMsg);
  } finally {
    editing.value = false;
  }
};

// 删除问题
const handleDelete = (question) => {
  if (question.answersCount > 0) {
    message.warning('已有回答的问题不能删除，您可以关闭问题');
    return;
  }

  dialog.warning({
    title: '确认删除',
    content: `确定要删除问题"${question.title}"吗？删除后可在"我的提问"中查看。${question.rewardPoints > 0 ? `\n将退还 ${question.rewardPoints} 积分。` : ''}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await questionAPI.deleteQuestion(question.id);

        if (result.refundPoints > 0) {
          message.success(`问题已删除，退还 ${result.refundPoints} 积分`);
          await loadUserPoints();
          await authStore.fetchUserInfo();
        } else {
          message.success('问题已删除');
        }

        // 重新加载列表
        await loadQuestions();
      } catch (error) {
        message.error(error.error || error.message || '删除失败');
      }
    },
  });
};

// 增加悬赏
const handleAddReward = async () => {
  if (!addRewardPoints.value || addRewardPoints.value <= 0) {
    message.warning('请输入有效的追加积分');
    return;
  }

  if (availablePoints.value < addRewardPoints.value) {
    message.error('积分余额不足');
    return;
  }

  submitting.value = true;
  try {
    const result = await questionAPI.addReward(selectedQuestion.value.id, {
      points: addRewardPoints.value,
    });

    message.success(`悬赏增加成功！当前悬赏 ${result.newRewardPoints} 积分`);
    showAddRewardModal.value = false;

    // 刷新数据
    await loadUserPoints();
    await authStore.fetchUserInfo();
    await loadQuestions();
  } catch (error) {
    message.error(error.error || error.message || '增加悬赏失败');
  } finally {
    submitting.value = false;
  }
};

// 补充内容
const handleAppend = async () => {
  if (!appendText.value.trim()) {
    message.warning('请输入补充内容');
    return;
  }

  submitting.value = true;
  try {
    await questionAPI.appendContent(selectedQuestion.value.id, {
      content: appendText.value,
    });

    message.success('补充内容成功');
    showAppendModal.value = false;

    // 重新加载列表
    await loadQuestions();
  } catch (error) {
    message.error(error.error || error.message || '补充内容失败');
  } finally {
    submitting.value = false;
  }
};

// 手动关闭问题
const handleClose = async () => {
  submitting.value = true;
  try {
    const result = await questionAPI.closeQuestion(selectedQuestion.value.id);

    message.success(result.message);
    showCloseModal.value = false;

    // 重新加载列表
    await loadQuestions();
  } catch (error) {
    message.error(error.error || error.message || '关闭问题失败');
  } finally {
    submitting.value = false;
  }
};

// 加载用户积分
const loadUserPoints = async () => {
  try {
    const pointsData = await pointAPI.getMyPoints();
    availablePoints.value = pointsData.totalPoints || 0;
  } catch (error) {
    console.error('加载积分失败:', error);
    availablePoints.value = 0;
  }
};

// 发布问题
const handlePublish = async () => {
  try {
    // 验证表单
    await formRef.value?.validate();

    // 检查积分余额（如果悬赏大于0）
    if (form.reward_points > 0 && availablePoints.value < form.reward_points) {
      message.error(`积分余额不足，还需 ${form.reward_points - availablePoints.value} 积分`);
      return;
    }

    publishing.value = true;
    const response = await questionAPI.createQuestion(form);

    // 刷新积分数据
    await loadUserPoints();
    await authStore.fetchUserInfo();

    if (form.reward_points > 0) {
      message.success(`问题发布成功！已扣除 ${form.reward_points} 积分`);
    } else {
      message.success('问题发布成功！');
    }

    showPublishModal.value = false;

    // 重置表单
    form.title = '';
    form.content = '';
    form.category = 'other';
    form.reward_points = 0;

    // 重新加载列表
    page.value = 1;
    await loadQuestions();

    // 跳转到问题详情
    router.push(`/questions/${response.question.id}`);
  } catch (error) {
    console.error('发布问题失败:', error);

    // 处理不同类型的错误
    let errorMsg = '发布失败，请重试';

    if (Array.isArray(error)) {
      // 表单验证错误（naive-ui返回的错误数组）
      const firstError = error[0]?.[0];
      errorMsg = firstError?.message || '请检查表单填写是否正确';
    } else if (error?.error) {
      // 后端返回的错误（axios拦截器已提取data）
      errorMsg = error.error;
    } else if (error?.message) {
      // 其他错误对象
      errorMsg = error.message;
    }

    message.error(errorMsg);
  } finally {
    publishing.value = false;
  }
};

// 获取类型标签文本
const getCategoryLabel = (category) => {
  const categoryMap = {
    language: '语言',
    math: '数学',
    life: '生活',
    technology: '科技',
    other: '其他'
  };
  return categoryMap[category] || '其他';
};

// 获取类型标签颜色
const getCategoryType = (category) => {
  const typeMap = {
    language: 'info',
    math: 'success',
    life: 'warning',
    technology: 'error',
    other: 'default'
  };
  return typeMap[category] || 'default';
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
    return date.toLocaleDateString('zh-CN');
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
  loadQuestions();
  loadUserPoints(); // 加载用户积分
});
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
