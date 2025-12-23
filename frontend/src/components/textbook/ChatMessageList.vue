<template>
  <div class="chat-message-list" ref="listRef">
    <!-- 空状态 -->
    <div v-if="messages.length === 0" class="empty-state">
      <n-icon size="36" color="#ddd"><ChatbubblesOutline /></n-icon>
      <p>在下方输入框中提问或分析</p>
      <p class="sub">输入内容后，将在 PDF 教材中进行分析</p>
    </div>

    <!-- 消息列表 -->
    <div v-else class="messages-container">
      <TransitionGroup name="message">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <!-- 消息头部 -->
          <div class="message-header">
            <span class="message-role">
              <template v-if="msg.role === 'user'">我</template>
              <template v-else-if="msg.role === 'system'">分析结果</template>
              <template v-else>AI 助手</template>
            </span>
            <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
          </div>

          <!-- 消息内容 -->
          <div class="message-body">
            <!-- 用户消息 -->
            <template v-if="msg.role === 'user'">
              <div class="user-text">{{ msg.content }}</div>
            </template>

            <!-- 系统搜索结果 -->
            <template v-else-if="msg.role === 'system'">
              <div class="search-results" v-if="msg.data?.matches?.length">
                <div
                  v-for="(match, idx) in msg.data.matches"
                  :key="idx"
                  class="result-item"
                  @click="$emit('go-to-page', match.page, msg.data.query)"
                >
                  <div class="result-page">
                    <n-icon size="12"><DocumentOutline /></n-icon>
                    第{{ match.page }}页
                  </div>
                  <div class="result-text">{{ match.text }}</div>
                </div>
              </div>
              <div v-else class="no-results">
                <n-icon size="16"><SearchOutline /></n-icon>
                未在教材中找到相关内容
              </div>
            </template>

            <!-- AI 回复（预留） -->
            <template v-else>
              <div class="ai-text" v-html="msg.content"></div>
            </template>
          </div>

          <!-- 消息操作栏 -->
          <div class="message-actions">
            <!-- 跳页（仅搜索结果有多个匹配时） -->
            <n-button
              v-if="msg.role === 'system' && msg.data?.matches?.length > 1"
              text
              size="tiny"
              @click="$emit('go-to-page', msg.data.matches[0].page, msg.data.query)"
            >
              <n-icon size="14"><NavigateOutline /></n-icon>
            </n-button>

            <!-- 朗读 -->
            <n-button
              text
              size="tiny"
              @click="speakMessage(msg)"
              :title="speakingMsgId === msg.id ? '停止朗读' : '朗读'"
            >
              <n-icon size="14" :color="speakingMsgId === msg.id ? '#ff4d4f' : '#999'">
                <StopCircleOutline v-if="speakingMsgId === msg.id" />
                <VolumeHighOutline v-else />
              </n-icon>
            </n-button>

            <!-- 保存到笔记 -->
            <n-button
              text
              size="tiny"
              :loading="msg.saving"
              @click="toggleSaveMessage(msg)"
              :title="msg.saved ? '取消保存' : '保存到笔记'"
            >
              <n-icon size="14" :color="msg.saved ? '#1890ff' : '#999'">
                <component :is="msg.saved ? Bookmark : BookmarkOutline" />
              </n-icon>
            </n-button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useMessage } from 'naive-ui';
import {
  ChatbubblesOutline,
  DocumentOutline,
  SearchOutline,
  NavigateOutline,
  VolumeHighOutline,
  StopCircleOutline,
  Bookmark,
  BookmarkOutline
} from '@vicons/ionicons5';
import { textbookNoteAPI } from '@/api/index';
import { speak, stopSpeaking, isSpeaking } from '@/utils/speechService';

const message = useMessage();

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  textbookId: {
    type: String,
    default: ''
  },
  sessionId: {
    type: String,
    default: ''
  },
  currentPage: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits(['go-to-page', 'update:messages', 'note-saved']);

const listRef = ref(null);
const speakingMsgId = ref(null); // 当前正在朗读的消息ID

// 格式化时间
const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// 朗读消息（切换）
const speakMessage = async (msg) => {
  // 如果正在朗读当前消息，则停止
  if (speakingMsgId.value === msg.id) {
    stopSpeaking();
    speakingMsgId.value = null;
    return;
  }

  // 停止之前的朗读
  stopSpeaking();

  let text = '';

  if (msg.role === 'user') {
    text = msg.content;
  } else if (msg.role === 'system') {
    if (msg.data?.matches?.length) {
      text = msg.data.matches.map(m => m.text).join('。');
    } else {
      text = '未找到相关内容';
    }
  } else {
    text = msg.content;
  }

  if (text) {
    speakingMsgId.value = msg.id;
    try {
      await speak(text);
    } finally {
      // 朗读结束后清除状态
      if (speakingMsgId.value === msg.id) {
        speakingMsgId.value = null;
      }
    }
  }
};

