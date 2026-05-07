<template>
  <div class="practice-panel">
    <!-- 顶部切换：当前练习 / 历史记录 -->
    <div class="practice-tabs">
      <n-tabs v-model:value="viewMode" type="segment" size="small">
        <n-tab name="current">当前练习</n-tab>
        <n-tab name="history">
          历史记录
          <n-badge v-if="historyCount > 0" :value="historyCount" :max="99" />
        </n-tab>
      </n-tabs>
    </div>

    <!-- 当前练习视图 -->
    <div v-show="viewMode === 'current'" class="current-practice">
      <!-- 初始状态：仅显示开始按钮 -->
      <div v-if="state === 'idle'" class="practice-idle">
        <div class="idle-content">
          <div class="idle-icon">
            <n-icon :size="56" color="#18a058"><SchoolOutline /></n-icon>
          </div>
          <h3 class="idle-title">本页练习</h3>
          <p class="idle-desc">基于当前页内容生成练习题，答完即可继续</p>
          <n-button type="primary" size="large" @click="startPractice">
            <template #icon><n-icon><PlayCircleOutline /></n-icon></template>
            开始本页练习
          </n-button>
          <!-- 如果有未完成的练习，显示恢复按钮 -->
          <div v-if="hasSavedSession" class="restore-hint">
            <n-button text type="info" @click="restoreSavedSession">
              <template #icon><n-icon><TimeOutline /></n-icon></template>
              恢复上次练习（第 {{ savedSessionPage }} 页）
            </n-button>
          </div>
        </div>
      </div>

      <!-- 生成中 -->
      <div v-else-if="state === 'generating'" class="practice-loading">
        <n-spin size="large">
          <template #description>
            <span class="loading-text">{{ practiceLoadingText }}</span>
          </template>
        </n-spin>
      </div>

      <!-- 练习题展示 -->
      <div v-else-if="state === 'practicing'" class="practice-content">
        <div class="practice-header">
          <span class="page-info">第 {{ sessionPage }} 页练习</span>
          <n-space>
            <n-button text size="small" @click="restartPractice">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              重新生成
            </n-button>
          </n-space>
        </div>

        <!-- 练习题渲染区 -->
        <div class="questions-area" ref="questionsRef">
          <div
            v-for="(question, index) in questions"
            :key="question.id"
            class="question-card"
            :class="{ answered: question.answered, correct: question.isCorrect, wrong: question.answered && !question.isCorrect }"
          >
            <!-- 题目标题 -->
            <div class="question-number">第 {{ index + 1 }} 题</div>

            <!-- 题干 -->
            <div class="question-stem" v-html="question.stem"></div>

            <!-- 选择题选项 -->
            <div v-if="question.type === 'choice'" class="question-options">
              <label
                v-for="opt in question.options"
                :key="opt.value"
                class="option-item"
                :class="{
                  selected: question.userAnswer === opt.value,
                  correct: question.answered && opt.value === question.answer,
                  wrong: question.answered && question.userAnswer === opt.value && opt.value !== question.answer
                }"
              >
                <input
                  type="radio"
                  :name="'q' + question.id"
                  :value="opt.value"
                  :checked="question.userAnswer === opt.value"
                  :disabled="question.answered"
                  @change="selectOption(index, opt.value)"
                />
                <span class="option-label">{{ opt.value }}.</span>
                <span class="option-text" v-html="opt.text"></span>
              </label>
            </div>

            <!-- 填空题输入 -->
            <div v-else-if="question.type === 'blank'" class="question-blank">
              <n-input
                v-model:value="question.userAnswer"
                placeholder="请输入答案"
                :disabled="question.answered"
                @keyup.enter="checkBlankAnswer(index)"
                @update:value="saveCurrentSession"
              />
              <n-button
                type="primary"
                :disabled="!question.userAnswer || question.answered"
                @click="checkBlankAnswer(index)"
              >
                确认
              </n-button>
            </div>

            <!-- 判断题选项 -->
            <div v-else-if="question.type === 'judge'" class="question-judge">
              <n-button-group>
                <n-button
                  :type="question.userAnswer === '对' ? (question.answered ? (question.isCorrect ? 'success' : 'error') : 'primary') : 'default'"
                  :disabled="question.answered"
                  @click="selectJudge(index, '对')"
                >
                  <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
                  正确
                </n-button>
                <n-button
                  :type="question.userAnswer === '错' ? (question.answered ? (question.isCorrect ? 'success' : 'error') : 'primary') : 'default'"
                  :disabled="question.answered"
                  @click="selectJudge(index, '错')"
                >
                  <template #icon><n-icon><CloseOutline /></n-icon></template>
                  错误
                </n-button>
              </n-button-group>
            </div>

            <!-- 作答反馈 -->
            <div v-if="question.answered" class="answer-feedback">
              <n-tag :type="question.isCorrect ? 'success' : 'error'" size="small">
                {{ question.isCorrect ? '回答正确' : '回答错误' }}
              </n-tag>
              <span v-if="!question.isCorrect" class="correct-answer">
                正确答案：{{ question.answer }}
              </span>
            </div>

            <!-- 解析（可折叠） -->
            <details v-if="question.analysis" class="question-analysis">
              <summary>查看解析</summary>
              <div class="analysis-content" v-html="question.analysis"></div>
            </details>

            <!-- 操作区 -->
            <div class="question-actions">
              <n-button
                text
                size="small"
                :type="question.saved || exerciseSaved ? 'success' : 'default'"
                :disabled="question.saved || exerciseSaved"
                @click="saveQuestionToNote(question, index)"
              >
                <template #icon><n-icon><BookmarkOutline /></n-icon></template>
                {{ question.saved || exerciseSaved ? '已保存' : '保存到笔记' }}
              </n-button>
            </div>
          </div>
        </div>

        <!-- 底部操作（答完题目后显示） -->
        <div class="practice-footer" v-if="allAnswered">
          <div class="score-info">
            <n-tag v-if="currentQuestion?.isCorrect" type="success" size="large">
              回答正确！
            </n-tag>
            <n-tag v-else type="error" size="large">
              回答错误
            </n-tag>
          </div>
          <n-space>
            <n-button
              :type="exerciseSaved ? 'success' : 'default'"
              :disabled="exerciseSaved"
              size="small"
              @click="saveAllToNote"
            >
              <template #icon><n-icon><BookmarkOutline /></n-icon></template>
              {{ exerciseSaved ? '已保存' : '保存笔记' }}
            </n-button>
            <n-button type="primary" @click="startPractice">
              <template #icon><n-icon><PlayCircleOutline /></n-icon></template>
              下一题
            </n-button>
          </n-space>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="state === 'error'" class="practice-error">
        <n-empty description="练习题生成失败">
          <template #extra>
            <n-button @click="startPractice">重试</n-button>
          </template>
        </n-empty>
      </div>
    </div>

    <!-- 历史记录视图 -->
    <div v-show="viewMode === 'history'" class="history-view">
      <div class="history-header">
        <span class="history-title">练习历史（最近 {{ historyList.length }} 条）</span>
        <n-button v-if="historyList.length > 0" text size="small" type="error" @click="clearHistory">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          清空
        </n-button>
      </div>

      <n-spin :show="loadingHistory">
        <div v-if="historyList.length > 0" class="history-list">
          <div
            v-for="item in historyList"
            :key="item.id"
            class="history-item"
            :class="{ completed: item.completed }"
            @click="viewHistoryItem(item)"
          >
            <div class="history-item-header">
              <n-tag size="tiny" :type="item.completed ? 'success' : 'warning'">
                {{ item.completed ? '已完成' : '未完成' }}
              </n-tag>
              <span class="history-page">P{{ item.page }}</span>
              <span class="history-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div class="history-item-body">
              <span class="history-count">{{ item.questions.length }} 题</span>
              <span v-if="item.completed" class="history-score">
                正确率：{{ item.correctCount }}/{{ item.questions.length }}
              </span>
            </div>
            <div class="history-item-actions">
              <n-button text size="tiny" @click.stop="loadHistoryItem(item)">
                <template #icon><n-icon><PlayOutline /></n-icon></template>
                {{ item.completed ? '重做' : '继续' }}
              </n-button>
              <n-button text size="tiny" type="error" @click.stop="deleteHistoryItem(item.id)">
                <template #icon><n-icon><TrashOutline /></n-icon></template>
              </n-button>
            </div>
          </div>
        </div>
        <n-empty v-else description="暂无练习记录" class="py-8" />
      </n-spin>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import SchoolOutline from '@vicons/ionicons5/es/SchoolOutline'
