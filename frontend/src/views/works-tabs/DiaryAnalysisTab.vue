<template>
  <div class="diary-analysis-tab">
    <!-- 筛选和搜索 -->
    <WorksFilterBar @reset="resetFilters">
      <n-select
        v-model:value="selectedAuthor"
        placeholder="选择作者"
        :options="authorOptions"
        clearable
        style="width: 150px"
        @update:value="handleFilter"
      />

      <n-select
        v-model:value="analysisType"
        placeholder="分析类型"
        :options="typeOptions"
        clearable
        style="width: 120px"
        @update:value="handleFilter"
      />

      <n-button @click="loadRecords" :loading="loading">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        刷新
      </n-button>
    </WorksFilterBar>

    <!-- 顶部分页 -->
    <WorksPagination
      v-model:page="currentPage"
      v-model:pageSize="pageSize"
      :total="pagination.total"
      item-name="条记录"
      position="top"
      @update:page="loadRecords"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 记录列表 -->
    <n-spin :show="loading">
      <div v-if="records.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card
          v-for="record in records"
          :key="record.id"
          class="record-card"
          hoverable
          @click="viewDetail(record)"
        >
          <!-- 标签行 -->
          <div class="flex items-center gap-2 mb-3">
            <n-tag :type="record.isBatch ? 'info' : 'success'" size="small">
              {{ record.isBatch ? '批量分析' : '单条分析' }}
            </n-tag>
            <n-tag v-if="record.period" type="warning" size="small">
              {{ record.period }}
            </n-tag>
            <span class="text-xs text-gray-500">{{ record.diaryCount }}篇日记</span>
          </div>

          <!-- 日记快照标题 -->
          <div class="mb-3">
            <h3 class="font-bold text-gray-800 truncate">
              {{ getDiaryTitle(record.diarySnapshot) }}
            </h3>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">
              {{ getAnalysisPreview(record.analysis) }}
            </p>
          </div>

          <!-- 作者信息 -->
          <div class="flex items-center gap-2 mb-3">
            <n-avatar :size="24" :src="record.user?.avatar" round>
              {{ (record.user?.profile?.nickname || record.user?.username || '?').charAt(0) }}
            </n-avatar>
            <span class="text-sm text-gray-600">
              {{ record.user?.profile?.nickname || record.user?.username }}
            </span>
          </div>

          <!-- 底部信息 -->
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>{{ formatDate(record.createdAt) }}</span>
            <div class="flex items-center gap-3">
              <span v-if="record.modelName" class="flex items-center gap-1">
                <n-icon><SparklesOutline /></n-icon>
                {{ truncateModel(record.modelName) }}
              </span>
            </div>
          </div>
        </n-card>
      </div>

      <n-empty v-else description="暂无日记分析记录" class="py-12" />
    </n-spin>

    <!-- 底部分页 -->
    <WorksPagination
      v-model:page="currentPage"
      v-model:pageSize="pageSize"
      :total="pagination.total"
      item-name="条记录"
      position="bottom"
      @update:page="loadRecords"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 详情对话框 -->
    <n-modal
      v-model:show="showDetailDialog"
      preset="card"
      :title="detailTitle"
      style="width: 90vw; max-width: 800px; max-height: 85vh;"
    >
      <div class="detail-content">
        <!-- 分析元信息 -->
        <div class="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b">
          <n-tag :type="detailRecord?.isBatch ? 'info' : 'success'" size="small">
            {{ detailRecord?.isBatch ? '批量分析' : '单条分析' }}
          </n-tag>
          <n-tag v-if="detailRecord?.period" type="warning" size="small">
            {{ detailRecord?.period }}
          </n-tag>
          <span class="text-sm text-gray-500">{{ detailRecord?.diaryCount }}篇日记</span>
          <div class="flex-1"></div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <n-avatar :size="20" :src="detailRecord?.user?.avatar" round>
              {{ (detailRecord?.user?.profile?.nickname || detailRecord?.user?.username || '?').charAt(0) }}
            </n-avatar>
            <span>{{ detailRecord?.user?.profile?.nickname || detailRecord?.user?.username }}</span>
          </div>
        </div>

        <!-- 日记快照 -->
        <div v-if="detailRecord?.diarySnapshot" class="mb-4">
          <h4 class="font-bold text-gray-700 mb-2">日记信息</h4>
          <div class="bg-gray-50 rounded-lg p-3 text-sm">
            <template v-if="Array.isArray(detailRecord.diarySnapshot)">
              <div v-for="(diary, idx) in detailRecord.diarySnapshot" :key="idx" class="mb-2 last:mb-0">
                <span class="font-medium">{{ idx + 1 }}. {{ diary.title || '无标题' }}</span>
                <span class="text-gray-500 ml-2">{{ formatSnapshotDate(diary.createdAt) }}</span>
              </div>
            </template>
            <template v-else>
              <span class="font-medium">{{ detailRecord.diarySnapshot.title || '无标题' }}</span>
              <span class="text-gray-500 ml-2">{{ formatSnapshotDate(detailRecord.diarySnapshot.createdAt) }}</span>
            </template>
          </div>
        </div>

        <!-- AI 分析结果 -->
        <div>
          <h4 class="font-bold text-gray-700 mb-2">AI 分析</h4>
          <!-- 朗读播放器 -->
          <div v-if="detailRecord?.analysis" class="mb-4">
            <SpeechPlayer :text="detailRecord.analysis" />
          </div>
          <div class="analysis-content prose prose-sm max-w-none" v-html="renderedAnalysis"></div>
        </div>

        <!-- 底部元信息 -->
        <div class="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
          <span>{{ formatDate(detailRecord?.createdAt) }}</span>
          <span v-if="detailRecord?.modelName">模型: {{ detailRecord.modelName }}</span>
          <span v-if="detailRecord?.tokensUsed">Token: {{ detailRecord.tokensUsed }}</span>
          <span v-if="detailRecord?.responseTime">耗时: {{ (detailRecord.responseTime / 1000).toFixed(1) }}s</span>
        </div>
      </div>
      <template #footer>
        <n-button @click="showDetailDialog = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import { aiAnalysisAPI } from '@/api';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { marked } from 'marked';
