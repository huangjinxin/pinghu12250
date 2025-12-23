<template>
  <div class="textbook-admin">
    <!-- 顶部导航 -->
    <div class="admin-header">
      <div class="header-left">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
        </n-button>
        <h1>教材审核管理</h1>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card pending">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">待审核</div>
      </div>
      <div class="stat-card approved">
        <div class="stat-value">{{ stats.approved }}</div>
        <div class="stat-label">已通过</div>
      </div>
      <div class="stat-card published">
        <div class="stat-value">{{ stats.published }}</div>
        <div class="stat-label">已发布</div>
      </div>
      <div class="stat-card total">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总课文数</div>
      </div>
    </div>

    <!-- 待审核列表 -->
    <div class="pending-section">
      <h2>待审核课文</h2>

      <n-spin :show="loading">
        <n-empty v-if="!loading && pendingLessons.length === 0" description="暂无待审核课文" />

        <div class="pending-list" v-else>
          <div
            v-for="lesson in pendingLessons"
            :key="lesson.id"
            class="pending-card"
          >
            <div class="card-header">
              <div class="lesson-info">
                <h3>{{ lesson.title }}</h3>
                <p>
                  {{ lesson.unit.textbook.title }} > {{ lesson.unit.title }}
                </p>
              </div>
              <n-tag type="info">待审核</n-tag>
            </div>

            <div class="card-preview">
              <iframe
                :srcdoc="getPreviewHtml(lesson.htmlContent)"
                class="preview-frame"
                sandbox="allow-scripts"
              ></iframe>
            </div>

            <div class="card-actions">
              <n-button @click="openPreview(lesson)">查看详情</n-button>
              <n-button type="error" @click="rejectLesson(lesson)">拒绝</n-button>
              <n-button type="success" @click="approveLesson(lesson)">通过并发布</n-button>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 预览弹窗 -->
    <n-modal v-model:show="showPreviewModal" preset="card" title="课文预览" style="width: 90%; max-width: 1000px">
      <div v-if="previewLesson" class="preview-modal-content">
        <div class="preview-header">
          <h3>{{ previewLesson.title }}</h3>
          <p>{{ previewLesson.unit?.textbook?.title }} > {{ previewLesson.unit?.title }}</p>
          <p v-if="previewLesson.pageStart">页码：P{{ previewLesson.pageStart }}-{{ previewLesson.pageEnd }}</p>
        </div>

        <div class="preview-container">
          <iframe
            :srcdoc="getPreviewHtml(previewLesson.htmlContent)"
            class="preview-frame-large"
            sandbox="allow-scripts"
          ></iframe>
        </div>

        <div class="preview-actions">
          <n-input
            v-model:value="reviewNote"
            type="textarea"
            placeholder="审核备注（可选）"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
          <div class="action-buttons">
            <n-button @click="showPreviewModal = false">关闭</n-button>
            <n-button type="error" @click="confirmReject" :loading="rejecting">拒绝</n-button>
            <n-button type="success" @click="confirmApprove" :loading="approving">通过并发布</n-button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { ArrowBack } from '@vicons/ionicons5';
import { textbookAPI } from '@/api/index';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();

// 数据
const loading = ref(false);
const stats = ref({ pending: 0, approved: 0, published: 0, total: 0 });
const pendingLessons = ref([]);

// 预览
const showPreviewModal = ref(false);
const previewLesson = ref(null);
const reviewNote = ref('');

// 加载状态
const approving = ref(false);
const rejecting = ref(false);

// 方法
const goBack = () => {
  router.back();
};

