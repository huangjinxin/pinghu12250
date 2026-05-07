<template>
  <div class="calligraphy-review-tab">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <n-space>
        <n-select
          v-model:value="filterStatus"
          :options="statusOptions"
          style="width: 120px"
          placeholder="状态筛选"
        />
        <n-button @click="loadWorks">刷新</n-button>
      </n-space>
      <n-space>
        <n-button
          v-if="selectedIds.length > 0"
          type="primary"
          @click="showBatchModal = true"
        >
          批量审核 ({{ selectedIds.length }})
        </n-button>
      </n-space>
    </div>

    <!-- 作品列表 -->
    <n-spin :show="loading">
      <n-data-table
        :columns="columns"
        :data="works"
        :row-key="row => row.id"
        :checked-row-keys="selectedIds"
        @update:checked-row-keys="selectedIds = $event"
      />
      <div class="pagination">
        <n-pagination
          v-model:page="page"
          :page-count="totalPages"
          @update:page="loadWorks"
        />
      </div>
    </n-spin>

    <!-- 详情/评分弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" style="width: 800px; max-width: 95vw">
      <template #header>
        <div class="detail-header">
          <span>{{ selectedWork?.title }}</span>
          <n-tag :type="getStatusType(selectedWork?.status)">
            {{ getStatusText(selectedWork?.status) }}
          </n-tag>
        </div>
      </template>

      <div v-if="selectedWork" class="detail-content">
        <!-- 预览区域 -->
        <div class="preview-section">
          <div v-if="hasCharPreviews(selectedWork)" class="copybook-grid">
            <div v-for="(item, idx) in getContentItems(selectedWork)" :key="idx" class="char-cell">
              <div class="cell-grid"></div>
              <span class="ref-char">{{ item.character }}</span>
              <img v-if="item.preview" :src="item.preview" class="char-img" />
            </div>
          </div>
          <div v-else-if="selectedWork.preview" class="legacy-preview">
            <img :src="selectedWork.preview" :alt="selectedWork.title" />
          </div>
        </div>

        <!-- 作者信息 -->
        <div class="author-info">
          <n-avatar :size="32" :src="selectedWork.author?.avatar" />
          <div class="author-text">
            <div class="author-name">{{ selectedWork.author?.profile?.nickname || selectedWork.author?.username }}</div>
            <div class="create-time">{{ formatTime(selectedWork.createdAt) }}</div>
          </div>
        </div>

        <!-- 评分展示 -->
        <div v-if="selectedWork.evaluationScore != null" class="evaluation-section">
          <div class="score-display" :class="getScoreClass(selectedWork.evaluationScore)">
            <div class="score-number">{{ selectedWork.evaluationScore }}</div>
            <div class="score-label">{{ getScoreLabel(selectedWork.evaluationScore) }}</div>
          </div>

          <div v-if="selectedWork.evaluationData" class="evaluation-details">
            <!-- 维度分数条 -->
            <div class="score-bars">
              <div class="score-item">
                <span class="item-label">字形相似</span>
                <n-progress type="line" :percentage="(selectedWork.evaluationData.shapeMatch?.score || 0) * 2" :show-indicator="false" :height="8" />
                <span class="item-score">{{ selectedWork.evaluationData.shapeMatch?.score || 0 }}/50</span>
              </div>
              <div class="score-item">
                <span class="item-label">笔画质量</span>
                <n-progress type="line" :percentage="(selectedWork.evaluationData.strokeQuality?.score || 0) * 3.33" :show-indicator="false" :height="8" />
                <span class="item-score">{{ selectedWork.evaluationData.strokeQuality?.score || 0 }}/30</span>
              </div>
              <div class="score-item">
                <span class="item-label">整体美观</span>
                <n-progress type="line" :percentage="(selectedWork.evaluationData.aesthetics?.score || 0) * 5" :show-indicator="false" :height="8" />
                <span class="item-score">{{ selectedWork.evaluationData.aesthetics?.score || 0 }}/20</span>
              </div>
            </div>

            <!-- 每个字的详细分析 -->
            <div v-if="selectedWork.evaluationData.shapeMatch?.charScores?.length" class="char-analysis">
              <div class="analysis-title">逐字分析</div>
              <div class="char-list">
                <div
                  v-for="(item, idx) in selectedWork.evaluationData.shapeMatch.charScores"
                  :key="idx"
                  class="char-item"
                  :class="getCharScoreClass(item.similarity)"
                >
                  <div class="char-header">
                    <span class="char-text">{{ item.char }}</span>
                    <span class="char-score">{{ Math.round((item.similarity || 0) * 100) }}%</span>
                  </div>
                  <div v-if="item.reason" class="char-reason">{{ item.reason }}</div>
                </div>
              </div>
            </div>

            <!-- 评语区域 -->
            <div class="comments-section">
              <div v-if="selectedWork.evaluationData.shapeMatch?.comment" class="comment-item">
                <div class="comment-label">字形评价</div>
                <div class="comment-text">{{ selectedWork.evaluationData.shapeMatch.comment }}</div>
              </div>
              <div v-if="selectedWork.evaluationData.strokeQuality?.comment" class="comment-item">
                <div class="comment-label">笔画评价</div>
                <div class="comment-text">{{ selectedWork.evaluationData.strokeQuality.comment }}</div>
              </div>
              <div v-if="selectedWork.evaluationData.aesthetics?.comment" class="comment-item">
                <div class="comment-label">美观评价</div>
                <div class="comment-text">{{ selectedWork.evaluationData.aesthetics.comment }}</div>
              </div>
              <div v-if="selectedWork.evaluationData.summary" class="comment-item summary">
                <div class="comment-label">总体评价</div>
                <div class="comment-text">{{ selectedWork.evaluationData.summary }}</div>
              </div>
            </div>

            <!-- 改进建议 -->
            <div v-if="selectedWork.evaluationData.improvements?.length" class="improvements">
              <div class="improvements-title">改进建议</div>
              <ul class="improvements-list">
                <li v-for="(tip, idx) in selectedWork.evaluationData.improvements" :key="idx">{{ tip }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 审核操作 -->
        <div class="review-actions">
          <n-button type="warning" :loading="evaluating" @click="evaluateWork">
            AI评分
          </n-button>
          <n-divider vertical />
          <n-input-number v-model:value="reviewPoints" :min="0" :max="1000" style="width: 120px">
            <template #prefix>积分</template>
          </n-input-number>
          <n-button type="success" :loading="reviewing" @click="reviewWork('APPROVED')">
            通过
          </n-button>
          <n-button type="error" :loading="reviewing" @click="reviewWork('REJECTED')">
            拒绝
          </n-button>
          <n-button type="warning" :loading="reviewing" @click="reviewWork('ARCHIVED')">
            归档
          </n-button>
          <n-button type="error" ghost @click="deleteWork">
            删除
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 批量审核弹窗 -->
    <n-modal v-model:show="showBatchModal" preset="card" title="批量审核" style="width: 400px">
      <n-form>
        <n-form-item label="审核状态">
          <n-select v-model:value="batchStatus" :options="batchStatusOptions" />
        </n-form-item>
        <n-form-item label="奖励积分" v-if="batchStatus === 'APPROVED'">
          <n-input-number v-model:value="batchPoints" :min="0" :max="1000" style="width: 100%" />
        </n-form-item>
        <n-form-item label="审核备注">
          <n-input v-model:value="batchNote" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBatchModal = false">取消</n-button>
          <n-button type="primary" :loading="batchReviewing" @click="batchReview">
            确认审核 ({{ selectedIds.length }}个)
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, watch } from 'vue';
import { useMessage, useDialog, NButton, NTag, NAvatar } from 'naive-ui';
import { calligraphyAPI, calligraphyListAPI } from '@/api/index';

