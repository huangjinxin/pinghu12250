<template>
  <div class="submit-task-page">
    <!-- 面包屑导航 -->
    <n-breadcrumb class="mb-4">
      <n-breadcrumb-item @click="$router.push('/')">首页</n-breadcrumb-item>
      <n-breadcrumb-item>任务提交</n-breadcrumb-item>
      <n-breadcrumb-item>{{ currentTaskConfig.name }}</n-breadcrumb-item>
    </n-breadcrumb>

    <!-- 成功状态（带动画） -->
    <div v-if="submitted" class="success-overlay">
      <div class="success-content">
        <div class="coin-animation">
          <div v-for="i in 8" :key="i" class="coin" :style="{ '--delay': i * 0.1 + 's' }">
            <n-icon size="24" color="#f59e0b"><StarOutline /></n-icon>
          </div>
        </div>
        <div class="success-icon">✅</div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">提交成功！</h2>
        <div class="points-earned">
          <span class="text-amber-500 text-3xl font-bold">+{{ earnedPoints }}</span>
          <span class="text-gray-500 ml-2">积分</span>
        </div>

        <!-- 提交信息 -->
        <div v-if="submissionInfo" class="submission-info">
          <div class="submission-badge">
            <n-icon><CheckmarkCircleOutline /></n-icon>
            已提交到审核中心
          </div>
          <div class="submission-detail">
            规则：{{ submissionInfo.templateName }} | 待审核积分：+{{ submissionInfo.points }}
          </div>
        </div>

        <!-- AI分析按钮（仅日记） -->
        <div v-if="currentType === 'diary' && lastDiaryId" class="ai-analysis-section">
          <n-button
            type="info"
            size="large"
            :loading="analyzingAI"
            @click="handleAiAnalysis"
          >
            <template #icon><n-icon><SparklesOutline /></n-icon></template>
            🧠 AI 智能分析
          </n-button>
          <div class="ai-hint">获取写作建议和评分</div>
        </div>

        <div class="flex gap-4 mt-6">
          <n-button @click="handleContinue">继续提交</n-button>
          <n-button type="primary" @click="goToList">查看作品</n-button>
        </div>
      </div>
    </div>

    <!-- 主内容区：左右分栏 -->
    <div v-else class="main-layout">
      <!-- 左侧：沉浸操作区 (65%) -->
      <div class="left-panel">
        <!-- 任务头 -->
        <div class="task-header">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ currentTaskConfig.icon }}</span>
            <h1 class="text-2xl font-bold text-gray-800">{{ currentTaskConfig.name }}</h1>
          </div>
          <div class="flex items-center gap-3">
            <n-button v-if="isAdmin" type="warning" size="small" @click="openAdminDialog">
              <template #icon><n-icon><SettingsOutline /></n-icon></template>
              管理权限
            </n-button>
            <router-link to="/my-growth" class="growth-entry-btn">
              📋 我的成长
            </router-link>
            <n-tag type="warning" size="large" round>
              <template #icon><n-icon><StarOutline /></n-icon></template>
              +{{ estimatedPointsRange.min }}-{{ estimatedPointsRange.max }} 积分
            </n-tag>
          </div>
        </div>

        <!-- 无权限提示（非管理员且被禁用日记权限） -->
        <div v-if="!diaryEnabled && !isAdmin" class="diary-disabled-overlay">
          <div class="diary-disabled-content">
            <div class="diary-disabled-icon">🪶</div>
            <p class="diary-disabled-text">如果连你这一滩烂泥般的生活都懒得记录，非要偷别人的二手人生，那从此笔可以折了。一个连真实灵魂都丢了的人，没资格在本系统上留下任何属于人类的痕迹。</p>
          </div>
        </div>

        <!-- 日记表单 -->
        <div v-else class="card space-y-4">


          <n-form-item label="标题">
            <n-input v-model:value="diaryForm.title" placeholder="给日记起个标题" maxlength="50" show-count />
          </n-form-item>

          <n-form-item label="内容">
            <n-input
              v-model:value="diaryForm.content"
              type="textarea"
              placeholder="今天发生了什么有趣的事情？"
              :rows="12"
              show-count
            />
          </n-form-item>

          <div class="grid grid-cols-2 gap-4">
            <n-form-item label="心情">
              <n-select v-model:value="diaryForm.mood" :options="moodSelectOptions" />
            </n-form-item>
            <n-form-item label="天气">
              <n-select v-model:value="diaryForm.weather" :options="weatherSelectOptions" />
            </n-form-item>
          </div>

          <n-form-item label="标签">
            <n-dynamic-tags v-model:value="diaryForm.tags" :max="5" />
          </n-form-item>
        </div>





        <!-- 操作按钮 -->
        <div class="action-bar">
          <n-button @click="handleSaveDraft" :disabled="submitting">
            <template #icon><n-icon><SaveOutline /></n-icon></template>
            保存草稿
          </n-button>
          <n-button 
            type="primary" 
            size="large" 
            :loading="submitting" 
            @click="handleSubmit"
          >
            提交审核
          </n-button>
        </div>
      </div>

      <!-- 右侧：辅助激励区 (35%) -->
      <div class="right-panel">
        <!-- 详细字数统计 -->
        <div class="card word-stats-card">
          <div class="card-title">📊 字数统计</div>

          <!-- 字数详情 -->
          <div class="word-stats-grid">
            <div class="word-stat-item">
              <div class="word-stat-value">{{ detailedWordCount.total }}</div>
              <div class="word-stat-label">总字符</div>
            </div>
            <div class="word-stat-item">
              <div class="word-stat-value">{{ detailedWordCount.words }}</div>
              <div class="word-stat-label">文字</div>
            </div>
            <div class="word-stat-item">
              <div class="word-stat-value">{{ detailedWordCount.punctuation }}</div>
              <div class="word-stat-label">标点</div>
            </div>
            <div class="word-stat-item">
              <div class="word-stat-value">{{ detailedWordCount.spaces }}</div>
              <div class="word-stat-label">空格</div>
            </div>
          </div>

          <!-- 等级选择 -->
          <div class="level-options">
            <div
              v-for="level in writingLevel.levels"
              :key="level.name"
              class="level-option"
              :class="{
                'level-achieved': detailedWordCount.words >= level.minWords,
                'level-current': writingLevel.next?.name === level.name
              }"
            >
              <span class="level-radio">
                <span v-if="detailedWordCount.words >= level.minWords" class="level-check">✓</span>
                <span v-else class="level-empty">○</span>
              </span>
              <span class="level-name">{{ level.name }}</span>
              <span class="level-words">({{ level.minWords }}字)</span>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: writingLevel.progress + '%' }"></div>
            </div>
            <div class="progress-text">{{ writingLevel.progress }}%</div>
          </div>

          <!-- 提示文字 -->
          <div class="level-hint" v-if="writingLevel.next">
            还需 <span class="hint-number">{{ writingLevel.wordsNeeded }}</span> 字达到{{ writingLevel.next.name }}等级
          </div>
          <div class="level-hint level-complete" v-else>
            🎉 已达到大师等级！
          </div>
        </div>

        <!-- 查重检测（800字以上可用） -->
        <div class="card duplicate-card">
          <div class="card-title">🔍 内容查重 <span class="card-subtitle">(都不能超过10%)</span></div>

          <!-- 查重按钮 -->
          <n-button
            block
            :type="detailedWordCount.words >= 800 ? 'primary' : 'default'"
            :disabled="detailedWordCount.words < 800"
            :loading="checkingDuplicate"
            @click="handleCheckDuplicate"
          >
            <template #icon><n-icon><SearchOutline /></n-icon></template>
            {{ detailedWordCount.words < 800 ? `还需${800 - detailedWordCount.words}字可查重` : '检测重复内容' }}
          </n-button>

          <!-- 查重结果 -->
          <div v-if="duplicateResult" class="duplicate-result">
            <div class="duplicate-rates">
              <div class="duplicate-rate" :class="getDuplicateRateClass(duplicateResult.overallRate)">
                <span class="rate-number">{{ duplicateResult.overallRate }}%</span>
                <span class="rate-label">总重复率</span>
              </div>
              <div class="duplicate-rate rate-self">
                <span class="rate-number">{{ duplicateResult.selfRepeatRate || 0 }}%</span>
                <span class="rate-label">自身重复</span>
              </div>
              <div class="duplicate-rate rate-global">
                <span class="rate-number">{{ duplicateResult.globalRepeatRate || 0 }}%</span>
                <span class="rate-label">全站重复</span>
              </div>
            </div>

            <div class="duplicate-stats">
              <span>已检查 {{ duplicateResult.checkedDiaries }} 篇日记</span>
              <span>历史重复 {{ duplicateResult.duplicateChars }} 字</span>
              <span v-if="duplicateResult.selfRepeatChars > 0">自身重复 {{ duplicateResult.selfRepeatChars }} 字</span>
              <span v-if="duplicateResult.globalDuplicateChars > 0">全站重复 {{ duplicateResult.globalDuplicateChars }} 字</span>
            </div>

            <!-- 自身重复内容列表 -->
            <div v-if="duplicateResult.selfRepeats?.length > 0" class="duplicate-list self-repeat-list">
              <div class="duplicate-list-title">⚠️ 文章内重复词句：</div>
              <div
                v-for="(repeat, index) in duplicateResult.selfRepeats"
                :key="'self-' + index"
                class="duplicate-item self-repeat-item"
              >
                <div class="duplicate-text">"{{ repeat.text }}"</div>
                <div class="duplicate-source">重复 {{ repeat.count }} 次，共 {{ repeat.length }} 字</div>
              </div>
            </div>

            <!-- 历史重复内容列表 -->
            <div v-if="duplicateResult.duplicates?.length > 0" class="duplicate-list">
              <div class="duplicate-list-title">📋 与本人历史日记重复：</div>
              <div
                v-for="(dup, index) in duplicateResult.duplicates"
                :key="index"
                class="duplicate-item"
              >
                <div class="duplicate-text">"{{ dup.text }}"</div>
                <div class="duplicate-source">
                  来自《{{ dup.foundIn[0]?.diaryTitle }}》({{ formatDate(dup.foundIn[0]?.diaryDate) }})
                </div>
              </div>
            </div>

            <!-- 全站重复内容列表 -->
            <div v-if="duplicateResult.globalDuplicates?.length > 0" class="duplicate-list global-duplicate-list">
              <div class="duplicate-list-title">🌐 与全站其他日记重复：</div>
              <div
                v-for="(dup, index) in duplicateResult.globalDuplicates"
                :key="'global-' + index"
                class="duplicate-item"
              >
                <div class="duplicate-text">"{{ dup.text }}"</div>
                <div class="duplicate-source">
                  来自《{{ dup.foundIn[0]?.diaryTitle }}》({{ formatDate(dup.foundIn[0]?.diaryDate) }})
                </div>
              </div>
            </div>

            <div v-if="!duplicateResult.duplicates?.length && !duplicateResult.selfRepeats?.length && !duplicateResult.globalDuplicates?.length" class="duplicate-empty">
              ✅ 未发现重复内容，继续保持原创！
            </div>

            <!-- 查重说明 -->
            <div class="duplicate-tips">
              <div class="tips-title">📖 查重标准</div>
              <ul class="tips-list">
                <li>历史查重：检测50字以上与本人历史日记的重复</li>
                <li>自身查重：检测连续6字以上的重复词句</li>
                <li>全站查重：检测50字以上与其他用户日记的重复</li>
              </ul>
              <div class="tips-title">✍️ 写作建议</div>
              <ul class="tips-list">
                <li>避免复制粘贴相同的句子</li>
                <li>用不同的表达方式描述相似内容</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 提交限制标准 -->
        <div class="card submit-tips-card">
          <div class="card-title">📋 提交标准</div>
          <ul class="submit-tips-list">
            <li>字数：需达1200字以上（包含标点）</li>
            <li>时间词：需包含早上/上午/中午/下午/晚上/天气等</li>
            <li>字符：不能有连续5个以上相同字符</li>
            <li>原创度：历史重复率、自身重复率、全站重复率均需低于10%</li>
          </ul>
        </div>

        <!-- 历史对照 -->
        <div class="card history-card">
          <div class="card-title">📚 最近提交</div>
          <n-spin :show="loadingHistory">
            <div v-if="recentHistory.length === 0" class="empty-history">
              暂无历史记录
            </div>
            <div v-else class="history-list">
              <div v-for="item in recentHistory" :key="item.id" class="history-item">
                <div class="history-title">{{ item.title }}</div>
                <div class="history-meta">
                  <span>{{ formatDate(item.date) }}</span>
                  <span class="text-amber-500">+{{ item.points }}分</span>
                </div>
              </div>
            </div>
          </n-spin>
        </div>


      </div>
    </div>

    <!-- 管理员权限管理对话框 -->
    <n-modal v-model:show="showAdminDialog" preset="card" title="日记编辑权限管理" style="width:800px;max-height:80vh" :mask-closable="false">
      <template #header-extra>
        <n-input
          v-model:value="adminSearchKeyword"
          placeholder="搜索用户名/邮箱/昵称..."
          clearable
          style="width:240px"
          @keydown.enter="onAdminSearch"
          @clear="onAdminSearch"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
      </template>

      <n-spin :show="adminLoading">
        <n-data-table
          :columns="adminTableColumns"
          :data="adminUsers"
          :pagination="adminPagination"
          :row-key="(row) => row.id"
          size="small"
          remote
          @update:page="onAdminPageChange"
        />
      </n-spin>

      <template #footer>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
          <span style="color:#6b7280;font-size:13px">点击切换按钮启用/禁用用户的日记编辑权限</span>
          <n-button @click="showAdminDialog = false">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NButton, NTag } from 'naive-ui';
