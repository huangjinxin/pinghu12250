<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">
    <h2 class="text-xl font-bold mb-4">勤学好问</h2>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <n-card size="small">
        <n-statistic label="总消息数" :value="stats.totalMessages" />
      </n-card>
      <n-card size="small">
        <n-statistic label="今日消息" :value="stats.todayMessages" />
      </n-card>
      <n-card size="small">
        <n-statistic label="活跃会话" :value="stats.activeChats" />
      </n-card>
      <n-card size="small">
        <div class="text-xs text-gray-500">最近活跃</div>
        <div class="text-sm font-medium mt-1">{{ formatTime(stats.lastActiveAt) }}</div>
      </n-card>
    </div>

    <!-- 数据分析图表（默认折叠） -->
    <n-card size="small" class="mb-4">
      <div class="flex items-center justify-between cursor-pointer select-none" @click="toggleCharts">
        <span class="text-sm font-medium text-gray-600">📊 数据分析图表</span>
        <n-icon size="18" :style="{ transform: chartsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        </n-icon>
      </div>
      <div v-show="chartsExpanded" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <div class="text-sm font-medium text-gray-600 mb-1">近14天消息趋势</div>
          <div ref="trendChartRef" style="height: 220px;"></div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-600 mb-1">24小时活跃分布</div>
          <div ref="hourlyChartRef" style="height: 220px;"></div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-600 mb-1">提问排行</div>
          <div ref="rankChartRef" style="height: 220px;"></div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-600 mb-1">平均消息长度</div>
          <div ref="lengthChartRef" style="height: 220px;"></div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-600 mb-1">对话深度（每会话平均轮数）</div>
          <div ref="depthChartRef" style="height: 220px;"></div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-600 mb-1">日均提问频率（近14天）</div>
          <div ref="freqChartRef" style="height: 220px;"></div>
        </div>
      </div>
    </n-card>

    <!-- 视图切换 -->
    <n-tabs v-model:value="activeTab" type="line" class="mb-4">
      <n-tab name="logs">消息列表</n-tab>
      <n-tab name="chats">按会话查看</n-tab>
      <n-tab name="users">按用户查看</n-tab>
      <n-tab name="evaluations">AI分析记录</n-tab>
    </n-tabs>

    <!-- 消息列表视图 -->
    <template v-if="activeTab === 'logs'">
      <!-- 筛选栏 -->
      <n-space align="center" :wrap="true" :size="8" class="mb-4">
        <n-input v-model:value="filters.keyword" placeholder="搜索内容" clearable size="small" style="width: 140px" @keyup.enter="loadLogs" />
        <n-input v-model:value="filters.sender" placeholder="发送者" clearable size="small" style="width: 120px" @keyup.enter="loadLogs" />
        <n-select v-model:value="filters.role" :options="roleOptions" placeholder="角色" clearable size="small" style="width: 100px" />
        <n-select v-model:value="filters.source" :options="sourceOptions" placeholder="来源" clearable size="small" style="width: 120px" />
        <n-date-picker v-model:value="dateRange" type="daterange" size="small" clearable style="width: 240px" />
        <n-button size="small" type="primary" @click="loadLogs">查询</n-button>
      </n-space>

      <n-data-table :columns="logColumns" :data="logs" :loading="loading" :row-key="r => r.id" size="small" />
      <div class="flex justify-end mt-3">
        <n-pagination v-model:page="page" :page-count="Math.ceil(total / pageSize)" size="small" @update:page="loadLogs" />
      </div>
    </template>

    <!-- 按会话查看 -->
    <template v-if="activeTab === 'chats'">
      <!-- 筛选栏 -->
      <div class="flex flex-wrap gap-2 mb-4">
        <n-input v-model:value="chatFilter.keyword" placeholder="搜索用户名" clearable size="small" class="w-40" />
        <n-select v-model:value="chatFilter.linkStatus" :options="linkStatusOptions" placeholder="关联状态" clearable size="small" class="w-28" />
        <n-select v-model:value="chatFilter.source" :options="sourceOptions" placeholder="来源" clearable size="small" class="w-28" />
      </div>

      <div class="space-y-2">
        <n-card v-for="chat in pagedChats" :key="chat.merged ? 'merged-' + chat.sender : chat.chatId" size="small" hoverable>
          <div class="flex justify-between items-center">
            <div>
              <span class="font-medium">{{ senderMappings[chat.sender]?.nickname || senderMappings[chat.sender]?.username || chat.senderName || chat.sender }}</span>
              <n-tag v-if="senderMappings[chat.sender]" size="tiny" type="success" class="ml-1" closable @close="unlinkSender(chat.sender)">
                已关联
              </n-tag>
              <n-button v-else size="tiny" text type="warning" class="ml-1" @click.stop="openLinkModal(chat.sender)">关联用户</n-button>
              <n-tag v-if="chat.systemMerged" size="tiny" type="default" class="ml-1">系统聚合</n-tag>
              <n-tag v-else-if="chat.merged" size="tiny" type="warning" class="ml-1">{{ chat.chatIds.length }}个会话已合并</n-tag>
              <n-tag v-if="chat.isGroup" size="tiny" type="info" class="ml-2">群聊</n-tag>
              <n-tag v-if="chat.chatSources && chat.chatSources.length > 1" size="tiny" type="warning" class="ml-1">多来源</n-tag>
              <n-tag v-else-if="!chat.merged" size="tiny" :type="chat.source === 'web-bot' ? 'success' : 'info'" class="ml-1">{{ chat.source === 'web-bot' ? 'Web机器人' : 'iMessage' }}</n-tag>
              <span class="text-xs text-gray-400 ml-2">{{ chat.messageCount }} 条消息 · {{ formatTime(chat.lastActiveAt) }}</span>
            </div>
            <n-space :size="4">
              <n-button size="tiny" @click="openChat(chat)">查看</n-button>
              <n-button v-if="!chat.systemMerged" size="tiny" type="primary" :loading="evaluatingChatId === (chat.merged ? chat.chatIds[0] : chat.chatId)" @click.stop="evaluateChat(chat)">AI分析</n-button>
              <n-button v-if="!chat.systemMerged" size="tiny" type="info" @click.stop="showEvalHistory(chat)">评价历史</n-button>
            </n-space>
          </div>
        </n-card>
        <n-empty v-if="!pagedChats.length && !loading" description="暂无会话记录" />
      </div>
      <div class="flex justify-end mt-3">
        <n-pagination v-model:page="chatPage" :page-count="Math.ceil(filteredChats.length / chatPageSize)" size="small" />
      </div>
    </template>

    <!-- AI分析记录 -->
    <template v-if="activeTab === 'evaluations'">
      <div class="space-y-2">
        <n-card v-for="ev in pagedEvaluations" :key="ev.id" size="small" hoverable class="cursor-pointer" @click="viewEval(ev)">
          <div class="flex justify-between items-center">
            <div>
              <span class="font-medium">{{ resolveEvalName(ev) }}</span>
              <n-tag size="tiny" class="ml-2" :type="analysisTagType(ev.analysisType)">{{ analysisTagLabel(ev.analysisType) }}</n-tag>
              <span class="text-xs text-gray-400 ml-2">{{ ev.messageCount }} 条消息 · {{ ev.modelName || '' }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ formatTime(ev.createdAt) }}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1 line-clamp-2">{{ ev.analysis.substring(0, 150) }}...</div>
        </n-card>
        <n-empty v-if="!pagedEvaluations.length && !evalLoading" description="暂无AI分析记录" />
      </div>
      <div class="flex justify-end mt-3">
        <n-pagination v-model:page="evalPage" :page-count="Math.ceil(evalTotal / evalPageSize)" size="small" @update:page="loadAllEvaluations" />
      </div>
    </template>

    <!-- 按用户查看 -->
    <template v-if="activeTab === 'users'">
      <LinkedUserCards />
    </template>

    <!-- 会话详情弹窗 -->
    <n-modal v-model:show="showChatModal" preset="card" :title="'对话: ' + (currentChat?.senderName || currentChat?.sender || '')" style="max-width: 720px; max-height: 80vh;">
      <div class="mb-3 flex items-center gap-2">
        <span class="text-xs text-gray-500">来源筛选</span>
        <n-select v-model:value="chatSourceFilter" :options="chatSourceOptions" size="small" style="width: 160px" clearable />
      </div>
      <div class="space-y-3 overflow-y-auto" style="max-height: 60vh;">
        <div v-for="msg in filteredChatMessages" :key="msg.id" :class="msg.role === 'assistant' ? 'flex justify-start' : 'flex justify-end'">
          <div :class="msg.role === 'assistant' ? 'bg-gray-100 text-gray-800' : 'bg-blue-500 text-white'" class="rounded-lg px-3 py-2 max-w-[80%] text-sm">
            <div>{{ msg.content }}</div>
            <div class="text-[10px] mt-1 flex items-center gap-2" :class="msg.role === 'assistant' ? 'text-gray-400' : 'text-blue-200'">
              <span>{{ formatTime(msg.createdAt) }}</span>
              <span>{{ msg.source === 'web-bot' ? 'Web机器人' : 'iMessage' }}</span>
            </div>
          </div>
        </div>
      </div>
    </n-modal>

    <!-- AI 分析方向选择弹窗 -->
    <n-modal v-model:show="showAnalysisTypeModal" preset="card" title="选择分析方向" style="max-width: 480px;">
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="opt in analysisTypeOptions"
          :key="opt.value"
          class="analysis-type-card"
          :class="{ 'analysis-type-active': selectedAnalysisType === opt.value }"
          @click="selectedAnalysisType = opt.value"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ opt.icon }}</span>
            <div class="flex-1">
              <div class="font-medium text-gray-800">{{ opt.label }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ opt.desc }}</div>
            </div>
            <n-icon v-if="selectedAnalysisType === opt.value" size="20" color="#18a058">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </n-icon>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAnalysisTypeModal = false">取消</n-button>
          <n-button type="primary" :loading="evaluatingChatId === pendingEvalChat?.chatId" @click="confirmEvaluate">
            开始分析
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- AI 评价结果弹窗 -->
    <n-modal v-model:show="showEvalModal" preset="card" title="AI 个人评价" style="max-width: 720px; max-height: 85vh;">
      <div class="overflow-y-auto" style="max-height: 65vh;">
        <div v-if="currentEval" class="space-y-3">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>用户: {{ currentEval.senderName || currentEval.sender }}</span>
            <span>·</span>
            <span>基于 {{ currentEval.messageCount }} 条消息</span>
            <span>·</span>
            <span>{{ formatTime(currentEval.createdAt) }}</span>
          </div>
          <div class="eval-content" v-html="renderMarkdown(currentEval.analysis)"></div>
          <div v-if="currentEval.modelName" class="text-xs text-gray-400">模型: {{ currentEval.modelName }}</div>
        </div>
      </div>
    </n-modal>

    <!-- 评价历史弹窗 -->
    <n-modal v-model:show="showEvalHistoryModal" preset="card" :title="'评价历史: ' + (evalHistoryName || '')" style="max-width: 650px; max-height: 85vh;">
      <div class="overflow-y-auto space-y-3" style="max-height: 65vh;">
        <n-empty v-if="!evalHistoryList.length" description="暂无评价记录" />
        <n-card v-for="ev in evalHistoryList" :key="ev.id" size="small" class="cursor-pointer" hoverable @click="viewEval(ev)">
          <div class="flex justify-between items-center">
            <div class="text-sm">
              <span>{{ formatTime(ev.createdAt) }}</span>
              <span class="text-gray-400 ml-2">基于 {{ ev.messageCount }} 条消息</span>
            </div>
            <n-button size="tiny" text type="primary">查看详情</n-button>
          </div>
          <div class="text-xs text-gray-500 mt-1 line-clamp-2">{{ ev.analysis.substring(0, 120) }}...</div>
        </n-card>
      </div>
    </n-modal>

    <!-- 关联用户弹窗 -->
    <n-modal v-model:show="showLinkModal" preset="card" :title="'关联用户: ' + linkingSender" style="max-width: 420px;">
      <div class="flex gap-2 mb-3">
        <n-input v-model:value="userSearchKeyword" placeholder="输入用户名或昵称搜索" size="small" clearable @keyup.enter="searchUsers" />
        <n-button size="small" type="primary" :loading="userSearching" @click="searchUsers">搜索</n-button>
      </div>
      <div class="space-y-2" style="max-height: 300px; overflow-y: auto;">
        <n-empty v-if="!userSearchResults.length" description="搜索系统用户进行关联" size="small" />
        <div v-for="u in userSearchResults" :key="u.id" class="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer" @click="linkUser(u)">
          <div class="flex items-center gap-2">
            <n-avatar :size="28" :src="u.avatar" round>{{ (u.nickname || u.username || '?')[0] }}</n-avatar>
            <div>
              <div class="text-sm font-medium">{{ u.nickname || u.username }}</div>
              <div class="text-xs text-gray-400">{{ u.username }}</div>
            </div>
          </div>
          <n-button size="tiny" type="primary" text>选择</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, h, nextTick, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { imessageAPI } from '@/api';
