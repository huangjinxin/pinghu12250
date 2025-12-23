<template>
  <div class="reference-panel" :class="{ collapsed: isCollapsed }">
    <!-- 面板头部 -->
    <div class="panel-header" @click="toggleCollapse">
      <span class="header-title">
        <n-icon size="16"><BookOutline /></n-icon>
        即时参考
      </span>
      <div class="header-actions">
        <n-button
          v-if="referenceItem && !isCollapsed"
          text
          size="tiny"
          @click.stop="clearReference"
        >
          清空
        </n-button>
        <n-icon size="16" class="collapse-icon">
          <ChevronDownOutline v-if="!isCollapsed" />
          <ChevronForwardOutline v-else />
        </n-icon>
      </div>
    </div>

    <!-- 面板内容 -->
    <div class="panel-content" v-show="!isCollapsed">
      <!-- 有内容时 -->
      <div v-if="referenceItem" class="reference-content">
        <!-- 查字结果 -->
        <template v-if="referenceItem.type === 'dict'">
          <CharacterDetail
            :character="referenceItem.data.character"
            @loaded="onDataLoaded"
          />
        </template>

        <!-- 搜索结果 -->
        <template v-else-if="referenceItem.type === 'search'">
          <div class="search-result">
            <div class="search-query">分析：{{ referenceItem.data.query }}</div>
            <div class="search-matches" v-if="referenceItem.data.matches?.length">
              <div
                v-for="(match, idx) in referenceItem.data.matches.slice(0, 3)"
                :key="idx"
                class="match-item"
                @click="$emit('go-to-page', match.page)"
              >
                <span class="match-page">第{{ match.page }}页</span>
                <span class="match-text">{{ match.text }}</span>
              </div>
            </div>
            <div v-else class="no-matches">未找到匹配内容</div>
          </div>
        </template>

        <!-- 来源页码 -->
        <div class="reference-source" v-if="referenceItem.page">
          <n-icon size="12"><DocumentOutline /></n-icon>
          来源：第{{ referenceItem.page }}页
        </div>

        <!-- 操作按钮 -->
        <div class="reference-actions">
          <n-button
            size="small"
            quaternary
            @click="quoteToChat"
          >
            <template #icon>
              <n-icon><ChatboxOutline /></n-icon>
            </template>
            引用到对话
          </n-button>
          <n-button
            size="small"
            quaternary
            :loading="saving"
            @click="toggleSave"
          >
            <template #icon>
              <n-icon :color="referenceItem.saved ? '#1890ff' : undefined">
                <component :is="referenceItem.saved ? Bookmark : BookmarkOutline" />
              </n-icon>
            </template>
            {{ referenceItem.saved ? '已保存' : '保存笔记' }}
          </n-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <n-icon size="24" color="#ccc"><SearchOutline /></n-icon>
        <p>选中文字后，查询结果将显示在这里</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import {
  BookOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  DocumentOutline,
  ChatboxOutline,
  SearchOutline,
  Bookmark,
  BookmarkOutline
} from '@vicons/ionicons5';
import CharacterDetail from './CharacterDetail.vue';
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

const emit = defineEmits(['update:referenceItem', 'quote-to-chat', 'go-to-page', 'clear']);

// 状态
const isCollapsed = ref(false);
const saving = ref(false);
const loadedData = ref(null);

// 折叠/展开
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 清空参考内容
const clearReference = () => {
  emit('clear');
};

// 数据加载完成回调
const onDataLoaded = (data) => {
  loadedData.value = data;
};

// 引用到对话
const quoteToChat = () => {
  if (!props.referenceItem) return;

  let quoteText = '';

  if (props.referenceItem.type === 'dict') {
    const data = loadedData.value || props.referenceItem.data;
    const char = data.character || props.referenceItem.data.character;
    const pinyin = data.pinyin || '';
    const definition = data.definitions?.[0] || data.definition || '';

    quoteText = `【引用内容】\n查字：${char}（${pinyin}）\n释义：${definition}\n来源：第 ${props.referenceItem.page || props.currentPage} 页`;
  } else if (props.referenceItem.type === 'search') {
    const query = props.referenceItem.data.query;
    const matches = props.referenceItem.data.matches || [];
    const matchText = matches.length > 0
      ? `在第 ${matches.map(m => m.page).join(', ')} 页找到`
      : '未找到匹配';

    quoteText = `【引用内容】\n分析：${query}\n结果：${matchText}`;
  }

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
      const data = loadedData.value || props.referenceItem.data;
      const snippet = buildSnippet(props.referenceItem.type, data);

      const res = await textbookNoteAPI.create({
        textbookId: props.textbookId,
        sessionId: props.sessionId,
        sourceType: props.referenceItem.type,
        query: data.character || data.query || '',
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

// 构建摘要
const buildSnippet = (type, data) => {
  if (type === 'dict') {
    const char = data.character || '';
    const pinyin = data.pinyin || '';
    const def = data.definitions?.[0] || data.definition || '';
    return `${char} [${pinyin}] ${def}`.slice(0, 100);
  }
  if (type === 'search') {
    return `分析: ${data.query}`.slice(0, 100);
  }
  return '';
};

// 当有新的 referenceItem 时自动展开
watch(() => props.referenceItem, (newVal) => {
  if (newVal) {
    isCollapsed.value = false;
    loadedData.value = null;
  }
});
</script>

<style scoped>
.reference-panel {
  background: #fff;
  border-bottom: 2px solid #d0d0d0;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  background: #f0f4f8;
  border-bottom: 1px solid #d0d0d0;
  transition: background 0.2s;
}

.panel-header:hover {
  background: #e4eaf0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-icon {
  color: #666;
  transition: transform 0.2s;
}

.panel-content {
  padding: 14px 16px;
  max-height: 300px;
  overflow-y: auto;
  background: #fafbfc;
}

.reference-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reference-source {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  padding-top: 10px;
  border-top: 1px solid #d0d0d0;
}

.reference-actions {
  display: flex;
  gap: 10px;
  padding-top: 10px;
}

.reference-actions .n-button {
  flex: 1;
  font-weight: 600;
}

/* 搜索结果样式 */
.search-result {
  font-size: 15px;
}

.search-query {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.search-matches {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.match-item:hover {
  background: #e6f4ff;
  border-color: #1890ff;
}

.match-page {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0066cc;
  background: #e6f4ff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #91caff;
}

.match-text {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.no-matches {
  color: #666;
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 28px 16px;
  color: #666;
}

.empty-state p {
  margin: 10px 0 0;
  font-size: 14px;
  color: #555;
}

/* 折叠状态 */
.reference-panel.collapsed .panel-header {
  border-bottom: none;
}
</style>
