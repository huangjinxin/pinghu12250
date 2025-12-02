<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">好友</h1>
        <p class="text-gray-500 mt-1">管理你的好友关系</p>
      </div>
      <n-button type="primary" @click="$router.push('/friends/leaderboard')">
        <template #icon><n-icon><TrophyOutline /></n-icon></template>
        好友排行榜
      </n-button>
    </div>

    <!-- 搜索框 -->
    <div class="card">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索用户（输入用户名或昵称）"
        clearable
        @update:value="handleSearch"
      >
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchQuery" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">
          搜索 "{{ searchQuery }}" 的结果
          <span v-if="searchResults.length > 0" class="text-sm font-normal text-gray-500">
            (找到 {{ searchResults.length }} 个用户)
          </span>
        </h2>
        <n-button text @click="clearSearch">清除搜索</n-button>
      </div>

      <div v-if="searchResults.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UserCard
          v-for="user in searchResults"
          :key="user.id"
          :user="user"
          :is-friend="false"
        />
      </div>

      <n-empty v-else description="未找到匹配的用户" class="py-12">
        <template #extra>
          <p class="text-sm text-gray-500 mt-2">
            尝试搜索用户的用户名或昵称
          </p>
        </template>
      </n-empty>
    </div>

    <!-- 标签页 -->
    <div v-show="!searchQuery">
      <n-tabs v-model:value="activeTab" type="line" animated @update:value="loadFriends">
        <n-tab-pane name="friends" tab="我的好友" />
        <n-tab-pane name="following" tab="我关注的" />
        <n-tab-pane name="followers" tab="关注我的" />
        <n-tab-pane name="recommended" tab="推荐关注" />
      </n-tabs>

      <n-spin :show="loading">
        <div v-if="users.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UserCard
            v-for="user in users"
            :key="user.id"
            :user="user"
            :tab-status="user._tabStatus"
          />
        </div>
        <n-empty v-else description="暂无用户" class="py-12" />
      </n-spin>

      <div v-if="total > pageSize" class="flex justify-center mt-4">
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          @update:page="loadFriends"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';
import { TrophyOutline, SearchOutline } from '@vicons/ionicons5';
import UserCard from '@/components/UserCard.vue';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const activeTab = ref('friends');
const users = ref([]);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const searchQuery = ref('');
const searchResults = ref([]);
let searchTimer = null;

const loadFriends = async () => {
  loading.value = true;
  try {
    const endpoints = {
      friends: '/follows/friends',
      following: '/follows/following',
      followers: '/follows/followers',
      recommended: '/follows/recommended'
    };

    const response = await api.get(endpoints[activeTab.value], {
      params: { page: page.value, limit: pageSize.value }
    });

    // 根据当前标签给用户添加正确的状态标识
    const usersWithTabStatus = response.users || response.recommendations || [];
    users.value = usersWithTabStatus.map(user => ({
      ...user,
      _tabStatus: activeTab.value // 记录用户的来源标签页
    }));
    total.value = response.total || response.recommendations?.length || 0;
  } catch (error) {
    console.error('加载好友失败:', error);
    message.error(error.error || '加载好友失败');
  } finally {
    loading.value = false;
  }
};

// 搜索用户（防抖）
const handleSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  if (!searchQuery.value || searchQuery.value.trim().length === 0) {
    searchResults.value = [];
    return;
  }

  searchTimer = setTimeout(async () => {
    try {
      const response = await api.get('/follows/recommendations', {
        params: { search: searchQuery.value.trim(), limit: 20 }
      });
      searchResults.value = response.users || [];
    } catch (error) {
      console.error('搜索用户失败:', error);
      message.error('搜索用户失败');
    }
  }, 500); // 500ms 防抖
};

// 清除搜索
const clearSearch = () => {
  searchQuery.value = '';
  searchResults.value = [];
};

onMounted(() => loadFriends());
</script>