import { marked } from 'marked';
import LinkedUserCards from './LinkedUserCards.vue';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

marked.setOptions({ breaks: true, gfm: true });

const message = useMessage();
const loading = ref(false);
const activeTab = ref('chats');
const chartsExpanded = ref(false);
let chartsLoaded = false;

function toggleCharts() {
  chartsExpanded.value = !chartsExpanded.value;
  if (chartsExpanded.value && !chartsLoaded) {
    chartsLoaded = true;
    nextTick(() => loadAnalytics());
  } else if (chartsExpanded.value) {
    nextTick(() => handleResize());
  }
}

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

// 统计
const stats = reactive({ totalMessages: 0, todayMessages: 0, activeChats: 0, lastActiveAt: null });

// 消息列表
const logs = ref([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const filters = reactive({ keyword: '', sender: '', role: null, source: null });
const dateRange = ref(null);
const roleOptions = [
  { label: '用户', value: 'user' },
  { label: 'AI', value: 'assistant' },
];
const sourceOptions = [
  { label: 'iMessage', value: 'imessage' },
  { label: 'Web机器人', value: 'web-bot' },
];
const chatSourceOptions = computed(() => [
  { label: '全部来源', value: null },
  ...sourceOptions,
]);

const logColumns = [
  { title: '时间', key: 'createdAt', width: 150, render: row => formatTime(row.createdAt) },
  { title: '来源', key: 'source', width: 80, render: row => h('span', {
    class: row.source === 'web-bot' ? 'text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700' : 'text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700'
  }, row.source === 'web-bot' ? 'Web机器人' : 'iMessage') },
  { title: '发送者', key: 'senderName', width: 160, render: row => {
    const name = row.senderName || row.sender;
    const mapped = senderMappings.value[row.sender];
    return mapped
      ? h('span', {}, [name, ' ', h('span', { class: 'text-green-600 text-xs' }, `[${mapped.nickname || mapped.username}]`)])
      : name;
  }},
  { title: '角色', key: 'role', width: 60, render: row => row.role === 'assistant' ? 'AI' : '用户' },
  { title: '内容', key: 'content', ellipsis: { tooltip: true } },
  {
    title: '会话',
    key: 'chatId',
    width: 80,
    render: row => h('a', {
      class: 'text-blue-500 cursor-pointer text-xs',
      onClick: () => openSingleQA(row),
    }, '查看'),
  },
];

// 会话列表
const chats = ref([]);
const showChatModal = ref(false);
const currentChat = ref(null);
const chatMessages = ref([]);
const chatSourceFilter = ref(null);
const chatPage = ref(1);
const chatPageSize = 10;
const chatFilter = reactive({ keyword: '', linkStatus: null, source: null });
const linkStatusOptions = [
  { label: '已关联', value: 'linked' },
  { label: '未关联', value: 'unlinked' },
];
const filteredChatMessages = computed(() => {
  if (!chatSourceFilter.value) return chatMessages.value;
  return chatMessages.value.filter(msg => (msg.source || 'imessage') === chatSourceFilter.value);
});

const filteredChats = computed(() => {
  const merged = [];
  const linkedUserGrouped = {};
  const unlinkedSenderGrouped = {};
  const aiAssistantGroup = {
    sender: '__AI_ASSISTANT__',
    senderName: 'AI助手',
    isGroup: false,
    source: 'imessage',
    messageCount: 0,
    lastActiveAt: null,
    firstMessageAt: null,
    chatIds: [],
    senders: [],
    chatSources: [],
    merged: false,
    systemMerged: true,
  };

  for (const c of chats.value) {
    const mapping = senderMappings.value[c.sender];
    const isLinked = !!mapping;
    const isAiAssistant = !isLinked && (c.senderName === 'AI助手' || c.sender === 'AI助手');

    if (isLinked) {
      const groupKey = mapping.userId;
      if (!linkedUserGrouped[groupKey]) {
        linkedUserGrouped[groupKey] = {
          sender: c.sender,
          senderName: mapping.nickname || mapping.username || c.senderName,
          isGroup: c.isGroup,
          source: c.source,
          messageCount: 0,
          lastActiveAt: null,
          firstMessageAt: null,
          chatIds: [],
          senders: [],
          chatSources: [],
          merged: false,
          linkedUserId: mapping.userId,
        };
      }
      const g = linkedUserGrouped[groupKey];
      g.messageCount += c.messageCount;
      if (!g.chatIds.includes(c.chatId)) g.chatIds.push(c.chatId);
      if (!g.senders.includes(c.sender)) g.senders.push(c.sender);
      if (!g.chatSources.includes(c.source || 'imessage')) g.chatSources.push(c.source || 'imessage');
      if (!g.lastActiveAt || new Date(c.lastActiveAt) > new Date(g.lastActiveAt)) g.lastActiveAt = c.lastActiveAt;
      if (!g.firstMessageAt || new Date(c.firstMessageAt) < new Date(g.firstMessageAt)) g.firstMessageAt = c.firstMessageAt;
      continue;
    }

    if (isAiAssistant) {
      aiAssistantGroup.messageCount += c.messageCount;
      if (!aiAssistantGroup.chatIds.includes(c.chatId)) aiAssistantGroup.chatIds.push(c.chatId);
      if (!aiAssistantGroup.senders.includes(c.sender)) aiAssistantGroup.senders.push(c.sender);
      if (!aiAssistantGroup.chatSources.includes(c.source || 'imessage')) aiAssistantGroup.chatSources.push(c.source || 'imessage');
      if (!aiAssistantGroup.lastActiveAt || new Date(c.lastActiveAt) > new Date(aiAssistantGroup.lastActiveAt)) aiAssistantGroup.lastActiveAt = c.lastActiveAt;
      if (!aiAssistantGroup.firstMessageAt || new Date(c.firstMessageAt) < new Date(aiAssistantGroup.firstMessageAt)) aiAssistantGroup.firstMessageAt = c.firstMessageAt;
      if (c.source === 'web-bot') aiAssistantGroup.source = 'web-bot';
      continue;
    }

    const senderKey = c.sender;
    if (!unlinkedSenderGrouped[senderKey]) {
      unlinkedSenderGrouped[senderKey] = {
        ...c,
        messageCount: 0,
        lastActiveAt: null,
        firstMessageAt: null,
        chatIds: [],
        senders: [c.sender],
        chatSources: [],
        merged: false,
      };
    }
    const g = unlinkedSenderGrouped[senderKey];
    g.messageCount += c.messageCount;
    if (!g.chatIds.includes(c.chatId)) g.chatIds.push(c.chatId);
    if (!g.chatSources.includes(c.source || 'imessage')) g.chatSources.push(c.source || 'imessage');
    if (!g.lastActiveAt || new Date(c.lastActiveAt) > new Date(g.lastActiveAt)) g.lastActiveAt = c.lastActiveAt;
    if (!g.firstMessageAt || new Date(c.firstMessageAt) < new Date(g.firstMessageAt)) g.firstMessageAt = c.firstMessageAt;
  }

  for (const g of Object.values(linkedUserGrouped)) {
    g.merged = g.chatIds.length > 1 || g.senders.length > 1;
    if (!g.merged) g.chatId = g.chatIds[0];
    merged.push(g);
  }

  for (const g of Object.values(unlinkedSenderGrouped)) {
    g.merged = g.chatIds.length > 1;
    if (!g.merged) g.chatId = g.chatIds[0];
    merged.push(g);
  }

  if (aiAssistantGroup.chatIds.length) {
    aiAssistantGroup.merged = aiAssistantGroup.chatIds.length > 1 || aiAssistantGroup.senders.length > 1;
    if (!aiAssistantGroup.merged) aiAssistantGroup.chatId = aiAssistantGroup.chatIds[0];
    merged.push(aiAssistantGroup);
  }

  merged.sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));

  let list = merged;
  if (chatFilter.keyword) {
    const kw = chatFilter.keyword.toLowerCase();
    list = list.filter(c => {
      const mapped = senderMappings.value[c.sender];
      const name = mapped?.nickname || mapped?.username || c.senderName || c.sender;
      return String(name || '').toLowerCase().includes(kw);
    });
  }
  if (chatFilter.linkStatus === 'linked') list = list.filter(c => c.linkedUserId || senderMappings.value[c.sender]);
  if (chatFilter.linkStatus === 'unlinked') list = list.filter(c => !c.linkedUserId && !senderMappings.value[c.sender]);
  if (chatFilter.source) list = list.filter(c => {
    const sources = c.chatSources || [c.source || 'imessage'];
    return sources.includes(chatFilter.source);
  });
  return list;
});

