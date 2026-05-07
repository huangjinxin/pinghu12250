<!-- @AI:LARGE-FILE 1990行,新逻辑必须提取到composables/ -->
<!-- @AI:EXTRACT useTextbookNotes(笔记CRUD) useAiStream(AI对话) usePdfSearch(PDF搜索) -->
<!-- @AI:MODIFY 仅修复bug,不在此文件新增功能 -->
<template>
  <div class="assist-mode" ref="containerRef">
    <!-- 左侧：阅读区（根据 contentType 切换） -->
    <div class="reader-area">
      <!-- PDF 阅读器 -->
      <SinglePageReader
        v-if="contentType === 'pdf' && pdfDoc"
        ref="singlePageRef"
        :pdf-doc="pdfDoc"
        :total-pages="totalPages"
        :current-page="currentPage"
        :zoom="zoom"
        :subject="subject"
        :highlight-keyword="highlightKeyword"
        :textbook-id="textbookId"
        @page-change="onPageChange"
        @text-selection="onTextSelection"
        @link-click="onLinkClick"
        @save-note="handlePdfSaveNote"
        @send-to-input="handlePdfSendToInput"
        @ask-ai="handlePdfAskAI"
        @to-analysis="handlePdfToAnalysis"
        @to-solving="handlePdfToSolving"
        @highlight="handlePdfHighlight"
        @region-action="handleRegionAction"
        @save-drawing-note="handleDrawingSaveNote"
      />
      <!-- EPUB 阅读器 -->
      <EPUBReader
        v-else-if="contentType === 'epub' && chapters.length > 0"
        ref="epubReaderRef"
        :textbook-id="textbookId"
        :chapters="chapters"
        :initial-chapter-id="currentChapterId"
        :subject="subject"
        @chapter-change="onChapterChange"
        @text-selection="onEpubTextSelection"
        @position-change="onPositionChange"
      />
      <!-- 无内容提示 -->
      <div v-else class="no-pdf">
        <n-empty :description="contentType === 'epub' ? '请先加载EPUB教材' : '请先加载PDF教材'" />
      </div>
    </div>

    <!-- 可拖拽分割线 -->
    <div
      class="resizer"
      :class="{ active: isResizing, collapsed: panelCollapsed }"
      @mousedown="startResize"
      @touchstart.passive="startTouchResize"
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
        <!-- 顶部：即时参考条（仅单字查询成功时显示） -->
        <ReferencePanel
          :reference-item="referenceItem"
          :textbook-id="textbookId"
          :session-id="sessionId"
          :current-page="currentPage"
          @update:reference-item="updateReferenceItem"
          @quote-to-chat="handleQuoteToChat"
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
            <!-- 笔记 Tab 放在最左边 -->
            <n-tab-pane name="notes" tab="笔记">
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
                      :class="{ expanded: expandedNotes.has(note.id), 'practice-note': note.sourceType === 'practice', 'solving-note': note.sourceType === 'solving' }"
                      @click="toggleNoteExpand(note)"
                    >
                      <div class="note-header">
                        <span class="note-type">
                          <n-tag size="tiny" :type="getNoteTypeStyle(note.sourceType)">
                            {{ getNoteTypeLabel(note.sourceType) }}
                          </n-tag>
                        </span>
                        <span class="note-page">P{{ note.page }}</span>
                        <n-icon v-if="expandedNotes.has(note.id)" size="14" color="#999" class="expand-icon"><ChevronUpOutline /></n-icon>
                        <n-icon v-else size="14" color="#999" class="expand-icon"><ChevronDownOutline /></n-icon>
                        <n-dropdown trigger="click" :options="noteActionOptions" @select="(key) => handleNoteAction(key, note)">
                          <n-button
                            text
                            size="tiny"
                            class="note-more"
                            @click.stop
                          >
                            <n-icon><EllipsisHorizontalOutline /></n-icon>
                          </n-button>
                        </n-dropdown>
                      </div>
                      <div class="note-query">{{ note.query }}</div>

                      <!-- 练习题类型：展开后显示可交互的题目 -->
                      <template v-if="note.sourceType === 'practice' && expandedNotes.has(note.id) && getPracticeQuestions(note).length > 0">
                        <div class="practice-questions-inline" @click.stop>
                          <PracticeQuestions
                            :questions="getPracticeQuestions(note)"
                            :compact="true"
                            :show-footer="true"
                            :show-feedback="true"
                          />
                        </div>
                      </template>

                      <!-- 普通笔记：展开显示完整内容，折叠显示摘要 -->
                      <template v-else>
                        <div v-if="expandedNotes.has(note.id)" class="note-content-expanded" @click.stop>
                          <!-- 手写草稿显示 -->
                          <div v-if="note.sourceType === 'drawing' && note.content" class="note-drawing-image">
                            <StrokeRenderer
                              :content="note.content"
                              :preview-mode="false"
                              :max-width="300"
                              :show-playback="true"
                            />
                          </div>
                          <div v-else class="note-full-text">{{ getNoteFullText(note) }}</div>
                          <!-- 关联教材信息（仅显示，不跳转） -->
                          <div v-if="note.textbook" class="note-textbook-info">
                            <n-tag size="tiny" type="info">{{ note.textbook.title }}</n-tag>
                            <span class="page-label">第 {{ note.page }} 页</span>
                          </div>
                        </div>
                        <!-- 折叠时显示预览图或摘要 -->
                        <div v-else class="note-snippet">
                          <img
                            v-if="note.sourceType === 'drawing' && getDrawingPreviewUrl(note.content)"
                            :src="getDrawingPreviewUrl(note.content)"
                            alt="手写草稿预览"
                            class="drawing-preview-thumb"
                          />
                          <span v-else>{{ note.snippet }}</span>
                        </div>
                      </template>

                      <div class="note-time">{{ formatNoteTime(note.createdAt) }}</div>
                    </div>
                  </div>
                </n-spin>
              </div>
            </n-tab-pane>
            <!-- 探索 Tab -->
            <n-tab-pane name="chat" tab="探索">
              <ChatMessageList
                ref="chatListRef"
                :messages="messages"
                :textbook-id="textbookId"
                :session-id="sessionId"
                :current-page="currentPage"
                @update:messages="updateMessages"
                @go-to-page="(page, keyword) => goToPage(page, keyword)"
                @note-saved="handleNoteSaved"
                @send-to-input="handleChatSendToInput"
                @ask-ai="handleChatAskAI"
              />
            </n-tab-pane>
            <!-- 解析 Tab -->
            <n-tab-pane name="ai" tab="解析">
              <AiConversationPanel
                ref="aiConversationRef"
                :messages="aiMessages"
                :streaming="aiStreaming"
                :textbook-id="textbookId"
                :session-id="sessionId"
                :current-page="currentPage"
                empty-description="在下方输入问题与 AI 对话"
                @update:messages="updateAiMessages"
                @save-note="handleAiSaveNote"
                @send-to-input="handleAiSendToInput"
                @ask-ai="handleAiExplain"
                @edit-message="handleEditAiMessage"
              />
            </n-tab-pane>
            <!-- 练习 Tab -->
            <n-tab-pane name="practice" tab="练习">
              <PracticePanel
                ref="practicePanelRef"
                :pdf-doc="pdfDoc"
                :total-pages="totalPages"
                :current-page="currentPage"
                :textbook-id="textbookId"
                :subject="subject"
                :get-screenshot="getPageScreenshotForPractice"
                @go-to-analysis="handleGoToAnalysis"
                @save-note="handlePracticeSaveNote"
                @lock-render="handleLockRender"
                @unlock-render="handleUnlockRender"
              />
            </n-tab-pane>
            <!-- 解题 Tab -->
            <n-tab-pane name="solving" tab="解题">
              <SolvingPanel
                ref="solvingPanelRef"
                :pdf-doc="pdfDoc"
                :total-pages="totalPages"
                :current-page="currentPage"
                :textbook-id="textbookId"
                :subject="subject"
                :get-screenshot="getPageScreenshotForPractice"
                @save-note="handleSolvingSaveNote"
                @start-region-select="handleStartRegionSelect"
              />
            </n-tab-pane>
          </n-tabs>
        </div>

        <!-- 底部：常驻输入框（练习/解题模式下隐藏） -->
        <ChatInputBox
          v-show="activeTab !== 'practice' && activeTab !== 'solving'"
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
          @save-note="handleDirectSaveNote"
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

      <!-- 提示词管理面板 -->
      <PromptManagePanel
        v-model:show="showPromptPanel"
        :textbook-id="textbookId"
        :subject="subject"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onUnmounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NIcon } from 'naive-ui';