const emit = defineEmits(['update:pending-count']);
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const totalPages = ref(1);
const filterStatus = ref('all');
const selectedIds = ref([]);

const showDetailModal = ref(false);
const selectedWork = ref(null);
const evaluating = ref(false);
const reviewing = ref(false);
const reviewPoints = ref(55);

const showBatchModal = ref(false);
const batchStatus = ref('APPROVED');
const batchPoints = ref(55);
const batchNote = ref('');
const batchReviewing = ref(false);

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已归档', value: 'ARCHIVED' },
];

const batchStatusOptions = [
  { label: '通过', value: 'APPROVED' },
  { label: '拒绝', value: 'REJECTED' },
  { label: '归档', value: 'ARCHIVED' },
];

const getTablePreview = (row) => row.previewItems?.[0]?.preview || row.previewUrl || row.preview;

const columns = [
  { type: 'selection' },
  {
    title: '预览',
    key: 'preview',
    width: 80,
    render: (row) => h('img', {
      src: getTablePreview(row),
      style: { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }
    })
  },
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  {
    title: '作者',
    key: 'author',
    render: (row) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
      h(NAvatar, { size: 24, src: row.author?.avatar }),
      row.author?.profile?.nickname || row.author?.username
    ])
  },
  { title: '字数', key: 'charCount', width: 60 },
  {
    title: '评分',
    key: 'evaluationScore',
    width: 60,
    render: (row) => row.evaluationScore != null ? h(NTag, { type: getScoreType(row.evaluationScore), size: 'small' }, () => row.evaluationScore) : '-'
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => h(NTag, { type: getStatusType(row.status), size: 'small' }, () => getStatusText(row.status))
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 150,
    render: (row) => formatTime(row.createdAt)
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) => h(NButton, { size: 'small', onClick: () => showDetail(row) }, () => '查看')
  }
];

