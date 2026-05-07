<template>
  <div class="solving-panel">
    <!-- 初始状态：等待开始解题 -->
    <div v-if="state === 'idle'" class="solving-idle">
      <div class="idle-content">
        <div class="idle-icon">
          <n-icon :size="56" color="#1890ff"><HelpCircleOutline /></n-icon>
        </div>
        <h3 class="idle-title">AI 解题助手</h3>
        <p class="idle-desc">截取题目图片，让 AI 帮你一步步解答</p>
        <n-button type="primary" size="large" @click="startSolving">
          <template #icon><n-icon><CameraOutline /></n-icon></template>
          开始解题
        </n-button>
        <!-- 如果有未完成的解题，显示恢复按钮 -->
        <div v-if="hasSavedSession" class="restore-hint">
          <n-button text type="info" @click="restoreSavedSession">
            <template #icon><n-icon><TimeOutline /></n-icon></template>
            继续上次解题
          </n-button>
        </div>
      </div>
    </div>

    <!-- 截图选择状态 -->
    <div v-else-if="state === 'selecting'" class="solving-selecting">
      <div class="selecting-header">
        <span class="selecting-title">请在左侧选取题目区域</span>
        <n-button text size="small" @click="cancelSelecting">
          <template #icon><n-icon><CloseOutline /></n-icon></template>
          取消
        </n-button>
      </div>
      <div class="selecting-tips">
        <p>1. 点击「截取整页」获取当前页截图</p>
        <p>2. 或使用「框选区域」选取题目部分</p>
      </div>
      <div class="selecting-actions">
        <n-button type="primary" @click="captureFullPage">
          <template #icon><n-icon><DocumentOutline /></n-icon></template>
          截取整页
        </n-button>
        <n-button @click="startRegionSelect">
          <template #icon><n-icon><ScanOutline /></n-icon></template>
          框选区域
        </n-button>
      </div>
    </div>

    <!-- AI 解题中 -->
    <div v-else-if="state === 'solving'" class="solving-content">
      <div class="solving-header">
        <span class="solving-title">AI 解题</span>
        <n-space>
          <n-button text size="small" @click="addNewQuestion">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            继续提问
          </n-button>
          <n-button text size="small" @click="restartSolving">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            新题目
          </n-button>
        </n-space>
      </div>

      <!-- 对话区域 -->
      <div class="solving-messages" ref="messagesRef">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <!-- 用户消息（可能包含图片） -->
          <template v-if="msg.role === 'user'">
            <div class="message-content user-message">
              <img v-if="msg.image" :src="msg.image" class="question-image" @click="previewImage(msg.image)" />
              <div v-if="msg.text" class="message-text">{{ msg.text }}</div>
            </div>
          </template>

          <!-- AI 回复 -->
          <template v-else>
            <div class="message-content ai-message">
              <div class="ai-avatar">
                <n-icon size="20" color="#1890ff"><SparklesOutline /></n-icon>
              </div>
              <div class="ai-content">
                <div class="ai-text" v-html="formatAiContent(msg.content)"></div>
                <div v-if="msg.loading" class="ai-loading">
                  <n-spin size="small" />
                  <span class="loading-text">{{ loadingText }}</span>
                </div>
                <!-- 操作按钮 -->
                <div v-if="!msg.loading && msg.content" class="ai-actions">
                  <n-button text size="tiny" @click="copyContent(msg.content)">
                    <template #icon><n-icon><CopyOutline /></n-icon></template>
                    复制
                  </n-button>
                  <n-button text size="tiny" :disabled="msg.saved" @click="saveToNote(msg)">
                    <template #icon><n-icon><BookmarkOutline /></n-icon></template>
                    {{ msg.saved ? '已保存' : '存笔记' }}
                  </n-button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 补充输入区 -->
      <div class="solving-input">
        <n-input
          v-model:value="inputText"
          type="textarea"
          placeholder="补充说明（如：我卡在第二步了）"
          :autosize="{ minRows: 1, maxRows: 3 }"
          :disabled="isStreaming"
          @keydown.enter.ctrl="handleSendMessage"
        />
        <n-button
          type="primary"
          :loading="isStreaming"
          :disabled="!inputText.trim() && !pendingImage"
          @click="handleSendMessage"
        >
          <template #icon><n-icon><SendOutline /></n-icon></template>
        </n-button>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <n-modal v-model:show="showImagePreview" preset="card" style="width: 90vw; max-width: 800px;">
      <img :src="previewImageUrl" style="width: 100%; height: auto;" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useMessage } from 'naive-ui';
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline'
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import TimeOutline from '@vicons/ionicons5/es/TimeOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import DocumentOutline from '@vicons/ionicons5/es/DocumentOutline'
import ScanOutline from '@vicons/ionicons5/es/ScanOutline'
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import SendOutline from '@vicons/ionicons5/es/SendOutline'
import { aiStreamChat, textbookNoteAPI } from '@/api/index';
import { useLoadingText } from '@/composables/useLoadingText';

