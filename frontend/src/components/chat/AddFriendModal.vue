<template>
  <n-modal v-if="mode === 'modal'" v-model:show="visible" preset="card" title="添加好友" style="width: 500px">
    <div class="add-friend-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">添加朋友</div>
          <div class="panel-subtitle">搜索用户名或从推荐好友中发起申请</div>
        </div>
      </div>
      <n-input
        v-model:value="searchKeyword"
        placeholder="搜索用户名"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #suffix>
          <n-button text @click="handleSearch" :loading="searching">
            <n-icon><SearchOutline /></n-icon>
          </n-button>
        </template>
      </n-input>

      <div v-if="!searched && recommendedUsers.length > 0" class="recommended-section">
        <div class="section-title">推荐好友</div>
        <div class="user-list">
          <div
            v-for="user in recommendedUsers"
            :key="user.id"
            class="user-item"
          >
            <n-avatar
              :src="user.avatar"
              :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`"
              round
              :size="40"
            />
            <div class="user-info">
              <div class="user-name">{{ user.nickname || user.username }}</div>
              <div class="user-meta">@{{ user.username }}</div>
            </div>
            <n-button
              v-if="!user.isFriend && user.requestStatus === 'NONE'"
              size="small"
              type="primary"
              @click="handleFollow(user.id)"
              :loading="following === user.id"
            >
              添加
            </n-button>
            <n-tag v-else-if="user.requestStatus === 'SENT'" type="warning" size="small">已发送</n-tag>
            <n-tag v-else-if="user.requestStatus === 'RECEIVED'" type="info" size="small">待处理</n-tag>
            <n-tag v-else-if="user.isFriend" type="success" size="small">已添加</n-tag>
          </div>
        </div>
      </div>

      <div v-if="searched" class="search-section">
        <div v-if="searchResults.length > 0" class="user-list">
          <div
            v-for="user in searchResults"
            :key="user.id"
            class="user-item"
          >
            <n-avatar
              :src="user.avatar"
              :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`"
              round
              :size="40"
            />
            <div class="user-info">
              <div class="user-name">{{ user.nickname || user.username }}</div>
              <div class="user-meta">@{{ user.username }}</div>
            </div>
            <n-button
              v-if="!user.isFriend && user.requestStatus === 'NONE'"
              size="small"
              type="primary"
              @click="handleFollow(user.id)"
              :loading="following === user.id"
            >
              添加
            </n-button>
            <n-tag v-else-if="user.requestStatus === 'SENT'" type="warning" size="small">已发送</n-tag>
            <n-tag v-else-if="user.requestStatus === 'RECEIVED'" type="info" size="small">待处理</n-tag>
            <n-tag v-else-if="user.isFriend" type="success" size="small">已添加</n-tag>
          </div>
        </div>
        <n-empty v-else :description="`未找到用户「${searchKeyword}」`" size="small" />
      </div>
    </div>
  </n-modal>

  <div v-else class="add-friend-panel panel-mode">
    <div class="panel-header">
      <div>
        <div class="panel-title">添加朋友</div>
        <div class="panel-subtitle">搜索用户名或从推荐好友中发起申请</div>
      </div>
    </div>
    <n-input
      v-model:value="searchKeyword"
      placeholder="搜索用户名"
      clearable
      @keyup.enter="handleSearch"
    >
      <template #suffix>
        <n-button text @click="handleSearch" :loading="searching">
          <n-icon><SearchOutline /></n-icon>
        </n-button>
      </template>
    </n-input>

    <div v-if="!searched && recommendedUsers.length > 0" class="recommended-section">
      <div class="section-title">推荐好友</div>
      <div class="user-list">
        <div
          v-for="user in recommendedUsers"
          :key="user.id"
          class="user-item"
        >
          <n-avatar
            :src="user.avatar"
            :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`"
            round
            :size="40"
          />
          <div class="user-info">
            <div class="user-name">{{ user.nickname || user.username }}</div>
            <div class="user-meta">@{{ user.username }}</div>
          </div>
          <n-button
            v-if="!user.isFriend && user.requestStatus === 'NONE'"
            size="small"
            type="primary"
            @click="handleFollow(user.id)"
            :loading="following === user.id"
          >
            添加
          </n-button>
          <n-tag v-else-if="user.requestStatus === 'SENT'" type="warning" size="small">已发送</n-tag>
          <n-tag v-else-if="user.requestStatus === 'RECEIVED'" type="info" size="small">待处理</n-tag>
          <n-tag v-else-if="user.isFriend" type="success" size="small">已添加</n-tag>
        </div>
      </div>
    </div>

    <div v-if="searched" class="search-section">
      <div v-if="searchResults.length > 0" class="user-list">
        <div
          v-for="user in searchResults"
          :key="user.id"
          class="user-item"
        >
          <n-avatar
            :src="user.avatar"
            :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`"
            round
            :size="40"
          />
          <div class="user-info">
            <div class="user-name">{{ user.nickname || user.username }}</div>
            <div class="user-meta">@{{ user.username }}</div>
          </div>
          <n-button
            v-if="!user.isFriend && user.requestStatus === 'NONE'"
            size="small"
            type="primary"
            @click="handleFollow(user.id)"
            :loading="following === user.id"
          >
            添加
          </n-button>
          <n-tag v-else-if="user.requestStatus === 'SENT'" type="warning" size="small">已发送</n-tag>
          <n-tag v-else-if="user.requestStatus === 'RECEIVED'" type="info" size="small">待处理</n-tag>
          <n-tag v-else-if="user.isFriend" type="success" size="small">已添加</n-tag>
        </div>
      </div>
      <n-empty v-else :description="`未找到用户「${searchKeyword}」`" size="small" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { friendAPI, userAPI } from '@/api'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'

