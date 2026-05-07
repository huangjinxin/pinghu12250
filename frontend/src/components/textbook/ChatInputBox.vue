<template>
  <div class="chat-input-box" ref="containerRef">
    <!-- 深入学习按钮（仅在解析/AI模式显示） -->
    <div class="deep-learn-tab" v-if="showDeepLearn && mode === 'ai'">
      <button
        class="deep-learn-tab-btn"
        :class="{ loading: deepLearnLoading }"
        :disabled="deepLearnLoading"
        @click="$emit('deep-learn')"
      >
        <n-icon v-if="deepLearnLoading" size="14" class="spinning">
          <SyncOutline />
        </n-icon>
        <n-icon v-else size="14">
          <SparklesOutline />
        </n-icon>
        <span>{{ deepLearnLoading ? 'AI 分析中...' : '深入学习本页' }}</span>
      </button>
    </div>

    <!-- 附件预览 -->
    <div v-if="attachedImage" class="attachment-preview">
      <div class="preview-item">
        <img :src="attachedImage.preview" alt="附件预览" />
        <button class="remove-btn" @click="removeAttachment">
          <n-icon size="14"><CloseCircleOutline /></n-icon>
        </button>
      </div>
    </div>

    <!-- 动态光线边框容器 -->
    <div class="input-glow-wrapper" :class="{ focused: isFocused, 'ai-mode': mode === 'ai' }">
      <!-- 流动光线层 -->
      <div class="glow-border"></div>
      <!-- 内容层 -->
      <div class="input-inner">
        <!-- 附件按钮（仅 AI 模式显示） -->
        <div class="attach-wrapper" v-if="mode === 'ai'">
          <button class="attach-btn" @click="handleSelectImage" title="添加图片 (也可 Ctrl/Cmd+V 粘贴)">
            <n-icon size="20"><ImageOutline /></n-icon>
          </button>
        </div>

        <textarea
          ref="textareaRef"
          v-model="inputText"
          :placeholder="currentPlaceholder"
          :rows="1"
          :style="{ maxHeight: maxTextareaHeight + 'px' }"
          @input="adjustHeight"
          @keydown="handleKeydown"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <button
          class="send-btn"
          :class="{ active: inputText.trim() || attachedImage, stop: isStreaming }"
          :disabled="(!inputText.trim() && !attachedImage && !isStreaming) || (loading && !isStreaming)"
          @click="handleButtonClick"
        >
          <n-icon v-if="loading && !isStreaming" size="22">
            <SyncOutline class="spinning" />
          </n-icon>
          <n-icon v-else-if="isStreaming" size="22">
            <StopOutline />
          </n-icon>
          <n-icon v-else-if="mode === 'ai'" size="22">
            <SparklesOutline />
          </n-icon>
          <n-icon v-else-if="mode === 'notes'" size="22">
            <BookmarkOutline />
          </n-icon>
          <n-icon v-else size="22">
            <SearchOutline />
          </n-icon>
        </button>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none;"
      @change="handleFileChange"
    />

    <div class="input-hint">
      <span v-if="mode === 'ai'">
        {{ isStreaming ? '点击停止按钮中断生成' : 'Enter 发送给 AI，Shift + Enter 换行' }}
      </span>
      <span v-else-if="mode === 'notes'">Enter 保存笔记，Shift + Enter 换行</span>
      <span v-else>Enter 搜索 PDF，Shift + Enter 换行</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import SendOutline from '@vicons/ionicons5/es/SendOutline'
import SyncOutline from '@vicons/ionicons5/es/SyncOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import StopOutline from '@vicons/ionicons5/es/StopOutline'
import ImageOutline from '@vicons/ionicons5/es/ImageOutline'
import CloseCircleOutline from '@vicons/ionicons5/es/CloseCircleOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'

const props = defineProps({
  placeholder: {
    type: String,
    default: '输入问题进行分析...'
  },
  loading: {
    type: Boolean,
    default: false
  },
  // 外部插入的文本（用于引用功能）
  insertText: {
    type: String,
    default: ''
  },
  // 参考面板高度（用于计算最大高度）
  referencePanelHeight: {
    type: Number,
    default: 300
  },
  // 是否显示深入学习按钮
  showDeepLearn: {
    type: Boolean,
    default: false
  },
  // 深入学习加载状态
  deepLearnLoading: {
    type: Boolean,
    default: false
  },
  // 输入模式：'search' 搜索 PDF | 'ai' AI 对话
  mode: {
    type: String,
    default: 'search'
  },
  // 是否正在流式输出
  isStreaming: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'update:insertText', 'deep-learn', 'ai-chat', 'stop-stream', 'attach-image', 'save-note']);

