<template>
  <div class="about-me-page">
    <div class="header">
      <h1 class="title">关于我</h1>
      <p class="subtitle">学生多维度评价系统</p>
    </div>

    <n-spin :show="loading">
      <div class="layout-container">
        
        <!-- 区域 A：我的评价（核心）始终可见 -->
        <div class="section-my-reviews">
          <h2 class="section-title">我的评价</h2>
          
          <div v-if="reviewData.stats && reviewData.stats.total > 0" class="stats-section">
            <!-- 雷达图和数据卡片 -->
            <div class="radar-section">
              <div class="radar-chart">
                <v-chart :option="radarOption" autoresize style="width: 100%; height: 280px" />
              </div>
              <div class="data-cards">
                <div class="data-card highlight">
                  <div class="card-icon"><n-icon size="24"><star /></n-icon></div>
                  <div class="card-content">
                    <span class="card-value">{{ reviewData.stats.averageScores?.attitude || 0 }}</span>
                    <span class="card-label">学习态度</span>
                  </div>
                </div>
                <div class="data-card highlight">
                  <div class="card-icon"><n-icon size="24"><checkmarkCircle /></n-icon></div>
                  <div class="card-content">
                    <span class="card-value">{{ reviewData.stats.averageScores?.cooperation || 0 }}</span>
                    <span class="card-label">互助合作</span>
                  </div>
                </div>
                <div class="data-card">
                  <div class="card-content">
                    <span class="card-value">{{ reviewData.stats.total }}</span>
                    <span class="card-label">收到评价</span>
                  </div>
                </div>
                <div class="data-card">
                  <div class="card-content">
                    <span class="card-value">{{ Object.keys(reviewData.stats.tagsCount || {}).length }}</span>
                    <span class="card-label">获得标签</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 标签统计 -->
            <div v-if="Object.keys(reviewData.stats.tagsCount || {}).length > 0" class="dimension-stats">
              <h4>标签统计</h4>
              <div class="dimension-bars">
                <div v-for="(count, tag) in reviewData.stats.tagsCount" :key="tag" class="dim-bar-item">
                  <span class="dim-name">{{ tag }}</span>
                  <n-progress
                    type="line"
                    :percentage="(count / reviewData.stats.total) * 100"
                    :show-indicator="false"
                    :height="6"
                    status="success"
                  />
                  <span class="dim-count">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="reviews-list">
            <h4>最新评价</h4>
            <div v-for="review in reviewData.reviews" :key="review.id" class="review-card">
              <div class="review-header">
                <n-avatar :src="review.fromUser?.avatar" :size="40" round />
                <div class="review-author">
                  <span class="name">{{ review.fromUser?.username || '匿名同学' }}</span>
                  <span class="time">{{ formatTime(review.createdAt) }}</span>
                </div>
              </div>
              <p class="review-content">{{ review.content }}</p>
            </div>
            <n-empty v-if="reviewData.reviews.length === 0" description="还没有收到评价" />
          </div>
        </div>

        <!-- 区域 B：我去评价别人 -->
        <div class="section-evaluate-others">
          <h2 class="section-title">我去评价别人</h2>
          
          <div class="task-progress">
            <span class="progress-text">今日推荐评价：{{ taskStatus.completedCount }}/{{ taskStatus.targetCount }} 位同学</span>
          </div>

          <div class="task-list">
            <div v-for="target in targets" :key="target.id" class="target-card">
              <div class="target-header">
                <n-avatar :src="target.avatar" :size="60" round />
                <div class="target-info">
                  <h3>{{ target.username }}</h3>
                  <p class="tip">写下你想对他/她说的话</p>
                </div>
              </div>

              <div class="dimension-tags">
                <p class="field-label">1. 选择标签（多选）</p>
                <n-tag
                  v-for="dim in dimensions"
                  :key="dim"
                  size="small"
                  :bordered="false"
                  :type="selectedDimensions[target.id]?.includes(dim) ? 'success' : 'default'"
                  class="dim-tag"
                  @click="toggleDimension(target.id, dim)"
                >
                  {{ dim }}
                </n-tag>
              </div>

              <div class="score-section">
                <p class="field-label">2. 综合打分</p>
                <div class="score-item">
                  <span>学习态度</span>
                  <n-rate v-model:value="scores[target.id].attitude" />
                </div>
                <div class="score-item">
                  <span>互助合作</span>
                  <n-rate v-model:value="scores[target.id].cooperation" />
                </div>
              </div>

              <div class="category-section">
                <p class="field-label">3. 最突出方面</p>
                <n-select
                  v-model:value="categories[target.id]"
                  :options="categoryOptions"
                  placeholder="选择他/她最突出的方面"
                />
              </div>

              <div class="content-section">
                <p class="field-label">4. 鼓励寄语</p>
                <n-input
                  v-model:value="reviewContent[target.id]"
                  type="textarea"
                  placeholder="至少输入8个中文字..."
                  :autosize="{ minRows: 3, maxRows: 5 }"
                  maxlength="200"
                  show-count
                />
              </div>
              <n-button
                type="primary"
                block
                :disabled="!canSubmit(target.id)"
                @click="submitReview(target.id)"
                class="submit-btn"
              >
                提交评价
              </n-button>
            </div>
          </div>

          <div v-if="targets.length === 0" class="empty-state">
            <n-empty description="今日推荐评价已完成" />
          </div>
        </div>

      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { useMessage } from 'naive-ui';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle';