import PlayCircleOutline from '@vicons/ionicons5/es/PlayCircleOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import BookmarkOutline from '@vicons/ionicons5/es/BookmarkOutline'
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import TimeOutline from '@vicons/ionicons5/es/TimeOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import { aiAnalysisAPI, textbookNoteAPI } from '@/api/index';
import { useLoadingText } from '@/composables/useLoadingText';

const message = useMessage();

// 练习题生成专用的加载提示
const practiceLoadingTexts = [
  '正在分析当前页内容...',
  '正在提取知识点...',
  '大模型正在构思题目...',
  '正在生成练习题...',
  'AI正在出题中...',
  '正在检查题目难度...',
  '正在匹配课程标准...',
  '正在设计答案解析...',
  '知识库检索中...',
  '正在优化题目表述...'
];

// 使用随机循环加载提示
const { loadingText: practiceLoadingText, start: startLoadingText, stop: stopLoadingText } = useLoadingText(practiceLoadingTexts, 2000);

const props = defineProps({
  pdfDoc: Object,
  totalPages: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  textbookId: { type: String, default: '' },
  subject: { type: String, default: '' },
  getScreenshot: { type: Function, default: null }  // 获取页面截图的函数
});

const emit = defineEmits(['save-note', 'lock-render', 'unlock-render']);