const props = defineProps({
  mode: { type: String, default: 'modal' }
})

const visible = defineModel('show', { type: Boolean, default: false })
const emit = defineEmits(['success'])

const searchKeyword = ref('')
const searchResults = ref([])
const recommendedUsers = ref([])
const searching = ref(false)
const searched = ref(false)
const following = ref(null)

const resetState = () => {
  searched.value = false
  searchKeyword.value = ''
  searchResults.value = []
}

const loadRecommendations = async () => {
  try {
    const res1 = await userAPI.search({ q: '果果' })
    const res2 = await userAPI.search({ q: '桐妹' })
    const guoguoUsers = res1.data || []
    const tongmeiUsers = res2.data || []
    recommendedUsers.value = [...guoguoUsers, ...tongmeiUsers]
  } catch (error) {
    console.error('加载推荐好友失败:', error)
  }
}

watch(visible, (newVal) => {
  if (props.mode === 'modal' && newVal) {
    resetState()
    loadRecommendations()
  }
})

onMounted(() => {
  if (props.mode === 'panel') {
    resetState()
    loadRecommendations()
  }
})

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) return
  searching.value = true
  searched.value = false
  try {
    const res = await userAPI.search({ q: searchKeyword.value })
    searchResults.value = res.data || []
    searched.value = true
  } catch (error) {
    console.error('搜索失败:', error)
    window.$message?.error('搜索失败')
  } finally {
    searching.value = false
  }
}

const handleFollow = async (userId) => {
  following.value = userId
  try {
    await friendAPI.sendRequest({ toUserId: userId })
    window.$message?.success('好友申请已发送')
    const user = searchResults.value.find(u => u.id === userId) || recommendedUsers.value.find(u => u.id === userId)
    if (user) user.requestStatus = 'SENT'
    emit('success')
  } catch (error) {
    window.$message?.error(error.response?.data?.error || '发送申请失败')
  } finally {
    following.value = null
  }
}
</script>

<style scoped>
.add-friend-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.panel-mode {
  overflow: hidden;
}

.panel-header {
  margin-bottom: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.panel-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.recommended-section,
.search-section {
  margin-top: 16px;
  min-height: 0;
  flex: 1;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
}

.user-list {
  max-height: 100%;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f5f5f5;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.user-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
</style>