import { useSubmission } from '@/composables/useSubmission';
import { useAuthStore } from '@/stores/auth';
import { diaryAdminAPI } from '@/api';
import BrushOutline from '@vicons/ionicons5/es/BrushOutline'
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import StarOutline from '@vicons/ionicons5/es/StarOutline'
import SaveOutline from '@vicons/ionicons5/es/SaveOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const {
  currentType,
  diaryForm,
  calligraphyForm,
  photoForm,
  submitting,
  submitted,
  earnedPoints,
  estimatedPoints,
  estimatedPointsRange,
  displayPoints,
  wordCount,
  detailedWordCount,
  writingLevel,
  diaryTemplates,
  selectedTemplate,
  templateExpanded,
  loadingTemplates,
  loadTemplates,
  applyTemplate,
  saveAsTemplate,
  deleteTemplate,
  duplicateResult,
  checkingDuplicate,
  checkDuplicate,
  lastDiaryId,
  submissionInfo,
  currentTaskConfig,
  moodOptions,
  weatherOptions,
  recentHistory,
  loadingHistory,
  loadHistory,
  loadDraft,
  saveDraft,
  submit,
  reset,
} = useSubmission();

// AI 分析状态
const analyzingAI = ref(false);



// 保存模板弹窗
const showSaveTemplateModal = ref(false);
const newTemplateName = ref('');
const newTemplateIcon = ref('📝');
const templateIcons = ['📝', '😊', '📚', '🎉', '📖', '🙏', '🌱', '✨', '💡', '🎯', '🌈', '⭐'];

