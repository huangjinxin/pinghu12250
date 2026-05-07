<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学伴动态</h1>
        <p class="text-gray-500 mt-1">看看学伴们最近学了什么</p>
      </div>
      <div class="flex gap-2">
        <n-button @click="showFriendManager = true">
          <template #icon><n-icon><PersonAdd /></n-icon></template>
          学伴管理
        </n-button>
        <n-button type="primary" @click="$router.push('/friends/leaderboard')">
          <template #icon><n-icon><TrophyOutline /></n-icon></template>
          排行榜
        </n-button>
      </div>
    </div>

    <!-- 动态流 -->
    <n-spin :show="loading && page === 1">
      <n-empty v-if="!loading && items.length === 0" description="暂无学伴动态，去关注一些同学吧">
        <template #extra>
          <n-button type="primary" @click="showFriendManager = true">发现学伴</n-button>
        </template>
      </n-empty>

      <div v-else class="space-y-4">
        <div v-for="item in items" :key="`${item.type}-${item.id}`" class="card cursor-pointer hover:shadow-md transition-shadow" @click="goToDetail(item)">
          <div class="flex items-center gap-3 mb-3">
            <AvatarText :username="item.user?.username" size="md" />
            <div class="flex-1 min-w-0">
              <span class="font-medium text-gray-800 cursor-pointer hover:text-primary-600" @click.stop="$router.push(`/users/${item.user?.id}`)">
                {{ item.user?.profile?.nickname || item.user?.username }}
              </span>
              <span class="text-gray-500 text-sm ml-2">{{ getActionText(item.type) }}</span>
            </div>
            <n-tag :type="getTagType(item.type)" size="small">{{ getTypeName(item.type) }}</n-tag>
          </div>
          <p class="text-gray-700 line-clamp-2">{{ item.content }}</p>
          <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{{ formatTime(item.createdAt) }}</span>
            <span v-if="item.meta?.wordCount">{{ item.meta.wordCount }}字</span>
            <span v-if="item.meta?.imageCount">{{ item.meta.imageCount }}张图</span>
            <span v-if="item.meta?.category">{{ item.meta.category }}</span>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="text-center mt-4">
        <n-button :loading="loadingMore" @click="loadMore">加载更多</n-button>
      </div>
    </n-spin>

    <!-- 学伴管理抽屉 -->
    <n-drawer v-model:show="showFriendManager" :width="400" placement="right">
      <n-drawer-content title="学伴管理">
        <n-input v-model:value="searchQuery" placeholder="搜索用户" clearable class="mb-4" @update:value="handleSearch">
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>

        <n-tabs v-model:value="friendTab" type="line" size="small">
          <n-tab-pane name="friends" tab="学伴" />
          <n-tab-pane name="following" tab="关注" />
          <n-tab-pane name="followers" tab="粉丝" />
          <n-tab-pane name="recommended" tab="推荐" />
        </n-tabs>

        <n-spin :show="friendLoading">
          <div v-if="searchQuery && searchResults.length > 0" class="space-y-3 mt-3">
            <UserCard v-for="u in searchResults" :key="u.id" :user="u" :is-friend="false" />
          </div>
          <div v-else-if="!searchQuery && friendUsers.length > 0" class="space-y-3 mt-3">
            <UserCard v-for="u in friendUsers" :key="u.id" :user="u" :tab-status="u._tabStatus" />
          </div>
          <n-empty v-else description="暂无用户" class="py-8" />
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import UserCard from '@/components/UserCard.vue'
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { feedAPI } from '@/api'
import api from '@/api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import PersonAdd from '@vicons/ionicons5/es/PersonAdd'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'

const router = useRouter()
const message = useMessage()

// 动态流状态
const items = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(false)

// 学伴管理状态
const showFriendManager = ref(false)
const friendTab = ref('friends')
const friendUsers = ref([])
const friendLoading = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
let searchTimer = null

const formatTime = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN })
}

const getTypeName = (type) => ({ diary: '日记', gallery: '画廊', poetry: '诗词', calligraphy: '书法', achievement: '成就' }[type] || '动态')
const getTagType = (type) => ({ diary: 'info', gallery: 'success', poetry: 'error', calligraphy: 'warning', achievement: 'default' }[type] || 'default')
const getActionText = (type) => ({ diary: '写了一篇日记', gallery: '发布了画作', poetry: '创作了诗词', calligraphy: '练习了书法', achievement: '解锁了成就' }[type] || '有新动态')

const goToDetail = (item) => {
  if (item.link) router.push(item.link)
}

// 加载动态流
const loadFeed = async (reset = true) => {
  if (reset) { page.value = 1; loading.value = true }
  else loadingMore.value = true

  try {
    const res = await feedAPI.getFeed({ page: page.value, limit: 20 })
    const data = res.data?.items || []
    if (reset) items.value = data
    else items.value.push(...data)
    hasMore.value = res.data?.hasMore || false
  } catch (e) {
    message.error('加载动态失败')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = () => { page.value++; loadFeed(false) }

// 学伴管理
const loadFriendList = async () => {
  friendLoading.value = true
  try {
    const endpoints = { friends: '/follows/friends', following: '/follows/following', followers: '/follows/followers', recommended: '/follows/recommended' }
    const res = await api.get(endpoints[friendTab.value], { params: { limit: 20 } })
    friendUsers.value = (res.users || res.recommendations || []).map(u => ({ ...u, _tabStatus: friendTab.value }))
  } catch (e) {
    message.error('加载失败')
  } finally {
    friendLoading.value = false
  }
}

const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchQuery.value?.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const res = await api.get('/follows/recommendations', { params: { search: searchQuery.value.trim(), limit: 20 } })
      searchResults.value = res.users || []
    } catch (e) { message.error('搜索失败') }
  }, 500)
}

watch(friendTab, loadFriendList)
watch(showFriendManager, (v) => { if (v) loadFriendList() })

onMounted(() => loadFeed())
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