const pagedChats = computed(() => {
  const start = (chatPage.value - 1) * chatPageSize;
  return filteredChats.value.slice(start, start + chatPageSize);
});

watch([() => chatFilter.keyword, () => chatFilter.linkStatus, () => chatFilter.source], () => { chatPage.value = 1; });

// AI分析记录
const allEvaluations = ref([]);
const evalPage = ref(1);
const evalPageSize = 15;
const evalTotal = ref(0);
const evalLoading = ref(false);
const pagedEvaluations = computed(() => allEvaluations.value);

function resolveEvalName(ev) {
  const mapped = senderMappings.value[ev.sender];
  return mapped?.nickname || mapped?.username || ev.senderName || ev.sender || '未知';
}

function analysisTagType(type) {
  const map = { comprehensive: 'info', psychology: 'warning', interest: 'success', negative: 'error' };
  return map[type] || 'default';
}

function analysisTagLabel(type) {
  const map = { comprehensive: '综合分析', psychology: '心理分析', interest: '兴趣分析', negative: '负面排查' };
  return map[type] || '综合分析';
}

async function loadAllEvaluations() {
  evalLoading.value = true;
  try {
    const res = await imessageAPI.getAllEvaluations({ page: evalPage.value, pageSize: evalPageSize });
    if (res.success) {
      allEvaluations.value = res.data.evaluations;
      evalTotal.value = res.data.total;
    }
  } catch {} finally {
    evalLoading.value = false;
  }
}

