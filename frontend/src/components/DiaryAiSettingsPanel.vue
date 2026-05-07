<template>
  <div class="ai-settings-panel">
    <template v-if="isAdmin">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="modules" tab="模块配置">
          <div class="module-grid">
            <!-- 基础模型配置 - 全宽 -->
            <n-card title="基础模型配置" size="small" class="module-card module-card-full">
              <AiApiConfigList />
            </n-card>

            <!-- 模块卡片 -->
            <div
              v-for="mod in moduleList"
              :key="mod.key"
              class="module-preview-card"
              @click="activeModal = mod.key"
            >
              <div class="module-icon">{{ mod.icon }}</div>
              <div class="module-title">{{ mod.title }}</div>
              <div class="module-desc">{{ mod.desc }}</div>
              <div class="module-status">
                <n-tag :type="mod.status ? 'success' : 'default'" size="tiny">
                  {{ mod.statusText }}
                </n-tag>
              </div>
              <div class="module-action">点击配置 →</div>
            </div>
          </div>

          <!-- 日记 AI 配置弹窗 -->
          <n-modal
            :show="activeModal === 'diary'"
            @update:show="val => { if (!val) activeModal = null }"
            preset="card"
            title="日记 AI 分析配置"
            style="width: 700px; max-height: 80vh; overflow-y: auto;"
            :mask-closable="true"
          >
            <template #header-extra>
              <n-tag type="info" size="small">日记模块</n-tag>
            </template>
            <n-alert type="info" style="margin-bottom: 16px;">
              审批通过后会自动分析日记正文，并写入用户的日记 AI 分析记录。
            </n-alert>

            <div class="switch-row">
              <div>
                <div class="switch-title">日记审批通过后自动分析</div>
                <div class="switch-desc">对"日记(审批前提项/日)"审批通过后的对应日记正文执行 AI 分析</div>
              </div>
              <n-switch v-model:value="automationSettings.autoAnalyzeApprovedSubmissions" />
            </div>

            <n-divider />

            <n-spin :show="adminPromptsLoading">
              <n-form label-placement="top">
                <n-collapse :default-expanded-names="[]">
                  <n-collapse-item title="单条日记分析默认提示词" name="single">
                    <n-input
                      v-model:value="adminPrompts.single"
                      type="textarea"
                      :rows="6"
                      placeholder="输入单条日记分析默认提示词"
                    />
                  </n-collapse-item>
                  <n-collapse-item title="批量日记分析默认提示词" name="batch">
                    <n-input
                      v-model:value="adminPrompts.batch"
                      type="textarea"
                      :rows="6"
                      placeholder="输入批量日记分析默认提示词"
                    />
                  </n-collapse-item>
                </n-collapse>
                <div class="actions-row" style="margin-top: 16px;">
                  <div class="meta-text" v-if="automationSettings.updatedAt">
                    最近更新：{{ formatTime(automationSettings.updatedAt) }}
                  </div>
                  <n-space>
                    <n-button @click="reloadDiaryModule" :disabled="adminPromptsLoading || automationLoading">重新加载</n-button>
                    <n-button @click="viewDiaryTasks">查看日记任务</n-button>
                    <n-button type="primary" @click="saveDiaryModuleConfig" :loading="adminSaving || automationSaving">保存日记模块配置</n-button>
                  </n-space>
                </div>
              </n-form>
            </n-spin>
          </n-modal>

          <!-- 书法 AI 配置弹窗 -->
          <n-modal
            :show="activeModal === 'calligraphy'"
            @update:show="val => { if (!val) activeModal = null }"
            preset="card"
            title="书法 AI 配置"
            style="width: 700px; max-height: 80vh; overflow-y: auto;"
            :mask-closable="true"
          >
            <template #header-extra>
              <n-tag type="warning" size="small">书法模块</n-tag>
            </template>
            <div class="switch-row">
              <div>
                <div class="switch-title">书法审核通过后自动分析</div>
                <div class="switch-desc">书法作品审核通过后自动进入 AI 评分任务队列</div>
              </div>
              <n-switch v-model:value="automationSettings.autoAnalyzeApprovedCalligraphy" />
            </div>

            <n-divider />

            <n-spin :show="calligraphyPromptLoading">
              <n-form label-placement="top">
                <n-collapse :default-expanded-names="[]">
                  <n-collapse-item title="书法评分提示词" name="prompt">
                    <n-input
                      v-model:value="calligraphyPrompt"
                      type="textarea"
                      :rows="10"
                      placeholder="输入书法 AI 评分提示词"
                    />
                  </n-collapse-item>
                </n-collapse>
                <div class="actions-row" style="margin-top: 16px;">
                  <div class="meta-text">评分提示词和自动化开关统一归到书法模块</div>
                  <n-space>
                    <n-button @click="resetCalligraphyPrompt" :loading="calligraphyPromptResetting">恢复默认</n-button>
                    <n-button @click="viewCalligraphyTasks">查看书法任务</n-button>
                    <n-button type="primary" @click="saveCalligraphyModuleConfig" :loading="calligraphyPromptSaving || automationSaving">保存书法模块配置</n-button>
                  </n-space>
                </div>
              </n-form>
            </n-spin>
          </n-modal>

          <!-- 电子书 AI 配置弹窗 -->
          <n-modal
            :show="activeModal === 'textbook'"
            @update:show="val => { if (!val) activeModal = null }"
            preset="card"
            title="电子书 AI 配置"
            style="width: 700px; max-height: 80vh; overflow-y: auto;"
            :mask-closable="true"
          >
            <template #header-extra>
              <n-tag type="primary" size="small">电子书模块</n-tag>
            </template>
            <div class="module-desc">用于管理电子书/教材问答的系统提示词与默认模板。</div>
            <AiSystemSettings :show-init-defaults="false" />
            <n-divider />
            <div class="actions-row">
              <div class="meta-text">教材默认模板初始化独立管理，避免和勤学好问系统提示词混在一起。</div>
              <n-button type="primary" @click="initTextbookDefaults" :loading="textbookDefaultsInitializing">初始化默认模板</n-button>
            </div>
          </n-modal>

          <!-- 勤学好问 AI 配置弹窗 -->
          <n-modal
            :show="activeModal === 'echobot'"
            @update:show="val => { if (!val) activeModal = null }"
            preset="card"
            title="勤学好问 AI 配置"
            style="width: 700px; max-height: 80vh; overflow-y: auto;"
            :mask-closable="true"
          >
            <template #header-extra>
              <n-tag type="success" size="small">勤学好问模块</n-tag>
            </template>
            <div class="module-desc">用于管理勤学好问聊天机器人在百科问答、资料查询、少儿问答场景下的专属系统提示词。</div>
            <n-spin :show="echoBotPromptLoading">
              <n-form label-placement="top">
                <n-collapse :default-expanded-names="[]">
                  <n-collapse-item title="勤学好问机器人提示词" name="prompt">
                    <n-input
                      v-model:value="echoBotPrompt"
                      type="textarea"
                      :rows="12"
                      placeholder="输入勤学好问聊天机器人提示词"
                    />
                  </n-collapse-item>
                </n-collapse>
                <div class="actions-row" style="margin-top: 16px;">
                  <div class="meta-text">这个提示词只用于勤学好问聊天机器人，不影响电子书分析。</div>
                  <n-space>
                    <n-button @click="resetEchoBotPrompt" :loading="echoBotPromptResetting">恢复默认</n-button>
                    <n-button type="primary" @click="saveEchoBotPrompt" :loading="echoBotPromptSaving">保存勤学好问配置</n-button>
                  </n-space>
                </div>
              </n-form>
            </n-spin>
          </n-modal>
        </n-tab-pane>

        <n-tab-pane name="tasks" tab="任务处理">
          <n-spin :show="tasksLoading || taskSummaryLoading">
            <div class="stats-grid">
              <n-card size="small"><n-statistic label="待处理" :value="taskSummary.pending || 0" /></n-card>
              <n-card size="small"><n-statistic label="处理中" :value="taskSummary.processing || 0" /></n-card>
              <n-card size="small"><n-statistic label="成功" :value="taskSummary.success || 0" /></n-card>
              <n-card size="small"><n-statistic label="失败" :value="taskSummary.error || 0" /></n-card>
              <n-card size="small"><n-statistic label="24h 成功" :value="taskSummary.last24hSuccess || 0" /></n-card>
              <n-card size="small"><n-statistic label="24h 失败" :value="taskSummary.last24hError || 0" /></n-card>
            </div>

            <div class="toolbar-row">
              <n-space>
                <n-select v-model:value="taskFilters.status" :options="taskStatusOptions" clearable placeholder="任务状态" style="width: 140px" />
                <n-select v-model:value="taskFilters.taskType" :options="taskTypeOptions" clearable placeholder="任务类型" style="width: 180px" />
              </n-space>
              <n-button @click="loadTaskData">刷新</n-button>
            </div>

            <n-data-table
              :columns="taskColumns"
              :data="tasks"
              :pagination="false"
              size="small"
              striped
            />

            <div v-if="taskPagination.totalPages > 1" class="pagination-row">
              <n-pagination
                v-model:page="taskPagination.page"
                :page-count="taskPagination.totalPages"
                :page-size="taskPagination.limit"
                @update:page="loadTasks"
              />
            </div>
          </n-spin>
        </n-tab-pane>

        <n-tab-pane name="logs" tab="日志与统计">
          <n-spin :show="statsLoading || logsLoading || logDetailLoading">
            <div class="toolbar-row">
              <n-space>
                <n-select v-model:value="statsDays" :options="statsDayOptions" style="width: 120px" @update:value="loadAdminStats" />
                <n-select v-model:value="logFilters.status" :options="logStatusOptions" clearable placeholder="日志状态" style="width: 140px" />
              </n-space>
              <n-button @click="loadLogsAndStats">刷新</n-button>
            </div>

            <div class="stats-grid">
              <n-card size="small"><n-statistic label="教材分析成功" :value="adminStats.overview?.textbookSuccess || 0" /></n-card>
              <n-card size="small"><n-statistic label="教材分析失败" :value="adminStats.overview?.textbookError || 0" /></n-card>
              <n-card size="small"><n-statistic label="日记分析总数" :value="adminStats.overview?.diaryCount || 0" /></n-card>
              <n-card size="small"><n-statistic label="日记自动分析数" :value="adminStats.overview?.submissionCount || 0" /></n-card>
              <n-card size="small"><n-statistic label="书法分析总数" :value="adminStats.overview?.calligraphyCount || 0" /></n-card>
            </div>

            <n-card size="small" title="最近分析趋势" class="section-card">
              <div class="simple-chart" v-if="adminStats.trend?.length">
                <div v-for="item in adminStats.trend" :key="item.date" class="chart-bar-wrapper">
                  <div class="chart-stack">
                    <div class="chart-bar chart-bar-blue" :style="{ height: getTrendHeight(item.diaryCount + item.submissionCount + item.calligraphyCount) + '%' }" />
                    <div class="chart-bar chart-bar-green" :style="{ height: getTrendHeight(item.textbookSuccess) + '%' }" />
                    <div class="chart-bar chart-bar-red" :style="{ height: getTrendHeight(item.textbookError) + '%' }" />
                  </div>
                  <div class="bar-value-text">{{ item.diaryCount + item.submissionCount + item.calligraphyCount + item.textbookSuccess + item.textbookError }}</div>
                  <span class="bar-label">{{ item.date.slice(5) }}</span>
                </div>
              </div>
              <n-empty v-else description="暂无统计数据" />
            </n-card>

            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
              <n-gi>
                <n-card size="small" title="AI 调用日志">
                  <n-data-table
                    :columns="logColumns"
                    :data="logs"
                    :pagination="false"
                    size="small"
                    striped
                  />
                  <div v-if="logsPagination.totalPages > 1" class="pagination-row">
                    <n-pagination
                      v-model:page="logsPagination.page"
                      :page-count="logsPagination.totalPages"
                      :page-size="logsPagination.limit"
                      @update:page="loadLogs"
                    />
                  </div>
                </n-card>
              </n-gi>
              <n-gi>
                <n-card size="small" title="错误详情">
                  <n-empty v-if="!selectedLogDetail" description="点击左侧日志查看详情" />
                  <div v-else class="log-detail">
                    <div class="detail-row"><span class="label">状态</span><span>{{ selectedLogDetail.status }}</span></div>
                    <div class="detail-row"><span class="label">模型</span><span>{{ selectedLogDetail.apiConfig?.model || selectedLogDetail.apiConfig?.name || '-' }}</span></div>
                    <div class="detail-row"><span class="label">耗时</span><span>{{ selectedLogDetail.responseTime || 0 }}ms</span></div>
                    <div class="detail-block">
                      <div class="label">错误信息</div>
                      <pre>{{ selectedLogDetail.errorMessage || '无' }}</pre>
                    </div>
                    <div class="detail-block">
                      <div class="label">输出内容</div>
                      <pre>{{ selectedLogDetail.outputText || '无' }}</pre>
                    </div>
                  </div>
                </n-card>
              </n-gi>
            </n-grid>

            <n-card size="small" title="最近错误任务" class="section-card">
              <n-empty v-if="!(adminStats.recentErrors || []).length" description="最近没有错误任务" />
              <div v-else class="error-list">
                <div v-for="item in adminStats.recentErrors" :key="item.id" class="error-item">
                  <div class="error-title">{{ taskTypeLabelMap[item.taskType] || item.taskType }}</div>
                  <div class="error-message">{{ item.errorMessage || '未知错误' }}</div>
                  <div class="error-time">{{ formatTime(item.updatedAt) }}</div>
                </div>
              </div>
            </n-card>
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </template>

    <template v-else>
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="config" tab="AI 配置">
          <n-spin :show="configLoading">
            <div v-if="!currentConfig" class="empty-state">
              <n-empty description="暂无可用的 AI 配置" />
            </div>

            <div v-else class="config-display">
              <div class="config-card">
                <div class="config-header">
                  <span class="config-name">{{ currentConfig.name }}</span>
                  <n-tag type="success" size="small">当前使用</n-tag>
                </div>
                <div class="config-info">
                  <div class="info-row">
                    <span class="label">服务器:</span>
                    <span class="value">{{ currentConfig.baseUrl }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">模型:</span>
                    <span class="value">{{ currentConfig.model }}</span>
                  </div>
                  <div v-if="currentConfig.maxTokens" class="info-row">
                    <span class="label">最大 Token:</span>
                    <span class="value">{{ currentConfig.maxTokens?.toLocaleString() }}</span>
                  </div>
                  <div v-if="currentConfig.temperature !== undefined" class="info-row">
                    <span class="label">温度:</span>
                    <span class="value">{{ currentConfig.temperature }}</span>
                  </div>
                </div>
              </div>
            </div>
          </n-spin>
        </n-tab-pane>

        <n-tab-pane name="prompts" tab="提示词设置">
          <n-spin :show="promptsLoading">
            <n-form label-placement="top">
              <n-form-item label="单条日记分析提示词">
                <n-input
                  v-model:value="customPrompts.single"
                  type="textarea"
                  :rows="5"
                  :placeholder="defaultPrompts.single || '留空则使用系统默认提示词'"
                />
              </n-form-item>
              <n-form-item label="批量日记分析提示词">
                <n-input
                  v-model:value="customPrompts.batch"
                  type="textarea"
                  :rows="5"
                  :placeholder="defaultPrompts.batch || '留空则使用系统默认提示词'"
                />
              </n-form-item>
              <div class="text-xs text-gray-500 mb-4">
                留空时将使用系统默认提示词（灰色显示的内容）
              </div>
              <n-space justify="end">
                <n-button @click="resetPrompts" :disabled="promptsLoading">恢复默认</n-button>
                <n-button type="primary" @click="savePrompts" :loading="saving">保存设置</n-button>
              </n-space>
            </n-form>
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useMessage, NButton, NTag, NModal, NCollapse, NCollapseItem } from 'naive-ui';
import { aiConfigAPI, aiAnalysisAPI, aiPromptAPI } from '@/api/index';
import AiApiConfigList from '@/components/textbook/AiApiConfigList.vue';
import AiSystemSettings from '@/components/textbook/AiSystemSettings.vue';

