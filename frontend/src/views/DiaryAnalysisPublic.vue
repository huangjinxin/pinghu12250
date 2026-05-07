<template>
  <div class="diary-analysis-public">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
      <p class="mt-4 text-gray-500">加载分析结果中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="text-6xl mb-4">404</div>
      <h2 class="text-xl font-bold text-gray-700 mb-2">分析记录不存在</h2>
      <p class="text-gray-500 mb-6">{{ error }}</p>
      <n-button type="primary" @click="$router.push('/')">返回首页</n-button>
    </div>

    <!-- 分析结果展示 -->
    <div v-else-if="record" class="content-container">
      <!-- 顶部 Logo 栏 -->
      <header class="header">
        <div class="logo">
          <span class="logo-icon">AI</span>
          <span class="logo-text">日记分析</span>
        </div>
        <n-button text @click="$router.push('/login')">
          登录
        </n-button>
      </header>

      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 作者信息 -->
        <div class="author-card">
          <n-avatar
            :src="record.user?.avatar"
            :size="48"
            round
          >
            {{ (record.user?.profile?.nickname || record.user?.username || '匿名')[0] }}
          </n-avatar>
          <div class="author-info">
            <div class="author-name">
              {{ record.user?.profile?.nickname || record.user?.username || '匿名用户' }}
            </div>
            <div class="author-meta">
              {{ formatDate(record.createdAt) }}
              <span v-if="record.isBatch" class="ml-2">
                {{ record.period }} · {{ record.diaryCount }}篇
              </span>
            </div>
          </div>
        </div>

        <!-- 评分卡片 -->
        <div v-if="record.totalScore" class="score-card">
          <div class="score-main">
            <div class="score-grade" :class="getGradeClass(record.grade)">
              {{ record.grade }}
            </div>
            <div class="score-value">{{ record.totalScore }}分</div>
          </div>
          <div v-if="record.scoreDetails" class="score-details">
            <div v-for="(detail, key) in record.scoreDetails" :key="key" class="score-item">
              <span class="score-label">{{ getDimensionLabel(key) }}</span>
              <n-progress
                type="line"
                :percentage="detail.score * 5"
                :height="6"
                :border-radius="3"
                :show-indicator="false"
                :color="getGradeColor(record.grade)"
              />
              <span class="score-num">{{ detail.score }}</span>
            </div>
          </div>
        </div>

        <!-- 亮点和改进 -->
        <div v-if="record.highlights?.length || record.improvements?.length" class="tags-section">
          <div v-if="record.highlights?.length" class="tag-group">
            <span class="tag-title">亮点</span>
            <div class="tags">
              <n-tag v-for="h in record.highlights" :key="h" type="success" size="small">{{ h }}</n-tag>
            </div>
          </div>
          <div v-if="record.improvements?.length" class="tag-group">
            <span class="tag-title">改进</span>
            <div class="tags">
              <n-tag v-for="i in record.improvements" :key="i" type="warning" size="small">{{ i }}</n-tag>
            </div>
          </div>
        </div>

        <!-- 人物画像（批量分析） -->
        <div v-if="record.authorProfile" class="profile-section">
          <h3 class="section-title">小作者画像</h3>
          <div class="profile-grid">
            <div v-if="record.authorProfile.traits?.length" class="profile-item">
              <span class="profile-label">性格特点</span>
              <div class="profile-tags">
                <n-tag v-for="t in record.authorProfile.traits" :key="t" size="tiny">{{ t }}</n-tag>
              </div>
            </div>
            <div v-if="record.authorProfile.interests?.length" class="profile-item">
              <span class="profile-label">兴趣爱好</span>
              <div class="profile-tags">
                <n-tag v-for="i in record.authorProfile.interests" :key="i" size="tiny" type="info">{{ i }}</n-tag>
              </div>
            </div>
            <div v-if="record.authorProfile.funFact" class="profile-item full-width">
              <span class="profile-label">趣味描述</span>
              <div class="profile-fun">{{ record.authorProfile.funFact }}</div>
            </div>
          </div>
        </div>

        <!-- 日记中的人物 -->
        <div v-if="record.charactersProfile?.length" class="characters-section">
          <h3 class="section-title">日记中的人物</h3>
          <div class="characters-list">
            <div v-for="char in record.charactersProfile" :key="char.name" class="character-card">
              <div class="character-name">{{ char.name }}</div>
              <div class="character-role">{{ char.role }}</div>
              <div v-if="char.funComment" class="character-comment">{{ char.funComment }}</div>
            </div>
          </div>
        </div>

        <!-- AI 分析报告 -->
        <div v-if="renderedAnalysis" class="analysis-section">
          <h3 class="section-title">AI 分析报告</h3>
          <div class="analysis-content" v-html="renderedAnalysis"></div>
        </div>

        <!-- 原日记内容（单条分析） -->
        <div v-if="!record.isBatch && record.diarySnapshot" class="diary-section">
          <h3 class="section-title">原日记内容</h3>
          <div class="diary-card">
            <div class="diary-header">
              <span class="diary-mood">{{ getMoodEmoji(record.diarySnapshot.mood) }}</span>
              <span class="diary-title">{{ record.diarySnapshot.title || '无标题' }}</span>
            </div>
            <div class="diary-content">{{ record.diarySnapshot.content }}</div>
            <div class="diary-footer">
              <span v-if="record.diarySnapshot.weather">{{ record.diarySnapshot.weather }}</span>
              <span v-if="record.diarySnapshot.createdAt">{{ formatDate(record.diarySnapshot.createdAt) }}</span>
            </div>
          </div>
        </div>
      </main>

      <!-- 底部 -->
      <footer class="footer">
        <p>由 AI 智能分析生成</p>
        <p class="text-xs text-gray-400 mt-1">分析仅供参考，鼓励孩子持续写作</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { aiAnalysisAPI } from '@/api'
