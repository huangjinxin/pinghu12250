<template>
  <div class="my-notes-container">
    <n-card title="我的笔记" :bordered="false">
      <!-- 分类 Tab -->
      <n-tabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
        <n-tab-pane name="all" tab="全部" />
        <n-tab-pane name="timeline" tab="按时间" />
        <n-tab-pane name="textbook" tab="按教材" />
        <n-tab-pane name="dict" tab="生词本" />
        <n-tab-pane name="pdf_selection" tab="摘录" />
        <n-tab-pane name="practice" tab="练习" />
        <n-tab-pane name="solving" tab="解题" />
      </n-tabs>

      <!-- 搜索筛选区域 -->
      <div class="filter-section mb-4">
        <n-space align="center" :wrap="true">
          <n-input
            v-model:value="notesSearch"
            placeholder="搜索笔记内容..."
            clearable
            style="width: 200px"
            @keyup.enter="handleNotesSearch"
            @clear="handleNotesSearch"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
          <n-select
            v-model:value="notesSortBy"
            style="width: 120px"
            :options="notesSortOptions"
            @update:value="handleNotesFilterChange"
          />
          <n-button type="primary" @click="handleNotesSearch">
            <template #icon><n-icon><SearchOutline /></n-icon></template>
            搜索
          </n-button>
          <span class="text-sm text-gray-500">共 {{ notesPagination.total }} 条{{ tabLabel }}</span>
        </n-space>
      </div>

      <n-spin :show="loadingNotes">
        <!-- 生词本视图 -->
        <template v-if="activeTab === 'dict'">
          <!-- 生词本工具栏 -->
          <div class="vocab-toolbar mb-4">
            <n-space align="center" justify="space-between">
              <n-space align="center">
                <n-radio-group v-model:value="vocabGridType" size="small">
                  <n-radio-button value="mi">米字格</n-radio-button>
                  <n-radio-button value="tian">田字格</n-radio-button>
                </n-radio-group>
                <n-divider vertical />
                <n-button size="small" quaternary @click="handleSelectAll">
                  全选
                </n-button>
                <n-button size="small" quaternary @click="handleDeselectAll" :disabled="selectedVocabNotes.size === 0">
                  取消
                </n-button>
                <span class="text-sm text-gray-500">
                  已选 {{ selectedVocabNotes.size }} / {{ notesList.length }}
                </span>
              </n-space>
              <n-button
                type="primary"
                :disabled="selectedVocabNotes.size === 0"
                @click="handleBatchPractice"
              >
                批量练习
              </n-button>
            </n-space>
          </div>

          <!-- 生词卡片网格 -->
          <div v-if="notesList.length > 0" class="vocab-grid">
            <VocabularyCard
              v-for="note in notesList"
              :key="note.id"
              :note="note"
              :grid-type="vocabGridType"
              :selected="selectedVocabNotes.has(note.id)"
              :practice-records="practiceRecordsMap[note.id] || []"
              @click="toggleVocabSelect(note)"
              @practice="handleStartPractice"
              @favorite="handleVocabFavorite"
              @view-record="handleViewRecord"
              @delete="handleDeleteVocab"
            />
          </div>
          <n-empty v-else description="还没有生词" class="py-8">
            <template #extra>
              <span class="text-sm text-gray-500">在阅读教材时查询生字即可添加到生词本</span>
            </template>
          </n-empty>
        </template>

        <!-- 按时间排序视图 -->
        <template v-else-if="notesViewMode === 'timeline'">
          <div v-if="notesList.length > 0" class="notes-timeline">
            <div v-for="(group, dateKey) in notesByDate" :key="dateKey" class="timeline-group">
              <div class="timeline-date">{{ dateKey }}</div>
              <div class="timeline-items">
                <n-card
                  v-for="note in group"
                  :key="note.id"
                  class="note-card mb-3"
                  :class="{ expanded: expandedNotes.has(note.id) }"
                  size="small"
                  @click="toggleNoteExpand(note)"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <n-tag size="tiny" :type="getNoteTypeStyle(note.sourceType)">
                          {{ getNoteTypeLabel(note.sourceType) }}
                        </n-tag>
                        <span class="text-xs text-gray-400">P{{ note.page }}</span>
                        <span v-if="note.textbook" class="text-xs text-blue-500">{{ note.textbook.title }}</span>
                        <n-icon v-if="expandedNotes.has(note.id)" size="14" color="#999"><ChevronUpOutline /></n-icon>
                        <n-icon v-else size="14" color="#999"><ChevronDownOutline /></n-icon>
                      </div>
                      <p class="text-sm font-medium mb-1">{{ note.query }}</p>
                      <!-- 折叠时显示摘要 -->
                      <template v-if="!expandedNotes.has(note.id)">
                        <img
                          v-if="note.sourceType === 'drawing' && getDrawingPreviewUrl(note.content)"
                          :src="getDrawingPreviewUrl(note.content)"
                          alt="草稿预览"
                          class="drawing-preview-thumb"
                        />
                        <p v-else class="text-xs text-gray-600 line-clamp-2">{{ note.snippet }}</p>
                      </template>
                      <!-- 展开时显示内容 -->
                      <div v-else class="note-expanded-content" @click.stop>
                        <!-- 练习题类型 -->
                        <template v-if="note.sourceType === 'practice' && getPracticeQuestions(note).length > 0">
                          <PracticeQuestions
                            :questions="getPracticeQuestions(note)"
                            :compact="true"
                            :show-footer="true"
                            :show-feedback="true"
                          />
                        </template>
                        <!-- 草稿类型 -->
                        <template v-else-if="note.sourceType === 'drawing' && note.content">
                          <StrokeRenderer
                            :content="note.content"
                            :preview-mode="false"
                            :max-width="400"
                            :show-playback="true"
                          />
                        </template>
                        <!-- 普通笔记 -->
                        <template v-else>
                          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ getNoteFullText(note) }}</p>
                        </template>
                      </div>
                      <p class="text-xs text-gray-400 mt-1">{{ formatNoteDetailTime(note.createdAt) }}</p>
                    </div>
                    <n-dropdown trigger="click" :options="noteActionOptions" @select="(key) => handleNoteAction(key, note)">
                      <n-button text size="tiny" @click.stop>
                        <n-icon color="#999"><EllipsisHorizontalOutline /></n-icon>
                      </n-button>
                    </n-dropdown>
                  </div>
                </n-card>
              </div>
            </div>
          </div>
          <n-empty v-else description="还没有学习笔记" class="py-8">
            <template #extra>
              <span class="text-sm text-gray-500">在阅读教材时保存内容即可添加笔记</span>
            </template>
          </n-empty>
        </template>

        <!-- 按教材分组视图 -->
        <template v-else>
          <div v-if="Object.keys(notesByTextbook).length > 0" class="notes-by-textbook">
            <n-collapse>
              <n-collapse-item
                v-for="(group, textbookId) in notesByTextbook"
                :key="textbookId"
                :title="group.title"
                :name="textbookId"
              >
                <template #header-extra>
                  <n-tag size="small" round>{{ group.notes.length }} 条</n-tag>
                </template>
                <div class="notes-group-items">
                  <n-card
                    v-for="note in group.notes"
                    :key="note.id"
                    class="note-card mb-3"
                    :class="{ expanded: expandedNotes.has(note.id) }"
                    size="small"
                    @click="toggleNoteExpand(note)"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <n-tag size="tiny" :type="getNoteTypeStyle(note.sourceType)">
                            {{ getNoteTypeLabel(note.sourceType) }}
                          </n-tag>
                          <span class="text-xs text-gray-400">P{{ note.page }}</span>
                          <n-icon v-if="expandedNotes.has(note.id)" size="14" color="#999"><ChevronUpOutline /></n-icon>
                          <n-icon v-else size="14" color="#999"><ChevronDownOutline /></n-icon>
                        </div>
                        <p class="text-sm font-medium mb-1">{{ note.query }}</p>
                        <!-- 折叠时显示摘要 -->
                        <template v-if="!expandedNotes.has(note.id)">
                          <img
                            v-if="note.sourceType === 'drawing' && getDrawingPreviewUrl(note.content)"
                            :src="getDrawingPreviewUrl(note.content)"
                            alt="草稿预览"
                            class="drawing-preview-thumb"
                          />
                          <p v-else class="text-xs text-gray-600 line-clamp-2">{{ note.snippet }}</p>
                        </template>
                        <!-- 展开时显示内容 -->
                        <div v-else class="note-expanded-content" @click.stop>
                          <!-- 练习题类型 -->
                          <template v-if="note.sourceType === 'practice' && getPracticeQuestions(note).length > 0">
                            <PracticeQuestions
                              :questions="getPracticeQuestions(note)"
                              :compact="true"
                              :show-footer="true"
                              :show-feedback="true"
                            />
                          </template>
                          <!-- 草稿类型 -->
                          <template v-else-if="note.sourceType === 'drawing' && note.content">
                            <StrokeRenderer
                              :content="note.content"
                              :preview-mode="false"
                              :max-width="400"
                              :show-playback="true"
                            />
                          </template>
                          <!-- 普通笔记 -->
                          <template v-else>
                            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ getNoteFullText(note) }}</p>
                          </template>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">{{ formatNoteDetailTime(note.createdAt) }}</p>
                      </div>
                      <n-dropdown trigger="click" :options="noteActionOptions" @select="(key) => handleNoteAction(key, note)">
                        <n-button text size="tiny" @click.stop>
                          <n-icon color="#999"><EllipsisHorizontalOutline /></n-icon>
                        </n-button>
                      </n-dropdown>
                    </div>
                  </n-card>
                </div>
              </n-collapse-item>
            </n-collapse>
          </div>
          <n-empty v-else description="还没有学习笔记" class="py-8">
            <template #extra>
              <span class="text-sm text-gray-500">在阅读教材时保存内容即可添加笔记</span>
            </template>
          </n-empty>
        </template>
      </n-spin>

      <!-- 分页组件 -->
      <div v-if="notesList.length && notesPagination.totalPages > 1" class="pagination-section mt-6">
        <n-space justify="center" align="center">
          <n-pagination
            v-model:page="notesPage"
            :page-count="notesPagination.totalPages"
            :page-size="notesPageSize"
            :item-count="notesPagination.total"
            show-size-picker
            show-quick-jumper
            :page-sizes="[10, 20, 50]"
            @update:page="handleNotesPageChange"
            @update:page-size="handleNotesPageSizeChange"
          >
            <template #prefix="{ itemCount }">
              共 {{ itemCount }} 条笔记
            </template>
          </n-pagination>
        </n-space>
      </div>
    </n-card>

    <!-- 书写练习模态框 -->
    <CharacterPractice
      v-if="showPracticeModal"
      :notes="practiceNotes"
      @close="showPracticeModal = false"
      @save="handlePracticeSave"
      @complete="handlePracticeComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NIcon } from 'naive-ui';