const BUILTIN_DIARY_SINGLE_PROMPT = `你是一位专业的儿童心理分析师和写作导师。请分析以下小学生的日记，从以下几个维度进行点评：

1. **情感状态**：分析日记中表达的情绪和心理状态
2. **写作技巧**：评价语言表达、叙事结构、用词准确性
3. **内容丰富度**：评价细节描写、事件完整性
4. **亮点发现**：找出日记中的精彩之处
5. **成长建议**：给出具体可行的改进建议

请用鼓励和肯定的语气，适合小学生阅读。回复请使用 markdown 格式。`;

const BUILTIN_DIARY_BATCH_PROMPT = `你是一位专业的儿童心理分析师和写作导师。请综合分析以下小学生这一周的日记集合，从以下几个维度进行总结和点评：

1. **情绪变化轨迹**：分析这一周情绪的变化趋势，找出情绪高点和低点
2. **主题与关注点**：总结孩子这周主要关注的事物和话题
3. **写作进步**：对比各篇日记，分析写作能力的变化
4. **成长亮点**：找出这周值得表扬的成长表现
5. **综合建议**：给出下周的学习和生活建议

请用鼓励和肯定的语气，适合家长和孩子一起阅读。回复请使用 markdown 格式。`;

const BUILTIN_ECHO_BOT_PROMPT = `你是"勤学好问"，一个友善、耐心的少儿学习助手。

请遵循以下原则：
1. 用简单易懂的语言回答，适合小学生理解
2. 鼓励孩子思考和探索，不要直接给出完整答案
3. 回答要简洁，一般不超过200字
4. 如果涉及生僻字词，需要注音和解释
5. 保持积极正面的态度，多鼓励多表扬
6. 如果问题不适合少儿，礼貌地引导到合适的话题`;

