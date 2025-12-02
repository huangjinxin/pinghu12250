<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">任务看板</h1>
        <p class="text-gray-500 mt-1">协作管理任务，类似Trello的看板系统</p>
      </div>
      <n-button type="primary" @click="showCreateBoardModal = true">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        创建看板
      </n-button>
    </div>

    <!-- 看板列表 -->
    <div v-if="!selectedBoard" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="board in boards"
        :key="board.id"
        class="card hover:shadow-lg transition-shadow cursor-pointer"
        @click="selectBoard(board)"
      >
        <div class="h-24 rounded-t-lg mb-3" :style="{ backgroundColor: board.color }"></div>
        <h3 class="font-medium text-gray-800 mb-2">{{ board.title }}</h3>
        <p v-if="board.description" class="text-sm text-gray-600 mb-3">{{ board.description }}</p>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center -space-x-2">
            <img
              v-for="member in board.members.slice(0, 5)"
              :key="member.id"
              :src="member.user.avatar"
              :alt="member.user.username"
              class="w-6 h-6 rounded-full border-2 border-white"
            />
            <span v-if="board.members.length > 5" class="pl-3 text-xs">
              +{{ board.members.length - 5 }}
            </span>
          </div>
          <span>{{ board._count.lists }} 个列表</span>
        </div>
      </div>
    </div>

    <!-- 看板详情（Trello风格） -->
    <div v-else class="fixed inset-0 z-40 bg-gray-100 overflow-hidden" style="margin: 0; padding: 0;">
      <!-- 看板头部 -->
      <div class="h-16 bg-white border-b flex items-center justify-between px-4">
        <div class="flex items-center space-x-4">
          <n-button text @click="selectedBoard = null">
            <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
            返回
          </n-button>
          <h2 class="text-xl font-bold">{{ selectedBoard.title }}</h2>
        </div>
        <div class="flex items-center space-x-2">
          <n-button @click="showInviteModal = true">
            <template #icon><n-icon><PersonAdd /></n-icon></template>
            邀请成员
          </n-button>
          <n-dropdown :options="boardActions" @select="handleBoardAction">
            <n-button circle quaternary>
              <template #icon><n-icon><EllipsisHorizontalOutline /></n-icon></template>
            </n-button>
          </n-dropdown>
        </div>
      </div>

      <!-- 看板内容区域 -->
      <div class="h-[calc(100vh-64px)] overflow-x-auto overflow-y-hidden p-4">
        <div class="flex space-x-4 h-full">
          <!-- 列表 -->
          <div
            v-for="list in selectedBoard.lists"
            :key="list.id"
            class="flex-shrink-0 w-72 bg-gray-200 rounded-lg p-3 flex flex-col max-h-full"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium">{{ list.title }}</h3>
              <n-dropdown :options="getListActions(list)" @select="(key) => handleListAction(key, list)">
                <n-button size="small" text circle>
                  <template #icon><n-icon><EllipsisHorizontalOutline /></n-icon></template>
                </n-button>
              </n-dropdown>
            </div>

            <!-- 卡片列表 -->
            <div class="flex-1 overflow-y-auto space-y-2 mb-3">
              <div
                v-for="card in list.cards"
                :key="card.id"
                class="bg-white p-3 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                @click="openCard(card)"
              >
                <!-- 关联标记 -->
                <div v-if="card.relatedType" class="mb-2">
                  <n-tag size="tiny" :type="getRelatedTypeColor(card.relatedType)">
                    <template #icon>
                      <n-icon><component :is="getRelatedIcon(card.relatedType)" /></n-icon>
                    </template>
                    {{ getRelatedTypeName(card.relatedType) }}
                  </n-tag>
                </div>

                <!-- 标签 -->
                <div v-if="card.labels && card.labels.length" class="flex flex-wrap gap-1 mb-2">
                  <n-tag v-for="(label, idx) in card.labels" :key="idx" size="tiny" :type="getLabelType(label)">
                    {{ label }}
                  </n-tag>
                </div>

                <!-- 卡片标题 -->
                <div class="font-medium text-sm mb-2">{{ card.title }}</div>

                <!-- 卡片底部信息 -->
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <div class="flex items-center space-x-2">
                    <!-- 截止日期 -->
                    <span v-if="card.dueDate" class="flex items-center">
                      <n-icon size="14"><CalendarOutline /></n-icon>
                      <span class="ml-1">{{ formatDate(card.dueDate) }}</span>
                    </span>
                    <!-- 评论数 -->
                    <span v-if="card._count && card._count.comments" class="flex items-center">
                      <n-icon size="14"><ChatboxOutline /></n-icon>
                      <span class="ml-1">{{ card._count.comments }}</span>
                    </span>
                    <!-- 附件数 -->
                    <span v-if="card._count && card._count.attachments" class="flex items-center">
                      <n-icon size="14"><AttachOutline /></n-icon>
                      <span class="ml-1">{{ card._count.attachments }}</span>
                    </span>
                  </div>

                  <!-- 成员头像 -->
                  <div v-if="card.members && card.members.length" class="flex -space-x-1">
                    <img
                      v-for="member in card.members.slice(0, 3)"
                      :key="member.id"
                      :src="member.user.avatar"
                      :alt="member.user.username"
                      class="w-5 h-5 rounded-full border border-white"
                    />
                  </div>
                </div>

                <!-- 完成标记 -->
                <div v-if="card.completed" class="mt-2">
                  <n-tag type="success" size="tiny">已完成</n-tag>
                </div>
              </div>
            </div>

            <!-- 添加卡片按钮 -->
            <n-button text block @click="startCreateCard(list)">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              添加卡片
            </n-button>
          </div>

          <!-- 添加列表 -->
          <div class="flex-shrink-0 w-72">
            <n-button text block class="bg-gray-200 hover:bg-gray-300" @click="startCreateList">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              添加列表
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建看板模态框 -->
    <n-modal v-model:show="showCreateBoardModal">
      <n-card style="width: 500px" title="创建看板" :bordered="false">
        <n-form :model="boardForm">
          <n-form-item label="看板名称">
            <n-input v-model:value="boardForm.title" placeholder="输入看板名称" />
          </n-form-item>
          <n-form-item label="描述">
            <n-input v-model:value="boardForm.description" type="textarea" :rows="2" placeholder="描述（可选）" />
          </n-form-item>
          <n-form-item label="主题色">
            <n-color-picker v-model:value="boardForm.color" :show-alpha="false" />
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button @click="showCreateBoardModal = false">取消</n-button>
            <n-button type="primary" @click="createBoard">创建</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 邀请成员模态框 -->
    <n-modal v-model:show="showInviteModal">
      <n-card style="width: 500px" title="邀请成员" :bordered="false">
        <n-form>
          <n-form-item label="选择用户">
            <n-select
              v-model:value="inviteForm.userIds"
              multiple
              filterable
              placeholder="搜索并选择用户"
              :options="userOptions"
              :loading="loadingUsers"
            />
          </n-form-item>
          <n-form-item label="角色">
            <n-select v-model:value="inviteForm.role" :options="roleOptions" />
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button @click="showInviteModal = false">取消</n-button>
            <n-button type="primary" @click="inviteMembers" :disabled="!inviteForm.userIds.length">邀请</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 卡片详情模态框 -->
    <n-modal v-model:show="showCardModal" :mask-closable="false">
      <n-card style="width: 800px; max-height: 90vh; overflow-y: auto;" :title="editingCard?.title || '新建卡片'" :bordered="false">
        <n-tabs type="line" animated>
          <n-tab-pane name="basic" tab="基本信息">
            <n-form :model="cardForm">
              <n-form-item label="标题">
                <n-input v-model:value="cardForm.title" placeholder="输入卡片标题" />
              </n-form-item>
              <n-form-item label="描述">
                <n-input v-model:value="cardForm.description" type="textarea" :rows="4" placeholder="详细描述（可选）" />
              </n-form-item>
              <n-form-item label="标签">
                <n-select
                  v-model:value="cardForm.labels"
                  multiple
                  tag
                  filterable
                  placeholder="添加标签"
                  :options="labelOptions"
                />
              </n-form-item>
              <n-form-item label="截止日期">
                <n-date-picker v-model:value="cardForm.dueDate" type="datetime" clearable style="width: 100%" />
              </n-form-item>
              <n-form-item label="分配成员">
                <n-select
                  v-model:value="cardForm.memberIds"
                  multiple
                  filterable
                  placeholder="选择成员"
                  :options="boardMemberOptions"
                />
              </n-form-item>
              <n-form-item label="关联模块">
                <div class="space-y-2">
                  <n-select
                    v-model:value="cardForm.relatedType"
                    placeholder="选择模块类型"
                    :options="relatedTypeOptions"
                    clearable
                  />
                  <n-input
                    v-if="cardForm.relatedType"
                    v-model:value="cardForm.relatedId"
                    placeholder="输入关联ID（动态ID、日记ID等）"
                  />
                </div>
              </n-form-item>
              <n-form-item label="状态">
                <n-checkbox v-model:checked="cardForm.completed">已完成</n-checkbox>
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <n-tab-pane v-if="editingCard" name="comments" tab="评论讨论">
            <div class="space-y-4">
              <!-- 添加评论 -->
              <div>
                <n-input
                  v-model:value="newComment"
                  type="textarea"
                  placeholder="写下你的想法..."
                  :rows="3"
                />
                <div class="mt-2 flex justify-end">
                  <n-button type="primary" @click="addComment" :disabled="!newComment.trim()">
                    发表评论
                  </n-button>
                </div>
              </div>

              <!-- 评论列表 -->
              <div class="space-y-3">
                <div
                  v-for="comment in cardComments"
                  :key="comment.id"
                  class="flex space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <img
                    :src="comment.author.avatar"
                    :alt="comment.author.username"
                    class="w-8 h-8 rounded-full"
                  />
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <span class="font-medium text-sm">{{ comment.author.username }}</span>
                      <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
                    </div>
                    <p class="text-sm text-gray-700">{{ comment.content }}</p>
                  </div>
                  <n-button
                    v-if="comment.authorId === currentUserId"
                    text
                    size="small"
                    type="error"
                    @click="deleteComment(comment.id)"
                  >
                    删除
                  </n-button>
                </div>
                <n-empty v-if="!cardComments.length" description="暂无评论" />
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>

        <template #footer>
          <div class="flex justify-between">
            <n-button v-if="editingCard" type="error" @click="deleteCard">删除卡片</n-button>
            <div class="flex gap-2 ml-auto">
              <n-button @click="showCardModal = false">取消</n-button>
              <n-button type="primary" @click="saveCard">保存</n-button>
            </div>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 创建列表模态框 -->
    <n-modal v-model:show="showCreateListModal">
      <n-card style="width: 400px" title="创建列表" :bordered="false">
        <n-form :model="listForm">
          <n-form-item label="列表名称">
            <n-input
              v-model:value="listForm.title"
              placeholder="输入列表名称"
              @keyup.enter="createList"
            />
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <n-button @click="showCreateListModal = false">取消</n-button>
            <n-button type="primary" @click="createList">创建</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { boardAPI } from '@/api';