const message = useMessage();
const containerRef = ref(null);
const textareaRef = ref(null);
const fileInputRef = ref(null);
const inputText = ref('');
const isFocused = ref(false);
const maxTextareaHeight = ref(150); // 默认最大高度
const attachedImage = ref(null); // 附加的图片 { file, preview }

// 根据模式切换 placeholder
const currentPlaceholder = computed(() => {
  if (props.mode === 'ai') {
    return '输入问题与 AI 对话...';
  }
  if (props.mode === 'notes') {
    return '记录学习笔记...';
  }
  return props.placeholder || '搜索 PDF 内容...';
});

// 计算最大高度（参考面板高度的50%）
const updateMaxHeight = () => {
  // 获取父容器（assist-panel）的高度
  const assistPanel = containerRef.value?.closest('.panel-content');
  if (assistPanel) {
    const panelHeight = assistPanel.clientHeight;
    // 最大高度为面板高度的50%，但不低于120px，不超过400px
    maxTextareaHeight.value = Math.min(400, Math.max(120, panelHeight * 0.5));
  }
};

// 自动调整高度
const adjustHeight = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;

  // 重置高度以获取正确的scrollHeight
  textarea.style.height = 'auto';

  // 使用动态最大高度
  const newHeight = Math.min(textarea.scrollHeight, maxTextareaHeight.value);

  textarea.style.height = `${newHeight}px`;
};

// 键盘事件处理
const handleKeydown = (e) => {
  // Enter 提交（非 Shift）
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

// 按钮点击处理
const handleButtonClick = () => {
  if (props.isStreaming) {
    emit('stop-stream');
  } else {
    handleSubmit();
  }
};

// 提交
const handleSubmit = () => {
  const text = inputText.value.trim();

  // AI 模式：允许仅发送图片（无文字）
  if (props.mode === 'ai') {
    if (!text && !attachedImage.value) return;
    if (props.loading) return;

    // 发送文本和图片（如有）
    emit('ai-chat', text || '请分析这张图片', attachedImage.value);
    inputText.value = '';

    // 清理附件
    if (attachedImage.value?.preview) {
      URL.revokeObjectURL(attachedImage.value.preview);
    }
    attachedImage.value = null;
  } else if (props.mode === 'notes') {
    // 笔记模式：直接保存到笔记
    if (!text) return;
    if (props.loading) return;

    emit('save-note', text);
    inputText.value = '';
    // 成功消息由父组件 AssistMode 显示（包含页码信息）
  } else {
    // 搜索模式：必须有文字
    if (!text || props.loading) return;
    emit('submit', text);
    inputText.value = '';
  }

  nextTick(() => {
    adjustHeight();
  });
};

// 插入文本（用于引用功能）
const insertTextAtCursor = (text) => {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = inputText.value.substring(0, start);
  const after = inputText.value.substring(end);

  // 如果输入框已有内容，添加换行
  const separator = inputText.value.trim() ? '\n\n' : '';

  inputText.value = before + separator + text + after;

  nextTick(() => {
    adjustHeight();
    // 聚焦并移动光标到末尾
    textarea.focus();
    const newPos = before.length + separator.length + text.length;
    textarea.setSelectionRange(newPos, newPos);
  });
};

// 聚焦输入框
const focus = () => {
  textareaRef.value?.focus();
};

// 清空输入框
const clear = () => {
  inputText.value = '';
  attachedImage.value = null;
  nextTick(() => adjustHeight());
};

// ===== 附件功能 =====
// 选择图片
const handleSelectImage = () => {
  fileInputRef.value?.click();
};

// 处理文件选择
const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件');
    return;
  }

  // 检查文件大小（最大 10MB）
  if (file.size > 10 * 1024 * 1024) {
    message.error('图片大小不能超过 10MB');
    return;
  }

  const preview = URL.createObjectURL(file);
  attachedImage.value = { file, preview };
  message.success('图片已添加');
  emit('attach-image', { file, preview });

  // 清空 input 以便重复选择同一文件
  e.target.value = '';
};

// 移除附件
const removeAttachment = () => {
  if (attachedImage.value?.preview) {
    URL.revokeObjectURL(attachedImage.value.preview);
  }
  attachedImage.value = null;
};