// 转换为 n-select 格式
const moodSelectOptions = computed(() =>
  moodOptions.map(m => ({ label: `${m.emoji} ${m.label}`, value: m.value }))
);

const weatherSelectOptions = computed(() =>
  weatherOptions.map(w => ({ label: `${w.emoji} ${w.label}`, value: w.value }))
);

// 选择模板
const handleSelectTemplate = (template) => {
  // 如果已有内容，提示用户
  if (diaryForm.value.content.trim() && template.id !== 'free') {
    if (!confirm('应用模板将覆盖当前内容，确定继续吗？')) {
      return;
    }
  }
  applyTemplate(template);
};

// 保存为模板
const handleSaveTemplate = async () => {
  const result = await saveAsTemplate(newTemplateName.value, newTemplateIcon.value);
  if (result) {
    showSaveTemplateModal.value = false;
    newTemplateName.value = '';
    newTemplateIcon.value = '📝';
  }
};

// 删除模板
const handleDeleteTemplate = async (templateId) => {
  if (confirm('确定删除这个模板吗？')) {
    await deleteTemplate(templateId);
  }
};

// 查重检测
const handleCheckDuplicate = async () => {
  await checkDuplicate();
};

// 获取重复率等级样式
const getDuplicateRateClass = (rate) => {
  if (rate <= 10) return 'rate-low';
  if (rate <= 30) return 'rate-medium';
  return 'rate-high';
};

