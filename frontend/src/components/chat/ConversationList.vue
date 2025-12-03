<template>
  <div class="conversation-list">
    <!-- 头部 -->
    <div class="conversation-list-header">
      <div class="flex items-center gap-2">
        <n-icon :size="24"><ChatbubblesOutline /></n-icon>
        <span class="text-lg font-semibold">消息</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- 新聊天按钮 -->
        <n-button
          text
          circle
          size="small"
          @click="$emit('new-chat')"
          title="发起新聊天"
        >
          <template #icon>
            <n-icon :size="20"><AddOutline /></n-icon>
          </template>
        </n-button>

        <!-- 置顶按钮 -->
        <n-button
          text
          circle
          size="small"
          @click="$emit('toggle-pin')"
          :title="isPinned ? '取消置顶' : '置顶'"
        >
          <template #icon>
            <n-icon :size="20" :color="isPinned ? '#667eea' : undefined">
              <Pin />
            </n-icon>
          </template>
        </n-button>

        <!-- 最小化按钮 -->
        <n-button
          text
          circle
          size="small"
          @click="$emit('minimize')"
          title="最小化"
        >
          <template #icon>
            <n-icon :size="20"><RemoveOutline /></n-icon>
          </template>
        </n-button>

        <!-- 关闭按钮 -->
        <n-button
          text
          circle
          size="small"
          @click="$emit('close')"
          title="关闭"
        >
          <template #icon>
            <n-icon :size="20"><CloseOutline /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 会话列表内容 -->
    <div class="conversation-list-content">
      <!-- 空状态 -->
      <div v-if="conversations.length === 0" class="empty-list">
        <n-empty description="暂无消息" size="small">
          <template #extra>
            <n-button text type="primary" @click="$emit('new-chat')">
              发起新聊天
            </n-button>
          </template>
        </n-empty>
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
import {
  ChatbubblesOutline,
  CloseOutline,
  RemoveOutline,
  Pin,
  AddOutline
} from '@vicons/ionicons5';
import ConversationItem from './ConversationItem.vue';

const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  onlineUserIds: {
    type: Set,
    default: () => new Set()
  }
});

defineEmits(['select', 'new-chat', 'toggle-pin', 'minimize', 'close']);

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

.conversation-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
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