const message = useMessage();

const activeTab = ref('config');
const configLoading = ref(false);
const promptsLoading = ref(false);
const adminPromptsLoading = ref(false);
const saving = ref(false);
const adminSaving = ref(false);
const automationLoading = ref(false);
const automationSaving = ref(false);
const calligraphyPromptLoading = ref(false);
const calligraphyPromptSaving = ref(false);
const calligraphyPromptResetting = ref(false);
const textbookDefaultsInitializing = ref(false);
const tasksLoading = ref(false);
const taskSummaryLoading = ref(false);
const logsLoading = ref(false);
const statsLoading = ref(false);
const logDetailLoading = ref(false);

const userRole = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || '';
  } catch {
    return '';
  }
});

const isAdmin = computed(() => ['ADMIN', 'TEACHER'].includes(userRole.value));
const currentConfig = ref(null);
const customPrompts = ref({ single: '', batch: '' });
const defaultPrompts = ref({ single: '', batch: '' });
const adminPrompts = ref({ single: '', batch: '' });
const calligraphyPrompt = ref('');
const echoBotPrompt = ref('');
const echoBotPromptLoading = ref(false);
const echoBotPromptSaving = ref(false);
const echoBotPromptResetting = ref(false);
const activeModal = ref(null); // 当前打开的配置弹窗
const automationSettings = ref({
  autoAnalyzeApprovedSubmissions: false,
  autoAnalyzeApprovedCalligraphy: false,
  updatedAt: null
});
const taskSummary = ref({});
const tasks = ref([]);
const logs = ref([]);
const selectedLogDetail = ref(null);
const adminStats = ref({ overview: {}, trend: [], recentErrors: [] });
const statsDays = ref(7);