import { textbookNoteAPI } from '@/api';
import PracticeQuestions from '@/components/textbook/PracticeQuestions.vue';
import StrokeRenderer from '@/components/textbook/StrokeRenderer.vue';
import VocabularyCard from '@/components/textbook/VocabularyCard.vue';
import CharacterPractice from '@/components/textbook/CharacterPractice.vue';
import { getDrawingPreviewUrl } from '@/composables/useStrokeData';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline'
import EllipsisHorizontalOutline from '@vicons/ionicons5/es/EllipsisHorizontalOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import ExpandOutline from '@vicons/ionicons5/es/ExpandOutline'

const router = useRouter();
const message = useMessage();

// Tab 状态
const activeTab = ref('all'); // 'all' | 'timeline' | 'textbook' | 'dict' | 'pdf_selection' | 'practice' | 'solving'

// 笔记列表
const notesList = ref([]);
const loadingNotes = ref(false);
const expandedNotes = ref(new Set());

// 视图模式（基于 activeTab 计算）
const notesViewMode = computed(() => {
  if (activeTab.value === 'textbook') return 'textbook';
  return 'timeline';
});

// ========== 生词本专用状态 ==========
const vocabGridType = ref('mi'); // 'mi' 米字格 | 'tian' 田字格
const showPracticeModal = ref(false);
const practiceNotes = ref([]); // 当前练习的笔记列表
const practiceRecordsMap = ref({}); // noteId -> practice records

