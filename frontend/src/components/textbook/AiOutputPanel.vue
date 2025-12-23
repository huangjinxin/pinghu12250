<template>
  <div class="ai-output-panel">
    <!-- 空状态 -->
    <div v-if="!content && !loading && !streaming" class="empty-state">
      <n-empty :description="emptyDescription" size="small">
        <template #icon>
          <n-icon size="32" color="#999"><SparklesOutline /></n-icon>
        </template>
      </n-empty>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading && !streaming" class="loading-state">
      <n-spin size="medium" />
      <p class="loading-text">{{ loadingText }}</p>
    </div>

    <!-- AI 输出内容（包括流式输出） -->
    <div v-else class="output-content">
      <!-- 操作按钮栏 -->
      <div class="output-actions" v-if="!streaming">
        <n-space size="small">
          <n-button size="tiny" @click="quoteToChat">
            <template #icon>
              <n-icon><ChatboxOutline /></n-icon>
            </template>
            引用到聊天
          </n-button>
          <n-button size="tiny" @click="saveAsNote" :loading="savingNote">
            <template #icon>
              <n-icon><BookmarkOutline /></n-icon>
            </template>
            保存笔记
          </n-button>
          <n-button size="tiny" @click="speakContent" :disabled="isSpeaking">
            <template #icon>
              <n-icon><VolumeHighOutline /></n-icon>
            </template>
            {{ isSpeaking ? '朗读中...' : '朗读' }}
          </n-button>
          <n-button size="tiny" @click="regenerate" :loading="loading">
            <template #icon>
              <n-icon><RefreshOutline /></n-icon>
            </template>
            重新生成
          </n-button>
        </n-space>
      </div>

      <!-- 流式输出时的状态栏 -->
      <div class="streaming-status" v-if="streaming">
        <div class="streaming-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="text">AI 正在回答...</span>
        </div>
      </div>

      <!-- 分析信息 -->
      <div class="output-meta" v-if="analysisInfo && !streaming">
        <span class="meta-item">页码: {{ analysisInfo.pages }}</span>
        <span class="meta-item">耗时: {{ analysisInfo.responseTime }}ms</span>
        <span class="meta-item" v-if="analysisInfo.tokensUsed">Token: {{ analysisInfo.tokensUsed }}</span>
      </div>

      <!-- 渲染内容 -->
      <div class="output-body" ref="outputBodyRef">
        <div v-html="renderedContent"></div>
        <span v-if="streaming" class="cursor-blink">|</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import {
  SparklesOutline,
  ChatboxOutline,
  BookmarkOutline,
  VolumeHighOutline,
  RefreshOutline
} from '@vicons/ionicons5';
import { textbookNoteAPI } from '@/api/index';

const message = useMessage();

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: 'AI 正在分析中...'
  },
  analysisInfo: {
    type: Object,
    default: null
  },
  textbookId: {
    type: String,
    default: ''
  },
  currentPage: {
    type: Number,
    default: 1
  },
  // 是否正在流式输出
  streaming: {
    type: Boolean,
    default: false
  },
  // 空状态描述
  emptyDescription: {
    type: String,
    default: '在 AI 输出 Tab 下发送消息与 AI 对话'
  }
});

const emit = defineEmits(['quote-to-chat', 'save-note', 'regenerate']);

const outputBodyRef = ref(null);

// 流式输出时自动滚动到底部
watch(() => props.content, () => {
  if (props.streaming && outputBodyRef.value) {
    nextTick(() => {
      outputBodyRef.value.scrollTop = outputBodyRef.value.scrollHeight;
    });
  }
});

const savingNote = ref(false);
const isSpeaking = ref(false);
let speechSynthesis = null;
let currentUtterance = null;

// 简单的 Markdown 渲染
const renderedContent = computed(() => {
  if (!props.content) return '';

  let html = props.content
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 换行
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // 包装列表
  html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');

  return `<p>${html}</p>`;
});

// 引用到聊天
const quoteToChat = () => {
  if (!props.content) return;
  emit('quote-to-chat', props.content);
  message.success('已添加到聊天');
};

// 保存为笔记
const saveAsNote = async () => {
  if (!props.content || !props.textbookId) return;

  savingNote.value = true;
  try {
    await textbookNoteAPI.create({
      textbookId: props.textbookId,
      page: props.currentPage,
      type: 'ai_analysis',
      content: props.content
    });
    message.success('已保存为笔记');
    emit('save-note');
  } catch (error) {
    message.error('保存失败');
  } finally {
    savingNote.value = false;
  }
};

// 朗读内容
const speakContent = () => {
  if (!props.content) return;

  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;

    // 停止当前朗读
    if (isSpeaking.value) {
      speechSynthesis.cancel();
      isSpeaking.value = false;
      return;
    }

    // 移除 Markdown 标记
    const plainText = props.content
      .replace(/[#*`_~\[\]()]/g, '')
      .replace(/\n+/g, '。');

    currentUtterance = new SpeechSynthesisUtterance(plainText);
    currentUtterance.lang = 'zh-CN';
    currentUtterance.rate = 0.9;

    currentUtterance.onstart = () => {
      isSpeaking.value = true;
    };

    currentUtterance.onend = () => {
      isSpeaking.value = false;
    };

    currentUtterance.onerror = () => {
      isSpeaking.value = false;
    };

    speechSynthesis.speak(currentUtterance);
  } else {
    message.warning('您的浏览器不支持语音朗读');
  }
};

// 重新生成
const regenerate = () => {
  emit('regenerate');
};

// 清理
onUnmounted(() => {
  if (speechSynthesis && isSpeaking.value) {
    speechSynthesis.cancel();
  }
});
</script>

<style scoped>
.ai-output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.output-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.output-actions {
  padding: 8px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: white;
}

.output-meta {
  padding: 6px 12px;
  background: #f5f5f5;
  font-size: 12px;
  color: #888;
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.output-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

.output-body :deep(h1),
.output-body :deep(h2),
.output-body :deep(h3) {
  margin: 16px 0 8px;
  font-weight: 600;
}

.output-body :deep(h1) { font-size: 18px; }
.output-body :deep(h2) { font-size: 16px; }
.output-body :deep(h3) { font-size: 15px; }

.output-body :deep(p) {
  margin: 8px 0;
}

.output-body :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.output-body :deep(li) {
  margin: 4px 0;
}

.output-body :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 13px;
}

.output-body :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.output-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.output-body :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

/* 流式输出状态栏 */
.streaming-status {
  padding: 8px 12px;
  background: linear-gradient(90deg, #f0f7ff 0%, #e8f4f8 100%);
  border-bottom: 1px solid #d4e8f0;
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
</style>