import ChevronBackOutline from '@vicons/ionicons5/es/ChevronBackOutline'
import ChevronForwardOutline from '@vicons/ionicons5/es/ChevronForwardOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import ExpandOutline from '@vicons/ionicons5/es/ExpandOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import CloseCircleOutline from '@vicons/ionicons5/es/CloseCircleOutline'
import EllipsisHorizontalOutline from '@vicons/ionicons5/es/EllipsisHorizontalOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import SinglePageReader from './SinglePageReader.vue';
import EPUBReader from './EPUBReader.vue';
import ReferencePanel from './ReferencePanel.vue';
import ChatMessageList from './ChatMessageList.vue';
import ChatInputBox from './ChatInputBox.vue';
import AiConversationPanel from './AiConversationPanel.vue';
import DeepLearnButton from './DeepLearnButton.vue';
import PromptManagePanel from './PromptManagePanel.vue';
import PracticePanel from './PracticePanel.vue';
import PracticeQuestions from './PracticeQuestions.vue';
import SolvingPanel from './SolvingPanel.vue';
import StrokeRenderer from './StrokeRenderer.vue';
import { isSingleChinese } from '@/api/dict';
import { getDrawingPreviewUrl } from '@/composables/useStrokeData';
import { textbookChatAPI, textbookNoteAPI, aiStreamChat } from '@/api/index';