const taskFilters = ref({ status: null, taskType: null });
const logFilters = ref({ status: null });
const taskPagination = ref({ page: 1, limit: 10, totalPages: 1 });
const logsPagination = ref({ page: 1, limit: 10, totalPages: 1 });

const statsDayOptions = [
  { label: '7天', value: 7 },
  { label: '14天', value: 14 },
  { label: '30天', value: 30 }
];

const taskStatusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'error' }
];

const taskTypeOptions = [
  { label: '日记自动分析', value: 'submission_analysis' },
  { label: '书法自动分析', value: 'calligraphy_analysis' }
];

// 模块卡片列表
const moduleList = computed(() => [
  {
    key: 'diary',
    icon: '📝',
    title: '日记 AI 分析',
    desc: '审批通过后自动分析日记正文，生成情感、写作等多维度点评。',
    status: automationSettings.value.autoAnalyzeApprovedSubmissions,
    statusText: automationSettings.value.autoAnalyzeApprovedSubmissions ? '自动分析已开启' : '自动分析已关闭',
  },
  {
    key: 'calligraphy',
    icon: '✍️',
    title: '书法 AI 评分',
    desc: '书法作品审核通过后自动进入 AI 评分任务队列。',
    status: automationSettings.value.autoAnalyzeApprovedCalligraphy,
    statusText: automationSettings.value.autoAnalyzeApprovedCalligraphy ? '自动评分已开启' : '自动评分已关闭',
  },
  {
    key: 'textbook',
    icon: '📚',
    title: '电子书 AI 配置',
    desc: '管理电子书/教材问答的系统提示词与默认模板。',
    status: true,
    statusText: '已配置',
  },
  {
    key: 'echobot',
    icon: '🤖',
    title: '勤学好问 AI',
    desc: '百科问答、资料查询、少儿问答场景下的专属提示词。',
    status: true,
    statusText: '已配置',
  },
]);

