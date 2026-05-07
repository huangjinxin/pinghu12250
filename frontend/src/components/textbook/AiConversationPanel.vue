<template>
  <div class="ai-conversation-panel" ref="panelRef">
    <!-- 空状态 -->
    <div v-if="messages.length === 0 && !streaming" class="empty-state">
      <n-empty :description="emptyDescription" size="small">
        <template #icon>
          <n-icon size="32" color="#999"><SparklesOutline /></n-icon>
        </template>
      </n-empty>
    </div>

    <!-- 对话消息列表 -->
    <div
      v-else
      ref="scrollContainerRef"
      class="messages-container"
      @scroll="handleScroll"
    >
      <div class="messages-list">
        <div
          v-for="(msg, index) in messages"
          :key="msg.id || index"
          class="message-card"
          :class="[msg.role, { streaming: streaming && index === messages.length - 1 && msg.role === 'assistant' }]"
        >
          <!-- 消息头部 -->
          <div class="message-header">
            <div class="message-role">
              <n-icon :size="16">
                <PersonOutline v-if="msg.role === 'user'" />
                <SparklesOutline v-else />
              </n-icon>
              <span>{{ msg.role === 'user' ? '你' : 'AI 助手' }}</span>
            </div>
            <span class="message-time" v-if="msg.createdAt">
              {{ formatTime(msg.createdAt) }}
            </span>
          </div>

          <!-- 消息内容 -->
          <div class="message-body">
            <!-- 用户消息的图片附件 -->
            <div v-if="msg.role === 'user' && msg.image" class="message-image">
              <img :src="msg.image" alt="附件图片" @click="previewImage(msg.image)" />
            </div>

            <!-- 文本内容 -->
            <SelectableContent
              v-if="msg.content"
              :textbook-id="textbookId"
              :current-page="currentPage"
              :source-type="msg.role === 'user' ? 'user_input' : 'ai_output'"
              @save-note="(data) => handleSaveNote(msg, data)"
              @send-to-input="(text) => $emit('send-to-input', text)"
              @ask-ai="(text) => $emit('ask-ai', text)"
            >
              <!-- 用户消息：支持折叠显示 -->
              <div v-if="msg.role === 'user'" class="user-text">
                <!-- 可折叠消息 -->
                <template v-if="msg.isCollapsible">
                  <div class="collapsible-message">
                    <div class="collapsible-header" @click="toggleMessageExpand(msg.id)">
                      <span class="collapsible-title">{{ msg.content }}</span>
                      <n-icon :size="16" class="expand-icon">
                        <ChevronUpOutline v-if="isMessageExpanded(msg.id)" />
                        <ChevronDownOutline v-else />
                      </n-icon>
                    </div>
                    <transition name="collapse">
                      <div v-if="isMessageExpanded(msg.id)" class="collapsible-content">
                        <pre class="full-content">{{ msg.fullContent }}</pre>
                      </div>
                    </transition>
                  </div>
                </template>
                <!-- 普通消息 -->
                <template v-else>{{ msg.content }}</template>
              </div>
              <!-- AI 消息使用 RichContent 渲染 -->
              <RichContent
                v-else
                :content="msg.content"
                :fold-thinking="true"
                :enable-code-highlight="true"
                :enable-math="true"
              />
            </SelectableContent>

            <!-- 流式输出光标 -->
            <span v-if="streaming && index === messages.length - 1 && msg.role === 'assistant'" class="cursor-blink">|</span>
          </div>

          <!-- 消息操作栏 -->
          <div class="message-actions" v-if="!streaming || index !== messages.length - 1">
            <n-button text size="tiny" @click="copyMessage(msg)">
              <template #icon><n-icon :size="14"><CopyOutline /></n-icon></template>
              复制
            </n-button>
            <n-button text size="tiny" @click="saveMessageAsNote(msg)">
              <template #icon><n-icon :size="14"><BookmarkOutline /></n-icon></template>
              保存
            </n-button>
            <n-button text size="tiny" @click="speakMessage(msg)" :disabled="speakingId === msg.id">
              <template #icon><n-icon :size="14"><VolumeHighOutline /></n-icon></template>
              {{ speakingId === msg.id ? '朗读中' : '朗读' }}
            </n-button>
            <n-button v-if="msg.role === 'user'" text size="tiny" @click="editMessage(msg)">
              <template #icon><n-icon :size="14"><CreateOutline /></n-icon></template>
              编辑
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 流式输出状态栏 -->
    <div class="streaming-status" v-if="streaming">
      <div class="streaming-indicator">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="text">{{ aiLoadingText }}</span>
      </div>
    </div>

    <!-- 返回底部按钮 -->
    <transition name="fade">
      <button
        v-if="showScrollToBottom"
        class="scroll-to-bottom-btn"
        @click="scrollToBottom(true)"
      >
        <n-icon :size="16"><ChevronDownOutline /></n-icon>
        <span>回到底部</span>
      </button>
    </transition>

    <!-- 图片预览 -->
    <n-modal v-model:show="showImagePreview" preset="card" style="width: auto; max-width: 90vw;">
      <img :src="previewImageUrl" style="max-width: 100%; max-height: 80vh;" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline'
