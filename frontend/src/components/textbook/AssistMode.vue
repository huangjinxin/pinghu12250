<template>
  <div class="assist-mode" ref="containerRef">
    <!-- 左侧：单页阅读区 -->
    <div class="reader-area">
      <SinglePageReader
        v-if="pdfDoc"
        ref="singlePageRef"
        :pdf-doc="pdfDoc"
        :total-pages="totalPages"
        :current-page="currentPage"
        :zoom="zoom"
        :subject="subject"
        :highlight-keyword="highlightKeyword"
        @page-change="onPageChange"
        @text-selection="onTextSelection"
        @link-click="onLinkClick"
      />
      <div v-else class="no-pdf">
        <n-empty description="请先加载PDF教材" />
      </div>
    </div>

    <!-- 可拖拽分割线 -->
    <div
      class="resizer"
      :class="{ active: isResizing, collapsed: panelCollapsed }"
      @mousedown="startResize"
    >
      <div class="resizer-handle"></div>
    </div>

    <!-- 右侧：辅助面板（三段式） -->
    <div
      class="assist-panel"
      :class="{ collapsed: panelCollapsed }"
      :style="panelStyle"
    >
      <button class="panel-toggle" @click="togglePanel">
        <n-icon size="16">
          <component :is="panelCollapsed ? ChevronBackOutline : ChevronForwardOutline" />
        </n-icon>
      </button>

      <div class="panel-content" v-show="!panelCollapsed">
        <!-- 顶部：即时参考区 -->
        <ReferencePanel
          :reference-item="referenceItem"
          :textbook-id="textbookId"
          :session-id="sessionId"
          :current-page="currentPage"
          @update:reference-item="updateReferenceItem"
          @quote-to-chat="handleQuoteToChat"
          @go-to-page="goToPage"
          @clear="clearReference"
        />

        <!-- 中间：Tabs 切换区域 -->
        <div class="tabs-container">
          <n-tabs v-model:value="activeTab" type="line" size="small" animated>
            <template #suffix>
              <n-dropdown
                trigger="click"
                :options="aiSettingsOptions"
                @select="handleAiSettingSelect"
                placement="bottom-end"
              >
                <n-button text class="ai-settings-tab-btn">
                  <n-icon size="20"><SettingsOutline /></n-icon>
                </n-button>
              </n-dropdown>
            </template>
            <n-tab-pane name="chat" tab="聊天记录">
              <ChatMessageList
                ref="chatListRef"
                :messages="messages"
                :textbook-id="textbookId"
                :session-id="sessionId"
                :current-page="currentPage"
                @update:messages="updateMessages"
                @go-to-page="(page, keyword) => goToPage(page, keyword)"
                @note-saved="loadNotes"
              />
            </n-tab-pane>
            <n-tab-pane name="ai" tab="AI 输出">
              <AiOutputPanel
                :content="aiOutput"
                :loading="aiLoading"
                :streaming="aiStreaming"
                :analysis-info="aiAnalysisInfo"
                :textbook-id="textbookId"
                :current-page="currentPage"
                empty-description="在 AI 输出 Tab 下发送消息与 AI 对话"
                @quote-to-chat="handleAiQuoteToChat"
                @regenerate="handleRegenerate"
              />
            </n-tab-pane>
            <n-tab-pane name="notes" tab="学习笔记">
              <div class="notes-panel">
                <n-spin :show="notesLoading">
                  <n-empty v-if="notes.length === 0 && !notesLoading" description="暂无学习笔记">
                    <template #extra>
                      <span class="empty-hint">在聊天记录中保存内容即可添加笔记</span>
                    </template>
                  </n-empty>
                  <div v-else class="notes-list">
                    <div
                      v-for="note in notes"
                      :key="note.id"
                      class="note-item"
                      @click="goToPage(note.page)"
                    >
                      <div class="note-header">
                        <span class="note-type">
                          <n-tag size="tiny" :type="getNoteTypeStyle(note.sourceType)">
                            {{ getNoteTypeLabel(note.sourceType) }}
                          </n-tag>
                        </span>
                        <span class="note-page">P{{ note.page }}</span>
                        <n-button
                          text
                          size="tiny"
                          class="note-delete"
                          @click.stop="handleDeleteNote(note.id)"
                        >
                          <n-icon><CloseCircleOutline /></n-icon>
                        </n-button>
                      </div>
                      <div class="note-query">{{ note.query }}</div>
                      <div class="note-snippet">{{ note.snippet }}</div>
                      <div class="note-time">{{ formatNoteTime(note.createdAt) }}</div>
                    </div>
                  </div>
                </n-spin>
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>

        <!-- 底部：常驻输入框 -->
        <ChatInputBox
          ref="chatInputRef"
          :loading="searchLoading || aiLoading"
          :insert-text="insertText"
          :show-deep-learn="!!pdfDoc"
          :deep-learn-loading="aiLoading"
          :mode="inputMode"
          :is-streaming="aiStreaming"
          @submit="handleChatSubmit"
          @update:insert-text="insertText = $event"
          @deep-learn="handleDeepLearnClick"
          @ai-chat="handleAiChat"
          @stop-stream="handleStopStream"
        />
      </div>

      <!-- 深入学习按钮组件（隐藏，仅用于弹窗和逻辑） -->
      <DeepLearnButton
        ref="deepLearnButtonRef"
        v-show="false"
        :loading="aiLoading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :textbook-id="textbookId"
        :subject="subject"
        :pdf-doc="pdfDoc"
        @analyze="handleAiAnalyzeResult"
        @update:loading="aiLoading = $event"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onUnmounted, h } from 'vue';