const loadWorks = async () => {
  loading.value = true;
  try {
    const res = await calligraphyListAPI.reviewList({
      page: page.value,
      limit: 20,
      status: filterStatus.value
    });
    if (res.success) {
      works.value = res.data.works;
      totalPages.value = res.data.totalPages;
      // 更新待审核数量
      if (filterStatus.value === 'all' || filterStatus.value === 'PENDING') {
        const pendingRes = await calligraphyListAPI.reviewList({ status: 'PENDING', limit: 1 });
        if (pendingRes.success) {
          emit('update:pending-count', pendingRes.data.total);
        }
      }
    }
  } catch (error) {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const showDetail = async (work) => {
  try {
    const res = await calligraphyAPI.get(work.id);
    if (res.success) {
      selectedWork.value = res.data;
      reviewPoints.value = 55;
      showDetailModal.value = true;
    }
  } catch (error) {
    message.error('获取详情失败');
  }
};

const evaluateWork = async () => {
  if (!selectedWork.value || evaluating.value) return;
  evaluating.value = true;
  try {
    const res = await calligraphyAPI.evaluate(selectedWork.value.id);
    if (res.success) {
      message.success(`评分完成：${res.data.score}分`);
      selectedWork.value.evaluationScore = res.data.score;
      selectedWork.value.evaluationData = res.data.evaluation;
      const idx = works.value.findIndex(w => w.id === selectedWork.value.id);
      if (idx >= 0) works.value[idx].evaluationScore = res.data.score;
    }
  } catch (error) {
    message.error(error.response?.data?.error || '评分失败');
  } finally {
    evaluating.value = false;
  }
};

const reviewWork = async (status) => {
  if (!selectedWork.value || reviewing.value) return;
  reviewing.value = true;
  try {
    const res = await calligraphyAPI.review(selectedWork.value.id, {
      status,
      points: status === 'APPROVED' ? reviewPoints.value : 0
    });
    if (res.success) {
      message.success('审核成功');
      showDetailModal.value = false;
      loadWorks();
    }
  } catch (error) {
    message.error(error.response?.data?.error || '审核失败');
  } finally {
    reviewing.value = false;
  }
};

const deleteWork = () => {
  dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await calligraphyAPI.adminDelete(selectedWork.value.id);
        if (res.success) {
          message.success('删除成功');
          showDetailModal.value = false;
          loadWorks();
        }
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
};

const batchReview = async () => {
  if (selectedIds.value.length === 0) return;
  batchReviewing.value = true;
  try {
    const res = await calligraphyAPI.batchReview({
      ids: selectedIds.value,
      status: batchStatus.value,
      points: batchStatus.value === 'APPROVED' ? batchPoints.value : 0,
      reviewNote: batchNote.value
    });
    if (res.success) {
      message.success(`已审核 ${res.data.count} 个作品`);
      showBatchModal.value = false;
      selectedIds.value = [];
      loadWorks();
    }
  } catch (error) {
    message.error(error.response?.data?.error || '批量审核失败');
  } finally {
    batchReviewing.value = false;
  }
};

const getContentItems = (work) => {
  if (!work) return [];
  if (Array.isArray(work.content)) return work.content;
  return work.title.split('').map(char => ({ character: char, preview: null }));
};

const hasCharPreviews = (work) => {
  if (!work || !Array.isArray(work.content)) return false;
  return work.content.some(item => item.preview);
};

const getStatusType = (status) => {
  const map = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', ARCHIVED: 'default' };
  return map[status] || 'default';
};

const getStatusText = (status) => {
  const map = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已拒绝', ARCHIVED: '已归档' };
  return map[status] || status;
};

const getScoreType = (score) => {
  if (score >= 85) return 'success';
  if (score >= 60) return 'info';
  return 'warning';
};

const getScoreClass = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 60) return 'good';
  return 'needs-work';
};

