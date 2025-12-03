<template>
  <div class="space-y-6">
    <!-- 顶部标题栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">游戏大厅</h1>
        <p class="text-gray-500 mt-1">发现好游戏，分享你的游戏体验</p>
      </div>
      <n-button type="primary" @click="$router.push('/my-games')">
        <template #icon>
          <n-icon><LibraryOutline /></n-icon>
        </template>
        我的游戏库
      </n-button>
    </div>

    <!-- 标签页 -->
    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 最新记录 -->
      <n-tab-pane name="feed" tab="最新记录">
        <div class="space-y-4 mt-4">
          <n-spin :show="loadingFeed">
            <div v-if="feedList.length > 0" class="space-y-4">
              <div
                v-for="item in feedList"
                :key="item.id"
                class="card hover:shadow-md transition-shadow cursor-pointer"
                @click="handleReviewClick(item)"
              >
                <div class="flex gap-4">
                  <!-- 游戏封面 -->
                  <img
                    v-if="item.game.coverUrl"
                    :src="item.game.coverUrl"
                    :alt="item.game.name"
                    class="w-24 h-32 object-cover rounded"
                  />
                  <div v-else class="w-24 h-32 bg-gray-200 rounded flex items-center justify-center">
                    <n-icon size="32" color="#999"><GameControllerOutline /></n-icon>
                  </div>

                  <!-- 评测内容 -->
                  <div class="flex-1 min-w-0">
                    <!-- 用户信息 -->
                    <div class="flex items-center gap-2 mb-2">
                      <AvatarText :username="game.author?.username" size="md" />
                      <span class="font-medium text-gray-800">{{ item.user.username }}</span>
                      <n-tag v-if="item.type === 'long'" type="warning" size="small">长评</n-tag>
                      <n-tag v-else type="info" size="small">短评</n-tag>
                      <span class="text-sm text-gray-400">{{ formatTime(item.createdAt) }}</span>
                    </div>

                    <!-- 游戏名称 -->
                    <div class="text-sm text-gray-500 mb-2">
                      游戏：{{ item.game.name }}
                      <n-tag size="tiny" type="info" class="ml-2">{{ item.game.gameType }}</n-tag>
                    </div>

                    <!-- 评分 -->
                    <div class="flex items-center gap-2 mb-2">
                      <n-rate :value="item.score / 2" readonly size="small" />
                      <span class="text-sm font-medium">{{ item.score }}/10</span>
                    </div>

                    <!-- 内容 -->
                    <div v-if="item.type === 'short'" class="text-gray-700 mb-2">
                      {{ item.content }}
                    </div>
                    <div v-else class="mb-2">
                      <div class="font-medium mb-1">{{ item.title }}</div>
                      <div class="text-sm text-gray-600 line-clamp-2" v-html="item.content"></div>
                    </div>

                    <!-- 互动信息（长评） -->
                    <div v-if="item.type === 'long'" class="flex items-center gap-4 text-sm text-gray-500">
                      <span><n-icon><HeartOutline /></n-icon> {{ item.likesCount }}</span>
                      <span><n-icon><ChatbubbleOutline /></n-icon> {{ item.commentsCount }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else description="还没有任何评测记录" />
          </n-spin>

          <!-- 分页 -->
          <div v-if="feedTotal > feedPageSize" class="flex justify-center">
            <n-pagination
              v-model:page="feedPage"
              :page-count="Math.ceil(feedTotal / feedPageSize)"
              @update:page="loadFeed"
            />
          </div>
        </div>
      </n-tab-pane>

      <!-- 热门游戏 -->
      <n-tab-pane name="hot" tab="热门游戏">
        <div class="mt-4">
          <n-spin :show="loadingHot">
            <div v-if="hotGames.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <div
                v-for="game in hotGames"
                :key="game.id"
                class="card hover:shadow-lg transition-shadow cursor-pointer relative"
                @click="$router.push(`/games/${game.id}`)"
              >
                <!-- 编辑/删除按钮 -->
                <div v-if="canEditGame(game)" class="absolute top-2 right-2 flex gap-1 z-10">
                  <n-button
                    size="tiny"
                    circle
                    type="info"
                    @click="openEditGameModal(game, $event)"
                  >
                    <template #icon>
                      <n-icon><CreateOutline /></n-icon>
                    </template>
                  </n-button>
                  <n-button
                    size="tiny"
                    circle
                    type="error"
                    @click="handleDeleteGame(game, $event)"
                  >
                    <template #icon>
                      <n-icon><TrashOutline /></n-icon>
                    </template>
                  </n-button>
                </div>

                <img
                  v-if="game.coverUrl"
                  :src="game.coverUrl"
                  :alt="game.name"
                  class="w-full h-48 object-cover rounded-t-lg"
                />
                <div v-else class="w-full h-48 bg-gray-300 rounded-t-lg flex items-center justify-center">
                  <n-icon size="48" color="#999"><GameControllerOutline /></n-icon>
                </div>

                <div class="p-3">
                  <h3 class="font-medium text-sm line-clamp-2 mb-2">{{ game.name }}</h3>
                  <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <n-tag size="tiny" type="info">{{ game.gameType }}</n-tag>
                    <span>{{ game.platform }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1">
                      <n-rate :value="game.avgScore / 2" readonly size="tiny" />
                      <span class="text-gray-600">{{ game.avgScore?.toFixed(1) || '暂无' }}</span>
                    </div>
                    <span class="text-gray-500">{{ game.recordCount }} 人记录</span>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else description="还没有任何游戏" />
          </n-spin>

          <!-- 分页 -->
          <div v-if="hotTotal > hotPageSize" class="flex justify-center mt-6">
            <n-pagination
              v-model:page="hotPage"
              :page-count="Math.ceil(hotTotal / hotPageSize)"
              @update:page="loadHot"
            />
          </div>
        </div>
      </n-tab-pane>

      <!-- 重温经典 -->
      <n-tab-pane name="classic" tab="重温经典">
        <div class="mt-4">
          <ClassicGames />
        </div>
      </n-tab-pane>

      <!-- 游戏搜索 -->
      <n-tab-pane name="search" tab="游戏搜索">
        <div class="mt-4 space-y-4">
          <!-- 搜索栏 -->
          <div class="card">
            <div class="flex gap-2">
              <n-input
                v-model:value="searchQuery"
                placeholder="搜索游戏名称或描述..."
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-select
                v-model:value="selectedType"
                :options="gameTypes"
                placeholder="选择类型"
                clearable
                style="width: 200px"
                @update:value="handleSearch"
              />
              <n-button type="primary" @click="handleSearch" :loading="loadingSearch">搜索</n-button>
              <n-button type="success" @click="showAddGameModal = true">
                <template #icon>
                  <n-icon><AddOutline /></n-icon>
                </template>
                添加游戏
              </n-button>
            </div>
          </div>

          <!-- 顶部分页 -->
          <div v-if="!loadingSearch && searchTotal > searchPageSize" class="card">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="text-sm text-gray-600">
                共 <span class="font-semibold text-primary-600">{{ searchTotal }}</span> 个游戏，
                当前第 <span class="font-semibold text-primary-600">{{ searchPage }}</span> 页，
                共 <span class="font-semibold text-primary-600">{{ Math.ceil(searchTotal / searchPageSize) }}</span> 页
              </div>
              <n-pagination
                v-model:page="searchPage"
                :page-count="Math.ceil(searchTotal / searchPageSize)"
                :page-size="searchPageSize"
                show-size-picker
                :page-sizes="[9, 18, 27, 36]"
                show-quick-jumper
                @update:page="loadSearchGames"
                @update:page-size="handleSearchPageSizeChange"
              >
                <template #prefix>
                  <n-button size="small" @click="goToSearchFirstPage" :disabled="searchPage === 1">首页</n-button>
                </template>
                <template #suffix>
                  <n-button size="small" @click="goToSearchLastPage" :disabled="searchPage === Math.ceil(searchTotal / searchPageSize)">尾页</n-button>
                </template>
              </n-pagination>
            </div>
          </div>

          <!-- 游戏列表 -->
          <div v-if="loadingSearch" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <n-skeleton v-for="i in 9" :key="i" height="300px" :sharp="false" />
          </div>

          <n-empty v-else-if="!searchResults.length" description="还没有任何游戏" />

          <div v-else>
            <h2 v-if="searchQuery || selectedType" class="text-lg font-bold mb-4">搜索结果</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="game in searchResults"
                :key="game.id"
                class="card hover:shadow-lg transition-shadow cursor-pointer relative"
                @click="$router.push(`/games/${game.id}`)"
              >
                <!-- 编辑/删除按钮 -->
                <div v-if="canEditGame(game)" class="absolute top-2 right-2 flex gap-1 z-10">
                  <n-button
                    size="tiny"
                    circle
                    type="info"
                    @click="openEditGameModal(game, $event)"
                  >
                    <template #icon>
                      <n-icon><CreateOutline /></n-icon>
                    </template>
                  </n-button>
                  <n-button
                    size="tiny"
                    circle
                    type="error"
                    @click="handleDeleteGame(game, $event)"
                  >
                    <template #icon>
                      <n-icon><TrashOutline /></n-icon>
                    </template>
                  </n-button>
                </div>

                <img
                  v-if="game.coverUrl"
                  :src="game.coverUrl"
                  :alt="game.name"
                  class="w-full h-48 object-cover rounded-t-lg"
                />
                <div v-else class="w-full h-48 bg-gray-300 rounded-t-lg flex items-center justify-center">
                  <n-icon size="48" color="#999"><GameControllerOutline /></n-icon>
                </div>

                <div class="p-4">
                  <h3 class="font-bold text-lg mb-2">{{ game.name }}</h3>
                  <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ game.description || '暂无描述' }}</p>

                  <div class="flex items-center justify-between mb-2">
                    <n-tag size="small" type="info">{{ game.gameType }}</n-tag>
                    <span class="text-xs text-gray-500">{{ game.platform }}</span>
                  </div>

                  <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-1">
                      <n-rate :value="game.avgScore / 2" readonly size="small" />
                      <span class="text-gray-600">{{ game.avgScore?.toFixed(1) || '暂无' }}</span>
                    </div>
                    <span class="text-gray-500">{{ game.recordCount }} 人记录</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部分页 -->
          <div v-if="!loadingSearch && searchTotal > searchPageSize" class="card">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="text-sm text-gray-600">
                共 <span class="font-semibold text-primary-600">{{ searchTotal }}</span> 个游戏，
                当前第 <span class="font-semibold text-primary-600">{{ searchPage }}</span> 页，
                共 <span class="font-semibold text-primary-600">{{ Math.ceil(searchTotal / searchPageSize) }}</span> 页
              </div>
              <n-pagination
                v-model:page="searchPage"
                :page-count="Math.ceil(searchTotal / searchPageSize)"
                :page-size="searchPageSize"
                show-size-picker
                :page-sizes="[9, 18, 27, 36]"
                show-quick-jumper
                @update:page="loadSearchGames"
                @update:page-size="handleSearchPageSizeChange"
              >
                <template #prefix>
                  <n-button size="small" @click="goToSearchFirstPage" :disabled="searchPage === 1">首页</n-button>
                </template>
                <template #suffix>
                  <n-button size="small" @click="goToSearchLastPage" :disabled="searchPage === Math.ceil(searchTotal / searchPageSize)">尾页</n-button>
                </template>
              </n-pagination>
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- 添加游戏弹窗 -->
    <n-modal v-model:show="showAddGameModal" preset="card" title="添加游戏到游戏库" style="width: 600px">
      <n-form ref="addGameFormRef" :model="newGame" :rules="addGameRules">
        <n-form-item label="游戏名称" path="name">
          <n-input v-model:value="newGame.name" placeholder="请输入游戏名称" />
        </n-form-item>
        <n-form-item label="游戏类型" path="gameType">
          <n-input v-model:value="newGame.gameType" placeholder="例如：RPG、动作、策略等" />
        </n-form-item>
        <n-form-item label="游戏平台" path="platform">
          <n-input v-model:value="newGame.platform" placeholder="例如：PC、PS5、Switch等" />
        </n-form-item>
        <n-form-item label="封面图片URL" path="coverUrl">
          <n-input v-model:value="newGame.coverUrl" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>
        <n-form-item label="游戏描述" path="description">
          <n-input
            v-model:value="newGame.description"
            type="textarea"
            placeholder="请输入游戏描述（可选）"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddGameModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddGame" :loading="submittingGame">提交</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 编辑游戏弹窗 -->
    <n-modal v-model:show="showEditGameModal" preset="card" title="编辑游戏信息" style="width: 600px">
      <n-form ref="editGameFormRef" :model="editGame" :rules="editGameRules">
        <n-form-item label="游戏名称" path="name">
          <n-input v-model:value="editGame.name" placeholder="请输入游戏名称" />
        </n-form-item>
        <n-form-item label="游戏类型" path="gameType">
          <n-input v-model:value="editGame.gameType" placeholder="例如：RPG、动作、策略等" />
        </n-form-item>
        <n-form-item label="游戏平台" path="platform">
          <n-input v-model:value="editGame.platform" placeholder="例如：PC、PS5、Switch等" />
        </n-form-item>
        <n-form-item label="封面图片URL" path="coverUrl">
          <n-input v-model:value="editGame.coverUrl" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>
        <n-form-item label="游戏描述" path="description">
          <n-input
            v-model:value="editGame.description"
            type="textarea"
            placeholder="请输入游戏描述（可选）"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showEditGameModal = false">取消</n-button>
          <n-button type="primary" @click="handleEditGame" :loading="submittingGame">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import ClassicGames from '@/views/ClassicGames.vue'
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { gameAPI } from '@/api';
import {
  SearchOutline,
  GameControllerOutline,
  LibraryOutline,
  HeartOutline,
  ChatbubbleOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const activeTab = ref('feed');

// 最新记录
const feedList = ref([]);
const feedPage = ref(1);
const feedPageSize = ref(20);
const feedTotal = ref(0);
const loadingFeed = ref(false);

// 热门游戏
const hotGames = ref([]);
const hotPage = ref(1);
const hotPageSize = ref(20);
const hotTotal = ref(0);
const loadingHot = ref(false);

// 游戏搜索
const searchQuery = ref('');
const selectedType = ref(null);
const searchResults = ref([]);
const searchPage = ref(1);
const searchPageSize = ref(9); // 每页显示数量（默认9个，3x3布局）
const searchTotal = ref(0);
const loadingSearch = ref(false);
const gameTypes = ref([]);

// 添加游戏
const showAddGameModal = ref(false);
const submittingGame = ref(false);
const addGameFormRef = ref(null);
const newGame = ref({
  name: '',
  gameType: '',
  platform: '',
  coverUrl: '',
  description: '',
});

const addGameRules = {
  name: { required: true, message: '请输入游戏名称', trigger: 'blur' },
  gameType: { required: true, message: '请输入游戏类型', trigger: 'blur' },
  platform: { required: true, message: '请输入游戏平台', trigger: 'blur' },
};

// 编辑游戏
const showEditGameModal = ref(false);
const editingGame = ref(null);
const editGameFormRef = ref(null);
const editGame = ref({
  name: '',
  gameType: '',
  platform: '',
  coverUrl: '',
  description: '',
});

const editGameRules = {
  name: { required: true, message: '请输入游戏名称', trigger: 'blur' },
  gameType: { required: true, message: '请输入游戏类型', trigger: 'blur' },
  platform: { required: true, message: '请输入游戏平台', trigger: 'blur' },
};

// 获取当前用户信息
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 检查是否可以编辑/删除游戏
const canEditGame = (game) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  return currentUser.role === 'ADMIN' || game.createdBy === currentUser.id;
};

