<template>
  <div class="delegated-reviews-page">
    <div class="header">
      <h1 class="title">待我审核</h1>
      <p class="subtitle">需要你协助管理员审核的同学提交记录</p>
    </div>

    <n-spin :show="loading">
      <!-- 老师考核统计面板 -->
      <n-card v-if="stats" class="stats-panel" style="margin-bottom: 24px; background: #fafafc;">
        <n-row :gutter="24">
          <n-col :span="6">
            <n-statistic label="信誉分" :value="stats.score" />
          </n-col>
          <n-col :span="6">
            <n-statistic label="审核等级">
              <template #default>
                <n-tag type="info" round>Lv.{{ stats.level }}</n-tag>
              </template>
            </n-statistic>
          </n-col>
          <n-col :span="6">
            <n-statistic label="准确率" :value="stats.totalReviews > 0 ? Math.round(stats.correctReviews / stats.totalReviews * 100) + '%' : '-'" />
          </n-col>
          <n-col :span="6">
            <n-statistic label="连续失误警告">
              <template #default>
                <n-tag :type="stats.consecutiveWrong >= 3 ? 'error' : 'success'" size="small">
                  {{ stats.consecutiveWrong }} / 5
                </n-tag>
              </template>
            </n-statistic>
          </n-col>
        </n-row>
      </n-card>
      <div v-if="reviews.length > 0" class="review-list">
        <n-card v-for="item in reviews" :key="item.id" class="review-item">
          <div class="submission-info" v-if="item.submission">
            <div class="user-info">
              <n-avatar round :src="item.submission.user?.avatar" />
              <span>{{ item.submission.user?.profile?.nickname || item.submission.user?.username }}</span>
              <span class="time">{{ new Date(item.createdAt).toLocaleString() }}</span>
            </div>
            
            <h3 class="template-name">{{ item.submission.template?.name }}</h3>
            <p class="content-text">{{ item.submission.content }}</p>
            
            <div class="media-preview" v-if="item.submission.images?.length > 0">
              <n-image
                v-for="(img, idx) in item.submission.images"
                :key="idx"
                :src="img"
                width="100"
                height="100"
                object-fit="cover"
              />
            </div>
          </div>
          <div v-else class="submission-info deleted">
            该提交记录已被删除
          </div>

          <template #action>
            <div class="action-bar">
              <n-input v-model:value="comments[item.id]" placeholder="输入审核意见（可选）" style="width: 300px;" />
              <div class="buttons">
                <n-button type="success" @click="handleReview(item.id, 'APPROVE')">通过并奖励</n-button>
                <n-button type="error" ghost @click="handleReview(item.id, 'REJECT')">驳回</n-button>
              </div>
            </div>
          </template>
        </n-card>
        
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.totalPages"
          @update:page="handlePageChange"
          class="pagination"
        />
      </div>

      <div v-else class="empty-state">
        <n-empty description="太棒了，目前没有待审核的任务" />
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { delegatedReviewAPI, teacherAPI } from '@/api';

const message = useMessage();
const loading = ref(false);
const reviews = ref([]);
const comments = ref({});
const stats = ref(null);
const pagination = ref({
  page: 1,
  pageSize: 20,
  totalPages: 1
});

async function loadData() {
  loading.value = true;
  try {
    const res = await delegatedReviewAPI.getPendingReviews({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    });
    if (res.success) {
      reviews.value = res.data;
      pagination.value = res.pagination;
      res.data.forEach(r => {
        if (!comments.value[r.id]) {
          comments.value[r.id] = '';
        }
      });
    }
    
    // 加载统计面板
    const statsRes = await teacherAPI.getStats();
    if (statsRes.success) {
      stats.value = statsRes.data;
    }
  } catch (error) {
    message.error(error.error || '加载数据失败');
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page) {
  pagination.value.page = page;
  loadData();
}

async function handleReview(id, action) {
  loading.value = true;
  try {
    const res = await delegatedReviewAPI.reviewSubmission(id, {
      action,
      comment: comments.value[id] || ''
    });
    if (res.success) {
      message.success(action === 'APPROVE' ? '已通过' : '已驳回');
      await loadData();
    }
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.delegated-reviews-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}
.header {
  margin-bottom: 24px;
}
.title {
  margin: 0;
  font-size: 24px;
  color: #333;
}
.subtitle {
  color: #666;
  margin-top: 8px;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-item {
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.user-info span {
  font-weight: 500;
}
.time {
  color: #999;
  font-size: 13px;
  font-weight: normal !important;
}
.template-name {
  margin: 0 0 12px;
  color: #18a058;
}
.content-text {
  margin: 0 0 16px;
  line-height: 1.6;
  color: #333;
}
.media-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.deleted {
  color: #999;
  font-style: italic;
}
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.buttons {
  display: flex;
  gap: 12px;
}
.pagination {
  margin-top: 24px;
  justify-content: center;
}
.empty-state {
  padding: 60px 0;
}
</style>