import {
  AddOutline,
  ArrowBackOutline,
  PersonAdd,
  EllipsisHorizontalOutline,
  CalendarOutline,
  ChatboxOutline,
  AttachOutline,
  DocumentTextOutline,
  BookOutline,
  CreateOutline,
  SchoolOutline,
  CodeSlashOutline,
  CheckboxOutline,
} from '@vicons/ionicons5';

const message = useMessage();
const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.id);

const boards = ref([]);
const selectedBoard = ref(null);
const showCreateBoardModal = ref(false);
const showInviteModal = ref(false);
const showCardModal = ref(false);
const showCreateListModal = ref(false);
const editingCard = ref(null);
const creatingCardList = ref(null);
const userOptions = ref([]);
const loadingUsers = ref(false);
const newComment = ref('');
const cardComments = ref([]);

const boardForm = ref({
  title: '',
  description: '',
  color: '#6366f1',
});

const inviteForm = ref({
  userIds: [],
  role: 'MEMBER',
});

const cardForm = ref({
  title: '',
  description: '',
  labels: [],
  dueDate: null,
  memberIds: [],
  completed: false,
  relatedType: null,
  relatedId: '',
});

const listForm = ref({
  title: '',
});

const roleOptions = [
  { label: '成员', value: 'MEMBER' },
  { label: '管理员', value: 'ADMIN' },
];

