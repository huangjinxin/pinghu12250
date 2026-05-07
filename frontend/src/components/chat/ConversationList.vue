<template>
  <div class="conversation-list">
    <!-- 会话列表内容 -->
    <div class="conversation-list-content">
      <!-- 空状态 -->
      <div v-if="conversations.length === 0" class="empty-list">
        <n-empty description="暂无消息" size="small" />
      </div>

      <!-- 会话列表 -->
      <div v-else class="conversations">
        <ConversationItem
          v-for="conv in conversations"
          :key="conv.id"
          :conversation="conv"
          :is-online="isUserOnline(conv.id)"
          @click="$emit('select', conv)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import ConversationItem from './ConversationItem.vue';

const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  onlineUserIds: {
    type: Set,
    default: () => new Set()
  }
});

defineEmits(['select']);

// 判断用户是否在线
const isUserOnline = (userId) => {
  return props.onlineUserIds.has(userId);
};
</script>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.conversation-list-content {
  flex: 1;
  overflow-y: auto;
}

.empty-list {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.conversations {
  display: flex;
  flex-direction: column;
}
</style>