// 字体选项
const fontOptions = [
  { label: '楷书', value: 'kaishu' },
  { label: '行书', value: 'xingshu' },
  { label: '草书', value: 'caoshu' },
  { label: '隶书', value: 'lishu' },
];

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

// 保存草稿
const handleSaveDraft = () => {
  saveDraft();
  message.success('草稿已保存');
};

// 提交处理
const handleSubmit = async () => {
  await submit();
};

// 继续提交
const handleContinue = () => {
  reset();
  loadHistory();
};

// AI 分析
const handleAiAnalysis = () => {
  if (lastDiaryId.value) {
    // 跳转到日记详情页并触发AI分析
    router.push(`/diaries?analyze=${lastDiaryId.value}`);
  }
};

// 跳转到作品列表
const goToList = () => {
  const routes = {
    diary: '/diaries',
    calligraphy: '/writing',
    photo: '/photos',
  };
  router.push(routes[currentType.value] || '/works/my');
};

onMounted(() => {
  loadDraft();
  loadHistory();
  loadTemplates();
  checkDiaryPermission();
});

// ========== 管理员日记权限管理 ==========
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');
const diaryEnabled = ref(true);
const showAdminDialog = ref(false);
const adminLoading = ref(false);
const adminUsers = ref([]);
const adminSearchKeyword = ref('');
const adminPage = ref(1);
const adminTotal = ref(0);
const adminPageSize = 50;