const labelOptions = [
  { label: '紧急', value: '紧急' },
  { label: '重要', value: '重要' },
  { label: 'Bug', value: 'Bug' },
  { label: '功能', value: '功能' },
  { label: '优化', value: '优化' },
];

const relatedTypeOptions = [
  { label: '动态', value: 'post' },
  { label: '日记', value: 'diary' },
  { label: '作业', value: 'homework' },
  { label: '笔记', value: 'note' },
  { label: '读书笔记', value: 'readingNote' },
  { label: 'HTML作品', value: 'htmlWork' },
];

const boardMemberOptions = computed(() => {
  if (!selectedBoard.value) return [];
  return selectedBoard.value.members.map((m) => ({
    label: m.user.username,
    value: m.user.id,
  }));
});

const boardActions = [
  { label: '编辑看板', key: 'edit' },
  { label: '删除看板', key: 'delete' },
];

const getListActions = (list) => [
  { label: '重命名', key: 'rename' },
  { label: '删除列表', key: 'delete' },
];

const getLabelType = (label) => {
  const types = {
    紧急: 'error',
    重要: 'warning',
    Bug: 'error',
    功能: 'info',
    优化: 'success',
  };
  return types[label] || 'default';
};

const getRelatedTypeName = (type) => {
  const names = {
    post: '动态',
    diary: '日记',
    homework: '作业',
    note: '笔记',
    readingNote: '读书笔记',
    htmlWork: 'HTML作品',
  };
  return names[type] || type;
};