// AI 评价
const evaluatingChatId = ref(null);
const showEvalModal = ref(false);
const currentEval = ref(null);
const showEvalHistoryModal = ref(false);
const evalHistoryList = ref([]);
const evalHistoryName = ref('');

// AI 分析方向选择
const showAnalysisTypeModal = ref(false);
const selectedAnalysisType = ref('comprehensive');
const pendingEvalChat = ref(null);
const analysisTypeOptions = [
  { value: 'comprehensive', icon: '🎯', label: '综合分析', desc: '全面评估兴趣、思维、沟通、学习态度等各维度' },
  { value: 'psychology', icon: '🧠', label: '心理分析', desc: '深度分析情绪特征、社交模式、自信心与心理韧性' },
  { value: 'interest', icon: '💡', label: '兴趣分析', desc: '挖掘核心兴趣领域、学习风格与天赋潜能' },
  { value: 'negative', icon: '🛡️', label: '负面情况排查', desc: '排查情绪异常、不良倾向、社交问题与网络安全' },
  { value: 'values', icon: '⚖️', label: '三观分析', desc: '评估世界观、人生观、价值观发展状况' },
  { value: 'teaching', icon: '📖', label: '教学建议', desc: '学习能力评估、学科优势分析、个性化教学策略' },
];

// 发送者-用户关联
const senderMappings = ref({});  // sender -> { userId, nickname, username }
const showLinkModal = ref(false);
const linkingSender = ref('');
const userSearchKeyword = ref('');
const userSearchResults = ref([]);
const userSearching = ref(false);