// ===== 存储键名 =====
const STORAGE_KEY_SESSION = 'practice_current_session';
const STORAGE_KEY_HISTORY = 'practice_history';
const MAX_HISTORY_ITEMS = 50;

// ===== 视图模式 =====
const viewMode = ref('current'); // 'current' | 'history'

// ===== 状态 =====
const state = ref('idle'); // idle | generating | practicing | error
const questions = ref([]);
const questionsRef = ref(null);
const exerciseSaved = ref(false);
const savedNoteId = ref(null);
const sessionId = ref('');
const sessionPage = ref(1); // 当前练习对应的页码

// ===== 历史记录 =====
const historyList = ref([]);
const loadingHistory = ref(false);

// ===== 计算属性 =====
const allAnswered = computed(() => {
  return questions.value.length > 0 && questions.value.every(q => q.answered);
});

const correctCount = computed(() => {
  return questions.value.filter(q => q.isCorrect).length;
});

// 当前题目（单题模式）
const currentQuestion = computed(() => {
  return questions.value.length > 0 ? questions.value[0] : null;
});

const historyCount = computed(() => historyList.value.length);

// ===== 检查是否有已保存的会话 =====
const hasSavedSession = computed(() => {
  const saved = getSavedSession();
  return saved && saved.textbookId === props.textbookId && saved.questions?.length > 0;
});

const savedSessionPage = computed(() => {
  const saved = getSavedSession();
  return saved?.page || 1;
});

// ===== 本地存储操作 =====
const getStorageKey = (key) => `${key}_${props.textbookId}`;