const getRelatedTypeColor = (type) => {
  const colors = {
    post: 'info',
    diary: 'success',
    homework: 'warning',
    note: 'default',
    readingNote: 'success',
    htmlWork: 'info',
  };
  return colors[type] || 'default';
};

const getRelatedIcon = (type) => {
  const icons = {
    post: CreateOutline,
    diary: BookOutline,
    homework: SchoolOutline,
    note: DocumentTextOutline,
    readingNote: BookOutline,
    htmlWork: CodeSlashOutline,
  };
  return icons[type] || DocumentTextOutline;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
};

const loadBoards = async () => {
  try {
    boards.value = await boardAPI.getBoards();
  } catch (error) {
    message.error('加载看板失败');
  }
};

const loadUsers = async () => {
  loadingUsers.value = true;
  try {
    const users = await boardAPI.searchUsers({ limit: 100 });
    userOptions.value = users.map((u) => ({
      label: `${u.profile?.nickname || u.username} (${u.role})`,
      value: u.id,
    }));
  } catch (error) {
    console.error('加载用户列表失败', error);
  } finally {
    loadingUsers.value = false;
  }
};

const createBoard = async () => {
  try {
    if (!boardForm.value.title) {
      message.error('请输入看板名称');
      return;
    }
    await boardAPI.createBoard(boardForm.value);
    message.success('看板创建成功');
    showCreateBoardModal.value = false;
    boardForm.value = { title: '', description: '', color: '#6366f1' };
    loadBoards();
  } catch (error) {
    message.error(error.error || '创建失败');
  }
};

const selectBoard = async (board) => {
  try {
    selectedBoard.value = await boardAPI.getBoardById(board.id);
  } catch (error) {
    message.error('加载看板详情失败');
  }
};

const inviteMembers = async () => {
  try {
    await boardAPI.inviteMembers(selectedBoard.value.id, inviteForm.value);
    message.success('邀请成功');
    showInviteModal.value = false;
    inviteForm.value = { userIds: [], role: 'MEMBER' };
    selectBoard(selectedBoard.value);
  } catch (error) {
    message.error(error.error || '邀请失败');
  }
};

const startCreateList = () => {
  listForm.value = { title: '' };
  showCreateListModal.value = true;
};

const createList = async () => {
  try {
    if (!listForm.value.title) {
      message.error('请输入列表名称');
      return;
    }
    await boardAPI.createList(selectedBoard.value.id, { title: listForm.value.title });
    message.success('列表创建成功');
    showCreateListModal.value = false;
    listForm.value = { title: '' };
    selectBoard(selectedBoard.value);
  } catch (error) {
    message.error('创建失败');
  }
};