// 获取生词的练习记录
const fetchPracticeRecords = async (noteIds) => {
  if (!noteIds.length) return;
  try {
    // 查询 sourceType 为 writing_practice 且 originalNoteId 在 noteIds 中的记录
    const res = await textbookNoteAPI.list({
      sourceType: 'writing_practice',
      limit: 100,
    });
    if (res.success && res.data?.notes) {
      const recordsMap = {};
      res.data.notes.forEach(record => {
        const originalId = record.content?.originalNoteId;
        if (originalId && noteIds.includes(originalId)) {
          if (!recordsMap[originalId]) {
            recordsMap[originalId] = [];
          }
          recordsMap[originalId].push({
            id: record.id,
            preview: record.content?.preview,
            createdAt: record.createdAt,
          });
        }
      });
      practiceRecordsMap.value = recordsMap;
    }
  } catch (error) {
    console.error('获取练习记录失败:', error);
  }
};

// 开始书写练习
const handleStartPractice = (note) => {
  practiceNotes.value = [note];
  showPracticeModal.value = true;
};

// 批量练习选中的生词
const selectedVocabNotes = ref(new Set());
const handleBatchPractice = () => {
  const selected = notesList.value.filter(n => selectedVocabNotes.value.has(n.id));
  if (selected.length === 0) {
    message.warning('请先选择要练习的生词');
    return;
  }
  practiceNotes.value = selected;
  showPracticeModal.value = true;
};