// 加载最新记录
const loadFeed = async () => {
  loadingFeed.value = true;
  try {
    const data = await gameAPI.getFeed({
      page: feedPage.value,
      pageSize: feedPageSize.value,
    });
    feedList.value = data.reviews || [];
    feedTotal.value = data.total || 0;
  } catch (error) {
    console.error('加载最新记录失败', error);
    message.error('加载失败');
  } finally {
    loadingFeed.value = false;
  }
};

// 加载热门游戏
const loadHot = async () => {
  loadingHot.value = true;
  try {
    const data = await gameAPI.getHot({
      page: hotPage.value,
      pageSize: hotPageSize.value,
    });
    hotGames.value = data.games || [];
    hotTotal.value = data.total || 0;
  } catch (error) {
    console.error('加载热门游戏失败', error);
    message.error('加载失败');
  } finally {
    loadingHot.value = false;
  }
};

// 加载游戏类型
const loadGameTypes = async () => {
  try {
    const data = await gameAPI.getTypes();
    gameTypes.value = (data.types || []).map(type => ({
      label: type,
      value: type,
    }));
  } catch (error) {
    console.error('加载游戏类型失败', error);
  }
};

// 搜索按钮点击
const handleSearch = () => {
  // 搜索时重置到第一页
  searchPage.value = 1;
  loadSearchGames();
};