import { useMessage, NIcon } from 'naive-ui';
import {
  ChevronBackOutline,
  ChevronForwardOutline,
  SettingsOutline,
  ExpandOutline,
  DocumentTextOutline,
  CloseCircleOutline
} from '@vicons/ionicons5';
import SinglePageReader from './SinglePageReader.vue';
import ReferencePanel from './ReferencePanel.vue';
import ChatMessageList from './ChatMessageList.vue';
import ChatInputBox from './ChatInputBox.vue';
import AiOutputPanel from './AiOutputPanel.vue';
import DeepLearnButton from './DeepLearnButton.vue';
import { isSingleChinese } from '@/api/dict';
import { textbookChatAPI, textbookNoteAPI, aiStreamChat } from '@/api/index';

const message = useMessage();

const props = defineProps({
  pdfDoc: Object,
  totalPages: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  zoom: {
    type: Number,
    default: 1
  },
  subject: {
    type: String,
    default: ''
  },
  textbookId: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['page-change', 'text-selection']);

// 获取共享状态
const readerState = inject('readerState', null);

// 组件引用
const containerRef = ref(null);
const singlePageRef = ref(null);
const chatListRef = ref(null);
const chatInputRef = ref(null);

// 面板状态
const panelCollapsed = ref(false);
const panelWidth = ref(380);

// 阅读会话ID
const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

// 即时参考区状态
const referenceItem = ref(null);

// 聊天消息列表
const messages = ref([]);
const searchLoading = ref(false);
const insertText = ref('');
const highlightKeyword = ref(''); // 高亮关键词
const chatHistoryLoading = ref(false); // 加载历史记录状态

// 学习笔记列表
const notes = ref([]);
const notesLoading = ref(false);

// AI 分析状态
const activeTab = ref('chat'); // 'chat' | 'ai'
const aiLoading = ref(false);
const aiOutput = ref('');
const aiAnalysisInfo = ref(null);

// AI 流式输出状态
const aiStreaming = ref(false);
let streamController = null; // 流式控制器

// 输入框模式：根据当前 Tab 切换
const inputMode = computed(() => {
  return activeTab.value === 'ai' ? 'ai' : 'search';
});

// AI 设置菜单选项
const aiSettingsOptions = [
  {
    label: '选择分析范围',
    key: 'range',
    icon: () => h(NIcon, null, { default: () => h(ExpandOutline) })
  },
  {
    label: '选择提示词模板',
    key: 'prompt',
    icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) })
  }
];

// DeepLearnButton 引用
const deepLearnButtonRef = ref(null);

// 处理 AI 设置选择
const handleAiSettingSelect = (key) => {
  // 调用 DeepLearnButton 的 openSettings 方法
  deepLearnButtonRef.value?.openSettings();
};

// 处理深入学习点击
const handleDeepLearnClick = () => {
  // 触发 DeepLearnButton 的点击逻辑
  deepLearnButtonRef.value?.triggerAnalysis?.() || startDeepLearnAnalysis();
};

