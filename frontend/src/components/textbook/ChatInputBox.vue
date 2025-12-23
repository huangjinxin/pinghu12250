<template>
  <div class="chat-input-box" ref="containerRef">
    <!-- 深入学习按钮 -->
    <div class="deep-learn-tab" v-if="showDeepLearn && mode !== 'ai'">
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

    <!-- 动态光线边框容器 -->
    <div class="input-glow-wrapper" :class="{ focused: isFocused, 'ai-mode': mode === 'ai' }">
      <!-- 流动光线层 -->
      <div class="glow-border"></div>
      <!-- 内容层 -->
      <div class="input-inner">
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
          :class="{ active: inputText.trim(), stop: isStreaming }"
          :disabled="!inputText.trim() && !isStreaming || (loading && !isStreaming)"
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
          <n-icon v-else size="22">
            <SearchOutline />
          </n-icon>
        </button>
      </div>
    </div>
    <div class="input-hint">
      <span v-if="mode === 'ai'">
        {{ isStreaming ? '点击停止按钮中断生成' : 'Enter 发送给 AI，Shift + Enter 换行' }}
      </span>
      <span v-else>Enter 搜索 PDF，Shift + Enter 换行</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { SendOutline, SyncOutline, SparklesOutline, SearchOutline, StopOutline } from '@vicons/ionicons5';

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

const emit = defineEmits(['submit', 'update:insertText', 'deep-learn', 'ai-chat', 'stop-stream']);

const containerRef = ref(null);
const textareaRef = ref(null);
const inputText = ref('');
const isFocused = ref(false);
const maxTextareaHeight = ref(150); // 默认最大高度

// 根据模式切换 placeholder
const currentPlaceholder = computed(() => {
  if (props.mode === 'ai') {
    return '输入问题与 AI 对话...';
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
  if (!text || props.loading) return;

  if (props.mode === 'ai') {
    emit('ai-chat', text);
  } else {
    emit('submit', text);
  }
  inputText.value = '';

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
  nextTick(() => adjustHeight());
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
});

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', updateMaxHeight);
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
</style>