// 分页控制函数
const goToSearchFirstPage = () => {
  searchPage.value = 1;
  loadSearchGames();
};

const goToSearchLastPage = () => {
  searchPage.value = Math.ceil(searchTotal.value / searchPageSize.value);
  loadSearchGames();
};

const handleSearchPageSizeChange = (newPageSize) => {
  searchPageSize.value = newPageSize;
  searchPage.value = 1; // 改变每页数量时重置到第一页
  loadSearchGames();
};

// 加载游戏（包括搜索和分页）
const loadSearchGames = async () => {
  loadingSearch.value = true;
  // 滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const params = {
      page: searchPage.value,
      pageSize: searchPageSize.value,
    };

    // 如果有搜索关键词，添加到参数中
    if (searchQuery.value && searchQuery.value.trim()) {
      params.q = searchQuery.value.trim();
    }

    // 如果选择了类型，添加到参数中
    if (selectedType.value) {
      params.gameType = selectedType.value;
    }

    const data = await gameAPI.searchGames(params);
    searchResults.value = data.games || [];
    searchTotal.value = data.total || 0;
  } catch (error) {
    console.error('加载游戏失败', error);
    message.error('加载游戏失败');
  } finally {
    loadingSearch.value = false;
  }
};

// 处理评测点击
const handleReviewClick = (item) => {
  if (item.type === 'long') {
    router.push(`/games/review/${item.id}`);
  } else {
    // 短评点击跳转到游戏详情
    router.push(`/games/${item.game.id}`);
  }
};