// 处理粘贴事件（支持 Ctrl/Cmd+V 粘贴图片）
const handlePaste = async (e) => {
  // 仅在 AI 模式下处理图片粘贴
  if (props.mode !== 'ai') return;

  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();

      const file = item.getAsFile();
      if (!file) continue;

      // 检查文件大小（最大 10MB）
      if (file.size > 10 * 1024 * 1024) {
        message.error('图片大小不能超过 10MB');
        return;
      }

      const preview = URL.createObjectURL(file);
      attachedImage.value = { file, preview };
      message.success('已粘贴图片');
      emit('attach-image', { file, preview });
      return;
    }
  }
};

// 监听外部插入文本
watch(() => props.insertText, (newText) => {
  if (newText) {
    insertTextAtCursor(newText);
    emit('update:insertText', '');
  }
});

// 初始化高度
onMounted(() => {
  updateMaxHeight();
  adjustHeight();
  // 监听窗口大小变化
  window.addEventListener('resize', updateMaxHeight);
  // 监听粘贴事件
  document.addEventListener('paste', handlePaste);
});

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', updateMaxHeight);
  document.removeEventListener('paste', handlePaste);
  // 清理图片预览 URL
  if (attachedImage.value?.preview) {
    URL.revokeObjectURL(attachedImage.value.preview);
  }
});

// 暴露方法
defineExpose({
  insertTextAtCursor,
  focus,
  clear
});
</script>

<style scoped>
.chat-input-box {
  background: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 14px 16px;
  flex-shrink: 0;
}

/* 深入学习按钮区域 */
.deep-learn-tab {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.deep-learn-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.deep-learn-tab-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.deep-learn-tab-btn:active:not(:disabled) {
  transform: translateY(0);
}

.deep-learn-tab-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.deep-learn-tab-btn.loading {
  background: linear-gradient(135deg, #8b9dc3, #9b7bb8);
}

/* 动态光线边框容器 */
.input-glow-wrapper {
  position: relative;
  border-radius: 14px;
  padding: 3px;
  background: linear-gradient(135deg, #e0e0e0, #d0d0d0);
  transition: all 0.3s ease;
}

/* 流动光线边框 */
.glow-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    #667eea,
    #764ba2,
    #f093fb,
    #f5576c,
    #ffd93d,
    #6dd5ed,
    #667eea
  );
  background-size: 400% 100%;
  animation: glowFlow 24s linear infinite;
  opacity: 0.6;
  z-index: 0;
  transition: opacity 0.3s ease;
}

/* 聚焦时光线更亮 */
.input-glow-wrapper.focused .glow-border {
  opacity: 1;
  animation: glowFlow 12s linear infinite;
}

/* 光线流动动画 */
@keyframes glowFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 400% 50%;
  }
}

/* 内容层 */
.input-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #fff;
  border-radius: 11px;
  padding: 8px 14px;
}

.input-inner textarea {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-size: 28px;
  line-height: 36px;
  padding: 0;
  min-height: 36px;
  overflow-y: auto;
  outline: none;
  font-family: inherit;
  color: #1a1a1a;
}

.input-inner textarea::placeholder {
  color: #999;
  font-size: 28px;
}

/* 自定义滚动条 */
.input-inner textarea::-webkit-scrollbar {
  width: 6px;
}

.input-inner textarea::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.input-inner textarea::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 3px;
}

.input-inner textarea::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.send-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  opacity: 0.5;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.send-btn.active {
  opacity: 1;
  transform: scale(1);
}

.send-btn.active:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.send-btn.stop {
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  opacity: 1;
}

.send-btn.stop:hover {
  background: linear-gradient(135deg, #ff5252, #e53935);
}

/* AI 模式下的发光效果 */
.input-glow-wrapper.ai-mode .glow-border {
  background: linear-gradient(
    90deg,
    #667eea,
    #764ba2,
    #667eea
  );
  animation: glowFlow 8s linear infinite;
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #888;
  text-align: right;
}

/* 旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 聚焦时外发光效果 */
.input-glow-wrapper.focused {
  box-shadow:
    0 0 20px rgba(102, 126, 234, 0.3),
    0 0 40px rgba(118, 75, 162, 0.2);
}

/* ===== 附件功能样式 ===== */
/* 附件预览 */
.attachment-preview {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e0e0e0;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-item .remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.preview-item .remove-btn:hover {
  background: rgba(255, 77, 79, 0.9);
}

/* 附件按钮容器 */
.attach-wrapper {
  position: relative;
  flex-shrink: 0;
}

.attach-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #f0f0f0;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.attach-btn:hover {
  background: #e0e0e0;
  color: #333;
}

/* 触摸设备优化 */
@media (pointer: coarse) {
  .attach-btn {
    width: 42px;
    height: 42px;
  }

  .preview-item {
    width: 90px;
    height: 90px;
  }

  .preview-item .remove-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