const adminPagination = computed(() => ({
  page: adminPage.value,
  pageSize: adminPageSize,
  itemCount: adminTotal.value,
  showSizePicker: false,
  showQuickJumper: false,
}));

const roleLabels = { STUDENT: '学生', PARENT: '家长', TEACHER: '老师', ADMIN: '管理员' };
const roleColors = { STUDENT: 'info', PARENT: 'warning', TEACHER: 'success', ADMIN: 'error' };
const statusLabels = { ACTIVE: '已激活', PENDING: '待审核', DISABLED: '已禁用' };
const statusColors = { ACTIVE: 'success', PENDING: 'warning', DISABLED: 'error' };

const adminTableColumns = [
  { title: '用户名', key: 'username', width: 105, ellipsis: { tooltip: true } },
  { title: '昵称', key: 'profile.nickname', width: 85, ellipsis: { tooltip: true } },
  {
    title: '角色', key: 'role', width: 60,
    render(row) {
      return h(NTag, { type: roleColors[row.role] || 'default', size: 'small', bordered: false }, { default: () => roleLabels[row.role] || row.role });
    },
  },
  {
    title: '状态', key: 'status', width: 65,
    render(row) {
      return h(NTag, { type: statusColors[row.status] || 'default', size: 'small', bordered: false }, { default: () => statusLabels[row.status] || row.status });
    },
  },
  { title: '班级', key: 'class.name', width: 80, ellipsis: { tooltip: true } },
  {
    title: '注册时间', key: 'createdAt', width: 100,
    render(row) {
      return row.createdAt ? new Date(row.createdAt).toLocaleDateString('zh-CN') : '-';
    },
  },
  {
    title: '日记权限', key: 'diaryEnabled', width: 80,
    render(row) {
      return h(NTag, { type: row.diaryEnabled !== false ? 'success' : 'error', size: 'small', bordered: false },
        { default: () => row.diaryEnabled !== false ? '已启用' : '已禁用' });
    },
  },
  {
    title: '操作', key: 'actions', width: 60,
    render(row) {
      return h(NButton, {
        size: 'tiny',
        type: row.diaryEnabled !== false ? 'error' : 'success',
        onClick: () => handleToggleDiaryPermission(row),
      }, { default: () => row.diaryEnabled !== false ? '禁用' : '启用' });
    },
  },
];

async function checkDiaryPermission() {
  try {
    const res = await diaryAdminAPI.checkPermission();
    diaryEnabled.value = res.data?.diaryEnabled !== false;
  } catch {
    diaryEnabled.value = true;
  }
}

async function loadAdminUsers() {
  adminLoading.value = true;
  try {
    const params = { page: adminPage.value, limit: adminPageSize };
    if (adminSearchKeyword.value) params.keyword = adminSearchKeyword.value;
    const res = await diaryAdminAPI.getWhitelist(params);
    adminUsers.value = res.users || [];
    adminTotal.value = res.pagination?.total || 0;
  } catch (e) {
    message.error('加载用户列表失败');
  } finally {
    adminLoading.value = false;
  }
}

function onAdminPageChange(page) {
  adminPage.value = page;
  loadAdminUsers();
}

function onAdminSearch() {
  adminPage.value = 1;
  loadAdminUsers();
}

function openAdminDialog() {
  showAdminDialog.value = true;
  adminPage.value = 1;
  adminSearchKeyword.value = '';
  loadAdminUsers();
}