// 图表
const trendChartRef = ref(null);
const hourlyChartRef = ref(null);
const rankChartRef = ref(null);
const lengthChartRef = ref(null);
const depthChartRef = ref(null);
const freqChartRef = ref(null);
let chartInstances = [];

function formatTime(t) {
  if (!t) return '-';
  const d = new Date(t);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function loadStats() {
  try {
    const res = await imessageAPI.getStats();
    if (res.success) Object.assign(stats, res.data);
  } catch {}
}

async function loadLogs() {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.sender) params.sender = filters.sender;
    if (filters.role) params.role = filters.role;
    if (filters.source) params.source = filters.source;
    if (dateRange.value) {
      params.startDate = new Date(dateRange.value[0]).toISOString();
      params.endDate = new Date(dateRange.value[1]).toISOString();
    }
    const res = await imessageAPI.getLogs(params);
    if (res.success) {
      logs.value = res.data.logs;
      total.value = res.data.total;
    }
  } catch (e) {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadChats() {
  loading.value = true;
  try {
    const res = await imessageAPI.getChats();
    if (res.success) chats.value = res.data;
  } catch {} finally {
    loading.value = false;
  }
}

async function openChat(chat) {
  currentChat.value = chat;
  chatSourceFilter.value = null;
  showChatModal.value = true;
  try {
    let res;
    if (chat.systemMerged || chat.merged || (chat.senders && chat.senders.length > 1)) {
      res = await imessageAPI.getChatBatch(chat.chatIds || [], chat.senders || []);
    } else if (chat.sender) {
      res = await imessageAPI.getChatBySender(chat.sender);
    } else {
      res = await imessageAPI.getChatDetail(chat.chatId);
    }
    if (res.success) chatMessages.value = res.data;
  } catch {}
}

async function openChatById(chatId, name) {
  currentChat.value = { chatId, sender: name };
  showChatModal.value = true;
  try {
    const res = await imessageAPI.getChatDetail(chatId);
    if (res.success) chatMessages.value = res.data;
  } catch {}
}

async function openSingleQA(row) {
  currentChat.value = { chatId: row.chatId, sender: row.senderName || row.sender };
  showChatModal.value = true;
  try {
    const res = await imessageAPI.getChatDetail(row.chatId);
    if (res.success) {
      const all = res.data;
      const idx = all.findIndex(m => m.id === row.id);
      if (idx === -1) {
        chatMessages.value = [row];
        return;
      }
      // Find the Q&A pair: if user message, find the next assistant reply; if assistant, find the previous user question
      let start = idx, end = idx;
      if (row.role === 'user') {
        // user question + following assistant answer(s)
        start = idx;
        end = idx;
        for (let i = idx + 1; i < all.length; i++) {
          if (all[i].role === 'assistant') { end = i; } else break;
        }
      } else {
        // assistant answer: find the preceding user question
        end = idx;
        start = idx;
        for (let i = idx - 1; i >= 0; i--) {
          if (all[i].role === 'user') { start = i; break; }
        }
      }
      chatMessages.value = all.slice(start, end + 1);
    }
  } catch {}
}

function evaluateChat(chat) {
  pendingEvalChat.value = chat;
  selectedAnalysisType.value = 'comprehensive';
  showAnalysisTypeModal.value = true;
}

async function confirmEvaluate() {
  const chat = pendingEvalChat.value;
  if (!chat) return;
  evaluatingChatId.value = chat.merged ? chat.chatIds[0] : chat.chatId;
  showAnalysisTypeModal.value = false;
  try {
    let res;
    if (chat.merged) {
      res = await imessageAPI.evaluateBySender(chat.sender, { analysisType: selectedAnalysisType.value });
    } else {
      res = await imessageAPI.evaluate(chat.chatId, selectedAnalysisType.value);
    }
    if (res.success) {
      currentEval.value = res.data;
      showEvalModal.value = true;
      message.success('AI 分析完成');
      // 刷新分析记录列表
      if (activeTab.value === 'evaluations') loadAllEvaluations();
    } else {
      message.error(res.error || '分析失败');
    }
  } catch (e) {
    message.error(e.error || 'AI 分析请求失败');
  } finally {
    evaluatingChatId.value = null;
    pendingEvalChat.value = null;
  }
}

async function showEvalHistory(chat) {
  evalHistoryName.value = senderMappings.value[chat.sender]?.nickname || chat.senderName || chat.sender;
  showEvalHistoryModal.value = true;
  evalHistoryList.value = [];
  try {
    let res;
    if (chat.merged) {
      res = await imessageAPI.getEvaluationsBySender(chat.sender);
    } else {
      res = await imessageAPI.getEvaluations(chat.chatId);
    }
    if (res.success) evalHistoryList.value = res.data;
  } catch {}
}

function viewEval(ev) {
  currentEval.value = ev;
  showEvalModal.value = true;
}

// 发送者关联方法
async function loadSenderMappings() {
  try {
    const res = await imessageAPI.getSenderMappings();
    if (res.success) {
      const map = {};
      res.data.forEach(m => {
        map[m.sender] = { userId: m.userId, nickname: m.user?.profile?.nickname, username: m.user?.username };
      });
      senderMappings.value = map;
    }
  } catch {}
}

function openLinkModal(sender) {
  linkingSender.value = sender;
  userSearchKeyword.value = '';
  userSearchResults.value = [];
  showLinkModal.value = true;
}

async function searchUsers() {
  if (!userSearchKeyword.value.trim()) return;
  userSearching.value = true;
  try {
    const res = await imessageAPI.searchUsers(userSearchKeyword.value.trim());
    if (res.success) userSearchResults.value = res.data;
  } catch {} finally {
    userSearching.value = false;
  }
}

async function linkUser(user) {
  try {
    const res = await imessageAPI.createSenderMapping({ sender: linkingSender.value, userId: user.id });
    if (res.success) {
      senderMappings.value[linkingSender.value] = { userId: user.id, nickname: user.nickname, username: user.username };
      showLinkModal.value = false;
      message.success('关联成功');
    }
  } catch (e) {
    message.error('关联失败');
  }
}

async function unlinkSender(sender) {
  try {
    const res = await imessageAPI.deleteSenderMapping(sender);
    if (res.success) {
      delete senderMappings.value[sender];
      senderMappings.value = { ...senderMappings.value };
      message.success('已解除关联');
    }
  } catch (e) {
    message.error('解除失败');
  }
}

function initChart(domRef) {
  if (!domRef) return null;
  const inst = echarts.init(domRef);
  chartInstances.push(inst);
  return inst;
}

async function loadAnalytics() {
  try {
    const res = await imessageAPI.getAnalytics();
    if (!res.success) return;
    const { dailyTrend, hourlyDist, senderRank, avgLength, convDepth, questionRate } = res.data;
    await nextTick();

    const barOpt = (names, values, color) => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 80, right: 24, top: 8, bottom: 8 },
      xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, width: 70, overflow: 'truncate' } },
      series: [{ type: 'bar', data: values, itemStyle: { color, borderRadius: [0, 3, 3, 0] } }],
    });

    // 近14天趋势
    const trendChart = initChart(trendChartRef.value);
    if (trendChart) {
      trendChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 16, top: 16, bottom: 28 },
        xAxis: { type: 'category', data: dailyTrend.map(d => d.date.slice(5)), axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 10 } },
        series: [{ type: 'line', data: dailyTrend.map(d => d.total), smooth: true, areaStyle: { opacity: 0.15 }, itemStyle: { color: '#3b82f6' } }],
      });
    }

    // 24小时分布
    const hourlyChart = initChart(hourlyChartRef.value);
    if (hourlyChart) {
      hourlyChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 16, top: 16, bottom: 28 },
        xAxis: { type: 'category', data: hourlyDist.map(d => d.hour + '时'), axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 10 } },
        series: [{ type: 'bar', data: hourlyDist.map(d => d.count), itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] } }],
      });
    }

    // 提问排行
    const rank = senderRank.slice(0, 10).reverse();
    const rankChart = initChart(rankChartRef.value);
    if (rankChart) rankChart.setOption(barOpt(rank.map(d => d.name), rank.map(d => d.count), '#f59e0b'));

    // 平均消息长度
    const len = avgLength.slice(0, 10).reverse();
    const lengthChart = initChart(lengthChartRef.value);
    if (lengthChart) lengthChart.setOption(barOpt(len.map(d => d.name), len.map(d => d.avgLen), '#8b5cf6'));

    // 对话深度
    const depth = (convDepth || []).slice(0, 10).reverse();
    const depthChart = initChart(depthChartRef.value);
    if (depthChart) depthChart.setOption(barOpt(depth.map(d => d.name), depth.map(d => d.avgDepth), '#06b6d4'));

    // 日均提问频率
    const freq = (questionRate || []).slice(0, 10).reverse();
    const freqChart = initChart(freqChartRef.value);
    if (freqChart) freqChart.setOption(barOpt(freq.map(d => d.name), freq.map(d => d.dailyAvg), '#ec4899'));
  } catch {}
}