import { textbookNoteAPI } from '@/api/index';
import RichContent from './RichContent.vue';
import SelectableContent from './SelectableContent.vue';
import { useLoadingText } from '@/composables/useLoadingText';

const message = useMessage();

// AI 对话专用的加载提示
const aiLoadingTexts = [
  '大模型正在加载...',
  '正在截图处理...',
  '正在查阅课本...',
  '正在分析文本...',
  '正在思考如何回答...',
  '正在预热GPU芯片...',
  '正在整理思绪...',
  '正在搜索知识库...',
  'AI正在努力思考...',
  '正在理解上下文...',
  '正在组织语言...',
  '正在生成回复...',
  '正在检索相关内容...',
  '正在深度分析...',
  '神经网络运算中...',
  '正在调用算力资源...'
];

// 使用随机循环加载提示
const { loadingText: aiLoadingText, start: startLoadingText, stop: stopLoadingText } = useLoadingText(aiLoadingTexts, 2500);

const props = defineProps({
  // 对话消息列表
  messages: {
    type: Array,
    default: () => []
  },
  // 是否正在流式输出
  streaming: {
    type: Boolean,
    default: false
  },
  // 教材ID
  textbookId: {
    type: String,
    default: ''
  },
  // 当前页码
  currentPage: {
    type: Number,
    default: 1
  },
  // 会话ID
  sessionId: {
    type: String,
    default: ''
  },
  // 空状态描述
  emptyDescription: {
    type: String,
    default: '在下方输入问题与 AI 对话'
  }
});

const emit = defineEmits(['update:messages', 'save-note', 'send-to-input', 'ask-ai', 'edit-message']);

// Refs
const panelRef = ref(null);
const scrollContainerRef = ref(null);
const showScrollToBottom = ref(false);
const isUserScrolling = ref(false);
const lastScrollTop = ref(0);
const speakingId = ref(null);
const showImagePreview = ref(false);
const previewImageUrl = ref('');
const expandedMessages = ref(new Set()); // 展开的消息 ID 集合

// 切换消息展开状态
const toggleMessageExpand = (msgId) => {
  if (expandedMessages.value.has(msgId)) {
    expandedMessages.value.delete(msgId);
  } else {
    expandedMessages.value.add(msgId);
  }
  // 触发响应式更新
  expandedMessages.value = new Set(expandedMessages.value);
};

// 判断消息是否展开
const isMessageExpanded = (msgId) => {
  return expandedMessages.value.has(msgId);
};

// Speech synthesis
let speechSynthesis = null;
let currentUtterance = null;

// 判断是否在底部附近（允许50px误差）
const isNearBottom = () => {
  const container = scrollContainerRef.value;
  if (!container) return true;
  const threshold = 50;
  return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
};

// 滚动到底部
const scrollToBottom = (force = false) => {
  const container = scrollContainerRef.value;
  if (!container) return;

  if (force || !isUserScrolling.value) {
    nextTick(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: force ? 'smooth' : 'auto'
      });
      showScrollToBottom.value = false;
    });
  }
};

// 处理滚动事件
const handleScroll = () => {
  const container = scrollContainerRef.value;
  if (!container) return;

  const currentScrollTop = container.scrollTop;

  // 检测用户是否主动向上滚动
  if (currentScrollTop < lastScrollTop.value - 10) {
    isUserScrolling.value = true;
  }

  // 如果滚动到底部附近，重置用户滚动状态
  if (isNearBottom()) {
    isUserScrolling.value = false;
    showScrollToBottom.value = false;
  } else if (props.streaming) {
    // 流式输出时如果不在底部，显示返回底部按钮
    showScrollToBottom.value = true;
  }

  lastScrollTop.value = currentScrollTop;
};

// 监听消息变化，智能滚动
watch(() => props.messages, () => {
  if (props.streaming && !isUserScrolling.value) {
    scrollToBottom();
  }
}, { deep: true });

// 监听流式输出结束
watch(() => props.streaming, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // 流式输出开始
    startLoadingText();
  } else if (!newVal && oldVal) {
    // 流式输出结束
    stopLoadingText();
    if (!isUserScrolling.value) {
      scrollToBottom();
    }
    showScrollToBottom.value = false;
  }
});

// 格式化时间
const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 复制消息
const copyMessage = async (msg) => {
  try {
    await navigator.clipboard.writeText(msg.content);
    message.success('已复制到剪贴板');
  } catch (e) {
    message.error('复制失败');
  }
};

// 保存消息为笔记
const saveMessageAsNote = async (msg) => {
  if (!msg.content || !props.textbookId) return;

  try {
    await textbookNoteAPI.create({
      textbookId: props.textbookId,
      sessionId: props.sessionId,
      sourceType: msg.role === 'user' ? 'user_input' : 'ai_quote',
      query: msg.content.slice(0, 50),
      content: { text: msg.content, image: msg.image },
      snippet: msg.content.slice(0, 100),
      page: props.currentPage
    });
    message.success('已保存到笔记');
    emit('save-note', msg);
  } catch (e) {
    message.error('保存失败');
  }
};