async function handleToggleDiaryPermission(user) {
  try {
    await diaryAdminAPI.toggleUser(user.id);
    message.success(`已${user.diaryEnabled !== false ? '禁用' : '启用'} ${user.username} 的日记权限`);
    await loadAdminUsers();
  } catch (e) {
    message.error('操作失败');
  }
}
</script>

<style scoped>
.submit-task-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

/* 主布局：左右分栏 */
.main-layout {
  display: flex;
  gap: 24px;
}

.left-panel {
  flex: 0 0 65%;
  min-width: 0;
}

.right-panel {
  flex: 0 0 calc(35% - 24px);
  min-width: 0;
}

/* 任务头 */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
}

/* 我的成长入口按钮 */
.growth-entry-btn {
  font-size: 13px;
  font-weight: 500;
  color: #059669;
  text-decoration: none;
  padding: 6px 12px;
  background: #ecfdf5;
  border-radius: 8px;
  transition: all 0.2s;
}

.growth-entry-btn:hover {
  background: #d1fae5;
  color: #047857;
}

/* 卡片样式 */
.card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
}

.card-title .card-subtitle {
  font-weight: 400;
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
}

/* AI 开关 */
.ai-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f3e8ff;
  border-radius: 8px;
}

/* 书写区域 */
.writing-area {
  width: 100%;
  height: 256px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}

.writing-placeholder {
  text-align: center;
  color: #9ca3af;
}

/* 模板选择 */
.template-section {
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 8px;
  margin: -8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.template-header:hover {
  background: #f9fafb;
}

.template-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-header-right .n-icon {
  transition: transform 0.3s;
}

.template-header-right .rotate-180 {
  transform: rotate(180deg);
}

.template-label {
  font-weight: 600;
  color: #374151;
}

.template-hint {
  font-size: 12px;
  color: #9ca3af;
}

.template-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  position: relative;
}

.template-item:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.template-item.template-active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.template-icon {
  font-size: 16px;
}

.template-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.template-name {
  font-weight: 500;
}

.template-author {
  font-size: 11px;
  color: #9ca3af;
}

.template-delete {
  opacity: 0;
  transition: opacity 0.2s;
}

.template-item:hover .template-delete {
  opacity: 1;
}

/* 图标选择器 */
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-option:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.icon-option.icon-active {
  border-color: #3b82f6;
  background: #3b82f6;
}

/* 查重卡片 */
.duplicate-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.duplicate-result {
  margin-top: 16px;
}

.duplicate-rates {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.duplicate-rate {
  flex: 1;
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.duplicate-rate.rate-self {
  background: #fef3c7;
}

.duplicate-rate.rate-self .rate-number {
  color: #d97706;
}

.duplicate-rate.rate-global {
  background: #e0e7ff;
}

.duplicate-rate.rate-global .rate-number {
  color: #4f46e5;
}

.duplicate-rate .rate-number {
  font-size: 32px;
  font-weight: 700;
  display: block;
}

.duplicate-rate .rate-label {
  font-size: 12px;
  color: #6b7280;
}

.duplicate-rate.rate-low .rate-number {
  color: #10b981;
}

.duplicate-rate.rate-medium .rate-number {
  color: #f59e0b;
}

.duplicate-rate.rate-high .rate-number {
  color: #ef4444;
}

.duplicate-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
}

.duplicate-list {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.duplicate-list.self-repeat-list {
  background: #fffbeb;
}

.duplicate-list-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.duplicate-item {
  padding: 8px;
  background: #fef2f2;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid #ef4444;
}

.duplicate-item.self-repeat-item {
  background: #fef3c7;
  border-left-color: #d97706;
}

.duplicate-item:last-child {
  margin-bottom: 0;
}

.duplicate-text {
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
  word-break: break-all;
}

.duplicate-source {
  font-size: 11px;
  color: #9ca3af;
}

.duplicate-empty {
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  color: #10b981;
  font-size: 13px;
}

/* 查重说明 */
.duplicate-tips {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  font-size: 11px;
}

.duplicate-tips .tips-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  margin-top: 8px;
}

.duplicate-tips .tips-title:first-child {
  margin-top: 0;
}

.duplicate-tips .tips-list {
  margin: 0;
  padding-left: 16px;
  color: #6b7280;
  line-height: 1.6;
}

.duplicate-tips .tips-list li {
  margin-bottom: 2px;
}

/* 提交限制标准 */
.submit-tips {
  margin-top: 12px;
  padding: 12px;
  background: rgba(254, 243, 199, 0.8);
  border-radius: 8px;
  font-size: 11px;
  border-left: 3px solid #f59e0b;
}

.submit-tips .tips-title {
  font-weight: 600;
  color: #92400e;
  margin-bottom: 6px;
  margin-top: 8px;
}

.submit-tips .tips-title:first-child {
  margin-top: 0;
}

.submit-tips .tips-list {
  margin: 0;
  padding-left: 16px;
  color: #92400e;
  line-height: 1.6;
}

.submit-tips .tips-list li {
  margin-bottom: 2px;
}

/* 提交限制标准卡片 */
.submit-tips-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.submit-tips-list {
  margin: 0;
  padding-left: 20px;
  color: #92400e;
  line-height: 1.8;
  font-size: 13px;
}

.submit-tips-list li {
  margin-bottom: 4px;
}

/* 操作按钮 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 提交成功信息 */
.submission-info {
  margin: 16px 0;
  padding: 12px 16px;
  background: #f0fdf4;
  border-radius: 8px;
}

.submission-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #059669;
  font-weight: 600;
  margin-bottom: 4px;
}