const message = useMessage();

// 解题专用加载提示
const solvingLoadingTexts = [
  '正在分析题目...',
  'AI 正在思考解法...',
  '正在推导解题步骤...',
  '正在整理答案...',
  '让我仔细看看这道题...',
  '正在检查解题过程...'
];

const { loadingText, start: startLoadingText, stop: stopLoadingText } = useLoadingText(solvingLoadingTexts, 2000);

const props = defineProps({
  pdfDoc: Object,
  totalPages: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  textbookId: { type: String, default: '' },
  subject: { type: String, default: '' },
  getScreenshot: { type: Function, default: null },
  getRegionScreenshot: { type: Function, default: null }
});

const emit = defineEmits(['save-note', 'start-region-select', 'image-received']);

// ===== 存储键名 =====
const STORAGE_KEY_SESSION = 'solving_session';

// ===== 状态 =====
const state = ref('idle'); // idle | selecting | solving
const messages = ref([]);
const messagesRef = ref(null);
const inputText = ref('');
const pendingImage = ref(null); // 待发送的图片
const isStreaming = ref(false);
const sessionId = ref(`solving_${Date.now()}`);

// 图片预览
const showImagePreview = ref(false);
const previewImageUrl = ref('');

// 流式控制器
let streamController = null;

// ===== 本地存储 =====
const getStorageKey = () => `${STORAGE_KEY_SESSION}_${props.textbookId}`;

const hasSavedSession = computed(() => {
  try {
    const data = localStorage.getItem(getStorageKey());
    const saved = data ? JSON.parse(data) : null;
    return saved && saved.messages?.length > 0;
  } catch {
    return false;
  }
});

const saveSession = () => {
  if (messages.value.length === 0) return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify({
      sessionId: sessionId.value,
      messages: messages.value.filter(m => !m.loading),
      state: state.value
    }));
  } catch (e) {
    console.warn('保存解题会话失败:', e);
  }
};

const restoreSavedSession = () => {
  try {
    const data = localStorage.getItem(getStorageKey());
    const saved = data ? JSON.parse(data) : null;
    if (saved && saved.messages?.length > 0) {
      sessionId.value = saved.sessionId || `solving_${Date.now()}`;
      messages.value = saved.messages;
      state.value = 'solving';
      message.success('已恢复上次解题');
    }
  } catch (e) {
    console.warn('恢复解题会话失败:', e);
  }
};

const clearSession = () => {
  try {
    localStorage.removeItem(getStorageKey());
  } catch {}
};

// ===== 操作方法 =====
const startSolving = () => {
  state.value = 'selecting';
};

const cancelSelecting = () => {
  state.value = 'idle';
};

const restartSolving = () => {
  messages.value = [];
  pendingImage.value = null;
  inputText.value = '';
  clearSession();
  state.value = 'selecting';
};

// 截取整页
const captureFullPage = () => {
  if (!props.getScreenshot) {
    message.warning('截图功能不可用');
    return;
  }

  const screenshot = props.getScreenshot();
  if (screenshot) {
    receiveImage(screenshot);
  } else {
    message.error('截图失败');
  }
};

// 开始框选
const startRegionSelect = () => {
  emit('start-region-select');
};

// 接收图片（从外部传入）
const receiveImage = (imageBase64) => {
  pendingImage.value = imageBase64;
  state.value = 'solving';

  // 自动发送解题请求
  sendSolvingRequest(imageBase64, '请帮我解答这道题，一步步详细说明解题过程。');
};

// 添加新问题（追问）
const addNewQuestion = () => {
  emit('start-region-select');
};

// 发送解题请求
const sendSolvingRequest = async (image, text) => {
  if (isStreaming.value) return;

  // 添加用户消息
  messages.value.push({
    role: 'user',
    image: image,
    text: text
  });

  // 添加 AI 占位消息
  const aiMsgIndex = messages.value.length;
  messages.value.push({
    role: 'assistant',
    content: '',
    loading: true,
    saved: false
  });

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  // 开始流式输出
  isStreaming.value = true;
  startLoadingText();

  try {
    const systemPrompt = buildSolvingPrompt();

    streamController = aiStreamChat.create(
      {
        textbookId: props.textbookId,
        sessionId: sessionId.value,
        message: systemPrompt + '\n\n' + text,
        context: '',
        subject: props.subject,
        image: image
      },
      {
        onStart: () => {
          messages.value[aiMsgIndex].loading = false;
        },
        onChunk: (chunk) => {
          messages.value[aiMsgIndex].content += chunk;
          scrollToBottom();
        },
        onDone: () => {
          isStreaming.value = false;
          stopLoadingText();
          streamController = null;
          saveSession();
        },
        onError: (err) => {
          isStreaming.value = false;
          stopLoadingText();
          messages.value[aiMsgIndex].loading = false;
          messages.value[aiMsgIndex].content = `解题失败: ${err}`;
          streamController = null;
        },
        onAborted: () => {
          isStreaming.value = false;
          stopLoadingText();
          messages.value[aiMsgIndex].loading = false;
          streamController = null;
          message.info('已停止');
        }
      }
    );
  } catch (error) {
    isStreaming.value = false;
    stopLoadingText();
    messages.value[aiMsgIndex].loading = false;
    messages.value[aiMsgIndex].content = `解题失败: ${error.message}`;
  }
};