// 直接开始深入学习分析（备用方法）
const startDeepLearnAnalysis = async () => {
  if (!props.pdfDoc || aiLoading.value) return;

  aiLoading.value = true;

  try {
    // 提取当前页和上下文的文本
    const startPage = Math.max(1, props.currentPage - 1);
    const endPage = Math.min(props.totalPages, props.currentPage + 1);

    const pageTexts = [];
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await props.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join('');
        if (text.trim()) {
          pageTexts.push(`【第${pageNum}页】\n${text}`);
        }
      } catch (e) {
        console.warn(`提取第${pageNum}页文本失败:`, e);
      }
    }

    if (pageTexts.length === 0) {
      message.warning('未能提取到页面文本');
      aiLoading.value = false;
      return;
    }

    const inputText = pageTexts.join('\n\n');

    // 调用 AI 分析 API
    const { aiAnalysisAPI } = await import('@/api/index');
    const result = await aiAnalysisAPI.analyze({
      textbookId: props.textbookId,
      inputPages: `${startPage}-${endPage}`,
      inputText: inputText
    });

    if (result.success) {
      handleAiAnalyzeResult({
        content: result.data.outputText,
        info: {
          pages: `P${startPage}-${endPage}`,
          responseTime: result.data.responseTime,
          tokensUsed: result.data.tokensUsed
        }
      });
    } else {
      message.error(result.message || 'AI 分析失败');
    }
  } catch (error) {
    console.error('AI 分析失败:', error);
    message.error(error.message || 'AI 分析失败，请检查 API 配置');
  } finally {
    aiLoading.value = false;
  }
};

// 消息ID计数器
let messageIdCounter = 0;
const generateMessageId = () => `msg_${++messageIdCounter}_${Date.now()}`;

// 拖拽状态
const isResizing = ref(false);
const MIN_PANEL_WIDTH = 40;
const DEFAULT_PANEL_WIDTH = 380;

// 面板样式
const panelStyle = computed(() => {
  if (panelCollapsed.value) {
    return { width: `${MIN_PANEL_WIDTH}px` };
  }
  return { width: `${panelWidth.value}px` };
});