import SpeechPlayer from '@/components/SpeechPlayer.vue';
import WorksFilterBar from '@/components/works/WorksFilterBar.vue';
import WorksPagination from '@/components/works/WorksPagination.vue';

const message = useMessage();

// 状态
const loading = ref(false);
const records = ref([]);
const authors = ref([]);
const selectedAuthor = ref(null);
const analysisType = ref(null);
const currentPage = ref(1);
const pageSize = ref(12);
const pagination = ref({ total: 0, totalPages: 0 });

// 对话框
const showDetailDialog = ref(false);
const detailRecord = ref(null);

// 选项
const typeOptions = [
  { label: '全部', value: null },
  { label: '单条分析', value: 'false' },
  { label: '批量分析', value: 'true' }
];

const authorOptions = computed(() => {
  return [
    { label: '全部作者', value: null },
    ...authors.value.map(a => ({ label: a.name, value: a.id }))
  ];
});

// 重置筛选
const resetFilters = () => {
  selectedAuthor.value = null;
  analysisType.value = null;
  currentPage.value = 1;
  loadRecords();
};

// 详情标题
const detailTitle = computed(() => {
  if (!detailRecord.value) return 'AI 分析详情';
  return getDiaryTitle(detailRecord.value.diarySnapshot);
});

// 渲染后的分析内容（与 Diaries.vue 保持一致的清理逻辑）
const renderedAnalysis = computed(() => {
  if (!detailRecord.value?.analysis) return '';

  let content = detailRecord.value.analysis;

  // 移除 JSON 代码块（评分数据部分）
  content = content.replace(/##\s*📊\s*评分数据[\s\S]*$/i, '');
  content = content.replace(/```json[\s\S]*?```/g, '');

  // 移除末尾的分隔线
  content = content.replace(/---\s*$/g, '');

  // 清理多余的空行
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  // 如果清理后没有内容，返回空
  if (!content.trim()) return '';

  return marked(content);
});

// 加载记录
const loadRecords = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    };

    if (selectedAuthor.value) {
      params.author = selectedAuthor.value;
    }

    if (analysisType.value !== null) {
      params.isBatch = analysisType.value;
    }

    const response = await aiAnalysisAPI.getPublicDiaryAnalysis(params);
    records.value = response.data?.records || [];
    authors.value = response.data?.authors || [];
    pagination.value = {
      total: response.data?.pagination?.total || 0,
      totalPages: response.data?.pagination?.totalPages || 0
    };
  } catch (error) {
    message.error(error.error || '加载失败');
  } finally {
    loading.value = false;
  }
};

// 筛选变化
const handleFilter = () => {
  currentPage.value = 1;
  loadRecords();
};

// 分页大小变化
const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadRecords();
};

// 查看详情
const viewDetail = async (record) => {
  try {
    const response = await aiAnalysisAPI.getPublicDiaryAnalysisDetail(record.id);
    detailRecord.value = response.data;
    showDetailDialog.value = true;
  } catch (error) {
    message.error(error.error || '加载详情失败');
  }
};

// 获取日记标题
const getDiaryTitle = (snapshot) => {
  if (!snapshot) return '日记分析';
  if (Array.isArray(snapshot)) {
    if (snapshot.length === 0) return '日记分析';
    if (snapshot.length === 1) return snapshot[0].title || '无标题日记';
    return `${snapshot[0].title || '无标题'}等${snapshot.length}篇`;
  }
  return snapshot.title || '无标题日记';
};

// 获取分析预览
const getAnalysisPreview = (analysis) => {
  if (!analysis) return '';
  // 移除markdown标记，取前100字符
  const text = analysis.replace(/[#*`>\[\]()]/g, '').replace(/\n+/g, ' ');
  return text.substring(0, 100) + (text.length > 100 ? '...' : '');
};

// 截断模型名
const truncateModel = (model) => {
  if (!model) return '';
  if (model.length <= 12) return model;
  return model.substring(0, 10) + '...';
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN
  });
};

// 格式化快照日期
const formatSnapshotDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd', { locale: zhCN });
};

onMounted(() => {
  loadRecords();
});
</script>

<style scoped>
.record-card {
  transition: all 0.3s;
  cursor: pointer;
}

.record-card:hover {
  transform: translateY(-4px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-content {
  max-height: calc(85vh - 180px);
  overflow-y: auto;
}

/* AI 分析内容样式（与 Diaries.vue 保持一致） */
.analysis-content {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  line-height: 1.9;
  font-size: 15px;
  color: #374151;
}

.analysis-content :deep(h1),
.analysis-content :deep(h2),
.analysis-content :deep(h3),
.analysis-content :deep(h4) {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5em;
}

.analysis-content :deep(h2) {
  font-size: 1.3em;
}

.analysis-content :deep(h3) {
  font-size: 1.15em;
}

.analysis-content :deep(p) {
  margin-bottom: 1em;
  text-align: justify;
}

.analysis-content :deep(ul),
.analysis-content :deep(ol) {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

.analysis-content :deep(li) {
  margin-bottom: 0.5em;
}

.analysis-content :deep(strong) {
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.8em 1em;
  border-left: 4px solid #6366f1;
  background-color: #f8fafc;
  color: #4b5563;
  font-style: italic;
}

.analysis-content :deep(code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.analysis-content :deep(hr) {
  margin: 1.5em 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>
