<template>
  <div>
    <n-spin :show="loading">
      <div v-if="users.length === 0 && !loading" class="text-center py-12">
        <n-empty description="暂无已关联用户，请先在「勤学好问」中关联用户" />
      </div>

      <div class="user-grid">
        <n-card v-for="user in users" :key="user.userId" size="small" class="user-card">
          <div class="card-main">
            <div class="card-left">
              <n-avatar :src="user.avatar" :size="48" round>
                {{ (user.nickname || user.username)[0] }}
              </n-avatar>
              <div class="user-info">
                <span class="user-name">{{ user.nickname || user.username }}</span>
                <span class="user-username">@{{ user.username }}</span>
              </div>
            </div>
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-value">{{ user.totalQuestions }}</span>
                <span class="stat-label">提问</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ user.diaryCount }}</span>
                <span class="stat-label">日记</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ formatWords(user.diaryTotalWords) }}</span>
                <span class="stat-label">总字数</span>
              </div>
            </div>
          </div>

          <template #action>
            <div class="expand-content">
              <n-space :size="8" class="mb-3">
                <n-checkbox :checked="analysisScope[user.userId]?.includeMessages !== false" @update:checked="v => { if (!analysisScope[user.userId]) analysisScope[user.userId] = {}; analysisScope[user.userId].includeMessages = v }">
                  勤学好问（{{ user.totalQuestions }}条消息）
                </n-checkbox>
                <n-checkbox :checked="analysisScope[user.userId]?.includeDiaries === true" @update:checked="v => { if (!analysisScope[user.userId]) analysisScope[user.userId] = {}; analysisScope[user.userId].includeDiaries = v }">
                  日记（{{ user.diaryCount }}篇）
                </n-checkbox>
              </n-space>

              <n-space>
                <n-button size="tiny" type="primary" :loading="evaluatingUserId === user.userId" @click="startAnalysis(user)">
                  AI分析
                </n-button>
                <n-button size="tiny" @click="showAnalysisHistory(user)">分析历史</n-button>
              </n-space>
            </div>
          </template>
        </n-card>
      </div>
    </n-spin>

    <!-- 分析类型选择 -->
    <n-modal v-model:show="showTypeModal" preset="card" title="选择分析方向" style="max-width: 480px;">
      <div class="grid grid-cols-1 gap-3">
        <div v-for="opt in analysisTypeOptions" :key="opt.value"
          class="analysis-type-card" :class="{ active: selectedType === opt.value }"
          @click="selectedType = opt.value">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ opt.icon }}</span>
            <div class="flex-1">
              <div class="font-medium text-gray-800">{{ opt.label }}</div>
              <div class="text-xs text-gray-500">{{ opt.desc }}</div>
            </div>
            <n-icon v-if="selectedType === opt.value" size="20" color="#18a058">
              <CheckmarkCircleSharp />
            </n-icon>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showTypeModal = false">取消</n-button>
          <n-button type="primary" :loading="analyzing" @click="confirmAnalysis">开始分析</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 分析结果 -->
    <n-modal v-model:show="showResultModal" preset="card" title="AI 分析结果" style="max-width: 720px; max-height: 85vh;">
      <div class="overflow-y-auto" style="max-height: 65vh;">
        <div v-if="currentResult" class="space-y-3">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>{{ currentResult.senderName || currentResult.sender }}</span>
            <span>· 基于 {{ currentResult.messageCount }} 条消息</span>
            <span v-if="currentResult.includeDiaries">· 包含日记分析</span>
            <span>· {{ formatTime(currentResult.createdAt) }}</span>
          </div>
          <div class="eval-content" v-html="renderMarkdown(currentResult.analysis)"></div>
          <div v-if="currentResult.modelName" class="text-xs text-gray-400">模型: {{ currentResult.modelName }}</div>
        </div>
      </div>
    </n-modal>

    <!-- 分析历史 -->
    <n-modal v-model:show="showHistoryModal" preset="card" title="分析历史" style="max-width: 650px; max-height: 85vh;">
      <div class="overflow-y-auto space-y-3" style="max-height: 65vh;">
        <n-empty v-if="!historyList.length" description="暂无分析记录" />
        <n-card v-for="ev in historyList" :key="ev.id" size="small" class="cursor-pointer" hoverable @click="viewHistory(ev)">
          <div class="flex justify-between items-center">
            <div class="text-sm">
              <span>{{ formatTime(ev.createdAt) }}</span>
              <span class="text-gray-400 ml-2">基于 {{ ev.messageCount }} 条消息</span>
            </div>
            <n-button size="tiny" text type="primary">查看详情</n-button>
          </div>
          <div class="text-xs text-gray-500 mt-1 line-clamp-2">{{ ev.analysis?.substring(0, 120) }}...</div>
        </n-card>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import CheckmarkCircleSharp from '@vicons/ionicons5/es/CheckmarkCircleSharp'