// ===== 拖拽调整面板宽度 =====
const startResize = (e) => {
  if (panelCollapsed.value) return;
  e.preventDefault();
  isResizing.value = true;
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const doResize = (e) => {
  if (!isResizing.value || !containerRef.value) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const maxWidth = containerWidth * 0.5;
  const newWidth = containerRect.right - e.clientX;

  if (newWidth < 100) {
    panelCollapsed.value = true;
    panelWidth.value = DEFAULT_PANEL_WIDTH;
    if (readerState) {
      readerState.panel.collapsed = true;
    }
  } else {
    panelWidth.value = Math.min(maxWidth, Math.max(280, newWidth));
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  if (readerState) {
    readerState.panel.width = panelWidth.value;
  }
};

// ===== 面板切换 =====
const togglePanel = () => {
  panelCollapsed.value = !panelCollapsed.value;
  if (readerState) {
    readerState.panel.collapsed = panelCollapsed.value;
  }
};

// ===== 页面事件 =====
const onPageChange = (page) => {
  emit('page-change', page);
};

const goToPage = (page, keyword = '') => {
  // 设置高亮关键词
  if (keyword) {
    highlightKeyword.value = keyword;
  }
  singlePageRef.value?.goToPage(page);
};

const onLinkClick = (linkInfo) => {
  if (linkInfo.type === 'url') {
    window.open(linkInfo.url, '_blank');
  }
};

// ===== 文字选中处理 =====
const onTextSelection = (selection) => {
  emit('text-selection', selection);

  // 单个汉字 → 显示在 ReferencePanel
  if (selection && selection.text && isSingleChinese(selection.text)) {
    referenceItem.value = {
      type: 'dict',
      data: { character: selection.text },
      page: props.currentPage,
      saved: false,
      noteId: null
    };
  }
};

// ===== Reference Panel 操作 =====
const updateReferenceItem = (item) => {
  referenceItem.value = item;
};

const clearReference = () => {
  referenceItem.value = null;
};

const handleQuoteToChat = (quoteText) => {
  insertText.value = quoteText;
  chatInputRef.value?.focus();
};

// ===== 聊天功能 =====
const updateMessages = (newMessages) => {
  messages.value = newMessages;
};

const handleChatSubmit = async (text) => {
  if (!text.trim()) return;

  // 添加用户消息
  const userMessage = {
    id: generateMessageId(),
    role: 'user',
    content: text,
    page: props.currentPage,
    createdAt: new Date(),
    saved: false,
    saving: true,
    noteId: null
  };
  messages.value.push(userMessage);

  // 保存用户消息到后端
  try {
    const saveResult = await textbookChatAPI.addMessage(props.textbookId, {
      role: 'user',
      content: text,
      page: props.currentPage,
      sourceType: 'user_input'
    });
    if (saveResult.success && saveResult.data) {
      userMessage.id = saveResult.data.id;
      userMessage.saved = true;
    }
  } catch (error) {
    console.warn('保存用户消息失败:', error);
  } finally {
    userMessage.saving = false;
  }

  // 执行 PDF 搜索
  searchLoading.value = true;

  try {
    const matches = await searchPdfContent(text);

    // 添加系统搜索结果消息
    const systemMessage = {
      id: generateMessageId(),
      role: 'system',
      data: {
        query: text,
        matches
      },
      page: props.currentPage,
      createdAt: new Date(),
      saved: false,
      saving: true,
      noteId: null
    };
    messages.value.push(systemMessage);

    // 保存搜索结果到后端
    try {
      const saveResult = await textbookChatAPI.addMessage(props.textbookId, {
        role: 'system',
        content: `搜索: ${text}`,
        page: props.currentPage,
        sourceType: 'search_result',
        metadata: JSON.stringify({ query: text, matches })
      });
      if (saveResult.success && saveResult.data) {
        systemMessage.id = saveResult.data.id;
        systemMessage.saved = true;
      }
    } catch (error) {
      console.warn('保存搜索结果失败:', error);
    } finally {
      systemMessage.saving = false;
    }

    // 如果有结果，自动跳转到第一个匹配页
    if (matches.length > 0) {
      // 延迟跳转，让用户先看到结果
      setTimeout(() => {
        goToPage(matches[0].page, text);
      }, 300);
    }
  } catch (error) {
    console.error('分析失败:', error);
    message.error('分析失败，请重试');
  } finally {
    searchLoading.value = false;
  }
};

// ===== AI 流式聊天 =====
const handleAiChat = async (text) => {
  if (!text.trim() || aiStreaming.value) return;

  // 切换到 AI 输出 Tab
  activeTab.value = 'ai';

  // 重置状态
  aiOutput.value = '';
  aiAnalysisInfo.value = null;
  aiLoading.value = true;
  aiStreaming.value = true;

  const startTime = Date.now();

  try {
    // 获取当前页上下文
    let context = '';
    if (props.pdfDoc) {
      try {
        const page = await props.pdfDoc.getPage(props.currentPage);
        const textContent = await page.getTextContent();
        context = textContent.items.map(item => item.str).join('');
      } catch (e) {
        console.warn('提取页面文本失败:', e);
      }
    }

    // 创建流式聊天
    streamController = aiStreamChat.create(
      {
        textbookId: props.textbookId,
        sessionId: sessionId.value,
        message: text,
        context: context,
        subject: props.subject
      },
      {
        onStart: (connectionId) => {
          console.log('Stream started:', connectionId);
        },
        onChunk: (chunk) => {
          aiOutput.value += chunk;
        },
        onDone: (data) => {
          aiStreaming.value = false;
          aiLoading.value = false;
          aiAnalysisInfo.value = {
            pages: `P${props.currentPage}`,
            responseTime: data.responseTime || (Date.now() - startTime),
            tokensUsed: data.tokensUsed
          };
          streamController = null;
        },
        onError: (errorMsg) => {
          aiStreaming.value = false;
          aiLoading.value = false;
          message.error(errorMsg || 'AI 对话失败');
          streamController = null;
        },
        onAborted: () => {
          aiStreaming.value = false;
          aiLoading.value = false;
          message.info('已停止生成');
          streamController = null;
        }
      }
    );
  } catch (error) {
    aiStreaming.value = false;
    aiLoading.value = false;
    message.error(error.message || 'AI 对话失败');
    streamController = null;
  }
};

// ===== 停止流式输出 =====
const handleStopStream = () => {
  if (streamController) {
    streamController.abort();
    streamController = null;
  }
};

// ===== AI 分析结果处理 =====
const handleAiAnalyzeResult = (result) => {
  aiOutput.value = result.content;
  aiAnalysisInfo.value = result.info;
  activeTab.value = 'ai'; // 自动切换到 AI 输出 Tab
};

const handleAiQuoteToChat = async (content) => {
  // 将 AI 输出引用到聊天记录
  const quoteMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: content,
    page: props.currentPage,
    createdAt: new Date(),
    sourceType: 'ai_quote',
    saved: false,
    saving: false,
    noteId: null
  };
  messages.value.push(quoteMessage);

  // 保存到后端
  try {
    await textbookChatAPI.addMessage(props.textbookId, {
      role: 'assistant',
      content: content,
      page: props.currentPage,
      sourceType: 'ai_quote'
    });
  } catch (error) {
    console.warn('保存聊天记录失败:', error);
  }

  activeTab.value = 'chat'; // 切换到聊天 Tab
};

const handleRegenerate = () => {
  // 触发 DeepLearnButton 重新分析
  // 这里通过清空输出让用户重新点击按钮
  aiOutput.value = '';
  aiAnalysisInfo.value = null;
};

// ===== PDF 本地搜索 =====
const searchPdfContent = async (query) => {
  if (!props.pdfDoc || !query.trim()) return [];

  const matches = [];
  const searchText = query.toLowerCase();

  // 遍历所有页面搜索
  for (let pageNum = 1; pageNum <= props.totalPages; pageNum++) {
    try {
      const page = await props.pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 提取页面文本
      const pageText = textContent.items.map(item => item.str).join('');

      // 检查是否包含搜索词
      if (pageText.toLowerCase().includes(searchText)) {
        // 提取匹配上下文
        const lowerPageText = pageText.toLowerCase();
        const matchIndex = lowerPageText.indexOf(searchText);

        // 获取匹配位置前后的文本作为上下文
        const contextStart = Math.max(0, matchIndex - 30);
        const contextEnd = Math.min(pageText.length, matchIndex + searchText.length + 50);
        let contextText = pageText.slice(contextStart, contextEnd);

        // 添加省略号
        if (contextStart > 0) contextText = '...' + contextText;
        if (contextEnd < pageText.length) contextText = contextText + '...';

        matches.push({
          page: pageNum,
          text: contextText.trim(),
          matchIndex
        });

        // 最多返回 5 个匹配
        if (matches.length >= 5) break;
      }
    } catch (error) {
      console.warn(`搜索第 ${pageNum} 页失败:`, error);
    }
  }

  return matches;
};

// ===== 清除选中 =====
const clearSelection = () => {
  singlePageRef.value?.clearSelection();
};

// ===== 从共享状态恢复 =====
watch(() => readerState?.panel, (panel) => {
  if (panel) {
    panelCollapsed.value = panel.collapsed;
    if (panel.width) {
      panelWidth.value = panel.width;
    }
  }
}, { immediate: true, deep: true });

// ===== 加载历史聊天记录 =====
const loadChatHistory = async () => {
  if (!props.textbookId) return;

  chatHistoryLoading.value = true;
  try {
    const result = await textbookChatAPI.getMessages(props.textbookId, { limit: 100 });
    if (result.success && result.data?.messages) {
      // 将后端数据转换为前端消息格式（后端已按时间升序排列）
      messages.value = result.data.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        data: msg.metadata ? JSON.parse(msg.metadata) : null,
        page: msg.page,
        sourceType: msg.sourceType,
        createdAt: new Date(msg.createdAt),
        saved: true, // 已持久化的消息
        saving: false,
        noteId: null
      }));
    }
  } catch (error) {
    console.warn('加载聊天记录失败:', error);
  } finally {
    chatHistoryLoading.value = false;
  }
};