const getSavedSession = () => {
  try {
    const data = localStorage.getItem(getStorageKey(STORAGE_KEY_SESSION));
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

const saveCurrentSession = () => {
  if (state.value !== 'practicing' || questions.value.length === 0) return;

  try {
    const sessionData = {
      id: sessionId.value,
      textbookId: props.textbookId,
      page: sessionPage.value,
      questions: questions.value,
      exerciseSaved: exerciseSaved.value,
      state: state.value,
      createdAt: Date.now(),
      completed: allAnswered.value,
      correctCount: correctCount.value
    };
    localStorage.setItem(getStorageKey(STORAGE_KEY_SESSION), JSON.stringify(sessionData));
  } catch (e) {
    console.warn('保存练习会话失败:', e);
  }
};

const clearSavedSession = () => {
  try {
    localStorage.removeItem(getStorageKey(STORAGE_KEY_SESSION));
  } catch (e) {
    console.warn('清除练习会话失败:', e);
  }
};

const restoreSavedSession = () => {
  const saved = getSavedSession();
  if (saved && saved.questions?.length > 0) {
    sessionId.value = saved.id;
    sessionPage.value = saved.page;
    questions.value = saved.questions;
    exerciseSaved.value = saved.exerciseSaved || false;
    state.value = 'practicing';
    message.success(`已恢复第 ${saved.page} 页的练习`);
  }
};

// ===== 历史记录操作 =====
const loadHistory = () => {
  try {
    const data = localStorage.getItem(getStorageKey(STORAGE_KEY_HISTORY));
    historyList.value = data ? JSON.parse(data) : [];
  } catch (e) {
    historyList.value = [];
  }
};

const saveToHistory = () => {
  if (questions.value.length === 0) return;

  try {
    const historyItem = {
      id: sessionId.value || `hist_${Date.now()}`,
      textbookId: props.textbookId,
      page: sessionPage.value,
      questions: questions.value.map(q => ({
        ...q,
        // 保存完整信息用于重做
      })),
      completed: allAnswered.value,
      correctCount: correctCount.value,
      createdAt: Date.now()
    };

    // 检查是否已存在相同ID的记录，如果有则更新
    const existingIndex = historyList.value.findIndex(h => h.id === historyItem.id);
    if (existingIndex >= 0) {
      historyList.value[existingIndex] = historyItem;
    } else {
      // 添加到开头
      historyList.value.unshift(historyItem);
    }

    // 限制最大条数
    if (historyList.value.length > MAX_HISTORY_ITEMS) {
      historyList.value = historyList.value.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(getStorageKey(STORAGE_KEY_HISTORY), JSON.stringify(historyList.value));
  } catch (e) {
    console.warn('保存历史记录失败:', e);
  }
};

const loadHistoryItem = (item) => {
  // 如果是已完成的练习，重置答题状态用于重做
  const questionsToLoad = item.completed
    ? item.questions.map(q => ({
        ...q,
        userAnswer: '',
        answered: false,
        isCorrect: false,
        saved: false
      }))
    : item.questions;

  sessionId.value = item.completed ? `practice_${Date.now()}` : item.id;
  sessionPage.value = item.page;
  questions.value = questionsToLoad;
  exerciseSaved.value = false;
  state.value = 'practicing';
  viewMode.value = 'current';

  // 保存当前会话
  saveCurrentSession();

  message.info(item.completed ? '开始重做练习' : '继续上次练习');
};

const viewHistoryItem = (item) => {
  // 切换到当前视图并加载
  loadHistoryItem(item);
};

const deleteHistoryItem = (id) => {
  historyList.value = historyList.value.filter(h => h.id !== id);
  try {
    localStorage.setItem(getStorageKey(STORAGE_KEY_HISTORY), JSON.stringify(historyList.value));
    message.success('已删除');
  } catch (e) {
    console.warn('删除历史记录失败:', e);
  }
};

const clearHistory = () => {
  historyList.value = [];
  try {
    localStorage.removeItem(getStorageKey(STORAGE_KEY_HISTORY));
    message.success('历史记录已清空');
  } catch (e) {
    console.warn('清空历史记录失败:', e);
  }
};

// ===== 格式化时间 =====
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

// ===== 构建 AI 请求（基于图片，单题模式） =====
const buildPrompt = () => {
  const current = props.currentPage;
  const subjectName = getSubjectName(props.subject);

  return `【${subjectName}练习生成】第${current}页

请根据当前页面图片内容，生成1道练习题。

严格按以下JSON格式输出（不要输出其他内容）：

{
  "type": "choice",
  "stem": "题干文本",
  "options": [
    {"value": "A", "text": "选项A"},
    {"value": "B", "text": "选项B"},
    {"value": "C", "text": "选项C"},
    {"value": "D", "text": "选项D"}
  ],
  "answer": "B",
  "analysis": "解析文本"
}

题型规则：
- choice：选择题，answer为A/B/C/D
- blank：填空题，无options，answer为标准答案
- judge：判断题，无options，answer为"对"或"错"

要求：
1. 仔细观察页面图片内容，题目必须紧扣页面内容
2. 答案必须唯一确定
3. 只输出JSON对象（不是数组），不要markdown
4. 适合小学生作答
5. 每次只生成1道题目`;
};

const getSubjectName = (subject) => {
  const map = {
    'CHINESE': '语文', 'MATH': '数学', 'ENGLISH': '英语',
    'SCIENCE': '科学', 'PHYSICS': '物理', 'CHEMISTRY': '化学'
  };
  return map[subject] || '练习';
};

// ===== 解析 AI 返回的 JSON（支持单题对象或数组格式）=====
const parseQuestions = (content) => {
  try {
    let jsonStr = content.trim();

    // 提取 code block
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // 尝试提取 JSON 对象或数组
    const arrayStart = jsonStr.indexOf('[');
    const arrayEnd = jsonStr.lastIndexOf(']');
    const objStart = jsonStr.indexOf('{');
    const objEnd = jsonStr.lastIndexOf('}');

    let parsed;

    // 优先尝试解析单个对象（单题模式）
    if (objStart !== -1 && objEnd !== -1) {
      const objStr = jsonStr.slice(objStart, objEnd + 1);
      try {
        parsed = JSON.parse(objStr);
        // 如果是单个对象，转为数组
        if (!Array.isArray(parsed) && parsed.stem) {
          parsed = [parsed];
        }
      } catch {
        // 如果单对象解析失败，尝试数组
        if (arrayStart !== -1 && arrayEnd !== -1) {
          jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
          parsed = JSON.parse(jsonStr);
        }
      }
    } else if (arrayStart !== -1 && arrayEnd !== -1) {
      jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
      parsed = JSON.parse(jsonStr);
    }

    if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
      throw new Error('无效的题目格式');
    }

    // 确保是数组
    const questions = Array.isArray(parsed) ? parsed : [parsed];

    return questions.map((q, idx) => ({
      id: `q_${Date.now()}_${idx}`,
      type: q.type || 'choice',
      stem: q.stem || '',
      options: q.options || [],
      answer: String(q.answer || '').trim(),
      analysis: q.analysis || '',
      userAnswer: '',
      answered: false,
      isCorrect: false,
      saved: false
    }));
  } catch (e) {
    console.error('解析练习题失败:', e, content);
    return null;
  }
};

// ===== 开始练习 =====
const startPractice = async () => {
  if (!props.pdfDoc) {
    message.warning('请先加载教材 PDF');
    return;
  }

  if (!props.textbookId) {
    message.warning('教材信息缺失');
    return;
  }

  // 如果当前有未完成的练习，先保存到历史
  if (state.value === 'practicing' && questions.value.length > 0) {
    saveToHistory();
  }

  state.value = 'generating';
  startLoadingText(); // 开始显示随机加载提示
  questions.value = [];
  sessionId.value = `practice_${Date.now()}`;
  sessionPage.value = props.currentPage;
  exerciseSaved.value = false;

  try {
    emit('lock-render');

    // 获取页面截图（base64 格式）
    const screenshotBase64 = props.getScreenshot ? props.getScreenshot() : null;

    // 构建提示词（不再是异步的）
    const prompt = buildPrompt();

    emit('unlock-render');

    // 调用 AI API，传递截图
    const result = await aiAnalysisAPI.chat({
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      message: prompt,
      context: '',
      subject: props.subject || 'CHINESE',
      imageBase64: screenshotBase64  // 传递页面截图
    });

    if (result.success && result.data?.content) {
      const parsed = parseQuestions(result.data.content);
      if (parsed && parsed.length > 0) {
        questions.value = parsed;
        state.value = 'practicing';
        stopLoadingText(); // 停止加载提示
        // 保存当前会话
        saveCurrentSession();
        // 保存到历史
        saveToHistory();
      } else {
        throw new Error('题目解析失败');
      }
    } else {
      throw new Error(result.error || '生成失败');
    }
  } catch (error) {
    console.error('练习生成失败:', error);
    message.error(error.message || '练习生成失败');
    state.value = 'error';
    stopLoadingText(); // 停止加载提示
    emit('unlock-render');
  }
};

// ===== 重新开始 =====
const restartPractice = () => {
  // 保存当前进度到历史
  if (questions.value.length > 0) {
    saveToHistory();
  }

  state.value = 'idle';
  questions.value = [];
  exerciseSaved.value = false;
  savedNoteId.value = null;
  clearSavedSession();
};

// ===== 选择题作答 =====
const selectOption = (index, value) => {
  const q = questions.value[index];
  if (q.answered) return;

  q.userAnswer = value;
  q.answered = true;
  q.isCorrect = value === q.answer;

  // 保存状态
  saveCurrentSession();
  saveToHistory();

  if (q.isCorrect) {
    message.success('回答正确！');
  } else {
    message.error(`回答错误，正确答案是 ${q.answer}`);
  }
};

// ===== 填空题作答 =====
const checkBlankAnswer = (index) => {
  const q = questions.value[index];
  if (q.answered || !q.userAnswer) return;

  q.answered = true;
  const userAns = q.userAnswer.trim().toLowerCase();
  const correctAns = q.answer.trim().toLowerCase();
  q.isCorrect = userAns === correctAns;

  // 保存状态
  saveCurrentSession();
  saveToHistory();

  if (q.isCorrect) {
    message.success('回答正确！');
  } else {
    message.error(`回答错误，正确答案是 ${q.answer}`);
  }
};

// ===== 判断题作答 =====
const selectJudge = (index, value) => {
  const q = questions.value[index];
  if (q.answered) return;

  q.userAnswer = value;
  q.answered = true;
  q.isCorrect = value === q.answer;

  // 保存状态
  saveCurrentSession();
  saveToHistory();

  if (q.isCorrect) {
    message.success('回答正确！');
  } else {
    message.error(`回答错误，正确答案是 ${q.answer}`);
  }
};

// ===== 保存单题到笔记 =====
const saveQuestionToNote = async (question, index) => {
  if (!props.textbookId || question.saved || exerciseSaved.value) return;

  try {
    const noteContent = buildNoteContent(question, index);
    await textbookNoteAPI.create({
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      sourceType: 'practice',
      query: `练习题 ${index + 1}`,
      content: { question, index },
      snippet: question.stem.slice(0, 80),
      page: sessionPage.value
    });

    question.saved = true;
    saveCurrentSession();

    message.success('已保存到笔记');
    emit('save-note');
  } catch (e) {
    message.error('保存失败');
  }
};

// ===== 保存全部到笔记 =====
const saveAllToNote = async () => {
  if (!props.textbookId || questions.value.length === 0 || exerciseSaved.value) return;

  try {
    const result = await textbookNoteAPI.create({
      textbookId: props.textbookId,
      sessionId: sessionId.value,
      sourceType: 'practice',
      query: `第${sessionPage.value}页练习 (${correctCount.value}/${questions.value.length})`,
      content: { questions: questions.value, score: `${correctCount.value}/${questions.value.length}` },
      snippet: `正确率：${correctCount.value}/${questions.value.length}`,
      page: sessionPage.value
    });

    exerciseSaved.value = true;
    savedNoteId.value = result.data?.id || null;
    saveCurrentSession();

    message.success('已保存到笔记');
    emit('save-note');
  } catch (e) {
    message.error('保存失败');
  }
};

// ===== 构建笔记内容 =====
const buildNoteContent = (q, index) => {
  let content = `【第${index + 1}题】${q.stem}\n`;
  if (q.type === 'choice' && q.options) {
    content += q.options.map(o => `${o.value}. ${o.text}`).join('\n') + '\n';
  }
  content += `答案：${q.answer}\n`;
  if (q.analysis) {
    content += `解析：${q.analysis}`;
  }
  return content;
};

// ===== 监听页码变化 =====
watch(() => props.currentPage, (newPage, oldPage) => {
  if (state.value === 'practicing' && newPage !== oldPage) {
    message.info('页面已切换，可点击"重新生成"更新练习');
  }
});

// ===== 监听 textbookId 变化，重新加载历史 =====
watch(() => props.textbookId, (newId, oldId) => {
  // 仅在 textbookId 实际变化时重新加载（排除初始化）
  if (newId && oldId && newId !== oldId) {
    loadHistory();
    // 检查新教材是否有未完成的练习
    const saved = getSavedSession();
    if (saved && saved.state === 'practicing' && saved.questions?.length > 0) {
      restoreSavedSession();
    } else {
      // 重置状态
      state.value = 'idle';
      questions.value = [];
      exerciseSaved.value = false;
    }
  }
});

// ===== 初始化 =====
onMounted(() => {
  loadHistory();

  // 尝试恢复上次会话
  const saved = getSavedSession();
  if (saved && saved.textbookId === props.textbookId && saved.state === 'practicing' && saved.questions?.length > 0) {
    restoreSavedSession();
  }
});

// ===== 组件卸载前保存 =====
onUnmounted(() => {
  if (state.value === 'practicing' && questions.value.length > 0) {
    saveCurrentSession();
    saveToHistory();
  }
});

// ===== 暴露方法给父组件 =====
defineExpose({
  saveCurrentSession,
  restoreSavedSession,
  getState: () => state.value
});
</script>

<style scoped>
.practice-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* 顶部tabs */
.practice-tabs {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
}

.practice-tabs :deep(.n-badge) {
  margin-left: 4px;
}

/* 当前练习视图 */
.current-practice {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 初始状态 */
.practice-idle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.idle-content {
  text-align: center;
  padding: 40px 20px;
}

.idle-icon {
  margin-bottom: 20px;
}

.idle-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.idle-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 24px;
}

.restore-hint {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

/* 加载中 */
.practice-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 14px;
  color: #666;
  margin-top: 12px;
}

/* 练习内容区 */
.practice-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.practice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
}

.page-info {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

/* 题目区域 */
.questions-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 题目卡片 */
.question-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border-left: 3px solid #e0e0e0;
  transition: border-color 0.3s;
}

.question-card.answered.correct {
  border-left-color: #18a058;
  background: #f6ffed;
}

.question-card.answered.wrong {
  border-left-color: #d03050;
  background: #fff2f0;
}

.question-number {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.question-stem {
  font-size: 15px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
}

/* 选择题选项 */
.question-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover:not(.correct):not(.wrong) {
  background: #f0f7ff;
  border-color: #91caff;
}

.option-item.selected {
  background: #e6f4ff;
  border-color: #1890ff;
}

.option-item.correct {
  background: #f6ffed;
  border-color: #52c41a;
}

.option-item.wrong {
  background: #fff2f0;
  border-color: #ff4d4f;
}

.option-item input[type="radio"] {
  margin-right: 8px;
  margin-top: 3px;
}

.option-label {
  font-weight: 500;
  margin-right: 6px;
  color: #666;
}

.option-text {
  flex: 1;
  color: #333;
}

/* 填空题 */
.question-blank {
  display: flex;
  gap: 10px;
  align-items: center;
}

.question-blank :deep(.n-input) {
  flex: 1;
}

/* 判断题 */
.question-judge {
  display: flex;
  gap: 12px;
}

/* 作答反馈 */
.answer-feedback {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.correct-answer {
  font-size: 13px;
  color: #666;
}

/* 解析 */
.question-analysis {
  margin-top: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.question-analysis summary {
  padding: 10px 14px;
  background: #fafafa;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  user-select: none;
}

.question-analysis summary:hover {
  background: #f0f0f0;
}

.analysis-content {
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  background: white;
}

/* 操作区 */
.question-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 12px;
}

/* 底部统计 */
.practice-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.score-label {
  font-size: 14px;
  color: #666;
}

.score-value {
  font-size: 24px;
  font-weight: 600;
  color: #18a058;
}

/* 错误状态 */
.practice-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 历史记录视图 */
.history-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.history-item {
  background: white;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.history-item.completed {
  border-left: 3px solid #18a058;
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.history-page {
  font-size: 12px;
  color: #666;
}

.history-time {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

.history-item-body {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #666;
}

.history-score {
  color: #18a058;
  font-weight: 500;
}

.history-item-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

/* 滚动条 */
.questions-area::-webkit-scrollbar,
.history-list::-webkit-scrollbar {
  width: 6px;
}
.questions-area::-webkit-scrollbar-track,
.history-list::-webkit-scrollbar-track {
  background: transparent;
}
.questions-area::-webkit-scrollbar-thumb,
.history-list::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}
</style>
