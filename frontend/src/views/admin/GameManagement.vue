<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">游戏管理</h1>
        <p class="text-gray-500 mt-1">管理游戏库、记录和屏蔽不良内容</p>
      </div>
      <n-button type="primary" @click="showCreateModal = true">
        <template #icon>
          <n-icon><AddCircleOutline /></n-icon>
        </template>
        添加游戏
      </n-button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">游戏总数</div>
        <div class="text-2xl font-bold">{{ stats.totalGames || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">记录总数</div>
        <div class="text-2xl font-bold">{{ stats.totalRecords || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">截图总数</div>
        <div class="text-2xl font-bold">{{ stats.totalScreenshots || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">评论总数</div>
        <div class="text-2xl font-bold">{{ stats.totalComments || 0 }}</div>
      </div>
    </div>

    <!-- 游戏库管理 -->
    <div class="card">
      <h2 class="text-xl font-bold mb-4">游戏库</h2>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="game in allGames"
            :key="game.id"
            class="border rounded-lg p-4"
            :class="game.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white'"
          >
            <div class="flex gap-3">
              <img
                v-if="game.coverImage"
                :src="game.coverImage"
                :alt="game.name"
                class="w-20 h-28 object-cover rounded"
              />
              <div v-else class="w-20 h-28 bg-gray-200 rounded flex items-center justify-center">
                <n-icon size="32" color="#999"><GameControllerOutline /></n-icon>
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-bold mb-1 truncate">{{ game.name }}</h3>
                <p v-if="game.nameEn" class="text-xs text-gray-500 mb-2 truncate">{{ game.nameEn }}</p>
                <div class="flex flex-wrap gap-1 mb-2">
                  <n-tag v-for="genre in game.genres.slice(0, 2)" :key="genre" size="tiny" type="info">
                    {{ genre }}
                  </n-tag>
                </div>
                <div class="text-xs text-gray-500">
                  {{ game._count.records }} 条记录 · {{ game._count.favorites }} 收藏
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-3">
              <n-button v-if="game.isBlocked" type="warning" size="small" @click="unblockGame(game.id)">
                取消屏蔽
              </n-button>
              <n-button v-else type="error" size="small" @click="blockGame(game.id)">
                屏蔽
              </n-button>
              <n-button size="small" @click="editGame(game)">
                编辑
              </n-button>
            </div>
          </div>
        </div>

        <n-empty v-if="allGames.length === 0" description="还没有任何游戏" />
      </div>
    </div>

    <!-- 游戏记录列表 -->
    <div class="card">
      <h2 class="text-xl font-bold mb-4">游戏记录</h2>

      <n-data-table
        :columns="columns"
        :data="records"
        :pagination="pagination"
        :loading="loading"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 创建/编辑游戏模态框 -->
    <n-modal v-model:show="showCreateModal" preset="card" :title="editingGame ? '编辑游戏' : '添加游戏'" style="width: 600px">
      <n-form ref="formRef" :model="gameForm" :rules="rules" label-placement="left" label-width="100">
        <n-form-item label="游戏名称" path="name">
          <n-input v-model:value="gameForm.name" placeholder="请输入游戏名称" />
        </n-form-item>

        <n-form-item label="英文名称" path="nameEn">
          <n-input v-model:value="gameForm.nameEn" placeholder="请输入英文名称（可选）" />
        </n-form-item>

        <n-form-item label="封面图片" path="coverImage">
          <n-input v-model:value="gameForm.coverImage" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>

        <n-form-item label="游戏描述" path="description">
          <n-input
            v-model:value="gameForm.description"
            type="textarea"
            placeholder="请输入游戏描述（可选）"
            :rows="3"
          />
        </n-form-item>

        <n-form-item label="游戏类型" path="genres">
          <n-dynamic-tags v-model:value="gameForm.genres" />
        </n-form-item>

        <n-form-item label="游戏平台" path="platforms">
          <n-dynamic-tags v-model:value="gameForm.platforms" />
        </n-form-item>

        <n-form-item label="发行日期" path="releaseDate">
          <n-date-picker v-model:value="gameForm.releaseDate" type="date" style="width: 100%" />
        </n-form-item>

        <n-form-item label="评分" path="rating">
          <n-input-number v-model:value="gameForm.rating" :min="0" :max="5" :step="0.1" placeholder="0-5分" style="width: 100%" />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveGame" :loading="saving">
            {{ editingGame ? '保存' : '创建' }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue';
import { NButton, NTag, NIcon, useMessage } from 'naive-ui';
import { adminGameAPI, gameAPI } from '@/api';
import { AddCircleOutline, GameControllerOutline } from '@vicons/ionicons5';

const message = useMessage();

const records = ref([]);
const stats = ref({});
const allGames = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const saving = ref(false);
const editingGame = ref(null);
const formRef = ref(null);

const gameForm = ref({
  name: '',
  nameEn: '',
  coverImage: '',
  description: '',
  genres: [],
  platforms: [],
  releaseDate: null,
  rating: null,
});

const rules = {
  name: {
    required: true,
    message: '请输入游戏名称',
    trigger: 'blur',
  },
};

const pagination = ref({
  page: 1,
  pageSize: 20,
  itemCount: 0,
});

const columns = [
  {
    title: '游戏',
    key: 'game.name',
    render: (row) => row.game.name,
  },
  {
    title: '用户',
    key: 'user',
    render: (row) => row.user.username,
  },
  {
    title: '评分',
    key: 'rating',
    render: (row) => `${row.rating}/10`,
  },
  {
    title: '状态',
    key: 'status',
    render: (row) => {
      const labels = {
        WANT_TO_PLAY: '想玩',
        PLAYING: '在玩',
        COMPLETED: '已完成',
        DROPPED: '已放弃',
      };
      const types = {
        WANT_TO_PLAY: 'info',
        PLAYING: 'warning',
        COMPLETED: 'success',
        DROPPED: 'default',
      };
      return h(NTag, { type: types[row.status], size: 'small' }, { default: () => labels[row.status] });
    },
  },
  {
    title: '可见性',
    key: 'visibility',
    render: (row) => {
      const labels = { PUBLIC: '公开', PARENT_ONLY: '家长可见', PRIVATE: '私密' };
      return labels[row.visibility];
    },
  },
  {
    title: '互动',
    key: 'interaction',
    render: (row) => `${row._count.likes} 赞 · ${row._count.comments} 评论`,
  },
  {
    title: '创建时间',
    key: 'createdAt',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'error',
          onClick: () => deleteRecord(row.id),
        },
        { default: () => '删除' }
      ),
  },
];

const loadAllGames = async () => {
  try {
    const { results } = await gameAPI.getTrending({ pageSize: 100 });
    allGames.value = results;
  } catch (error) {
    message.error('加载游戏列表失败');
  }
};

const loadRecords = async () => {
  loading.value = true;
  try {
    const { records: data, total } = await adminGameAPI.getRecords({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    });
    records.value = data;
    pagination.value.itemCount = total;
  } catch (error) {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    stats.value = await adminGameAPI.getStats();
  } catch (error) {
    message.error('加载统计失败');
  }
};

const handleSaveGame = async () => {
  try {
    await formRef.value.validate();
    saving.value = true;

    const data = {
      ...gameForm.value,
      releaseDate: gameForm.value.releaseDate ? new Date(gameForm.value.releaseDate).toISOString() : null,
    };

    if (editingGame.value) {
      // TODO: 添加更新游戏API
      message.warning('编辑功能暂未实现');
    } else {
      await gameAPI.createGame(data);
      message.success('游戏创建成功');
    }

    showCreateModal.value = false;
    resetForm();
    loadAllGames();
    loadStats();
  } catch (error) {
    if (error.errors) {
      // 表单验证错误
      return;
    }
    message.error(error.error || '操作失败');
  } finally {
    saving.value = false;
  }
};

const editGame = (game) => {
  editingGame.value = game;
  gameForm.value = {
    name: game.name,
    nameEn: game.nameEn || '',
    coverImage: game.coverImage || '',
    description: game.description || '',
    genres: [...(game.genres || [])],
    platforms: [...(game.platforms || [])],
    releaseDate: game.releaseDate ? new Date(game.releaseDate).getTime() : null,
    rating: game.rating,
  };
  showCreateModal.value = true;
};

const resetForm = () => {
  editingGame.value = null;
  gameForm.value = {
    name: '',
    nameEn: '',
    coverImage: '',
    description: '',
    genres: [],
    platforms: [],
    releaseDate: null,
    rating: null,
  };
};

const deleteRecord = async (id) => {
  if (!confirm('确定删除此记录？')) return;
  try {
    await adminGameAPI.deleteRecord(id);
    message.success('删除成功');
    loadRecords();
    loadStats();
  } catch (error) {
    message.error('删除失败');
  }
};

const blockGame = async (id) => {
  if (!confirm('确定屏蔽此游戏？屏蔽后将不会出现在搜索结果中。')) return;
  try {
    await adminGameAPI.blockGame(id, { isBlocked: true });
    message.success('已屏蔽');
    loadAllGames();
    loadStats();
  } catch (error) {
    message.error('操作失败');
  }
};

const unblockGame = async (id) => {
  try {
    await adminGameAPI.blockGame(id, { isBlocked: false });
    message.success('已取消屏蔽');
    loadAllGames();
    loadStats();
  } catch (error) {
    message.error('操作失败');
  }
};

const handlePageChange = (page) => {
  pagination.value.page = page;
  loadRecords();
};

onMounted(() => {
  loadAllGames();
  loadRecords();
  loadStats();
});
</script>