import { format } from 'date-fns'
import { marked } from 'marked'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const record = ref(null)

// 渲染分析内容
const renderedAnalysis = computed(() => {
  if (!record.value?.analysis) return ''

  let content = record.value.analysis

  // 移除 JSON 代码块
  content = content.replace(/##\s*📊\s*评分数据[\s\S]*$/i, '')
  content = content.replace(/```json[\s\S]*?```/g, '')
  content = content.replace(/---\s*$/g, '')
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  if (!content.trim()) return ''

  return marked(content)
})

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return format(new Date(date), 'yyyy年M月d日 HH:mm')
}

// 获取心情 emoji
const getMoodEmoji = (mood) => {
  const emojis = { happy: '😊', neutral: '😐', sad: '😢', angry: '😠', tired: '😴' }
  return emojis[mood] || '😊'
}

// 获取评分等级样式
const getGradeClass = (grade) => {
  if (!grade) return ''
  const g = grade.toUpperCase()
  if (g.startsWith('A')) return 'grade-a'
  if (g.startsWith('B')) return 'grade-b'
  if (g.startsWith('C')) return 'grade-c'
  return 'grade-d'
}

// 获取评分颜色
const getGradeColor = (grade) => {
  if (!grade) return '#6366f1'
  const g = grade.toUpperCase()
  if (g.startsWith('A')) return '#22c55e'
  if (g.startsWith('B')) return '#3b82f6'
  if (g.startsWith('C')) return '#f59e0b'
  return '#ef4444'
}

// 获取维度标签
const getDimensionLabel = (key) => {
  const labels = {
    content: '内容',
    emotion: '情感',
    language: '语言',
    structure: '结构',
    creativity: '创意'
  }
  return labels[key] || key
}

// 加载数据
const loadData = async () => {
  const id = route.params.id
  if (!id) {
    error.value = '缺少分析记录 ID'
    loading.value = false
    return
  }

  try {
    const res = await aiAnalysisAPI.getPublicDiaryAnalysisDetail(id)
    if (res.success) {
      record.value = res.data
    } else {
      error.value = res.error || '获取失败'
    }
  } catch (e) {
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.diary-analysis-public {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.loading-container,
.error-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
}

/* 头部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  margin-bottom: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

/* 作者卡片 */
.author-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.author-meta {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

/* 评分卡片 */
.score-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.score-main {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.score-grade {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
}

.score-grade.grade-a {
  background: #dcfce7;
  color: #166534;
}

.score-grade.grade-b {
  background: #dbeafe;
  color: #1e40af;
}

.score-grade.grade-c {
  background: #fef3c7;
  color: #92400e;
}

.score-grade.grade-d {
  background: #fee2e2;
  color: #991b1b;
}

.score-value {
  font-size: 32px;
  font-weight: bold;
  color: #1f2937;
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  width: 40px;
  font-size: 12px;
  color: #6b7280;
}

.score-item :deep(.n-progress) {
  flex: 1;
}

.score-num {
  width: 24px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-align: right;
}

/* 标签区 */
.tags-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tag-group {
  margin-bottom: 12px;
}

.tag-group:last-child {
  margin-bottom: 0;
}

.tag-title {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 通用章节 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #6366f1;
}

/* 人物画像 */
.profile-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.profile-item {
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.profile-item.full-width {
  grid-column: span 2;
}

.profile-label {
  display: block;
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 6px;
}

.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.profile-fun {
  font-size: 14px;
  color: #374151;
  font-style: italic;
}

/* 人物列表 */
.characters-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.characters-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.character-card {
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
  text-align: center;
}

.character-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.character-role {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.character-comment {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
  font-style: italic;
}

/* 分析内容 */
.analysis-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.analysis-content {
  line-height: 1.8;
  font-size: 14px;
  color: #374151;
}

.analysis-content :deep(h1),
.analysis-content :deep(h2),
.analysis-content :deep(h3),
.analysis-content :deep(h4) {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(h2) {
  font-size: 1.2em;
}

.analysis-content :deep(h3) {
  font-size: 1.1em;
}

.analysis-content :deep(p) {
  margin-bottom: 0.8em;
}

.analysis-content :deep(ul),
.analysis-content :deep(ol) {
  margin-bottom: 0.8em;
  padding-left: 1.5em;
}

.analysis-content :deep(blockquote) {
  margin: 0.8em 0;
  padding: 0.6em 1em;
  border-left: 3px solid #6366f1;
  background-color: #f8fafc;
  color: #4b5563;
  font-style: italic;
}

.analysis-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
  font-size: 13px;
}

.analysis-content :deep(th),
.analysis-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  text-align: left;
}

.analysis-content :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

/* 日记内容 */
.diary-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.diary-card {
  background: #fffbeb;
  border-radius: 12px;
  padding: 16px;
}

.diary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.diary-mood {
  font-size: 24px;
}

.diary-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.diary-content {
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
}

.diary-footer {
  margin-top: 12px;
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  gap: 12px;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 24px 0;
  color: #9ca3af;
  font-size: 13px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .content-container {
    padding: 12px;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-item.full-width {
    grid-column: span 1;
  }
}
</style>