.submission-detail {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

/* AI分析区域 */
.ai-analysis-section {
  margin: 20px 0;
  text-align: center;
}

.ai-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

/* 字数统计卡片 */
.word-stats-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.word-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.word-stat-item {
  text-align: center;
  padding: 8px 4px;
  background: white;
  border-radius: 8px;
}

.word-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #059669;
}

.word-stat-label {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

/* 等级选项 */
.level-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.level-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.2s;
}

.level-option.level-achieved {
  color: #059669;
  font-weight: 500;
}

.level-option.level-current {
  color: #d97706;
}

.level-radio {
  width: 16px;
  text-align: center;
}

.level-check {
  color: #059669;
  font-weight: bold;
}

.level-empty {
  color: #d1d5db;
}

.level-name {
  flex: 1;
}

.level-words {
  font-size: 12px;
  color: #9ca3af;
}

/* 进度条 */
.level-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  min-width: 36px;
  text-align: right;
}

/* 等级提示 */
.level-hint {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  padding: 8px;
  background: white;
  border-radius: 6px;
}

.level-hint .hint-number {
  font-weight: 700;
  color: #d97706;
}

.level-hint.level-complete {
  color: #059669;
  font-weight: 500;
}

/* 锦囊提示 */
.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
  color: #6b7280;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #10b981;
}

/* 历史记录 */
.empty-history {
  text-align: center;
  color: #9ca3af;
  padding: 24px 0;
  font-size: 13px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.history-title {
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
}

/* 实时数据 */
.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  font-weight: 600;
  color: #374151;
}

/* 积分预测 */
.points-preview {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  text-align: center;
}

.points-label {
  font-size: 12px;
  color: #92400e;
  margin-bottom: 4px;
}

.points-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.points-number {
  font-size: 28px;
  font-weight: 700;
  color: #d97706;
  transition: transform 0.2s;
}

.points-number.points-animate {
  animation: pointsPulse 0.3s ease;
}

@keyframes pointsPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.points-unit {
  font-size: 14px;
  color: #92400e;
}

.points-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #b45309;
}

/* 成功状态 */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.success-content {
  text-align: center;
  position: relative;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: bounceIn 0.5s ease;
}

@keyframes bounceIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.points-earned {
  margin: 16px 0;
  animation: slideUp 0.5s ease 0.2s both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 金币动画 */
.coin-animation {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.coin {
  position: absolute;
  animation: coinFly 1s ease-out var(--delay) both;
}

@keyframes coinFly {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc((var(--delay) - 0.4s) * 200), -100px) scale(0.5);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    flex: 1 1 100%;
  }

  .task-header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}

/* 日记权限禁用提示 */
.diary-disabled-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 48px 24px;
}

.diary-disabled-content {
  text-align: center;
  max-width: 600px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  padding: 48px 32px;
}

.diary-disabled-icon {
  font-size: 48px;
  margin-bottom: 24px;
  opacity: 0.4;
}

.diary-disabled-text {
  font-size: 16px;
  line-height: 2;
  color: #9ca3af;
  font-style: italic;
}
</style>