const getScoreLabel = (score) => {
  if (score >= 85) return '优秀';
  if (score >= 60) return '良好';
  return '需努力';
};

const getCharScoreClass = (similarity) => {
  const score = similarity || 0;
  if (score >= 0.7) return 'excellent';
  if (score >= 0.5) return 'good';
  if (score >= 0.3) return 'fair';
  return 'poor';
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

watch(filterStatus, () => {
  page.value = 1;
  loadWorks();
});

onMounted(() => {
  loadWorks();
});
</script>

<style scoped>
.calligraphy-review-tab {
  padding: 16px 0;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-section {
  background: #fffef8;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.copybook-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.char-cell {
  width: 80px;
  height: 80px;
  position: relative;
  border: 1px solid #333;
  margin: -0.5px;
  background: #fffef8;
}

.cell-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.cell-grid::before {
  content: '';
  position: absolute;
  top: 50%; left: 0; right: 0;
  height: 1px;
  background: repeating-linear-gradient(to right, #e74c3c 0, #e74c3c 4px, transparent 4px, transparent 8px);
}

.cell-grid::after {
  content: '';
  position: absolute;
  left: 50%; top: 0; bottom: 0;
  width: 1px;
  background: repeating-linear-gradient(to bottom, #e74c3c 0, #e74c3c 4px, transparent 4px, transparent 8px);
}

.ref-char {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 56px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(200, 100, 100, 0.3);
  z-index: 1;
}

.char-img {
  position: absolute;
  top: 2px; left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  object-fit: contain;
  z-index: 2;
}

.legacy-preview img {
  max-width: 100%;
  max-height: 300px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.author-text {
  text-align: left;
}

.author-name {
  font-weight: 500;
}

.create-time {
  font-size: 12px;
  color: #999;
}

.evaluation-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.score-display {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.score-display.excellent { background: linear-gradient(135deg, #f6ffed, #d9f7be); color: #389e0d; }
.score-display.good { background: linear-gradient(135deg, #e6f7ff, #bae7ff); color: #096dd9; }
.score-display.needs-work { background: linear-gradient(135deg, #fffbe6, #fff1b8); color: #d48806; }

.score-number { font-size: 36px; font-weight: bold; }
.score-label { font-size: 14px; margin-top: 4px; }

.score-bars { margin-top: 12px; }

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.item-label { width: 70px; font-size: 13px; color: #666; }
.score-item .n-progress { flex: 1; }
.item-score { width: 50px; font-size: 12px; color: #999; text-align: right; }

/* 逐字分析样式 */
.char-analysis {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.analysis-title {
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
}

.char-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.char-item {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 120px;
  max-width: 200px;
}

.char-item.excellent { border-color: #52c41a; background: #f6ffed; }
.char-item.good { border-color: #1890ff; background: #e6f7ff; }
.char-item.fair { border-color: #faad14; background: #fffbe6; }
.char-item.poor { border-color: #ff4d4f; background: #fff2f0; }

.char-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.char-text {
  font-size: 20px;
  font-family: 'KaiTi', 'STKaiti', serif;
  font-weight: bold;
}

.char-score {
  font-size: 14px;
  font-weight: 500;
}

.char-item.excellent .char-score { color: #52c41a; }
.char-item.good .char-score { color: #1890ff; }
.char-item.fair .char-score { color: #faad14; }
.char-item.poor .char-score { color: #ff4d4f; }

.char-reason {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

/* 评语区域 */
.comments-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.comment-item {
  margin-bottom: 12px;
}

.comment-item.summary {
  background: #fafafa;
  padding: 12px;
  border-radius: 8px;
}

.comment-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.comment-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

/* 改进建议 */
.improvements {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.improvements-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.improvements-list {
  margin: 0;
  padding-left: 20px;
}

.improvements-list li {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.review-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  flex-wrap: wrap;
}
</style>