const logStatusOptions = [
  { label: '成功', value: 'success' },
  { label: '失败', value: 'error' },
  { label: '处理中', value: 'pending' }
];

const taskTypeLabelMap = {
  submission_analysis: '日记自动分析',
  calligraphy_analysis: '书法自动分析'
};

const loadConfigs = async () => {
  if (isAdmin.value) return;
  configLoading.value = true;
  try {
    const activeRes = await aiConfigAPI.getActive();
    if (activeRes.success && activeRes.data?.config) {
      currentConfig.value = activeRes.data.config;
    }
  } finally {
    configLoading.value = false;
  }
};

const loadPrompts = async () => {
  promptsLoading.value = true;
  try {
    const res = await aiAnalysisAPI.getDiaryPrompts();
    if (res.success) {
      customPrompts.value.single = res.data.userPrompt.singlePrompt || '';
      customPrompts.value.batch = res.data.userPrompt.batchPrompt || '';
      defaultPrompts.value.single = res.data.defaultPrompt.singlePrompt || '';
      defaultPrompts.value.batch = res.data.defaultPrompt.batchPrompt || '';
    }
  } finally {
    promptsLoading.value = false;
  }
};

const savePrompts = async () => {
  saving.value = true;
  try {
    const res = await aiAnalysisAPI.saveDiaryPrompts({
      singlePrompt: customPrompts.value.single || null,
      batchPrompt: customPrompts.value.batch || null
    });
    if (res.success) message.success('提示词设置已保存');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const resetPrompts = async () => {
  try {
    const res = await aiAnalysisAPI.resetDiaryPrompts();
    if (res.success) {
      customPrompts.value.single = '';
      customPrompts.value.batch = '';
      message.success('已恢复默认提示词');
    }
  } catch {
    message.error('重置失败');
  }
};

const loadAdminPrompts = async () => {
  if (!isAdmin.value) return;
  adminPromptsLoading.value = true;
  try {
    const res = await aiAnalysisAPI.getDefaultDiaryPrompts();
    if (res.success && res.data) {
      adminPrompts.value.single = res.data.singlePrompt || BUILTIN_DIARY_SINGLE_PROMPT;
      adminPrompts.value.batch = res.data.batchPrompt || BUILTIN_DIARY_BATCH_PROMPT;
    } else {
      adminPrompts.value.single = BUILTIN_DIARY_SINGLE_PROMPT;
      adminPrompts.value.batch = BUILTIN_DIARY_BATCH_PROMPT;
    }
  } catch {
    adminPrompts.value.single = BUILTIN_DIARY_SINGLE_PROMPT;
    adminPrompts.value.batch = BUILTIN_DIARY_BATCH_PROMPT;
  } finally {
    adminPromptsLoading.value = false;
  }
};

const saveAdminPrompts = async () => {
  if (!adminPrompts.value.single || !adminPrompts.value.batch) {
    message.warning('请填写完整的提示词');
    return false;
  }
  const res = await aiAnalysisAPI.saveDefaultDiaryPrompts({
    singlePrompt: adminPrompts.value.single,
    batchPrompt: adminPrompts.value.batch
  });
  if (res.success) {
    message.success('日记默认提示词已保存');
    return true;
  }
  return false;
};

const loadCalligraphyPrompt = async () => {
  if (!isAdmin.value) return;
  calligraphyPromptLoading.value = true;
  try {
    const res = await aiPromptAPI.getEvalPrompt('calligraphy_eval');
    if (res.success && res.data) {
      calligraphyPrompt.value = res.data.content || '';
    }
  } finally {
    calligraphyPromptLoading.value = false;
  }
};

const loadEchoBotPrompt = async () => {
  if (!isAdmin.value) return;
  echoBotPromptLoading.value = true;
  try {
    const res = await aiPromptAPI.getEchoBotPrompt();
    if (res.success && res.data?.content) {
      echoBotPrompt.value = res.data.content;
    } else {
      echoBotPrompt.value = BUILTIN_ECHO_BOT_PROMPT;
    }
  } catch {
    echoBotPrompt.value = BUILTIN_ECHO_BOT_PROMPT;
  } finally {
    echoBotPromptLoading.value = false;
  }
};

const saveCalligraphyPrompt = async () => {
  if (!calligraphyPrompt.value.trim()) {
    message.warning('书法提示词不能为空');
    return false;
  }
  const res = await aiPromptAPI.saveEvalPrompt('calligraphy_eval', calligraphyPrompt.value);
  if (res.success) {
    message.success('书法提示词已保存');
    return true;
  }
  return false;
};

const resetCalligraphyPrompt = async () => {
  calligraphyPromptResetting.value = true;
  try {
    const res = await aiPromptAPI.resetEvalPrompt('calligraphy_eval');
    if (res.success) {
      calligraphyPrompt.value = res.data.content || '';
      message.success('书法提示词已恢复默认');
    }
  } catch {
    message.error('恢复默认失败');
  } finally {
    calligraphyPromptResetting.value = false;
  }
};

const saveEchoBotPrompt = async () => {
  if (!echoBotPrompt.value.trim()) {
    message.warning('勤学好问提示词不能为空');
    return false;
  }
  const res = await aiPromptAPI.saveEchoBotPrompt(echoBotPrompt.value);
  if (res.success) {
    message.success('勤学好问提示词已保存');
    return true;
  }
  return false;
};

const resetEchoBotPrompt = async () => {
  echoBotPromptResetting.value = true;
  try {
    const res = await aiPromptAPI.resetEchoBotPrompt();
    if (res.success) {
      echoBotPrompt.value = BUILTIN_ECHO_BOT_PROMPT;
      message.success('勤学好问提示词已恢复默认');
    }
  } catch {
    message.error('恢复默认失败');
  } finally {
    echoBotPromptResetting.value = false;
  }
};

const loadAutomationSettings = async () => {
  if (!isAdmin.value) return;
  automationLoading.value = true;
  try {
    const res = await aiConfigAPI.getAutomationSettings();
    if (res.success) {
      automationSettings.value = { ...automationSettings.value, ...(res.data || {}) };
    }
  } finally {
    automationLoading.value = false;
  }
};

const saveAutomationSettings = async () => {
  const res = await aiConfigAPI.updateAutomationSettings({
    autoAnalyzeApprovedSubmissions: automationSettings.value.autoAnalyzeApprovedSubmissions,
    autoAnalyzeApprovedCalligraphy: automationSettings.value.autoAnalyzeApprovedCalligraphy
  });
  if (res.success) {
    automationSettings.value = { ...automationSettings.value, ...(res.data || {}) };
    return true;
  }
  return false;
};

const saveDiaryModuleConfig = async () => {
  adminSaving.value = true;
  automationSaving.value = true;
  try {
    const [promptOk, automationOk] = await Promise.all([
      saveAdminPrompts(),
      saveAutomationSettings()
    ]);
    if (promptOk && automationOk) {
      message.success('日记模块配置已保存');
    } else {
      message.error('日记模块配置保存失败');
    }
  } catch {
    message.error('日记模块配置保存失败');
  } finally {
    adminSaving.value = false;
    automationSaving.value = false;
  }
};

const reloadDiaryModule = async () => {
  await Promise.all([loadAdminPrompts(), loadAutomationSettings()]);
  message.success('日记模块已重新加载');
};

const viewDiaryTasks = async () => {
  activeTab.value = 'tasks';
  taskFilters.value.taskType = 'submission_analysis';
  taskPagination.value.page = 1;
  await loadTaskData();
};

const viewCalligraphyTasks = async () => {
  activeTab.value = 'tasks';
  taskFilters.value.taskType = 'calligraphy_analysis';
  taskPagination.value.page = 1;
  await loadTaskData();
};

const initTextbookDefaults = async () => {
  textbookDefaultsInitializing.value = true;
  try {
    const res = await aiPromptAPI.initDefaults();
    if (res.success) {
      message.success(res.message || '电子书默认模板初始化完成');
    }
  } catch {
    message.error('初始化默认模板失败');
  } finally {
    textbookDefaultsInitializing.value = false;
  }
};

const saveCalligraphyModuleConfig = async () => {
  calligraphyPromptSaving.value = true;
  automationSaving.value = true;
  try {
    const [promptOk, automationOk] = await Promise.all([
      saveCalligraphyPrompt(),
      saveAutomationSettings()
    ]);
    if (promptOk && automationOk) {
      message.success('书法模块配置已保存');
    } else {
      message.error('书法模块配置保存失败');
    }
  } catch {
    message.error('书法模块配置保存失败');
  } finally {
    calligraphyPromptSaving.value = false;
    automationSaving.value = false;
  }
};

const loadTaskSummary = async () => {
  if (!isAdmin.value) return;
  taskSummaryLoading.value = true;
  try {
    const res = await aiConfigAPI.getTasksSummary();
    if (res.success) taskSummary.value = res.data || {};
  } finally {
    taskSummaryLoading.value = false;
  }
};

const loadTasks = async () => {
  if (!isAdmin.value) return;
  tasksLoading.value = true;
  try {
    const res = await aiConfigAPI.getTasks({
      page: taskPagination.value.page,
      limit: taskPagination.value.limit,
      status: taskFilters.value.status || undefined,
      taskType: taskFilters.value.taskType || undefined
    });
    if (res.success) {
      tasks.value = res.data.items || [];
      taskPagination.value.totalPages = res.data.pagination?.totalPages || 1;
    }
  } finally {
    tasksLoading.value = false;
  }
};

const retryTask = async (row) => {
  try {
    const res = await aiConfigAPI.retryTask(row.id);
    if (res.success) {
      message.success('任务已重新加入队列');
      loadTaskData();
    }
  } catch {
    message.error('重试任务失败');
  }
};

const loadAdminStats = async () => {
  if (!isAdmin.value) return;
  statsLoading.value = true;
  try {
    const res = await aiAnalysisAPI.getAdminStats({ days: statsDays.value });
    if (res.success) adminStats.value = res.data || { overview: {}, trend: [], recentErrors: [] };
  } finally {
    statsLoading.value = false;
  }
};

const loadLogs = async () => {
  if (!isAdmin.value) return;
  logsLoading.value = true;
  try {
    const res = await aiAnalysisAPI.getLogs({
      page: logsPagination.value.page,
      limit: logsPagination.value.limit,
      status: logFilters.value.status || undefined
    });
    if (res.success) {
      logs.value = res.data.logs || [];
      logsPagination.value.totalPages = res.data.pagination?.totalPages || 1;
    }
  } finally {
    logsLoading.value = false;
  }
};

const loadLogDetail = async (id) => {
  if (!id) return;
  logDetailLoading.value = true;
  try {
    const res = await aiAnalysisAPI.getLog(id);
    if (res.success) selectedLogDetail.value = res.data;
  } finally {
    logDetailLoading.value = false;
  }
};

const loadTaskData = async () => {
  await Promise.all([loadTaskSummary(), loadTasks()]);
};

const loadLogsAndStats = async () => {
  await Promise.all([loadAdminStats(), loadLogs()]);
};

const formatTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getTrendHeight = (value) => {
  const values = (adminStats.value.trend || []).map(item => (
    item.diaryCount + item.submissionCount + item.calligraphyCount + item.textbookSuccess + item.textbookError
  ));
  const max = Math.max(...values, 1);
  return Math.max(8, (value / max) * 100);
};

const taskColumns = [
  { title: '任务类型', key: 'taskType', render: row => taskTypeLabelMap[row.taskType] || row.taskType },
  { title: '用户', key: 'user', render: row => row.user?.realName || row.user?.username || '-' },
  { title: '来源', key: 'sourceType' },
  { title: '状态', key: 'status', render: row => h(NTag, { type: row.status === 'success' ? 'success' : row.status === 'error' ? 'error' : row.status === 'processing' ? 'warning' : 'default', size: 'small' }, { default: () => row.status }) },
  { title: '重试', key: 'retryCount', width: 70 },
  { title: '错误信息', key: 'errorMessage', ellipsis: { tooltip: true } },
  { title: '创建时间', key: 'createdAt', width: 170, render: row => formatTime(row.createdAt) },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: row => row.status === 'error'
      ? h(NButton, { size: 'tiny', type: 'primary', text: true, onClick: () => retryTask(row) }, { default: () => '重试' })
      : null
  }
];

const logColumns = [
  { title: '状态', key: 'status', width: 90, render: row => h(NTag, { type: row.status === 'success' ? 'success' : row.status === 'error' ? 'error' : 'warning', size: 'small' }, { default: () => row.status }) },
  { title: '配置', key: 'apiConfig', width: 140, render: row => row.apiConfig?.name || '-' },
  { title: '耗时(ms)', key: 'responseTime', width: 100 },
  { title: '错误', key: 'errorMessage', ellipsis: { tooltip: true } },
  { title: '时间', key: 'createdAt', width: 170, render: row => formatTime(row.createdAt) },
  {
    title: '详情',
    key: 'actions',
    width: 80,
    render: row => h(NButton, { size: 'tiny', text: true, type: 'primary', onClick: () => loadLogDetail(row.id) }, { default: () => '查看' })
  }
];

onMounted(async () => {
  if (isAdmin.value) {
    activeTab.value = 'modules';
    await Promise.all([
      loadAdminPrompts(),
      loadAutomationSettings(),
      loadCalligraphyPrompt(),
      loadEchoBotPrompt(),
      loadTaskData(),
      loadLogsAndStats()
    ]);
    return;
  }

  activeTab.value = 'config';
  await Promise.all([loadConfigs(), loadPrompts()]);
});
</script>

<style scoped>
.ai-settings-panel {
  min-height: 300px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.module-card {
  height: 100%;
}

.module-card-full {
  grid-column: 1 / -1;
}

/* 模块预览卡片 */
.module-preview-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  min-height: 180px;
  position: relative;
  overflow: hidden;
}

.module-preview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  opacity: 0;
  transition: opacity 0.3s;
}