// 格式化时间
const formatTime = (date) => {
  const now = new Date();
  const created = new Date(date);
  const diff = now - created;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return created.toLocaleDateString('zh-CN');
};

// 添加游戏
const handleAddGame = async () => {
  try {
    await addGameFormRef.value?.validate();
    submittingGame.value = true;

    const data = await gameAPI.addGame(newGame.value);
    message.success(data.message || '添加游戏成功');
    showAddGameModal.value = false;

    // 重置表单
    newGame.value = {
      name: '',
      gameType: '',
      platform: '',
      coverUrl: '',
      description: '',
    };

    // 刷新搜索结果
    if (activeTab.value === 'search') {
      loadSearchGames();
    }
  } catch (error) {
    console.error('添加游戏失败', error);
    message.error(error.error || '添加游戏失败');
  } finally {
    submittingGame.value = false;
  }
};

// 打开编辑游戏弹窗
const openEditGameModal = (game, event) => {
  event.stopPropagation();
  editingGame.value = game;
  editGame.value = {
    name: game.name,
    gameType: game.gameType,
    platform: game.platform,
    coverUrl: game.coverUrl || '',
    description: game.description || '',
  };
  showEditGameModal.value = true;
};

// 编辑游戏
const handleEditGame = async () => {
  try {
    await editGameFormRef.value?.validate();
    submittingGame.value = true;

    const data = await gameAPI.updateGame(editingGame.value.id, editGame.value);
    message.success(data.message || '更新游戏成功');
    showEditGameModal.value = false;

    // 刷新列表
    if (activeTab.value === 'hot') {
      loadHot();
    } else if (activeTab.value === 'search') {
      loadSearchGames();
    }
  } catch (error) {
    console.error('更新游戏失败', error);
    message.error(error.error || '更新游戏失败');
  } finally {
    submittingGame.value = false;
  }
};

// 删除游戏
const handleDeleteGame = (game, event) => {
  event.stopPropagation();

  dialog.warning({
    title: '删除确认',
    content: `确定要删除游戏"${game.name}"吗？此操作不可恢复。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteGame(game.id);
    },
  });
};

// 执行删除
const deleteGame = async (gameId) => {
  try {
    const data = await gameAPI.deleteGame(gameId);
    message.success(data.message || '删除游戏成功');

    // 刷新列表
    if (activeTab.value === 'hot') {
      loadHot();
    } else if (activeTab.value === 'search') {
      loadSearchGames();
    }
  } catch (error) {
    console.error('删除游戏失败', error);
    message.error(error.error || '删除游戏失败');
  }
};

onMounted(() => {
  loadFeed();
  loadHot();
  loadGameTypes();
  loadSearchGames(); // 初始加载所有游戏
});
</script>