const router = useRouter();
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
  },
  // EPUB 相关 props
  contentType: {
    type: String,
    default: 'pdf' // 'pdf' | 'epub'
  },
  chapters: {
    type: Array,
    default: () => []
  },
  currentChapterId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['page-change', 'text-selection', 'chapter-change']);

// 获取共享状态
const readerState = inject('readerState', null);

// 组件引用
const containerRef = ref(null);
const singlePageRef = ref(null);
const epubReaderRef = ref(null);
const chatListRef = ref(null);
const chatInputRef = ref(null);
const aiConversationRef = ref(null);
const practicePanelRef = ref(null);
const solvingPanelRef = ref(null);

// 面板状态
const panelCollapsed = ref(false);
const panelWidth = ref(380);
const hasUserResized = ref(false); // 用户是否手动调整过宽度

// 阅读会话ID
const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

// 即时参考区状态
const referenceItem = ref(null);

// 聊天消息列表（探索 Tab）
const messages = ref([]);
const searchLoading = ref(false);
const insertText = ref('');
const highlightKeyword = ref(''); // 高亮关键词
const chatHistoryLoading = ref(false); // 加载历史记录状态

// AI 对话消息列表（解析 Tab）
const aiMessages = ref([]);
const currentAiMessageId = ref(null); // 当前流式输出的消息ID

// 学习笔记列表
const notes = ref([]);
const notesLoading = ref(false);
const expandedNotes = ref(new Set()); // 展开的笔记ID集合

// AI 分析状态
const activeTab = ref('notes'); // 'notes' | 'chat' | 'ai' | 'practice' | 'solving'
const aiLoading = ref(false);
const aiOutput = ref('');
const aiAnalysisInfo = ref(null);

// AI 流式输出状态
const aiStreaming = ref(false);
let streamController = null; // 流式控制器

// 提示词管理面板
const showPromptPanel = ref(false);