// 全选生词
const handleSelectAll = () => {
  notesList.value.forEach(note => {
    selectedVocabNotes.value.add(note.id);
  });
  selectedVocabNotes.value = new Set(selectedVocabNotes.value);
};

// 取消全选
const handleDeselectAll = () => {
  selectedVocabNotes.value.clear();
  selectedVocabNotes.value = new Set(selectedVocabNotes.value);
};

// 切换生词选中状态
const toggleVocabSelect = (note) => {
  if (selectedVocabNotes.value.has(note.id)) {
    selectedVocabNotes.value.delete(note.id);
  } else {
    selectedVocabNotes.value.add(note.id);
  }
  selectedVocabNotes.value = new Set(selectedVocabNotes.value);
};

// 删除生词
const handleDeleteVocab = async (note) => {
  try {
    await textbookNoteAPI.delete(note.id);
    notesList.value = notesList.value.filter(n => n.id !== note.id);
    selectedVocabNotes.value.delete(note.id);
    message.success('已删除');
  } catch (error) {
    message.error('删除失败');
  }
};

// 练习保存回调
const handlePracticeSave = ({ noteId, practiceId, character }) => {
  // 刷新练习记录
  if (!practiceRecordsMap.value[noteId]) {
    practiceRecordsMap.value[noteId] = [];
  }
  practiceRecordsMap.value[noteId].unshift({
    id: practiceId,
    createdAt: new Date().toISOString(),
  });
  practiceRecordsMap.value = { ...practiceRecordsMap.value };
};