import InformationCircle from '@vicons/ionicons5/es/InformationCircle';
import Star from '@vicons/ionicons5/es/Star';
import { reviewAPI } from '@/api';

use([RadarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const message = useMessage();
const loading = ref(false);
const taskStatus = ref({ isCompleted: false, completedCount: 0, targetCount: 2 });
const targets = ref([]);
const reviewContent = ref({});
const selectedDimensions = reactive({});
const scores = reactive({});
const categories = reactive({});
const reviewData = ref({ reviews: [], stats: {}, isAnonymous: false });

const dimensions = ['开朗', '认真', '乐于助人', '努力', '活泼'];
const categoryOptions = [
  { label: '学习成绩优异', value: 'study' },
  { label: '性格开朗热情', value: 'personality' },
  { label: '乐于帮助同学', value: 'help' },
  { label: '思维活跃敏捷', value: 'thinking' },
  { label: '其他', value: 'other' }
];

const radarOption = computed(() => {
  const stats = reviewData.value.stats || {};
  const avgScores = stats.averageScores || {};
  const tagsCount = stats.tagsCount || {};
  const total = stats.total || 1;

  const tagValues = Object.keys(tagsCount).map(tag => (tagsCount[tag] / total) * 100);
  while (tagValues.length < 5) tagValues.push(0);

  return {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '学习态度', max: 100 },
        { name: '互助合作', max: 100 },
        { name: '标签覆盖', max: 100 },
        { name: '评价数量', max: 100 },
        { name: '综合表现', max: 100 }
      ],
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#666', fontSize: 12 }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          (avgScores.attitude || 0) * 20,
          (avgScores.cooperation || 0) * 20,
          Math.min((Object.keys(tagsCount).length / 5) * 100, 100),
          Math.min((total / 10) * 100, 100),
          ((avgScores.attitude || 0) + (avgScores.cooperation || 0)) / 2 * 20
        ],
        name: '我的表现',
        areaStyle: { color: 'rgba(24, 160, 88, 0.3)' },
        lineStyle: { color: '#18a058', width: 2 },
        itemStyle: { color: '#18a058' }
      }]
    }]
  };
});

function toggleDimension(targetId, dim) {
  if (!selectedDimensions[targetId]) {
    selectedDimensions[targetId] = [];
  }
  const idx = selectedDimensions[targetId].indexOf(dim);
  if (idx > -1) {
    selectedDimensions[targetId].splice(idx, 1);
  } else {
    selectedDimensions[targetId].push(dim);
  }
  const existing = reviewContent.value[targetId] || '';
  if (!existing.includes(dim)) {
    reviewContent.value[targetId] = existing + (existing ? '，' : '') + dim + '的同学';
  }
}

function canSubmit(targetId) {
  const content = reviewContent.value[targetId] || '';
  const chinese = content.match(/[\u4e00-\u9fa5]/g) || [];
  const textValid = chinese.length >= 8 && !/^(\W)\1+$/.test(content); // Basic duplicate char check
  
  const scoreValid = scores[targetId]?.attitude > 0 && scores[targetId]?.cooperation > 0;
  const categoryValid = !!categories[targetId];
  
  return textValid && scoreValid && categoryValid;
}