// 输入框模式：根据当前 Tab 切换
const inputMode = computed(() => {
  if (activeTab.value === 'ai') return 'ai';
  if (activeTab.value === 'notes') return 'notes';
  return 'search';
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
  if (key === 'range') {
    // 打开分析范围设置
    deepLearnButtonRef.value?.openSettings();
  } else if (key === 'prompt') {
    // 打开提示词管理面板
    showPromptPanel.value = true;
  }
};

// 处理深入学习点击
const handleDeepLearnClick = () => {
  // 使用增强的深入学习分析（带截图）
  startDeepLearnWithScreenshot();
};

// 深入学习分析（带截图，不再使用文本层）
const startDeepLearnWithScreenshot = async () => {
  if (!props.pdfDoc || aiLoading.value || aiStreaming.value) return;

  // 切换到 AI Tab
  activeTab.value = 'ai';

  // 获取当前页截图（不再使用文本层，因为错误率高）
  const screenshot = singlePageRef.value?.getPageScreenshot?.();

  // 构建完整的提问内容（发送给 AI，让 AI 通过图片来分析）
  const fullPrompt = `请深入分析当前页面内容（第${props.currentPage}页）。

请从以下几个方面进行分析：
1. 主要内容概述
2. 重点知识点
3. 难点解析
4. 学习建议

请根据页面图片内容进行详细分析，用简洁易懂的语言回答，适合小学生阅读理解。`;

  // 折叠显示的标题
  const displayText = `🔍 深入分析本页（第${props.currentPage}页）`;

  // 直接传递 base64 截图
  const imageData = screenshot ? { preview: screenshot } : null;

  // 通过 handleAiChat 发送（会显示在对话流中）
  // 使用 options 参数传递显示文本，实现折叠效果
  handleAiChat(fullPrompt, imageData, { displayText });
};

// 直接开始深入学习分析（备用方法，不带截图）
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
const DEFAULT_PANEL_RATIO = 0.50; // 默认面板占比 50%（左右各占一半）

// 面板样式
const panelStyle = computed(() => {
  if (panelCollapsed.value) {
    return { width: `${MIN_PANEL_WIDTH}px`, flex: 'none' };
  }
  // 用户未手动调整过时，使用 flex: 1 实现 50-50 布局
  if (!hasUserResized.value) {
    return { flex: '1', minWidth: '280px' };
  }
  // 用户手动调整后，使用固定宽度
  return { width: `${panelWidth.value}px`, flex: 'none' };
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

// 触摸开始
const startTouchResize = (e) => {
  if (panelCollapsed.value) return;
  isResizing.value = true;
  document.addEventListener('touchmove', doTouchResize, { passive: false });
  document.addEventListener('touchend', stopTouchResize);
  document.addEventListener('touchcancel', stopTouchResize);
};

const doResize = (e) => {
  if (!isResizing.value || !containerRef.value) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const maxWidth = containerWidth * 0.6; // 最大 60%
  const minWidth = containerWidth * 0.25; // 最小 25%
  const newWidth = containerRect.right - e.clientX;

  if (newWidth < 100) {
    panelCollapsed.value = true;
    panelWidth.value = DEFAULT_PANEL_WIDTH;
    if (readerState) {
      readerState.panel.collapsed = true;
    }
  } else {
    panelWidth.value = Math.min(maxWidth, Math.max(minWidth, newWidth));
  }
};

// 触摸拖拽
const doTouchResize = (e) => {
  if (!isResizing.value || !containerRef.value) return;
  e.preventDefault(); // 阻止滚动

  const touch = e.touches[0];
  const containerRect = containerRef.value.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const maxWidth = containerWidth * 0.6;
  const minWidth = containerWidth * 0.25;
  const newWidth = containerRect.right - touch.clientX;

  if (newWidth < 80) {
    panelCollapsed.value = true;
    panelWidth.value = DEFAULT_PANEL_WIDTH;
    if (readerState) {
      readerState.panel.collapsed = true;
    }
  } else {
    panelWidth.value = Math.min(maxWidth, Math.max(minWidth, newWidth));
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  // 标记用户已手动调整
  hasUserResized.value = true;

  if (readerState) {
    readerState.panel.width = panelWidth.value;
  }
};

// 触摸结束
const stopTouchResize = () => {
  isResizing.value = false;
  document.removeEventListener('touchmove', doTouchResize);
  document.removeEventListener('touchend', stopTouchResize);
  document.removeEventListener('touchcancel', stopTouchResize);

  // 标记用户已手动调整
  hasUserResized.value = true;

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

// EPUB 事件处理
const onChapterChange = (data) => {
  emit('chapter-change', data);
};

const onEpubTextSelection = (selection) => {
  // EPUB 文本选区 - 复用 PDF 的选区处理逻辑
  onTextSelection(selection);
};

const onPositionChange = (position) => {
  // 更新 readerState 中的位置信息
  if (readerState) {
    readerState.currentPosition = position;
  }
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
  // 切换到 AI 对话模式
  activeTab.value = 'ai';
  // 填充引用模板到输入框
  insertText.value = quoteText;
  // 聚焦输入框
  chatInputRef.value?.focus();
};

// ===== 选中文字事件处理 =====
// AI 输出区选中文字发送到输入框
const handleAiSendToInput = (text) => {
  insertText.value = text;
  chatInputRef.value?.focus();
};

// AI 输出区选中文字 AI 解释
const handleAiExplain = (text) => {
  // 直接调用 AI 聊天进行解释
  handleAiChat(`请解释以下内容：\n${text}`);
};

// 即时参考区选中文字发送到输入框
const handleRefSendToInput = (text) => {
  insertText.value = text;
  chatInputRef.value?.focus();
};

// 即时参考区选中文字 AI 解释
const handleRefAskAI = (text) => {
  handleAiChat(`请解释以下内容：\n${text}`);
};

// 聊天记录选中文字发送到输入框
const handleChatSendToInput = (text) => {
  insertText.value = text;
  chatInputRef.value?.focus();
};

// 聊天记录选中文字 AI 解释
const handleChatAskAI = (text) => {
  handleAiChat(`请解释以下内容：\n${text}`);
};

// ===== PDF 选中菜单事件 =====
// PDF 选中文字保存笔记
const handlePdfSaveNote = async (data) => {
  if (!data?.text || !props.textbookId) return;

  try {
    const noteData = {
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      sourceType: data.sourceType || 'pdf_selection',
      query: data.text.slice(0, 50),
      content: { text: data.text },
      snippet: data.text.slice(0, 100),
      page: data.page || props.currentPage
    };
    const res = await textbookNoteAPI.create(noteData);
    // 更新笔记列表
    notes.value.unshift({
      id: res.data?.id,
      ...noteData,
      createdAt: new Date().toISOString()
    });
    message.success('已保存到笔记');
  } catch (error) {
    console.error('保存笔记失败:', error);
    message.error('保存失败');
  }
};

// PDF 选中文字发送到输入框
const handlePdfSendToInput = (text) => {
  insertText.value = text;
  chatInputRef.value?.focus();
};

// PDF 选中文字 AI 解释
const handlePdfAskAI = (text) => {
  handleAiChat(`请解释以下内容：\n${text}`);
};

// PDF 选中文字放入解析（带截图）
const handlePdfToAnalysis = (data) => {
  activeTab.value = 'ai';
  // 使用截图和文本构建分析请求
  const prompt = data.text
    ? `请分析以下内容：\n${data.text}`
    : '请分析当前页面内容';

  // 获取截图（优先使用传入的截图）
  const screenshot = data.screenshot || singlePageRef.value?.getPageScreenshot?.();
  handleAiChat(prompt, screenshot ? { preview: screenshot } : null);
};

// PDF 选中文字放入解题
const handlePdfToSolving = (data) => {
  activeTab.value = 'solving';
  // 获取截图
  const screenshot = data.screenshot || singlePageRef.value?.getPageScreenshot?.();
  if (screenshot && solvingPanelRef.value) {
    solvingPanelRef.value.receiveImage(screenshot);
  }
};

// PDF 高亮文本（TODO: 实现高亮持久化）
const handlePdfHighlight = (data) => {
  // 暂时保存为笔记
  handlePdfSaveNote({
    text: data.text,
    sourceType: 'highlight',
    page: data.page
  });
  message.success('已添加高亮');
};

// PDF 书写保存到笔记
const handleDrawingSaveNote = async (data) => {
  if (!data?.content || !props.textbookId) return;

  try {
    const noteData = {
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      sourceType: 'drawing',
      query: `手写草稿 - 第${data.page}页`,
      content: data.content,  // 结构化笔画数据（包含 preview）
      snippet: `[手写草稿] 第${data.page}页`,
      page: data.page
    };

    const res = await textbookNoteAPI.create(noteData);

    // 更新笔记列表
    notes.value.unshift({
      id: res.data?.id,
      ...noteData,
      createdAt: new Date().toISOString()
    });

    message.success(`手写草稿已保存（第${data.page}页）`);
  } catch (error) {
    console.error('保存手写草稿失败:', error);
    message.error('保存失败');
  }
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
const handleAiChat = async (text, image = null, options = {}) => {
  if (!text.trim() || aiStreaming.value) return;

  // 切换到 AI 输出 Tab
  activeTab.value = 'ai';

  // 处理图片：如果用户粘贴了图片，需要转换为 base64
  let imagePreviewForDisplay = null;
  let imageBase64ForApi = null;

  if (image) {
    // 如果有 file 对象（用户粘贴的图片），转换为 base64
    if (image.file) {
      imageBase64ForApi = await aiStreamChat.fileToBase64(image.file);
      imagePreviewForDisplay = imageBase64ForApi; // 使用 base64 作为预览
    } else if (typeof image === 'string') {
      // 已经是 base64 字符串（如页面截图）
      imageBase64ForApi = image;
      imagePreviewForDisplay = image;
    } else if (image.preview && image.preview.startsWith('data:')) {
      // preview 已经是 base64 格式
      imageBase64ForApi = image.preview;
      imagePreviewForDisplay = image.preview;
    }
  }

  // 如果没有用户提供的图片，自动获取当前页截图
  if (!imageBase64ForApi) {
    imageBase64ForApi = singlePageRef.value?.getPageScreenshot?.() || null;
  }

  // 添加用户消息
  const userMsgId = generateMessageId();
  const userMessage = {
    id: userMsgId,
    role: 'user',
    content: options.displayText || text, // 显示文本（可能是折叠标题）
    fullContent: options.displayText ? text : null, // 完整内容（用于折叠展开）
    isCollapsible: !!options.displayText, // 是否可折叠
    image: imagePreviewForDisplay,
    page: props.currentPage,
    createdAt: new Date()
  };
  aiMessages.value.push(userMessage);

  // 添加空的 AI 消息（用于流式填充）
  const aiMsgId = generateMessageId();
  const aiMessage = {
    id: aiMsgId,
    role: 'assistant',
    content: '',
    page: props.currentPage,
    createdAt: new Date()
  };
  aiMessages.value.push(aiMessage);
  currentAiMessageId.value = aiMsgId;

  // 开始流式输出
  aiLoading.value = true;
  aiStreaming.value = true;

  const startTime = Date.now();

  try {
    // 创建流式聊天（传递 base64 截图）
    streamController = aiStreamChat.create(
      {
        textbookId: props.textbookId,
        sessionId: sessionId.value,
        message: text,
        context: '', // 不再使用文本上下文
        subject: props.subject,
        image: imageBase64ForApi // 传递 base64 字符串
      },
      {
        onStart: (connectionId) => {
          console.log('Stream started:', connectionId);
        },
        onChunk: (chunk) => {
          // 找到当前 AI 消息并追加内容
          const msgIndex = aiMessages.value.findIndex(m => m.id === currentAiMessageId.value);
          if (msgIndex !== -1) {
            aiMessages.value[msgIndex].content += chunk;
          }
        },
        onDone: (data) => {
          aiStreaming.value = false;
          aiLoading.value = false;
          currentAiMessageId.value = null;
          streamController = null;

          // 保存对话到后端
          saveAiConversation(userMessage, aiMessages.value.find(m => m.id === aiMsgId));
        },
        onError: (errorMsg) => {
          aiStreaming.value = false;
          aiLoading.value = false;
          currentAiMessageId.value = null;
          message.error(errorMsg || 'AI 对话失败');
          // 移除失败的 AI 消息
          aiMessages.value = aiMessages.value.filter(m => m.id !== aiMsgId);
          streamController = null;
        },
        onAborted: () => {
          aiStreaming.value = false;
          aiLoading.value = false;
          currentAiMessageId.value = null;
          message.info('已停止生成');
          streamController = null;
        }
      }
    );
  } catch (error) {
    aiStreaming.value = false;
    aiLoading.value = false;
    currentAiMessageId.value = null;
    message.error(error.message || 'AI 对话失败');
    // 移除失败的 AI 消息
    aiMessages.value = aiMessages.value.filter(m => m.id !== aiMsgId);
    streamController = null;
  }
};

// 保存 AI 对话到后端
const saveAiConversation = async (userMsg, aiMsg) => {
  if (!props.textbookId) return;

  try {
    // 保存用户消息
    await textbookChatAPI.addMessage(props.textbookId, {
      role: 'user',
      content: userMsg.content,
      page: userMsg.page,
      sourceType: 'ai_chat',
      metadata: JSON.stringify({ image: !!userMsg.image })
    });

    // 保存 AI 回复
    if (aiMsg?.content) {
      await textbookChatAPI.addMessage(props.textbookId, {
        role: 'assistant',
        content: aiMsg.content,
        page: aiMsg.page,
        sourceType: 'ai_chat'
      });
    }
  } catch (error) {
    console.warn('保存 AI 对话失败:', error);
  }
};

// ===== 停止流式输出 =====
const handleStopStream = () => {
  if (streamController) {
    streamController.abort();
    streamController = null;
  }
};

// ===== AI 分析结果处理（深入学习本页） =====
const handleAiAnalyzeResult = (result) => {
  // 将分析结果作为对话添加到 AI 消息列表
  const userMsgId = generateMessageId();
  aiMessages.value.push({
    id: userMsgId,
    role: 'user',
    content: `请深入分析当前页面内容（${result.info?.pages || `P${props.currentPage}`}）`,
    page: props.currentPage,
    createdAt: new Date()
  });

  aiMessages.value.push({
    id: generateMessageId(),
    role: 'assistant',
    content: result.content,
    page: props.currentPage,
    createdAt: new Date()
  });

  activeTab.value = 'ai'; // 自动切换到 AI 输出 Tab
};

// 更新 AI 消息列表
const updateAiMessages = (newMessages) => {
  aiMessages.value = newMessages;
};

// 保存 AI 对话中的笔记
const handleAiSaveNote = async (data) => {
  // 刷新笔记列表
  loadNotes();
};

// 编辑 AI 对话中的用户消息
const handleEditAiMessage = (msg) => {
  // 将消息内容填入输入框
  insertText.value = msg.content;
  chatInputRef.value?.focus();
};

// 移除旧的引用到聊天功能（不再需要）
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
  // 获取最后一条用户消息并重新发送
  const lastUserMsg = [...aiMessages.value].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    // 移除最后一条 AI 回复
    const lastAiMsgIndex = aiMessages.value.map(m => m.role).lastIndexOf('assistant');
    if (lastAiMsgIndex !== -1) {
      aiMessages.value.splice(lastAiMsgIndex, 1);
    }
    // 重新发送
    handleAiChat(lastUserMsg.content);
  }
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
    // 如果有保存的宽度，恢复它并标记为已调整
    if (panel.width) {
      panelWidth.value = panel.width;
      hasUserResized.value = true;
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

// ===== 笔记操作菜单选项 =====
const noteActionOptions = [
  {
    label: '跳转教材',
    key: 'jump',
    icon: () => h(NIcon, null, { default: () => h(BookOutline) })
  },
  {
    label: '专注模式',
    key: 'focus',
    icon: () => h(NIcon, null, { default: () => h(ExpandOutline) })
  },
  {
    label: '编辑',
    key: 'edit',
    icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
  },
  {
    label: '删除',
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
  }
];

// ===== 处理笔记操作 =====
const handleNoteAction = (key, note) => {
  if (key === 'delete') {
    handleDeleteNote(note.id);
  } else if (key === 'jump') {
    // 跳转到教材对应页面
    goToPage(note.page);
    message.info(`已跳转到第 ${note.page} 页`);
  } else if (key === 'edit') {
    // 展开笔记以便查看/编辑
    if (!expandedNotes.value.has(note.id)) {
      expandedNotes.value.add(note.id);
      expandedNotes.value = new Set(expandedNotes.value);
    }
    message.info('已展开笔记内容');
  } else if (key === 'focus') {
    // 进入专注模式
    router.push(`/textbook/focus/${note.id}`);
  }
};

// ===== 直接保存笔记（笔记Tab输入框提交）=====
const handleDirectSaveNote = async (text) => {
  if (!text || !props.textbookId) {
    message.warning('请输入笔记内容');
    return;
  }

  try {
    const noteData = {
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      sourceType: 'user_note',
      query: text.slice(0, 50),
      content: { text, page: props.currentPage },
      snippet: text.slice(0, 100),
      page: props.currentPage
    };

    const res = await textbookNoteAPI.create(noteData);

    // 添加到笔记列表顶部
    notes.value.unshift({
      id: res.data?.id,
      ...noteData,
      createdAt: new Date().toISOString()
    });

    message.success(`笔记已保存（第${props.currentPage}页）`);
  } catch (error) {
    console.error('保存笔记失败:', error);
    message.error('保存失败，请检查网络连接');
  }
};

// ===== 笔记类型映射 =====
const getNoteTypeLabel = (sourceType) => {
  const map = {
    'dict': '查字',
    'search': '搜索',
    'ai_analysis': 'AI分析',
    'ai_quote': 'AI对话',
    'user_note': '笔记',
    'pdf_selection': '摘录',
    'practice': '练习',
    'exercise': '练习',
    'solving': '解题',
    'highlight': '高亮',
    'region_screenshot': '截图',
    'drawing': '草稿'
  };
  return map[sourceType] || '笔记';
};

const getNoteTypeStyle = (sourceType) => {
  const map = {
    'dict': 'info',
    'search': 'default',
    'ai_analysis': 'success',
    'ai_quote': 'success',
    'user_note': 'warning',
    'pdf_selection': 'default',
    'practice': 'primary',
    'exercise': 'primary',
    'solving': 'error',
    'highlight': 'info',
    'region_screenshot': 'default',
    'drawing': 'error'
  };
  return map[sourceType] || 'default';
};

// 获取笔记完整文本（用于展开显示）
const getNoteFullText = (note) => {
  // 优先使用 content.text
  if (note.content?.text) {
    return note.content.text;
  }
  // 其次使用 snippet
  return note.snippet || '';
};

// 获取练习题数组（兼容多题和单题两种格式）
const getPracticeQuestions = (note) => {
  if (!note?.content) return [];
  // 多题格式：{ questions: [...] }
  if (Array.isArray(note.content.questions) && note.content.questions.length > 0) {
    return note.content.questions;
  }
  // 单题格式：{ question: {...} }
  if (note.content.question && note.content.question.stem) {
    return [note.content.question];
  }
  return [];
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

// ===== 处理笔记保存（实时更新） =====
const handleNoteSaved = (noteData) => {
  if (noteData && noteData.id) {
    // 将新笔记添加到列表顶部
    notes.value.unshift(noteData);
  }
};

// ===== 笔记练习题交互 =====
// 切换笔记展开/折叠（一次只展开一个）
const toggleNoteExpand = (note) => {
  if (expandedNotes.value.has(note.id)) {
    // 当前已展开，点击则折叠
    expandedNotes.value.delete(note.id);
  } else {
    // 展开新的笔记前，先清除其他展开的笔记
    expandedNotes.value.clear();
    expandedNotes.value.add(note.id);
  }
  // 触发响应式更新
  expandedNotes.value = new Set(expandedNotes.value);
};

// ===== 获取页面截图供练习面板使用 =====
const getPageScreenshotForPractice = () => {
  return singlePageRef.value?.getPageScreenshot?.() || null;
};

// ===== 练习模式相关 =====
// 从练习切换到解析
const handleGoToAnalysis = () => {
  activeTab.value = 'ai';
};

// 练习保存笔记后刷新笔记列表
const handlePracticeSaveNote = () => {
  loadNotes();
};

// ===== 解题模式相关 =====
// 解题保存笔记后刷新列表
const handleSolvingSaveNote = () => {
  loadNotes();
};

// 开始框选区域（启动区域选择器）
const handleStartRegionSelect = () => {
  singlePageRef.value?.startRegionSelect?.();
};

// 处理区域选择结果
const handleRegionAction = (data) => {
  const { action, image } = data;

  switch (action) {
    case 'solving':
      // 发送到解题
      activeTab.value = 'solving';
      if (image && solvingPanelRef.value) {
        solvingPanelRef.value.receiveImage(image);
      }
      break;

    case 'practice':
      // TODO: 练习模式暂时使用整页截图
      activeTab.value = 'practice';
      break;

    case 'ai':
      // 发送到 AI 解析
      activeTab.value = 'ai';
      handleAiChat('请分析这个题目', { preview: image });
      break;

    case 'note':
      // 保存为笔记（图片形式）
      handlePdfSaveNote({
        text: '[图片笔记]',
        sourceType: 'region_screenshot',
        page: props.currentPage,
        image: image
      });
      break;

    default:
      console.warn('Unknown region action:', action);
  }
};

// 练习模式：锁定渲染（防止翻页/resize触发重绘）
const renderLocked = ref(false);
const handleLockRender = () => {
  renderLocked.value = true;
  // 通知 SinglePageReader 锁定渲染
  singlePageRef.value?.lockRender?.();
};

// 练习模式：解锁渲染
const handleUnlockRender = () => {
  renderLocked.value = false;
  singlePageRef.value?.unlockRender?.();
};

// ===== 初始化 =====
onMounted(() => {
  loadChatHistory();
  loadNotes();
  // 默认使用 CSS flex: 1 实现 50-50 布局，无需 JS 计算
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
  document.removeEventListener('touchmove', doTouchResize);
  document.removeEventListener('touchend', stopTouchResize);
  document.removeEventListener('touchcancel', stopTouchResize);
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
  width: 12px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  z-index: 20;
  transition: background 0.2s;
  touch-action: none; /* 禁止浏览器默认触摸行为 */
  -webkit-tap-highlight-color: transparent;
}

/* 触摸设备上增大点击区域 */
@media (pointer: coarse) {
  .resizer {
    width: 20px;
  }
}

.resizer:hover,
.resizer.active {
  background: rgba(24, 144, 255, 0.15);
}

.resizer-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 50px;
  background: #d9d9d9;
  border-radius: 3px;
  transition: all 0.2s;
}

.resizer:hover .resizer-handle,
.resizer.active .resizer-handle {
  background: #1890ff;
  height: 70px;
  width: 6px;
}

/* 触摸设备上的手柄样式 */
@media (pointer: coarse) {
  .resizer-handle {
    width: 8px;
    height: 60px;
    background: #bbb;
  }

  .resizer:hover .resizer-handle,
  .resizer.active .resizer-handle {
    width: 8px;
    height: 80px;
  }
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

.expand-icon {
  flex-shrink: 0;
}

.note-more {
  opacity: 0;
  transition: opacity 0.2s;
  color: #999;
  flex-shrink: 0;
}

.note-item:hover .note-more {
  opacity: 1;
}

.note-more:hover {
  color: #1890ff !important;
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

/* 练习类型笔记 */
.note-item.practice-note {
  border-left: 3px solid #18a058;
}

.note-item.practice-note.expanded {
  background: #f6ffed;
}

/* 内联练习题 */
.practice-questions-inline {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #d9d9d9;
}

/* 笔记展开内容 */
.note-content-expanded {
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.note-full-text {
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 书写笔记图片 */
.note-drawing-image {
  margin: 8px 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.note-drawing-image img {
  width: 100%;
  display: block;
}

/* 草稿预览缩略图 */
.drawing-preview-thumb {
  max-width: 120px;
  max-height: 80px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.note-textbook-info {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #d9d9d9;
  display: flex;
  align-items: center;
  gap: 8px;
}

.note-textbook-info .page-label {
  font-size: 12px;
  color: #666;
}

/* 笔记展开状态 */
.note-item.expanded {
  background: #f6f8fa;
  border-color: #d0d7de;
}

.note-item.expanded .note-query {
  font-weight: 600;
}
</style>
