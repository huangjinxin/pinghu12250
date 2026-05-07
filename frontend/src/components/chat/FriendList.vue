<template>
  <div class="friend-list">
    <div v-if="loading" class="loading">
      <n-spin size="small" />
    </div>
    <div v-else-if="friends.length === 0" class="empty">
      <n-empty description="暂无好友" size="small" />
    </div>
    <div v-else class="list">
      <div
        v-for="friend in friends"
        :key="friend.id"
        class="friend-item"
        @click="$emit('select', friend)"
      >
        <n-badge :dot="onlineUserIds.includes(friend.id)" :offset="[-4, 4]">
          <n-avatar
            :src="friend.avatar"
            :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`"
            round
            :size="40"
          />
        </n-badge>
        <div class="friend-info">
          <div class="friend-name">{{ friend.nickname || friend.username }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { friendAPI } from '@/api'

const props = defineProps({
  onlineUserIds: { type: Array, default: () => [] },
  extraContacts: { type: Array, default: () => [] }
})

defineEmits(['select'])

const friends = ref([])
const loading = ref(true)

const loadFriends = async () => {
  loading.value = true
  try {
    const res = await friendAPI.getFriends()
    const list = res.data || res.users || []
    const map = new Map()
    ;[...props.extraContacts, ...list].forEach(item => {
      if (item?.id) map.set(item.id, item)
    })
    friends.value = Array.from(map.values())
  } catch (error) {
    console.error('加载好友列表失败:', error)
    friends.value = props.extraContacts || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFriends()
})
</script>

<style scoped>
.friend-list {
  height: 100%;
  overflow-y: auto;
}

.loading, .empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.friend-item:hover {
  background: #f5f5f7;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}
</style>