// 构建解题提示词
const buildSolvingPrompt = () => {
  const subjectMap = {
    CHINESE: '语文',
    MATH: '数学',
    ENGLISH: '英语',
    SCIENCE: '科学',
    PHYSICS: '物理',
    CHEMISTRY: '化学'
  };
  const subjectName = subjectMap[props.subject] || '学习';

  return `你是一位耐心细致的${subjectName}老师，正在帮助小学生解答题目。

请根据图片中的题目内容：
1. 先理解题目要求
2. 分步骤详细讲解解题思路
3. 写出完整的解答过程
4. 给出最终答案
5. 如果有多种解法，可以补充说明

注意：
- 用简单易懂的语言
- 解题步骤要清晰
- 不要跳过中间过程
- 适合小学生理解`;
};

// 发送补充消息
const handleSendMessage = () => {
  if (!inputText.value.trim() || isStreaming.value) return;

  const text = inputText.value.trim();
  inputText.value = '';

  // 如果有待发送的图片，一起发送
  if (pendingImage.value) {
    sendSolvingRequest(pendingImage.value, text);
    pendingImage.value = null;
  } else {
    // 仅发送文字追问
    sendSolvingRequest(null, text);
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
};

// 格式化 AI 内容（简单的 Markdown 转换）
const formatAiContent = (content) => {
  if (!content) return '';
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
};

// 复制内容
const copyContent = async (content) => {
  try {
    await navigator.clipboard.writeText(content);
    message.success('已复制');
  } catch {
    message.error('复制失败');
  }
};

// 保存到笔记
const saveToNote = async (msg) => {
  if (!props.textbookId || msg.saved) return;

  try {
    await textbookNoteAPI.create({
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      sourceType: 'solving',
      query: '解题记录',
      content: { answer: msg.content },
      snippet: msg.content.slice(0, 100),
      page: props.currentPage
    });

    msg.saved = true;
    saveSession();
    message.success('已保存到笔记');
    emit('save-note');
  } catch {
    message.error('保存失败');
  }
};

// 预览图片
const previewImage = (url) => {
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

// 暴露方法给父组件
defineExpose({
  receiveImage,
  getState: () => state.value
});

// 清理
onUnmounted(() => {
  if (streamController) {
    streamController.abort();
  }
  stopLoadingText();
});
</script>

<style scoped>
.solving-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* 初始状态 */
.solving-idle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.idle-content {
  text-align: center;
  padding: 40px 20px;
}

.idle-icon {
  margin-bottom: 20px;
}

.idle-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.idle-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 24px;
}

.restore-hint {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

/* 截图选择状态 */
.solving-selecting {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.selecting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.selecting-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.selecting-tips {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.selecting-tips p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #666;
}

.selecting-tips p:last-child {
  margin-bottom: 0;
}

.selecting-actions {
  display: flex;
  gap: 12px;
}

/* 解题内容区 */
.solving-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.solving-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.solving-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

/* 消息区域 */
.solving-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message-item {
  margin-bottom: 16px;
}

.message-item.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-message {
  max-width: 85%;
}

.question-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e8e8e8;
}

.message-text {
  margin-top: 8px;
  padding: 10px 14px;
  background: #1890ff;
  color: #fff;
  border-radius: 12px;
  font-size: 14px;
}

/* AI 消息 */
.ai-message {
  display: flex;
  gap: 12px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e6f7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-content {
  flex: 1;
  min-width: 0;
}

.ai-text {
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: #333;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.ai-text :deep(strong) {
  color: #1890ff;
}

.ai-text :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
}

.loading-text {
  font-size: 13px;
  color: #999;
}

.ai-actions {
  margin-top: 8px;
  display: flex;
  gap: 12px;
}

/* 输入区 */
.solving-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
}

.solving-input :deep(.n-input) {
  flex: 1;
}

/* 滚动条 */
.solving-messages::-webkit-scrollbar {
  width: 6px;
}

.solving-messages::-webkit-scrollbar-track {
  background: transparent;
}

.solving-messages::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}
</style>