// ===== 加载学习笔记 =====
const loadNotes = async () => {
  if (!props.textbookId) return;

  notesLoading.value = true;
  try {
    const result = await textbookNoteAPI.list({ textbookId: props.textbookId, limit: 50 });
    if (result.success && result.data?.notes) {
      notes.value = result.data.notes;
    }
  } catch (error) {
    console.warn('加载学习笔记失败:', error);
  } finally {
    notesLoading.value = false;
  }
};

// ===== 删除笔记 =====
const handleDeleteNote = async (noteId) => {
  try {
    await textbookNoteAPI.delete(noteId);
    notes.value = notes.value.filter(n => n.id !== noteId);
    message.success('笔记已删除');
  } catch (error) {
    message.error('删除失败');
  }
};

// ===== 笔记类型映射 =====
const getNoteTypeLabel = (sourceType) => {
  const map = {
    'dict': '查字',
    'search': '搜索',
    'ai_analysis': 'AI分析',
    'ai_quote': 'AI对话',
    'user_note': '笔记'
  };
  return map[sourceType] || '笔记';
};

const getNoteTypeStyle = (sourceType) => {
  const map = {
    'dict': 'info',
    'search': 'default',
    'ai_analysis': 'success',
    'ai_quote': 'success',
    'user_note': 'warning'
  };
  return map[sourceType] || 'default';
};

