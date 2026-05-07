<template>
  <div class="diary-score-card">
    <!-- 总分和等级 -->
    <div class="score-header">
      <div class="score-circle" :style="{ background: gradeColor }">
        <span class="score-grade">{{ grade || '-' }}</span>
        <span class="score-value">{{ totalScore ?? '-' }}</span>
      </div>
      <div class="score-info">
        <div class="score-label">AI 评分</div>
        <div v-if="previousScore !== null" class="score-compare">
          <span :class="scoreChange > 0 ? 'text-green-600' : scoreChange < 0 ? 'text-red-500' : 'text-gray-500'">
            {{ scoreChange > 0 ? '+' : '' }}{{ scoreChange }} 分
            <span v-if="previousGrade">（{{ previousGrade }} → {{ grade }}）</span>
          </span>
        </div>
        <div v-if="encouragement" class="score-encouragement">{{ encouragement }}</div>
      </div>
    </div>

    <!-- 五维度评分 -->
    <div v-if="scoreDetails" class="score-dimensions">
      <div class="dimensions-title">评分详情</div>
      <div class="dimensions-grid">
        <div v-for="(item, key) in dimensionItems" :key="key" class="dimension-item">
          <div class="dimension-header">
            <span class="dimension-label">{{ item.label }}</span>
            <span class="dimension-score">{{ item.score }}/{{ item.max || 20 }}</span>
          </div>
          <n-progress
            type="line"
            :percentage="(item.score / (item.max || 20)) * 100"
            :color="getDimensionColor(item.score, item.max || 20)"
            :height="6"
            :show-indicator="false"
          />
          <div v-if="item.comment" class="dimension-comment">{{ item.comment }}</div>
        </div>
      </div>
    </div>

    <!-- 亮点和改进建议 -->
    <div class="score-feedback">
      <div v-if="highlights?.length" class="feedback-section highlights">
        <div class="feedback-title">
          <span class="icon">✨</span>
          亮点
        </div>
        <ul class="feedback-list">
          <li v-for="(item, idx) in highlights" :key="idx">{{ item }}</li>
        </ul>
      </div>

      <div v-if="improvements?.length" class="feedback-section improvements">
        <div class="feedback-title">
          <span class="icon">💡</span>
          改进建议
        </div>
        <ul class="feedback-list">
          <li v-for="(item, idx) in improvements" :key="idx">{{ item }}</li>
        </ul>
      </div>
    </div>

    <!-- 下次目标 -->
    <div v-if="nextGoal" class="next-goal">
      <span class="goal-icon">🎯</span>
      <span class="goal-text">下次目标：{{ nextGoal }}</span>
    </div>

    <!-- 人物画像（批量分析） -->
    <template v-if="authorProfile || charactersProfile">
      <div class="profile-section">
        <div class="profile-title">人物画像</div>

        <div v-if="authorProfile" class="profile-item author-profile">
          <div class="profile-header">
            <span class="profile-icon">📝</span>
            <span>小作者画像</span>
          </div>
          <div class="profile-content">
            <div v-if="authorProfile.personality" class="profile-row">
              <span class="row-label">性格特点：</span>
              <span>{{ authorProfile.personality }}</span>
            </div>
            <div v-if="authorProfile.interests" class="profile-row">
              <span class="row-label">兴趣爱好：</span>
              <span>{{ Array.isArray(authorProfile.interests) ? authorProfile.interests.join('、') : authorProfile.interests }}</span>
            </div>
            <div v-if="authorProfile.writingStyle" class="profile-row">
              <span class="row-label">写作风格：</span>
              <span>{{ authorProfile.writingStyle }}</span>
            </div>
            <div v-if="authorProfile.emotionalTendency" class="profile-row">
              <span class="row-label">情感倾向：</span>
              <span>{{ authorProfile.emotionalTendency }}</span>
            </div>
          </div>
        </div>

        <div v-if="charactersProfile?.length" class="profile-item characters-profile">
          <div class="profile-header">
            <span class="profile-icon">👥</span>
            <span>日记中的人物</span>
          </div>
          <div class="characters-list">
            <div v-for="(char, idx) in charactersProfile" :key="idx" class="character-item">
              <div class="character-name">{{ char.name || char.role }}</div>
              <div v-if="char.relationship" class="character-rel">{{ char.relationship }}</div>
              <div v-if="char.description" class="character-desc">{{ char.description }}</div>
            </div>
          </div>
        </div>

        <div v-if="socialStyle" class="profile-item social-style">
          <div class="profile-header">
            <span class="profile-icon">🤝</span>
            <span>社交风格</span>
          </div>
          <div class="profile-content">{{ socialStyle }}</div>
        </div>

        <div v-if="funSummary" class="profile-item fun-summary">
          <div class="profile-header">
            <span class="profile-icon">🎉</span>
            <span>有趣总结</span>
          </div>
          <div class="profile-content">{{ funSummary }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalScore: { type: Number, default: null },
  grade: { type: String, default: null },
  scoreDetails: { type: Object, default: null },
  highlights: { type: Array, default: () => [] },
  improvements: { type: Array, default: () => [] },
  encouragement: { type: String, default: null },
  nextGoal: { type: String, default: null },
  previousScore: { type: Number, default: null },
  previousGrade: { type: String, default: null },
  // 人物画像（批量分析）
  authorProfile: { type: Object, default: null },
  charactersProfile: { type: Array, default: null },
  socialStyle: { type: String, default: null },
  funSummary: { type: String, default: null }
})