// 处理选中文字保存笔记
const handleSaveNote = (msg, data) => {
  emit('save-note', { ...data, messageId: msg.id });
};

// 朗读消息
const speakMessage = (msg) => {
  if (!msg.content) return;

  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;

    // 停止当前朗读
    if (speakingId.value === msg.id) {
      speechSynthesis.cancel();
      speakingId.value = null;
      return;
    }

    // 停止其他朗读
    speechSynthesis.cancel();

    // 移除 Markdown 标记
    const plainText = msg.content
      .replace(/[#*`_~\[\]()]/g, '')
      .replace(/\n+/g, '。');

    currentUtterance = new SpeechSynthesisUtterance(plainText);
    currentUtterance.lang = 'zh-CN';
    currentUtterance.rate = 0.9;

    currentUtterance.onstart = () => {
      speakingId.value = msg.id;
    };

    currentUtterance.onend = () => {
      speakingId.value = null;
    };

    currentUtterance.onerror = () => {
      speakingId.value = null;
    };

    speechSynthesis.speak(currentUtterance);
  } else {
    message.warning('您的浏览器不支持语音朗读');
  }
};

// 编辑消息（用户消息）
const editMessage = (msg) => {
  emit('edit-message', msg);
};

// 预览图片
const previewImage = (url) => {
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

// 暴露滚动方法
defineExpose({
  scrollToBottom
});

// 清理
onUnmounted(() => {
  if (speechSynthesis && speakingId.value) {
    speechSynthesis.cancel();
  }
});
</script>

<style scoped>
.ai-conversation-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8f9fa;
  position: relative;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.messages-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 消息卡片 */
.message-card {
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.message-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 用户消息样式 */
.message-card.user {
  background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
  border-left: 3px solid #667eea;
}

/* AI 消息样式 */
.message-card.assistant {
  background: white;
  border-left: 3px solid #18a058;
}

/* 流式输出中的消息 */
.message-card.streaming {
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
}

/* 消息头部 */
.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.message-role {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.message-card.user .message-role {
  color: #667eea;
}

.message-card.assistant .message-role {
  color: #18a058;
}

.message-time {
  font-size: 11px;
  color: #999;
}

/* 消息内容 */
.message-body {
  font-size: 14px;
  line-height: 1.7;
  color: #333;
}

.user-text {
  white-space: pre-wrap;
  word-break: break-word;
}

/* 可折叠消息样式 */
.collapsible-message {
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.collapsible-header:hover {
  background: #f0f0f0;
}

.collapsible-title {
  font-weight: 500;
  color: #333;
}

.expand-icon {
  color: #666;
  flex-shrink: 0;
  margin-left: 8px;
}

.collapsible-content {
  padding: 0 14px 14px;
  border-top: 1px solid #e8e8e8;
  background: #fff;
}

.full-content {
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 400px;
}

/* 用户消息中的图片 */
.message-image {
  margin-bottom: 8px;
}

.message-image img {
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image img:hover {
  transform: scale(1.02);
}

/* 消息操作栏 */
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-card:hover .message-actions {
  opacity: 1;
}

.message-actions .n-button {
  font-size: 12px;
  color: #666;
}

.message-actions .n-button:hover {
  color: #667eea;
}

/* 流式输出状态栏 */
.streaming-status {
  padding: 8px 16px;
  background: linear-gradient(90deg, #f0f7ff 0%, #e8f4f8 100%);
  border-top: 1px solid #d4e8f0;
  flex-shrink: 0;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.streaming-indicator .dot {
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
  animation: dotBounce 1.4s infinite ease-in-out both;
}

.streaming-indicator .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.streaming-indicator .dot:nth-child(2) {
  animation-delay: -0.16s;
}

.streaming-indicator .dot:nth-child(3) {
  animation-delay: 0s;
}

.streaming-indicator .text {
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
  margin-left: 4px;
}

@keyframes dotBounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 光标闪烁 */
.cursor-blink {
  display: inline-block;
  color: #667eea;
  font-weight: bold;
  animation: cursorBlink 1s infinite;
}

@keyframes cursorBlink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 返回底部按钮 */
.scroll-to-bottom-btn {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  font-size: 13px;
  color: #666;
  z-index: 10;
  transition: all 0.2s;
}

.scroll-to-bottom-btn:hover {
  background: #f5f5f5;
  color: #333;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* RichContent 样式调整 */
.message-body :deep(h1),
.message-body :deep(h2),
.message-body :deep(h3) {
  margin: 12px 0 8px;
  font-weight: 600;
}

.message-body :deep(h1) { font-size: 17px; }
.message-body :deep(h2) { font-size: 15px; }
.message-body :deep(h3) { font-size: 14px; }

.message-body :deep(p) {
  margin: 6px 0;
}

.message-body :deep(ul),
.message-body :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}

.message-body :deep(li) {
  margin: 3px 0;
}

.message-body :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 13px;
}

.message-body :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #b0b0b0;
}
</style>