// 练习完成回调
const handlePracticeComplete = (records) => {
  showPracticeModal.value = false;
  message.success(`完成 ${records.length} 个字的练习`);
  selectedVocabNotes.value.clear();
};

// 查看练习记录
const handleViewRecord = (record) => {
  router.push(`/textbook/focus/${record.id}`);
};

// 收藏生词
const handleVocabFavorite = async (note) => {
  message.info('收藏功能开发中');
};

// Tab 标签
const tabLabel = computed(() => {
  const labels = {
    'all': '笔记',
    'timeline': '笔记',
    'textbook': '笔记',
    'dict': '生词',
    'pdf_selection': '摘录',
    'practice': '练习',
    'solving': '解题',
  };
  return labels[activeTab.value] || '笔记';
});

// 筛选分页
const notesSearch = ref('');
const notesSourceType = computed(() => {
  // 根据 Tab 决定筛选类型
  if (['dict', 'pdf_selection', 'practice', 'solving'].includes(activeTab.value)) {
    return activeTab.value;
  }
  return null; // all, timeline, textbook 不筛选类型
});
const notesSortBy = ref('latest');
const notesPage = ref(1);
const notesPageSize = ref(20);
const notesPagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });

// 笔记排序选项
const notesSortOptions = [
  { label: '最新优先', value: 'latest' },
  { label: '最早优先', value: 'oldest' },
];