const startCreateCard = (list) => {
  creatingCardList.value = list;
  editingCard.value = null;
  cardForm.value = {
    title: '',
    description: '',
    labels: [],
    dueDate: null,
    memberIds: [],
    completed: false,
    relatedType: null,
    relatedId: '',
  };
  showCardModal.value = true;
};

const openCard = async (card) => {
  editingCard.value = card;
  cardForm.value = {
    title: card.title,
    description: card.description,
    labels: card.labels || [],
    dueDate: card.dueDate ? new Date(card.dueDate).getTime() : null,
    memberIds: card.members?.map((m) => m.user.id) || [],
    completed: card.completed,
    relatedType: card.relatedType,
    relatedId: card.relatedId || '',
  };
  showCardModal.value = true;

  // 加载评论
  loadComments(card.id);
};

const saveCard = async () => {
  try {
    if (!cardForm.value.title) {
      message.error('请输入卡片标题');
      return;
    }

    const data = { ...cardForm.value };
    if (data.relatedType && !data.relatedId) {
      delete data.relatedType;
      delete data.relatedId;
    }

    if (editingCard.value) {
      await boardAPI.updateCard(editingCard.value.id, data);
      message.success('卡片已更新');
    } else {
      await boardAPI.createCard(creatingCardList.value.id, data);
      message.success('卡片已创建');
    }
    showCardModal.value = false;
    selectBoard(selectedBoard.value);
  } catch (error) {
    message.error(error.error || '保存失败');
  }
};

const deleteCard = async () => {
  if (!confirm('确定要删除此卡片吗？')) return;
  try {
    await boardAPI.deleteCard(editingCard.value.id);
    message.success('卡片已删除');
    showCardModal.value = false;
    selectBoard(selectedBoard.value);
  } catch (error) {
    message.error('删除失败');
  }
};

const handleListAction = async (action, list) => {
  if (action === 'rename') {
    const newTitle = prompt('输入新名称', list.title);
    if (!newTitle) return;
    try {
      await boardAPI.updateList(list.id, { title: newTitle });
      message.success('列表已重命名');
      selectBoard(selectedBoard.value);
    } catch (error) {
      message.error('重命名失败');
    }
  } else if (action === 'delete') {
    if (!confirm('确定要删除此列表及其所有卡片吗？')) return;
    try {
      await boardAPI.deleteList(list.id);
      message.success('列表已删除');
      selectBoard(selectedBoard.value);
    } catch (error) {
      message.error('删除失败');
    }
  }
};

const handleBoardAction = async (action) => {
  if (action === 'delete') {
    if (!confirm('确定要删除此看板吗？')) return;
    try {
      await boardAPI.deleteBoard(selectedBoard.value.id);
      message.success('看板已删除');
      selectedBoard.value = null;
      loadBoards();
    } catch (error) {
      message.error('删除失败');
    }
  }
};

const handleListDragEnd = async () => {
  // 更新列表位置
  const updates = selectedBoard.value.lists.map((list, index) => ({
    id: list.id,
    position: index,
  }));
  // 这里可以调用批量更新API
  console.log('列表拖拽完成', updates);
};

const handleCardDragEnd = async () => {
  // 更新卡片位置
  console.log('卡片拖拽完成');
};

const loadComments = async (cardId) => {
  try {
    const comments = await boardAPI.getCardComments(cardId);
    cardComments.value = comments;
  } catch (error) {
    console.error('加载评论失败', error);
  }
};

const addComment = async () => {
  if (!newComment.value.trim()) return;
  try {
    await boardAPI.addCardComment(editingCard.value.id, { content: newComment.value });
    message.success('评论已发表');
    newComment.value = '';
    loadComments(editingCard.value.id);
  } catch (error) {
    message.error('发表失败');
  }
};

const deleteComment = async (commentId) => {
  if (!confirm('确定要删除此评论吗？')) return;
  try {
    await boardAPI.deleteComment(commentId);
    message.success('评论已删除');
    loadComments(editingCard.value.id);
  } catch (error) {
    message.error('删除失败');
  }
};

onMounted(() => {
  loadBoards();
  loadUsers();
});
</script>

<style scoped>
.sortable-ghost {
  opacity: 0.5;
  background: #f0f0f0;
}
</style>