// ===== 格式化笔记时间 =====
const formatNoteTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

// ===== 刷新笔记列表（供外部调用） =====
const refreshNotes = () => {
  loadNotes();
};

// ===== 初始化 =====
onMounted(() => {
  loadChatHistory();
  loadNotes();
});

// ===== 监听教材ID变化，重新加载数据 =====
watch(() => props.textbookId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    messages.value = [];
    notes.value = [];
    loadChatHistory();
    loadNotes();
  }
});

// ===== 暴露方法 =====
defineExpose({
  clearSelection,
  goToPage,
  refreshNotes,
  addDictCard: (character) => {
    referenceItem.value = {
      type: 'dict',
      data: { character },
      page: props.currentPage,
      saved: false,
      noteId: null
    };
  }
});

// ===== 清理 =====
onUnmounted(() => {
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
  // 清理流式控制器
  if (streamController) {
    streamController.abort();
    streamController = null;
  }
});
</script>

<style scoped>
.assist-mode {
  height: 100%;
  display: flex;
  background: #f0f2f5;
}

/* 左侧阅读区 */
.reader-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.no-pdf {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

/* 可拖拽分割线 */
.resizer {
  width: 6px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  z-index: 20;
  transition: background 0.2s;
}

.resizer:hover,
.resizer.active {
  background: rgba(24, 144, 255, 0.1);
}

.resizer-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  background: #d9d9d9;
  border-radius: 2px;
  transition: all 0.2s;
}

.resizer:hover .resizer-handle,
.resizer.active .resizer-handle {
  background: #1890ff;
  height: 60px;
}

.resizer.collapsed {
  cursor: default;
}

.resizer.collapsed .resizer-handle {
  display: none;
}

/* 右侧面板 */
.assist-panel {
  background: white;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
}

.assist-panel.collapsed {
  border-left: none;
}

.panel-toggle {
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: white;
  border: 1px solid #e8e8e8;
  border-right: none;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  z-index: 10;
  transition: all 0.2s;
}

.panel-toggle:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* Tabs 容器 */
.tabs-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.tabs-container :deep(.n-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tabs-container :deep(.n-tabs-nav) {
  padding: 0 12px;
  flex-shrink: 0;
}

.ai-settings-tab-btn {
  color: #666;
  padding: 4px 8px;
  margin-right: 4px;
}

.ai-settings-tab-btn:hover {
  color: #18a058;
}

.tabs-container :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  overflow: hidden;
}

.tabs-container :deep(.n-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 学习笔记面板 */
.notes-panel {
  height: 100%;
  overflow-y: auto;
  padding: 12px;
}

.empty-hint {
  font-size: 12px;
  color: #999;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #eee;
}

.note-item:hover {
  background: #f0f5ff;
  border-color: #d6e4ff;
}

.note-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.note-page {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

.note-delete {
  opacity: 0;
  transition: opacity 0.2s;
  color: #999;
}

.note-item:hover .note-delete {
  opacity: 1;
}

.note-delete:hover {
  color: #ff4d4f !important;
}

.note-query {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.note-snippet {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-time {
  font-size: 11px;
  color: #bbb;
  margin-top: 8px;
  text-align: right;
}
</style>