// 笔记操作选项
const noteActionOptions = [
  { label: '跳转到教材', key: 'goto', icon: () => h(NIcon, null, { default: () => h(ExpandOutline) }) },
  { label: '删除笔记', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
];

// 按日期分组笔记
const notesByDate = computed(() => {
  const groups = {};
  notesList.value.forEach(note => {
    const date = new Date(note.createdAt);
    const dateKey = formatDateKey(date);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(note);
  });
  return groups;
});

// 按教材分组笔记
const notesByTextbook = computed(() => {
  const groups = {};
  notesList.value.forEach(note => {
    const textbookId = note.textbookId || 'unknown';
    if (!groups[textbookId]) {
      groups[textbookId] = {
        title: note.textbook?.title || '未知教材',
        notes: []
      };
    }
    groups[textbookId].notes.push(note);
  });
  return groups;
});

// 格式化日期键
const formatDateKey = (date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (noteDate.getTime() === today.getTime()) {
    return '今天';
  } else if (noteDate.getTime() === yesterday.getTime()) {
    return '昨天';
  } else if (now.getTime() - noteDate.getTime() < 7 * 86400000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  }
};

// 格式化笔记详细时间
const formatNoteDetailTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 展开/折叠笔记
const toggleNoteExpand = (note) => {
  if (expandedNotes.value.has(note.id)) {
    expandedNotes.value.delete(note.id);
  } else {
    expandedNotes.value.clear();
    expandedNotes.value.add(note.id);
  }
  expandedNotes.value = new Set(expandedNotes.value);
};

// 获取笔记完整内容
const getNoteFullText = (note) => {
  if (note.content?.text) return note.content.text;
  return note.snippet || '';
};

// 获取练习题数组
const getPracticeQuestions = (note) => {
  if (!note?.content) return [];
  if (Array.isArray(note.content.questions) && note.content.questions.length > 0) {
    return note.content.questions;
  }
  if (note.content.question) {
    return [note.content];
  }
  return [];
};

// 笔记类型标签
const getNoteTypeLabel = (sourceType) => {
  const map = {
    'dict': '查字',
    'search': '搜索',
    'ai_analysis': 'AI分析',
    'ai_quote': 'AI对话',
    'user_note': '笔记',
    'pdf_selection': '摘录',
    'practice': '练习',
    'solving': '解题',
    'drawing': '草稿',
  };
  return map[sourceType] || '笔记';
};

// 笔记类型样式
const getNoteTypeStyle = (sourceType) => {
  const map = {
    'dict': 'info',
    'search': 'default',
    'ai_analysis': 'success',
    'ai_quote': 'success',
    'user_note': 'warning',
    'pdf_selection': 'info',
    'practice': 'primary',
    'solving': 'error',
    'drawing': 'warning',
  };
  return map[sourceType] || 'default';
};

// 获取笔记列表
const fetchNotes = async () => {
  loadingNotes.value = true;
  try {
    const params = {
      page: notesPage.value,
      limit: notesPageSize.value,
      sortBy: notesSortBy.value,
    };
    if (notesSearch.value) params.search = notesSearch.value;
    if (notesSourceType.value) params.sourceType = notesSourceType.value;

    const res = await textbookNoteAPI.list(params);
    if (res.success && res.data?.notes) {
      notesList.value = res.data.notes;
      notesPagination.value = res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

      // 如果是生词本 tab，获取练习记录
      if (activeTab.value === 'dict') {
        const noteIds = res.data.notes.map(n => n.id);
        await fetchPracticeRecords(noteIds);
      }
    }
  } catch (error) {
    console.error('获取笔记失败:', error);
    message.error('加载笔记失败');
  } finally {
    loadingNotes.value = false;
  }
};

// Tab 切换
const handleTabChange = (tab) => {
  notesPage.value = 1;
  selectedVocabNotes.value.clear();
  fetchNotes();
};

// 搜索笔记
const handleNotesSearch = () => {
  notesPage.value = 1;
  fetchNotes();
};

// 筛选变化
const handleNotesFilterChange = () => {
  notesPage.value = 1;
  fetchNotes();
};

// 分页变化
const handleNotesPageChange = (page) => {
  notesPage.value = page;
  fetchNotes();
};

const handleNotesPageSizeChange = (pageSize) => {
  notesPageSize.value = pageSize;
  notesPage.value = 1;
  fetchNotes();
};

// 笔记操作
const handleNoteAction = async (key, note) => {
  if (key === 'delete') {
    try {
      await textbookNoteAPI.delete(note.id);
      message.success('删除成功');
      fetchNotes();
    } catch (error) {
      message.error('删除失败');
    }
  } else if (key === 'goto') {
    if (note.textbookId) {
      router.push(`/textbook/reader/${note.textbookId}?page=${note.page || 1}`);
    } else {
      message.warning('该笔记没有关联教材');
    }
  }
};

// 监听筛选变化
watch([notesSortBy], () => {
  handleNotesFilterChange();
});

onMounted(() => {
  fetchNotes();
});
</script>

<style scoped>
.my-notes-container {
  max-width: 1000px;
  margin: 0 auto;
}

/* Tabs 样式 */
.my-notes-container :deep(.n-tabs-nav) {
  margin-bottom: 16px;
}

.my-notes-container :deep(.n-tabs-tab) {
  padding: 8px 16px;
}

.filter-section {
  padding: 12px 0;
}

/* 草稿预览缩略图 */
.drawing-preview-thumb {
  max-width: 120px;
  max-height: 80px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  margin: 4px 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 笔记时间线 */
.notes-timeline {
  padding: 16px 0;
}

.timeline-group {
  margin-bottom: 24px;
}

.timeline-date {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--n-color-target);
}

.note-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.note-card:hover {
  transform: translateX(4px);
}

.note-card.expanded {
  border-color: var(--n-color-target);
}

.note-expanded-content {
  margin: 12px 0;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

/* 按教材分组视图 */
.notes-by-textbook :deep(.n-collapse-item) {
  margin-bottom: 8px;
}

.notes-group-items {
  padding: 8px 0;
}

.pagination-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

/* 生词本样式 */
.vocab-toolbar {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.vocab-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 0;
  align-items: flex-start;
}

@media (max-width: 640px) {
  .vocab-grid {
    gap: 12px;
  }
}
</style>
