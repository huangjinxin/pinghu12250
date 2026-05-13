<template>
  <div class="about-me-page">
    <div class="header">
      <h1 class="title">关于我</h1>
      <p class="subtitle">学生多维度评价系统</p>
      <n-tabs v-model:value="activeTab" type="line" class="main-tabs">
        <n-tab-pane v-if="!isTeacher" name="mine" tab="我的评价" />
        <n-tab-pane v-if="isTeacher" name="admin" tab="全部学生" />
        <n-tab-pane v-if="isTeacher" name="mine-self" tab="我的数据" />
      </n-tabs>
    </div>

    <n-spin :show="loading">
      <div v-if="activeTab === 'mine' || activeTab === 'mine-self'" class="layout-container">
        <div class="section-my-reviews">
          <h2 class="section-title">我的评价</h2>

          <div class="stats-section">
            <div class="radar-section">
              <div class="radar-chart">
                <v-chart :option="radarOption" autoresize style="width: 100%; height: 280px" />
              </div>
              <div class="data-cards">
                <div class="data-card highlight">
                  <div class="card-icon"><n-icon size="24"><star /></n-icon></div>
                  <div class="card-content">
                    <span class="card-value">{{ reviewData.stats.total }}</span>
                    <span class="card-label">收到评价</span>
                  </div>
                </div>
                <div v-for="dim in dimensionsMeta" :key="dim.key" class="data-card">
                  <div class="card-content">
                    <span class="card-value">{{ reviewData.stats.averages?.[dim.key] ?? '-' }}</span>
                    <span class="card-label">{{ dim.label }}</span>
                  </div>
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
                  <n-tag v-if="review.dimension" size="tiny" :bordered="false" type="info">{{ dimLabel(review.dimension) }}</n-tag>
                  <n-tag v-if="review.score" size="tiny" :bordered="false" type="success">{{ review.score }}分</n-tag>
                  <span class="time">{{ formatTime(review.createdAt) }}</span>
                </div>
              </div>
              <p v-if="review.detail?.content" class="review-content">{{ review.detail.content }}</p>
              <div v-if="review.detail?.tags?.length" class="review-tags">
                <n-tag v-for="t in review.detail.tags" :key="t" size="tiny" :bordered="false">{{ t }}</n-tag>
              </div>
            </div>
            <n-empty v-if="reviewData.reviews.length === 0" description="还没有收到评价" />
          </div>
        </div>

        <div class="section-evaluate-others">
          <h2 class="section-title">我去评价别人</h2>

          <div class="task-progress">
            <span class="progress-text">今日已评价：{{ taskStatus.completedCount }}/{{ taskStatus.targetCount }} 位同学</span>
            <n-progress type="line" :percentage="(taskStatus.completedCount / taskStatus.targetCount) * 100" :height="6" :show-indicator="false" />
          </div>

          <!-- Step: Select Target + Dimension -->
          <div v-if="wizardStep === 'select'" class="wizard-select">
            <div v-for="target in targets" :key="target.id" class="target-card">
              <div class="target-header">
                <n-avatar :src="target.avatar" :size="60" round />
                <div class="target-info">
                  <h3>{{ target.realName || target.username }}</h3>
                  <p class="tip">点击下方维度开始评价</p>
                </div>
              </div>

              <div class="dimension-grid">
                <button
                  v-for="dim in dimensionsMeta"
                  :key="dim.key"
                  class="dim-btn"
                  :class="{ reviewed: target.reviewedDimensions?.includes(dim.key) }"
                  :disabled="target.reviewedDimensions?.includes(dim.key)"
                  @click="startEvaluate(target, dim.key)"
                >
                  <span class="dim-icon">{{ dim.icon }}</span>
                  <span class="dim-label">{{ dim.label }}</span>
                  <span v-if="target.reviewedDimensions?.includes(dim.key)" class="dim-check">✓</span>
                </button>
              </div>

              <n-button class="skip-btn" quaternary @click="skipTarget(target.id)">
                <template #icon><n-icon><CloseOutline /></n-icon></template>
                不认识，换个人
              </n-button>
            </div>

            <div v-if="targets.length === 0" class="empty-state">
              <n-empty :description="taskStatus.completedCount >= taskStatus.targetCount ? '今日评价任务已完成' : '暂无其他可评价的同学'" />
            </div>
          </div>

          <!-- Step: Fill Evaluation -->
          <div v-if="wizardStep === 'fill' && wizardTarget" class="wizard-fill">
            <div class="fill-header">
              <n-button quaternary circle size="small" @click="cancelEvaluate">
                <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
              </n-button>
              <div>
                <h3>{{ wizardTarget.realName || wizardTarget.username }}</h3>
                <n-tag size="small" type="info">{{ dimLabel(wizardDimension) }}</n-tag>
              </div>
            </div>

            <div class="fill-body">
              <p class="fill-question">{{ dimensionContent?.question }}</p>

              <div class="interaction-section">
                <label class="field-label">✏️ 提问</label>
                <n-input v-model:value="wizardForm.content" type="textarea" :rows="2" placeholder="写下你的评价..." maxlength="200" />
              </div>

              <div class="interaction-section">
                <label class="field-label">📋 下拉选择</label>
                <n-select v-model:value="wizardForm.dropdownValue" :options="dropdownOptions" placeholder="选择一个选项" clearable />
              </div>

              <div class="interaction-section">
                <label class="field-label">🏷️ 多选标签</label>
                <div class="tag-group">
                  <n-tag
                    v-for="t in dimensionContent?.multiTags || []" :key="t"
                    size="small" :bordered="false"
                    :type="wizardForm.selectedTags.includes(t) ? 'success' : 'default'"
                    class="dim-tag" @click="toggleTag(t)"
                  >{{ t }}</n-tag>
                </div>
              </div>

              <div class="interaction-section">
                <label class="field-label">😊 表情评价</label>
                <div class="emoji-group">
                  <button
                    v-for="e in dimensionContent?.emojis || []" :key="e"
                    class="emoji-btn" :class="{ active: wizardForm.emoji === e }"
                    @click="wizardForm.emoji = wizardForm.emoji === e ? '' : e"
                  >{{ e }}</button>
                </div>
              </div>

              <div class="interaction-section">
                <label class="field-label">⭐ 星级评分</label>
                <n-rate v-model:value="wizardForm.starRating" />
              </div>

              <div class="score-display" v-if="wizardScore > 0">
                <span class="score-label">该维度得分：</span>
                <span class="score-value">{{ wizardScore }}</span>
                <span class="score-max">/ 5</span>
              </div>

              <n-button type="primary" block class="submit-btn" :disabled="!wizardCanSubmit" @click="submitEvaluation">
                提交评价（{{ wizardScore }}分）
              </n-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin view -->
      <div v-if="activeTab === 'admin'" class="admin-panel">
        <div class="admin-filters">
          <n-select v-model:value="filterSchool" :options="schools" placeholder="选择学校" clearable />
          <n-select v-model:value="filterGrade" :options="gradeOptions" placeholder="选择年级" clearable />
          <n-select v-model:value="filterClass" :options="classOptions" placeholder="选择班级" clearable />
          <n-select v-model:value="filterStatus" :options="[
            { label: '全部状态', value: 'ALL' },
            { label: '已激活', value: 'ACTIVE' },
            { label: '未激活', value: 'INACTIVE' },
          ]" />
        </div>
        <n-spin :show="adminLoading">
          <div class="admin-grid">
            <div v-for="student in adminStudents" :key="student.id" class="student-card" @click="openStudentDetail(student.id)">
              <div class="sc-header">
                <n-avatar :src="student.avatar" :size="48" round />
                <div class="sc-name">
                  <span class="sc-realname">{{ student.realName || student.username }}</span>
                  <n-tag :type="student.status === 'ACTIVE' ? 'success' : 'warning'" size="tiny" :bordered="false">
                    {{ student.status === 'ACTIVE' ? '已注册' : '待注册' }}
                  </n-tag>
                </div>
              </div>
              <div class="sc-meta">
                <span v-if="student.school">{{ student.school.name }}</span>
                <span v-if="student.class">{{ student.class.grade }}{{ student.class.name }}</span>
              </div>
              <div class="sc-stats">
                <div class="sc-stat-item">
                  <span class="sc-stat-val">{{ student.reviewCount }}</span>
                  <span class="sc-stat-label">被评</span>
                </div>
                <div v-for="dim in dimensionsMeta" :key="dim.key" class="sc-stat-item">
                  <span class="sc-stat-val">{{ student.reviewStats?.averages?.[dim.key] ?? '-' }}</span>
                  <span class="sc-stat-label">{{ dim.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="adminPagination.totalPages > 1" class="admin-pagination">
            <n-pagination v-model:page="adminPagination.page" :page-count="adminPagination.totalPages" @update:page="loadAdminStudents" />
          </div>
        </n-spin>

        <n-modal v-model:show="showDetailModal" preset="card" title="学生评价详情" style="max-width: 640px;" :mask-closable="true" @close="closeStudentDetail">
          <n-spin :show="detailLoading">
            <template v-if="selectedStudent && studentDetail">
              <div class="detail-header">
                <n-avatar :src="selectedStudent.avatar" :size="56" round />
                <div>
                  <h3>{{ selectedStudent.realName || selectedStudent.username }}</h3>
                  <p v-if="selectedStudent.class">{{ selectedStudent.school?.name }} · {{ selectedStudent.class.grade }}{{ selectedStudent.class.name }}</p>
                </div>
              </div>

              <div class="detail-stats">
                <div class="ds-card">
                  <span class="ds-num">{{ studentDetail.total }}</span>
                  <span class="ds-label">收到评价</span>
                </div>
              </div>

              <div class="detail-radar">
                <v-chart :option="studentRadarOption" autoresize style="width: 100%; height: 240px" />
              </div>

              <div class="detail-reviews">
                <h4>评价记录</h4>
                <div v-for="r in studentDetail.reviews" :key="r.id" class="dr-item">
                  <div class="dr-header">
                    <n-avatar :src="r.fromUser?.avatar" :size="28" round />
                    <span class="dr-name">{{ r.fromUser?.username || '匿名' }}</span>
                    <n-tag v-if="r.dimension" size="tiny" :bordered="false" type="info">{{ dimLabel(r.dimension) }}</n-tag>
                    <n-tag v-if="r.score" size="tiny" :bordered="false" type="success">{{ r.score }}分</n-tag>
                    <span class="dr-time">{{ formatTime(r.createdAt) }}</span>
                  </div>
                  <p v-if="r.detail?.content" class="dr-content">{{ r.detail.content }}</p>
                </div>
                <n-empty v-if="studentDetail.reviews.length === 0" description="暂无评价记录" />
              </div>
            </template>
          </n-spin>
        </n-modal>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import Star from '@vicons/ionicons5/es/Star';
import CloseOutline from '@vicons/ionicons5/es/CloseOutline';
import ArrowBackOutline from '@vicons/ionicons5/es/ArrowBackOutline';
import { reviewAPI, reviewAdminAPI, campusAPI, classAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { DIMENSIONS, DIMENSION_CONTENT, useReviewWizard } from '@/composables/useReviewWizard';

use([RadarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const dimensionsMeta = [
  { key: 'MORALITY', label: '品德', icon: '🛡️' },
  { key: 'INTELLIGENCE', label: '智慧', icon: '🧠' },
  { key: 'PHYSIQUE', label: '体质', icon: '💪' },
  { key: 'AESTHETICS', label: '审美', icon: '🎨' },
  { key: 'LABOR', label: '劳动', icon: '🔧' },
  { key: 'SOCIETY', label: '社交', icon: '🤝' }
];

function dimLabel(key) { return DIMENSIONS[key] || key }

const message = useMessage();
const authStore = useAuthStore();
const isTeacher = computed(() => authStore.user?.role === 'TEACHER' || authStore.user?.role === 'ADMIN');
const activeTab = ref('mine');
const loading = ref(true);

const reviewData = ref({ reviews: [], stats: {} });

const taskStatus = ref({ isCompleted: false, completedCount: 0, targetCount: 2 });
const targets = ref([]);

const {
  step: wizardStep, selectedDimension: wizardDimension, selectedTarget: wizardTarget,
  form: wizardForm, computedScore: wizardScore, canSubmit: wizardCanSubmit,
  selectTarget, selectDimension, backToSelect, getSubmitPayload
} = useReviewWizard();

function startEvaluate(target, dim) {
  selectTarget(target)
  selectDimension(dim)
}

function cancelEvaluate() {
  backToSelect()
}

function toggleTag(tag) {
  const idx = wizardForm.selectedTags.indexOf(tag)
  if (idx > -1) wizardForm.selectedTags.splice(idx, 1)
  else wizardForm.selectedTags.push(tag)
}

const dimensionContent = computed(() => wizardDimension.value ? DIMENSION_CONTENT[wizardDimension.value] : null)

const dropdownOptions = computed(() => {
  if (!dimensionContent.value) return []
  return dimensionContent.value.dropdownOptions.map(o => ({ label: o, value: o }))
})

function buildRadarOption(averages) {
  const maxScore = 5
  const values = dimensionsMeta.map(d => averages?.[d.key] || 0)
  return {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: dimensionsMeta.map(d => ({ name: d.label, max: maxScore })),
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#666', fontSize: 12 },
      splitArea: { areaStyle: { color: ['rgba(79,70,229,0.02)', 'rgba(79,70,229,0.05)'] } }
    },
    series: [{
      type: 'radar',
      areaStyle: { color: 'rgba(79, 70, 229, 0.5)' },
      data: [{
        value: values,
        name: '评价表现',
        lineStyle: { color: '#4f46e5', width: 2 },
        itemStyle: { color: '#4f46e5' }
      }]
    }]
  }
}

const radarOption = computed(() => buildRadarOption(reviewData.value.stats?.averages))
const studentRadarOption = computed(() => {
  if (!studentDetail.value) return {}
  return buildRadarOption(studentDetail.value.stats?.averages)
})

async function loadTaskStatus() {
  try {
    const json = await reviewAPI.getTaskStatus()
    taskStatus.value = {
      isCompleted: json.data.isCompleted,
      completedCount: json.data.completedCount,
      targetCount: json.data.targetCount
    }
  } catch (e) { console.error(e) }
}

async function loadTargets() {
  try {
    const json = await reviewAPI.getTaskTargets()
    console.log('[loadTargets] API response:', json)
    targets.value = json.data || []
  } catch (e) { console.error('[loadTargets] error:', e) }
}

async function loadReviews() {
  try {
    const json = await reviewAPI.getMyReviews()
    reviewData.value = json.data || { reviews: [], stats: {} }
  } catch (e) { console.error(e) }
}

async function submitEvaluation() {
  if (!wizardCanSubmit.value) {
    message.warning('请先完成一项评价')
    return
  }
  loading.value = true
  try {
    const payload = getSubmitPayload()
    const json = await reviewAPI.submitReview(payload)
    if (json.success) {
      message.success('评价成功')
      await loadTaskStatus()
      await loadTargets()
      await loadReviews()
      cancelEvaluate()
    } else {
      message.error(json.error || '提交失败')
    }
  } catch (e) {
    message.error('提交失败: ' + (e.message || ''))
  } finally {
    loading.value = false
  }
}

async function skipTarget(targetId) {
  try {
    const json = await reviewAPI.skipTarget()
    if (json.success) {
      targets.value = targets.value.filter(t => t.id !== targetId)
      if (json.data) targets.value.push(json.data)
      message.success('已更换评价对象')
    }
  } catch (e) {
    message.error(e.message || '操作失败')
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// Admin state
const adminLoading = ref(false)
const adminStudents = ref([])
const adminPagination = ref({ page: 1, limit: 24, total: 0, totalPages: 0 })
const selectedStudent = ref(null)
const studentDetail = ref(null)
const detailLoading = ref(false)
const showDetailModal = ref(false)

const filterSchool = ref(null)
const filterGrade = ref(null)
const filterClass = ref(null)
const filterStatus = ref('ALL')
const schools = ref([])
const allClasses = ref([])

const gradeOptions = computed(() => {
  const grades = [...new Set(allClasses.value.map(c => c.grade).filter(Boolean))]
  return grades.sort().map(g => ({ label: g, value: g }))
})

const classOptions = computed(() => {
  let list = allClasses.value
  if (filterGrade.value) list = list.filter(c => c.grade === filterGrade.value)
  return list.map(c => ({ label: `${c.grade || ''}${c.name}`, value: c.id }))
})

async function loadSchools() {
  try {
    const json = await campusAPI.getCampuses()
    schools.value = (json.campuses || []).map(s => ({ label: s.name, value: s.id }))
  } catch (e) { console.error(e) }
}

async function loadClasses() {
  try {
    const params = {}
    if (filterSchool.value) params.schoolId = filterSchool.value
    const json = await classAPI.getClasses(params)
    allClasses.value = (json.classes || [])
  } catch (e) { console.error(e) }
}

watch(filterSchool, () => {
  filterGrade.value = null
  filterClass.value = null
  loadClasses()
})

watch([filterSchool, filterGrade, filterClass, filterStatus], () => {
  loadAdminStudents(1)
})

async function loadAdminStudents(page = 1) {
  adminLoading.value = true
  try {
    const params = { page, limit: 24 }
    if (filterSchool.value) params.schoolId = filterSchool.value
    if (filterClass.value) params.classId = filterClass.value
    if (filterStatus.value && filterStatus.value !== 'ALL') params.status = filterStatus.value
    const json = await reviewAdminAPI.getAllStudents(params)
    adminStudents.value = json.data.students || []
    adminPagination.value = { page: json.data.page, limit: json.data.limit, total: json.data.total, totalPages: json.data.totalPages }
  } catch (e) { console.error(e) }
  finally { adminLoading.value = false }
}

async function openStudentDetail(studentId) {
  selectedStudent.value = adminStudents.value.find(s => s.id === studentId)
  showDetailModal.value = true
  detailLoading.value = true
  try {
    const json = await reviewAdminAPI.getStudentDetail(studentId, { limit: 20 })
    studentDetail.value = json.data
  } catch (e) { console.error(e) }
  finally { detailLoading.value = false }
}

function closeStudentDetail() {
  showDetailModal.value = false
  selectedStudent.value = null
  studentDetail.value = null
}

onMounted(async () => {
  loading.value = true
  if (isTeacher.value) {
    await Promise.all([loadSchools(), loadClasses()])
    await loadAdminStudents()
    activeTab.value = 'admin'
  } else {
    await loadTaskStatus()
    await loadReviews()
    if (!taskStatus.value.isCompleted) await loadTargets()
  }
  loading.value = false
})

watch(activeTab, async (tab) => {
  if (tab === 'admin') {
    await Promise.all([loadSchools(), loadClasses()])
    await loadAdminStudents()
  } else if (tab === 'mine-self') {
    loading.value = true
    await loadTaskStatus()
    await loadReviews()
    if (!taskStatus.value.isCompleted) await loadTargets()
    loading.value = false
  }
})
</script>

<style scoped>
.about-me-page { padding: 20px; min-height: 100vh; background: #f8f9fa; }
.layout-container { display: flex; flex-direction: column; gap: 24px; }
@media (min-width: 768px) {
  .layout-container { flex-direction: row; align-items: flex-start; }
  .section-my-reviews { flex: 2; }
  .section-evaluate-others { flex: 1; position: sticky; top: 20px; }
}
.section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 16px; border-left: 4px solid #4f46e5; padding-left: 8px; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: bold; color: #333; }
.subtitle { font-size: 14px; color: #666; margin-top: 4px; }
.main-tabs { margin-top: 12px; }
.task-progress { margin-bottom: 20px; }
.progress-text { display: block; text-align: center; margin-top: 8px; color: #666; font-size: 14px; }
.stats-section { background: #fff; border-radius: 12px; padding: 16px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.radar-section { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
.radar-chart { flex: 1; min-width: 280px; }
.data-cards { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
.data-card { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #f8f9fa; border-radius: 10px; }
.data-card.highlight { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); }
.card-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #fff; border-radius: 50%; color: #4f46e5; }
.card-content { display: flex; flex-direction: column; }
.card-value { font-size: 20px; font-weight: bold; color: #333; line-height: 1.2; }
.card-label { font-size: 12px; color: #666; }
.reviews-list { padding: 0; }
.reviews-list h4 { font-size: 15px; color: #333; margin: 0 0 12px; }
.review-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 12px; }
.review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.review-author { display: flex; flex-direction: column; }
.review-author .name { font-weight: 500; color: #333; }
.review-author .time { font-size: 12px; color: #999; }
.review-content { color: #555; line-height: 1.6; margin: 0 0 6px; }
.review-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.empty-state { padding: 40px; text-align: center; }

/* Wizard */
.wizard-select { display: flex; flex-direction: column; gap: 16px; }
.target-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.target-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.target-info h3 { margin: 0; font-size: 16px; color: #333; }
.target-info .tip { margin: 4px 0 0; font-size: 13px; color: #999; }
.dimension-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.dim-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border: 2px solid #e5e7eb; border-radius: 10px; background: #fff; cursor: pointer; transition: all 0.2s; position: relative; }
.dim-btn:hover:not(:disabled) { border-color: #4f46e5; background: #eef2ff; }
.dim-btn.reviewed { border-color: #22c55e; background: #f0fdf4; opacity: 0.7; cursor: default; }
.dim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dim-icon { font-size: 20px; }
.dim-label { font-size: 12px; color: #555; font-weight: 500; }
.dim-check { position: absolute; top: 4px; right: 6px; font-size: 14px; color: #22c55e; font-weight: bold; }
.skip-btn { width: 100%; }
.wizard-fill { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.fill-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
.fill-header h3 { margin: 0; font-size: 16px; color: #333; }
.fill-body { display: flex; flex-direction: column; gap: 16px; }
.fill-question { font-size: 14px; color: #666; background: #f8f9fa; padding: 12px; border-radius: 8px; margin: 0; }
.interaction-section { }
.field-label { font-size: 13px; font-weight: 500; color: #333; display: block; margin-bottom: 8px; }
.tag-group { display: flex; flex-wrap: wrap; gap: 6px; }
.dim-tag { cursor: pointer; }
.emoji-group { display: flex; gap: 8px; }
.emoji-btn { font-size: 28px; padding: 8px 12px; border: 2px solid transparent; border-radius: 10px; background: #f8f9fa; cursor: pointer; transition: all 0.2s; }
.emoji-btn:hover { border-color: #4f46e5; background: #eef2ff; }
.emoji-btn.active { border-color: #4f46e5; background: #e0e7ff; }
.score-display { text-align: center; padding: 12px; background: #f0fdf4; border-radius: 8px; }
.score-label { font-size: 14px; color: #555; }
.score-value { font-size: 28px; font-weight: bold; color: #4f46e5; }
.score-max { font-size: 14px; color: #999; }
.submit-btn { margin-top: 8px; }

/* Admin */
.admin-panel { padding: 0; }
.admin-filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.admin-filters .n-select { min-width: 150px; flex: 1; }
.admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.student-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer; transition: box-shadow 0.2s; }
.student-card:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.15); }
.sc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sc-name { display: flex; flex-direction: column; gap: 4px; }
.sc-realname { font-size: 15px; font-weight: 600; color: #333; }
.sc-meta { font-size: 12px; color: #999; margin-bottom: 10px; display: flex; gap: 8px; }
.sc-stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
.sc-stat-item { text-align: center; }
.sc-stat-val { display: block; font-size: 16px; font-weight: bold; color: #4f46e5; }
.sc-stat-label { font-size: 10px; color: #999; }
.admin-pagination { margin-top: 20px; display: flex; justify-content: center; }
.detail-header { display: flex; align-items: center; gap: 14px; padding-bottom: 16px; border-bottom: 1px solid #eee; margin-bottom: 16px; }
.detail-header h3 { margin: 0; font-size: 18px; color: #333; }
.detail-header p { margin: 4px 0 0; font-size: 13px; color: #999; }
.detail-stats { display: flex; gap: 12px; margin-bottom: 16px; }
.ds-card { flex: 1; text-align: center; background: #f8f9fa; border-radius: 8px; padding: 10px 8px; }
.ds-num { display: block; font-size: 20px; font-weight: bold; color: #4f46e5; }
.ds-label { font-size: 11px; color: #999; }
.detail-radar { margin-bottom: 16px; }
.detail-reviews h4 { font-size: 15px; color: #333; margin: 0 0 12px; }
.dr-item { padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px; }
.dr-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.dr-name { font-size: 13px; font-weight: 500; color: #333; }
.dr-time { font-size: 11px; color: #ccc; margin-left: auto; }
.dr-content { margin: 0 0 6px; font-size: 14px; color: #555; line-height: 1.5; }
</style>