// 保存/取消保存消息
const toggleSaveMessage = async (msg) => {
  if (msg.saving) return;

  // 设置 saving 状态
  const msgIndex = props.messages.findIndex(m => m.id === msg.id);
  if (msgIndex === -1) return;

  const updatedMessages = [...props.messages];
  updatedMessages[msgIndex] = { ...msg, saving: true };
  emit('update:messages', updatedMessages);

  try {
    if (msg.saved && msg.noteId) {
      // 取消保存
      await textbookNoteAPI.delete(msg.noteId);
      updatedMessages[msgIndex] = {
        ...updatedMessages[msgIndex],
        saving: false,
        saved: false,
        noteId: null
      };
      emit('update:messages', updatedMessages);
      message.success('已取消保存');
    } else {
      // 保存笔记
      const snippet = buildSnippet(msg);
      const res = await textbookNoteAPI.create({
        textbookId: props.textbookId,
        sessionId: props.sessionId,
        sourceType: msg.role === 'user' ? 'user_message' : msg.role,
        query: msg.role === 'user' ? msg.content : (msg.data?.query || ''),
        content: msg.role === 'user' ? { text: msg.content } : msg.data,
        snippet,
        page: msg.page || props.currentPage
      });

      updatedMessages[msgIndex] = {
        ...updatedMessages[msgIndex],
        saving: false,
        saved: true,
        noteId: res.data?.id
      };
      emit('update:messages', updatedMessages);
      emit('note-saved'); // 通知父组件刷新笔记列表
      message.success('已保存到笔记');
    }
  } catch (error) {
    console.error('保存笔记失败:', error);
    updatedMessages[msgIndex] = {
      ...updatedMessages[msgIndex],
      saving: false
    };
    emit('update:messages', updatedMessages);
    message.error('操作失败，请重试');
  }
};

// 构建摘要
const buildSnippet = (msg) => {
  if (msg.role === 'user') {
    return `提问: ${msg.content}`.slice(0, 100);
  }
  if (msg.role === 'system') {
    const matches = msg.data?.matches || [];
    if (matches.length > 0) {
      return `分析"${msg.data?.query}": 第${matches.map(m => m.page).join(',')}页`.slice(0, 100);
    }
    return `分析"${msg.data?.query}": 无结果`.slice(0, 100);
  }
  return msg.content?.slice(0, 100) || '';
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  });
};

// 监听消息变化，自动滚动到底部
watch(() => props.messages.length, () => {
  scrollToBottom();
});

// 暴露方法
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.chat-message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px;
  background: #f5f7fa;
}

/* 空状态 */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  text-align: center;
}

.empty-state p {
  margin: 10px 0 0;
  font-size: 15px;
  color: #444;
}

.empty-state .sub {
  font-size: 13px;
  color: #888;
}

/* 消息容器 */
.messages-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 消息项 */
.message-item {
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid #d0d0d0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.message-item.user {
  background: #e6f4ff;
  border-color: #91caff;
  margin-left: 24px;
}

.message-item.system {
  background: #fff;
  border-color: #d0d0d0;
  margin-right: 24px;
}

.message-item.ai {
  background: #f0fff4;
  border-color: #95de9c;
  margin-right: 24px;
}

/* 消息头部 */
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-role {
  font-size: 13px;
  font-weight: 700;
  color: #333;
}

.message-item.user .message-role {
  color: #0066cc;
}

.message-item.system .message-role {
  color: #2e7d32;
}

.message-time {
  font-size: 12px;
  font-weight: 500;
  color: #888;
}

/* 消息内容 */
.message-body {
  font-size: 15px;
  line-height: 1.7;
  color: #1a1a1a;
}

.user-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-weight: 500;
}

/* 搜索结果 */
.search-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  padding: 10px 12px;
  background: #f8f9fa;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: #e6f4ff;
  border-color: #1890ff;
}

.result-page {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #0066cc;
  margin-bottom: 6px;
}

.result-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.no-results {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 0;
}

/* 消息操作栏 */
.message-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}

.message-actions .n-button {
  min-width: 32px;
  min-height: 32px;
}

/* 消息动画 */
.message-enter-active {
  animation: message-in 0.3s ease-out;
}

.message-leave-active {
  animation: message-out 0.2s ease-in;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes message-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