// 等级对应颜色
const gradeColor = computed(() => {
  const grade = props.grade?.toUpperCase()
  if (!grade) return '#9ca3af'
  if (grade.startsWith('A')) return '#22c55e'  // 绿色
  if (grade.startsWith('B')) return '#3b82f6'  // 蓝色
  if (grade.startsWith('C')) return '#f97316'  // 橙色
  return '#ef4444'  // 红色
})

// 分数变化
const scoreChange = computed(() => {
  if (props.previousScore === null || props.totalScore === null) return 0
  return props.totalScore - props.previousScore
})

// 维度评分项
const dimensionItems = computed(() => {
  if (!props.scoreDetails) return []

  const labels = {
    content: '内容丰富度',
    language: '语言表达',
    structure: '结构条理',
    emotion: '情感真实度',
    creativity: '创意想象力'
  }

  const items = []
  for (const [key, value] of Object.entries(props.scoreDetails)) {
    if (typeof value === 'object') {
      items.push({
        key,
        label: labels[key] || key,
        score: value.score ?? value,
        max: value.max || 20,
        comment: value.comment
      })
    } else {
      items.push({
        key,
        label: labels[key] || key,
        score: value,
        max: 20,
        comment: null
      })
    }
  }
  return items
})

// 获取维度颜色
function getDimensionColor(score, max) {
  const ratio = score / max
  if (ratio >= 0.8) return '#22c55e'
  if (ratio >= 0.6) return '#3b82f6'
  if (ratio >= 0.4) return '#f97316'
  return '#ef4444'
}
</script>

<style scoped>
.diary-score-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.score-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.score-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.score-grade {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.score-value {
  font-size: 12px;
  opacity: 0.9;
}

.score-info {
  flex: 1;
}

.score-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.score-compare {
  font-size: 13px;
  font-weight: 500;
}

.score-encouragement {
  font-size: 14px;
  color: #374151;
  margin-top: 4px;
}

.score-dimensions {
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.dimensions-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.dimensions-grid {
  display: grid;
  gap: 12px;
}

.dimension-item {
  background: white;
  padding: 10px 12px;
  border-radius: 8px;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dimension-label {
  font-size: 13px;
  color: #374151;
}

.dimension-score {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.dimension-comment {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.score-feedback {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.feedback-section {
  padding: 12px 16px;
  border-radius: 10px;
}

.highlights {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.improvements {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.feedback-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.highlights .feedback-title {
  color: #065f46;
}

.improvements .feedback-title {
  color: #92400e;
}

.feedback-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.6;
}

.highlights .feedback-list {
  color: #047857;
}

.improvements .feedback-list {
  color: #b45309;
}

.feedback-list li {
  margin-bottom: 4px;
}

.next-goal {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 10px;
  font-size: 14px;
  color: #1e40af;
  margin-bottom: 16px;
}

.goal-icon {
  font-size: 18px;
}

.profile-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.profile-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.profile-item {
  margin-bottom: 16px;
  padding: 14px;
  background: #f9fafb;
  border-radius: 12px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.profile-icon {
  font-size: 18px;
}

.profile-content {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}

.profile-row {
  margin-bottom: 6px;
}

.row-label {
  color: #6b7280;
}

.characters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.character-item {
  background: white;
  padding: 10px 14px;
  border-radius: 8px;
  min-width: 120px;
}

.character-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.character-rel {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.character-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}
</style>
