<template>
  <!-- 即时参考条 - 仅在单字典查询成功时显示 -->
  <div
    v-if="shouldShow"
    class="reference-bar"
  >
    <!-- 汉字 -->
    <span class="ref-char">{{ displayData.character }}</span>

    <!-- 分隔符 -->
    <span class="ref-divider">|</span>

    <!-- 拼音 -->
    <span class="ref-pinyin" v-if="displayData.pinyin">{{ displayData.pinyin }}</span>

    <!-- 分隔符 -->
    <span class="ref-divider" v-if="displayData.pinyin">|</span>

    <!-- 简要释义 -->
    <span class="ref-definition">{{ truncatedDefinition }}</span>

    <!-- 操作图标组 -->
    <div class="ref-actions">
      <!-- 朗读 -->
      <button
        class="action-btn"
        :class="{ active: speaking }"
        @click="speakCharacter"
        title="朗读"
      >
        <n-icon size="16"><VolumeHighOutline /></n-icon>
      </button>

      <!-- 引用到对话 -->
      <button
        class="action-btn"
        @click="quoteToChat"
        title="引用到对话"
      >
        <n-icon size="16"><ChatboxOutline /></n-icon>
      </button>

      <!-- 保存到笔记 -->
      <button
        class="action-btn"
        :class="{ active: referenceItem?.saved }"
        :disabled="saving"
        @click="toggleSave"
        :title="referenceItem?.saved ? '已保存' : '保存到笔记'"
      >
        <n-icon size="16">
          <Bookmark v-if="referenceItem?.saved" />
          <BookmarkOutline v-else />
        </n-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';
import VolumeHighOutline from '@vicons/ionicons5/es/VolumeHighOutline'
import ChatboxOutline from '@vicons/ionicons5/es/ChatboxOutline'
import Bookmark from '@vicons/ionicons5/es/Bookmark'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import { lookupCharacter } from '@/api/dict';
import { speak } from '@/utils/speechService';
import { textbookNoteAPI } from '@/api/index';

const message = useMessage();

const props = defineProps({
  referenceItem: {
    type: Object,
    default: null
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

const emit = defineEmits(['update:referenceItem', 'quote-to-chat', 'clear']);

// 状态
const saving = ref(false);
const speaking = ref(false);
const dictData = ref(null);
const loading = ref(false);

// 判断是否显示 - 仅当是单字典查询且有有效数据时显示
const shouldShow = computed(() => {
  if (!props.referenceItem) return false;
  if (props.referenceItem.type !== 'dict') return false;

  // 需要有字典数据
  const data = dictData.value || props.referenceItem.data;
  if (!data) return false;

  // 需要有字符
  return !!data.character;
});

// 显示数据
const displayData = computed(() => {
  return dictData.value || props.referenceItem?.data || {};
});

// 截断的释义（最多显示40个字符）
const truncatedDefinition = computed(() => {
  const def = displayData.value?.definition || '暂无释义';
  if (def.length > 40) {
    return def.slice(0, 40) + '...';
  }
  return def;
});

// 加载字典数据
const loadDictData = async () => {
  if (!props.referenceItem || props.referenceItem.type !== 'dict') {
    dictData.value = null;
    return;
  }

  const char = props.referenceItem.data?.character;
  if (!char) {
    dictData.value = null;
    return;
  }

  loading.value = true;
  try {
    const result = await lookupCharacter(char);
    dictData.value = result;
  } catch (error) {
    console.error('加载字典数据失败:', error);
    dictData.value = null;
  } finally {
    loading.value = false;
  }
};

// 朗读字符
const speakCharacter = async () => {
  const char = displayData.value?.character;
  if (!char) return;

  speaking.value = true;
  try {
    await speak(char);
  } finally {
    speaking.value = false;
  }
};

// 引用到对话 - 切换到 AI 模式并填充模板
const quoteToChat = () => {
  if (!props.referenceItem) return;

  const data = displayData.value;
  const char = data.character || '';
  const pinyin = data.pinyin || '';
  const definition = data.definition || '';
  const page = props.referenceItem.page || props.currentPage;

  // 构建引用模板
  const quoteText = `关于"${char}"（${pinyin}）：${definition}\n（来源：第${page}页）\n\n请帮我进一步解释这个字的用法。`;

  emit('quote-to-chat', quoteText);
};

// 保存/取消保存笔记
const toggleSave = async () => {
  if (!props.referenceItem || saving.value) return;

  saving.value = true;

  try {
    if (props.referenceItem.saved && props.referenceItem.noteId) {
      // 取消保存
      await textbookNoteAPI.delete(props.referenceItem.noteId);
      emit('update:referenceItem', {
        ...props.referenceItem,
        saved: false,
        noteId: null
      });
      message.success('已取消保存');
    } else {
      // 保存笔记
      const data = displayData.value;
      const snippet = `${data.character} [${data.pinyin || ''}] ${data.definition || ''}`.slice(0, 100);

      const res = await textbookNoteAPI.create({
        textbookId: props.textbookId,
        sessionId: props.sessionId,
        sourceType: 'dict',
        query: data.character || '',
        content: data,
        snippet,
        page: props.referenceItem.page || props.currentPage
      });

      emit('update:referenceItem', {
        ...props.referenceItem,
        saved: true,
        noteId: res.data?.id
      });
      message.success('已保存到笔记');
    }
  } catch (error) {
    console.error('保存笔记失败:', error);
    message.error('操作失败，请重试');
  } finally {
    saving.value = false;
  }
};

// 当 referenceItem 变化时加载数据
watch(() => props.referenceItem, (newVal) => {
  if (newVal && newVal.type === 'dict') {
    loadDictData();
  } else {
    dictData.value = null;
  }
}, { immediate: true });
</script>

<style scoped>
.reference-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  min-height: 40px;
  flex-shrink: 0;
}

/* 汉字 */
.ref-char {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

/* 分隔符 */
.ref-divider {
  color: #cbd5e1;
  font-size: 14px;
}

/* 拼音 */
.ref-pinyin {
  font-size: 15px;
  color: #dc2626;
  font-family: 'Times New Roman', serif;
  font-style: italic;
  font-weight: 500;
}

/* 释义 */
.ref-definition {
  flex: 1;
  font-size: 14px;
  color: #475569;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作按钮组 */
.ref-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

/* 单个操作按钮 */
.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn.active {
  color: #3b82f6;
  background: #eff6ff;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 朗读按钮激活动画 */
.action-btn.active:first-child {
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 响应式 - 小屏幕隐藏释义文字 */
@media (max-width: 500px) {
  .ref-definition {
    display: none;
  }

  .ref-divider:last-of-type {
    display: none;
  }
}
</style>