const loadStats = async () => {
  try {
    const data = await textbookAPI.getAdminStats();
    stats.value = data.stats;
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

const loadPendingLessons = async () => {
  loading.value = true;
  try {
    const data = await textbookAPI.getPendingLessons();
    pendingLessons.value = data.lessons || [];
  } catch (error) {
    message.error('加载待审核列表失败');
  } finally {
    loading.value = false;
  }
};

const getPreviewHtml = (htmlContent) => {
  if (!htmlContent) return '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; padding: 20px; line-height: 1.8; color: #333; }
        .textbook-lesson { max-width: 800px; margin: 0 auto; }
        .lesson-header { text-align: center; margin-bottom: 24px; }
        .lesson-title { font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .lesson-type { display: inline-block; padding: 2px 8px; background: #e8f4f8; color: #0077b6; border-radius: 4px; font-size: 12px; margin-bottom: 8px; }
        .lesson-number { display: inline-block; width: 28px; height: 28px; line-height: 28px; background: #f0f0f0; border-radius: 50%; font-size: 14px; margin-right: 8px; }
        .lesson-page { margin-bottom: 20px; }
        .lesson-body { font-size: 18px; }
        .paragraph { text-indent: 2em; margin-bottom: 1em; }
        ruby rt { font-size: 10px; color: #666; }
        .lesson-vocabulary { margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; }
        .vocab-grid table { width: 100%; border-collapse: collapse; }
        .vocab-grid td { padding: 12px; text-align: center; font-size: 24px; border: 1px solid #ddd; }
        .lesson-exercises { margin-top: 24px; }
        .exercise-item { margin-bottom: 16px; padding-left: 24px; position: relative; }
        .exercise-item::before { content: "◆"; position: absolute; left: 0; color: #0077b6; }
        .word-group { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; padding-left: 24px; }
        .lesson-footnote { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `;
};

const openPreview = (lesson) => {
  previewLesson.value = lesson;
  reviewNote.value = '';
  showPreviewModal.value = true;
};

const approveLesson = (lesson) => {
  dialog.warning({
    title: '确认发布',
    content: `确定通过并发布《${lesson.title}》吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await textbookAPI.reviewLesson(lesson.id, {
          status: 'PUBLISHED',
          reviewNote: '',
        });
        message.success('发布成功');
        loadStats();
        loadPendingLessons();
      } catch (error) {
        message.error('操作失败');
      }
    },
  });
};

const rejectLesson = (lesson) => {
  previewLesson.value = lesson;
  reviewNote.value = '';
  showPreviewModal.value = true;
};

const confirmApprove = async () => {
  if (!previewLesson.value) return;
  approving.value = true;
  try {
    await textbookAPI.reviewLesson(previewLesson.value.id, {
      status: 'PUBLISHED',
      reviewNote: reviewNote.value,
    });
    message.success('发布成功');
    showPreviewModal.value = false;
    loadStats();
    loadPendingLessons();
  } catch (error) {
    message.error('操作失败');
  } finally {
    approving.value = false;
  }
};

const confirmReject = async () => {
  if (!previewLesson.value) return;
  if (!reviewNote.value.trim()) {
    message.warning('请填写拒绝原因');
    return;
  }
  rejecting.value = true;
  try {
    await textbookAPI.reviewLesson(previewLesson.value.id, {
      status: 'REJECTED',
      reviewNote: reviewNote.value,
    });
    message.success('已拒绝');
    showPreviewModal.value = false;
    loadStats();
    loadPendingLessons();
  } catch (error) {
    message.error('操作失败');
  } finally {
    rejecting.value = false;
  }
};

onMounted(() => {
  loadStats();
  loadPendingLessons();
});
</script>

<style scoped>
.textbook-admin {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-card.pending .stat-value { color: #2080f0; }
.stat-card.approved .stat-value { color: #18a058; }
.stat-card.published .stat-value { color: #722ed1; }
.stat-card.total .stat-value { color: #1a1a1a; }

/* 待审核列表 */
.pending-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.pending-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.pending-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.lesson-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.lesson-info p {
  font-size: 13px;
  color: #666;
}

.card-preview {
  height: 200px;
  background: #fafafa;
  overflow: hidden;
}

.preview-frame {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: #fafafa;
}

/* 预览弹窗 */
.preview-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.preview-header p {
  font-size: 14px;
  color: #666;
}

.preview-container {
  height: 500px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.preview-frame-large {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .pending-list {
    grid-template-columns: 1fr;
  }
}
</style>
