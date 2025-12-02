<template>
  <div class="chat-detail">
    <!-- 调试信息 -->
    <div v-if="false" style="background: pink; padding: 10px; font-size: 12px; position: absolute; top: 0; left: 0; z-index: 9999;">
      <div>ChatDetail 已渲染</div>
      <div>item: {{ item }}</div>
      <div>messages length: {{ messages?.length }}</div>
      <div>inputText: {{ inputText }}</div>
    </div>

    <!-- 消息列表 -->
    <div ref="messageListRef" class="chat-messages">
      <div v-if="!messages || messages.length === 0" class="empty-messages">
        <n-empty description="暂无消息，开始聊天吧" size="small">
          <template #extra>
            <p class="text-sm text-gray-500">和 {{ item.name }} 打个招呼吧！ </p>
          </template>
        </n-empty>
      </div>
      <div v-else class="messages-container">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'message-item',
            msg.fromUserId === currentUserId ? 'message-sent' : 'message-received'
          ]"
        >
          <AvatarText :username="msg.fromUserId === currentUserId ? authStore.user?.username : item.username" size="md" />

          <!-- 判断消息类型 -->
          <ShareCard
            v-if="isShareMessage(msg)"
            :share-data="getShareData(msg)"
            :is-sent="msg.fromUserId === currentUserId"
          />
          <div v-else class="message-bubble">
            <div class="message-text">{{ msg.content }}</div>
            <div class="message-time">{{ formatMessageTime(msg.createdAt) }}</div>
            <div v-if="msg.status === 'sending'" class="message-status">发送中</div>
            <div v-else-if="msg.status === 'failed'" class="message-status failed">发送失败</div>
          </div>

          <AvatarText :username="msg.fromUserId === currentUserId ? authStore.user?.username : item.username" size="md" />
        </div>
      </div>
    </div>

    <!-- 消息输入区域 -->
    <div class="chat-input-area">
      <!-- 工具栏 -->
      <div class="input-toolbar">
        <!-- 表情包按钮 -->
        <EmojiPicker @select="handleEmojiSelect">
          <n-button text circle size="small" title="表情包">
            <template #icon>
              <n-icon :size="20"><HappyOutline /></n-icon>
            </template>
          </n-button>
        </EmojiPicker>

        <!-- 分享菜单 -->
        <n-dropdown :options="shareOptions" @select="openShareSelector">
          <n-button text circle size="small" title="分享">
            <template #icon>
              <n-icon :size="20"><ShareSocialOutline /></n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </div>

      <!-- 输入框和发送按钮 -->
      <div class="input-row">
        <n-input
          v-model:value="inputText"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 3 }"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="handleSend"
        />
        <n-button type="primary" @click="handleSend" :loading="sending">
          发送
        </n-button>
      </div>
    </div>

    <!-- 分享选择器弹窗 -->

    <!-- 分享选择器弹窗 -->
    <ShareSelector
      v-model:visible="shareSelectorVisible"
      :share-type="shareType"
      @select="handleShareSelect"
    />
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, nextTick, watch, h } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ShareSocialOutline,
  BookOutline,
  DocumentTextOutline,
  BrushOutline,
  LibraryOutline,
  GameControllerOutline,
  TrophyOutline,
  HelpCircleOutline,
  HappyOutline
} from '@vicons/ionicons5';
import ShareSelector from './ShareSelector.vue';
import ShareCard from './ShareCard.vue';
import EmojiPicker from './EmojiPicker.vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  messages: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['send-message']);

const chatStore = useChatStore();
const authStore = useAuthStore();

// 调试：组件挂载时打印
console.log('=== ChatDetail 组件初始化 ===');
console.log('props.item:', props.item);
console.log('props.messages:', props.messages);

// 状态
const inputText = ref('');
const sending = ref(false);
const messageListRef = ref(null);
const shareSelectorVisible = ref(false);
const shareType = ref('');

const currentUserId = computed(() => authStore.user?.id);
const currentAvatar = computed(() => authStore.user?.avatar);

// 分享选项
const shareOptions = [
  {
    label: '日记',
    key: 'diary',
    icon: () => h(BookOutline)
  },
  {
    label: '作业',
    key: 'homework',
    icon: () => h(DocumentTextOutline)
  },
  {
    label: '作品',
    key: 'work',
    icon: () => h(BrushOutline)
  },
  {
    label: '书籍',
    key: 'book',
    icon: () => h(LibraryOutline)
  },
  {
    label: '游戏',
    key: 'game',
    icon: () => h(GameControllerOutline)
  },
  {
    label: '成就',
    key: 'achievement',
    icon: () => h(TrophyOutline)
  },
  {
    label: '问答',
    key: 'question',
    icon: () => h(HelpCircleOutline)
  }
];

// 判断是否为分享消息
const isShareMessage = (msg) => {
  try {
    const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    return content && content.share_type;
  } catch {
    return false;
  }
};

// 获取分享数据
const getShareData = (msg) => {
  try {
    return typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
  } catch {
    return null;
  }
};

// 格式化消息时间
const formatMessageTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'HH:mm', { locale: zhCN });
};

// 处理表情包选择
const handleEmojiSelect = (emoji) => {
  inputText.value += emoji;
};

// 发送消息
const handleSend = async () => {
  if (!inputText.value.trim()) return;

  sending.value = true;
  try {
    emit('send-message', inputText.value.trim());
    inputText.value = '';
    scrollToBottom();
  } catch (error) {
    console.error('发送消息失败:', error);
  } finally {
    sending.value = false;
  }
};

// 打开分享选择器
const openShareSelector = (type) => {
  shareType.value = type;
  shareSelectorVisible.value = true;
};

// 处理分享选择
const handleShareSelect = async (shareData) => {
  if (!shareData) return;

  sending.value = true;
  try {
    const shareContent = JSON.stringify(shareData);
    emit('send-message', shareContent);
    scrollToBottom();
  } catch (error) {
    window.$message?.error('分享失败：' + error.message);
  } finally {
    sending.value = false;
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

// 监听消息变化
watch(() => props.messages, () => {
  scrollToBottom();
}, { deep: true });
</script>

<style scoped>
.chat-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  /* 调试：添加边框确认组件存在 */
  border: 2px solid red;
  min-height: 300px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-sent {
  flex-direction: row-reverse;
}

.message-received {
  flex-direction: row;
}

.message-avatar {
  flex-shrink: 0;
  margin-bottom: 4px;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.4;
}

.message-sent .message-bubble {
  background: #07c160; /* 微信绿色 */
  color: white;
}

.message-received .message-bubble {
  background: white;
  color: #000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-text {
  margin-bottom: 4px;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
}

.message-received .message-time {
  color: #999;
}

.message-sent .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-status {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.message-status.failed {
  color: #ff4f4f;
}

/* 输入区域 */
.chat-input-area {
  flex-shrink: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
}

.input-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-row :deep(.n-input) {
  flex: 1;
}

/* 滚动条 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-detail {
    border-radius: 0;
  }

  .chat-messages {
    padding: 12px;
  }

  .chat-input-area {
    padding: 10px 12px;
  }

  .message-bubble {
    max-width: 75%;
    font-size: 13px;
  }
}
</style>