async function loadTaskStatus() {
  try {
    const json = await reviewAPI.getTaskStatus();
    taskStatus.value = {
      isCompleted: json.data.isCompleted,
      completedCount: json.data.completedCount,
      targetCount: json.data.targetCount
    };
  } catch (e) {
    console.error(e);
  }
}

async function loadTargets() {
  try {
    const json = await reviewAPI.getTaskTargets();
    targets.value = json.data || [];
    targets.value.forEach(t => {
      if (!reviewContent.value[t.id]) reviewContent.value[t.id] = '';
      if (!selectedDimensions[t.id]) selectedDimensions[t.id] = [];
      if (!scores[t.id]) scores[t.id] = { attitude: 0, cooperation: 0 };
      if (!categories[t.id]) categories[t.id] = null;
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadReviews() {
  try {
    const json = await reviewAPI.getMyReviews();
    reviewData.value = json.data || { reviews: [], stats: {} };
  } catch (e) {
    console.error(e);
  }
}

async function submitReview(targetId) {
  if (!canSubmit(targetId)) {
    message.warning('请填写完整评价信息');
    return;
  }
  const content = reviewContent.value[targetId];

  loading.value = true;
  try {
    const payload = {
      toUserId: targetId,
      content,
      tags: selectedDimensions[targetId] || [],
      scores: scores[targetId],
      category: categories[targetId]
    };
    const json = await reviewAPI.submitReview(payload);
    if (json.success) {
      message.success('评价成功');
      reviewContent.value[targetId] = '';
      selectedDimensions[targetId] = [];
      scores[targetId] = { attitude: 0, cooperation: 0 };
      categories[targetId] = null;
      await loadTaskStatus();
      await loadTargets();
      await loadReviews();
    } else {
      message.error(json.error || '提交失败');
    }
  } catch (e) {
    message.error('提交失败');
  } finally {
    loading.value = false;
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
}

onMounted(async () => {
  loading.value = true;
  await loadTaskStatus();
  await loadReviews();
  if (!taskStatus.value.isCompleted) {
    await loadTargets();
  }
  loading.value = false;
});
</script>

<style scoped>
.about-me-page {
  padding: 20px;
  min-height: 100vh;
  background: #f8f9fa;
}

.layout-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 768px) {
  .layout-container {
    flex-direction: row;
    align-items: flex-start;
  }
  .section-my-reviews {
    flex: 2;
  }
  .section-evaluate-others {
    flex: 1;
    position: sticky;
    top: 20px;
  }
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  border-left: 4px solid #18a058;
  padding-left: 8px;
}

.header {
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.task-progress {
  margin-bottom: 20px;
}

.progress-text {
  display: block;
  text-align: center;
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.target-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.target-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.target-info h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.target-info .tip {
  margin: 4px 0 0;
  font-size: 13px;
  color: #999;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  margin: 12px 0 8px;
  color: #333;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.score-item span {
  width: 60px;
  font-size: 13px;
  color: #666;
}

.dimension-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.dim-tag {
  cursor: pointer;
}

.submit-btn {
  margin-top: 16px;
}

.target-card :deep(.n-input) {
  margin-bottom: 12px;
}

.completed-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #eef9f4;
  border-radius: 8px;
  color: #18a058;
  margin-bottom: 20px;
}

.stats-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.radar-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.radar-chart {
  flex: 1;
  min-width: 280px;
}

.data-cards {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.data-card.highlight {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  color: #18a058;
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
}

.card-label {
  font-size: 12px;
  color: #666;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px;
}

.stats-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stat-card.positive {
  background: #e8f5e9;
}

.stat-card.neutral {
  background: #fff3e0;
}

.stat-num {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.dimension-stats {
  margin-top: 16px;
}

.dimension-stats h4 {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
}

.dimension-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dim-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dim-name {
  width: 50px;
  font-size: 13px;
  color: #666;
}

.dim-bar-item :deep(.n-progress) {
  flex: 1;
}

.dim-count {
  width: 24px;
  text-align: right;
  font-size: 12px;
  color: #999;
}

.reviews-list-preview {
  margin-top: 16px;
}

.reviews-list-preview h4 {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.review-card.small {
  padding: 12px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.review-author {
  display: flex;
  flex-direction: column;
}

.review-author .name {
  font-weight: 500;
  color: #333;
}

.review-author .time {
  font-size: 12px;
  color: #999;
}

.review-content {
  color: #555;
  line-height: 1.6;
  margin: 0;
}

.empty-state {
  padding: 40px;
  text-align: center;
}
</style>