.module-preview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: #6366f1;
}

.module-preview-card:hover::before {
  opacity: 1;
}

.module-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.module-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.module-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  flex: 1;
  margin-bottom: 12px;
}

.module-status {
  margin-bottom: 8px;
}

.module-action {
  font-size: 12px;
  color: #6366f1;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s;
}

.module-preview-card:hover .module-action {
  opacity: 1;
  transform: translateX(0);
}

.module-desc {
  margin-bottom: 12px;
  color: #64748b;
  font-size: 13px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.config-display {
  padding: 8px 0;
}

.config-card {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.config-name {
  font-weight: 600;
  font-size: 15px;
}

.config-info {
  font-size: 13px;
}

.info-row,
.detail-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.info-row .label,
.detail-row .label,
.detail-block .label {
  color: #64748b;
  min-width: 80px;
}

.info-row .value {
  color: #334155;
  word-break: break-all;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.switch-title {
  font-weight: 600;
  color: #1e293b;
}

.switch-desc,
.meta-text {
  color: #64748b;
  font-size: 12px;
}

.actions-row,
.toolbar-row,
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0;
}

.section-card {
  margin-bottom: 16px;
}

.simple-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  min-height: 220px;
  padding: 8px 0;
}

.chart-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 6px;
}

.chart-stack {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  height: 180px;
}