import { imessageAPI } from '@/api'
import { marked } from 'marked'

const message = useMessage()
const loading = ref(false)
const users = ref([])

const analysisScope = reactive({})
const evaluatingUserId = ref(null)
const showTypeModal = ref(false)
const selectedType = ref('comprehensive')
const currentAnalysisUser = ref(null)
const analyzing = ref(false)

const showResultModal = ref(false)
const currentResult = ref(null)
const showHistoryModal = ref(false)
const historyList = ref([])

const analysisTypeOptions = [
  { value: 'comprehensive', icon: '🎯', label: '综合分析', desc: '全面评估兴趣、思维、沟通、学习态度等各维度' },
  { value: 'psychology', icon: '🧠', label: '心理分析', desc: '深度分析情绪特征、社交模式、自信心与心理韧性' },
  { value: 'interest', icon: '💡', label: '兴趣分析', desc: '挖掘核心兴趣领域、学习风格与天赋潜能' },
  { value: 'negative', icon: '🛡️', label: '负面情况排查', desc: '排查情绪异常、不良倾向、社交问题与网络安全' },
  { value: 'values', icon: '⚖️', label: '三观分析', desc: '评估世界观、人生观、价值观发展状况' },
  { value: 'teaching', icon: '📖', label: '教学建议', desc: '学习能力评估、学科优势分析、个性化教学策略' },
]

function formatWords(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}



async function loadUsers() {
  loading.value = true
  try {
    const res = await imessageAPI.getLinkedUsersStats()
    if (res.success) users.value = res.data
  } catch (e) {
    message.error('加载用户数据失败')
  } finally {
    loading.value = false
  }
}

function startAnalysis(user) {
  currentAnalysisUser.value = user
  selectedType.value = 'comprehensive'
  showTypeModal.value = true
}

async function confirmAnalysis() {
  const user = currentAnalysisUser.value
  if (!user) return
  analyzing.value = true
  evaluatingUserId.value = user.userId
  showTypeModal.value = false

  const scope = analysisScope[user.userId] || { includeMessages: true, includeDiaries: false }

  try {
    const res = await imessageAPI.evaluateBySender(user.sender, {
      analysisType: selectedType.value,
      includeDiaries: scope.includeDiaries,
    })
    if (res.success) {
      currentResult.value = res.data
      showResultModal.value = true
      message.success('AI 分析完成')
    } else {
      message.error(res.error || '分析失败')
    }
  } catch (e) {
    message.error(e.message || 'AI 分析请求失败')
  } finally {
    analyzing.value = false
    evaluatingUserId.value = null
  }
}

async function showAnalysisHistory(user) {
  showHistoryModal.value = true
  historyList.value = []
  try {
    const res = await imessageAPI.getEvaluationsBySender(user.sender)
    if (res.success) historyList.value = res.data
  } catch {}
}

function viewHistory(ev) {
  currentResult.value = ev
  showResultModal.value = true
}

function renderMarkdown(text) {
  if (!text) return ''
  return marked(text)
}

onMounted(loadUsers)
</script>

<style scoped>
.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}
.user-card {
  transition: box-shadow 0.2s;
}
.user-card:hover {
  box-shadow: 0 4px 16px rgba(79,70,229,0.12);
}
.card-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.user-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-username {
  font-size: 12px;
  color: #999;
}
.card-stats {
  display: flex;
  gap: 16px;
}
.stat-item {
  text-align: center;
  min-width: 44px;
}
.stat-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #4f46e5;
}
.stat-label {
  font-size: 10px;
  color: #999;
}
.expand-content {
  padding-top: 8px;
}
.analysis-type-card {
  padding: 14px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.analysis-type-card:hover {
  border-color: #4f46e5;
  background: #eef2ff;
}
.analysis-type-card.active {
  border-color: #4f46e5;
  background: #eef2ff;
}
.eval-content :deep(h2) { font-size: 16px; margin: 16px 0 8px; }
.eval-content :deep(h3) { font-size: 14px; margin: 12px 0 6px; }
.eval-content :deep(p)  { margin: 6px 0; line-height: 1.6; }
.eval-content :deep(ul), .eval-content :deep(ol) { padding-left: 20px; margin: 6px 0; }
.eval-content :deep(blockquote) { border-left: 3px solid #4f46e5; padding-left: 12px; margin: 8px 0; color: #555; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; }
</style>