function handleResize() {
  chartInstances.forEach(c => c && !c.isDisposed() && c.resize());
}

onMounted(() => {
  loadStats();
  loadLogs();
  loadChats();
  loadSenderMappings();
  window.addEventListener('resize', handleResize);
});

watch(activeTab, (val) => {
  if (val === 'evaluations' && !allEvaluations.value.length) loadAllEvaluations();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstances.forEach(c => c && !c.isDisposed() && c.dispose());
  chartInstances = [];
});
</script>

<style scoped>
.eval-content {
  font-size: 0.9rem;
  line-height: 1.8;
  color: #374151;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}

.eval-content :deep(h1),
.eval-content :deep(h2),
.eval-content :deep(h3) {
  color: #1e293b;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.eval-content :deep(h2) {
  font-size: 1.05rem;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #e2e8f0;
}

.eval-content :deep(h3) {
  font-size: 0.95rem;
}

.eval-content :deep(p) {
  margin: 0.5em 0;
}

.eval-content :deep(ul),
.eval-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.4em 0;
}

.eval-content :deep(li) {
  margin: 0.25em 0;
}

.eval-content :deep(strong) {
  color: #1e40af;
  font-weight: 600;
}

.eval-content :deep(em) {
  color: #6b7280;
}

.eval-content :deep(blockquote) {
  border-left: 3px solid #3b82f6;
  padding: 0.5em 1em;
  margin: 0.8em 0;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0 8px 8px 0;
  color: #475569;
}

.eval-content :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1em 0;
}

.analysis-type-card {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.analysis-type-card:hover {
  border-color: #93c5fd;
  background: #f0f7ff;
}

.analysis-type-active {
  border-color: #18a058;
  background: #f0fdf4;
}
</style>