.chart-bar {
  width: 18px;
  border-radius: 6px 6px 0 0;
  min-height: 8px;
}

.chart-bar-blue {
  background: linear-gradient(180deg, #2080f0 0%, #60a5fa 100%);
}

.chart-bar-green {
  background: linear-gradient(180deg, #18a058 0%, #4ade80 100%);
}

.chart-bar-red {
  background: linear-gradient(180deg, #d03050 0%, #fb7185 100%);
}

.bar-label,
.bar-value-text {
  font-size: 12px;
  color: #64748b;
}

.log-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}

.detail-block {
  margin-top: 12px;
}

.error-list {
  display: grid;
  gap: 12px;
}

.error-item {
  padding: 12px;
  border: 1px solid #fecaca;
  background: #fff5f5;
  border-radius: 8px;
}

.error-title {
  font-weight: 600;
  color: #991b1b;
}

.error-message,
.error-time {
  color: #7f1d1d;
  font-size: 12px;
  margin-top: 4px;
}

@media (max-width: 1024px) {
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
}

.prompt-preview-block {
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.preview-title {
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.preview-item + .preview-item {
  margin-top: 12px;
}

.preview-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.preview-item pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: white;
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .switch-row,
  .actions-row,
  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .simple-chart {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .chart-bar-wrapper {
    min-width: 44px;
  }
}
</style>
