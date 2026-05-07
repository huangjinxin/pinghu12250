<template>
  <div class="practice-questions" :class="{ compact: compact }">
    <!-- 题目列表 -->
    <div class="questions-list">
      <div
        v-for="(question, index) in interactiveQuestions"
        :key="question.id || index"
        class="question-card"
        :class="{
          answered: question.answered,
          correct: question.isCorrect,
          wrong: question.answered && !question.isCorrect
        }"
      >
        <!-- 题目标题 -->
        <div class="question-header">
          <span class="question-number">第 {{ index + 1 }} 题</span>
          <n-tag v-if="question.answered" :type="question.isCorrect ? 'success' : 'error'" size="tiny">
            {{ question.isCorrect ? '正确' : '错误' }}
          </n-tag>
        </div>

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
              wrong: question.answered && question.userAnswer === opt.value && opt.value !== question.answer,
              disabled: question.answered
            }"
            @click="!question.answered && handleSelectOption(index, opt.value)"
          >
            <span class="option-radio" :class="{ checked: question.userAnswer === opt.value }"></span>
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
            @keyup.enter="handleCheckBlank(index)"
          />
          <n-button
            type="primary"
            :disabled="!question.userAnswer || question.answered"
            @click="handleCheckBlank(index)"
          >
            确认
          </n-button>
        </div>

        <!-- 判断题选项 -->
        <div v-else-if="question.type === 'judge'" class="question-judge">
          <n-button-group>
            <n-button
              :type="getJudgeButtonType(question, '对')"
              :disabled="question.answered"
              @click="handleSelectJudge(index, '对')"
            >
              <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
              正确
            </n-button>
            <n-button
              :type="getJudgeButtonType(question, '错')"
              :disabled="question.answered"
              @click="handleSelectJudge(index, '错')"
            >
              <template #icon><n-icon><CloseOutline /></n-icon></template>
              错误
            </n-button>
          </n-button-group>
        </div>

        <!-- 作答反馈 -->
        <div v-if="question.answered" class="answer-feedback">
          <span v-if="!question.isCorrect" class="correct-answer">
            正确答案：<strong>{{ question.answer }}</strong>
          </span>
        </div>

        <!-- 解析（可折叠） -->
        <details v-if="question.analysis" class="question-analysis" :open="question.answered">
          <summary>
            <n-icon size="14"><InformationCircleOutline /></n-icon>
            查看解析
          </summary>
          <div class="analysis-content" v-html="question.analysis"></div>
        </details>
      </div>
    </div>

    <!-- 底部统计 -->
    <div v-if="showFooter && allAnswered" class="questions-footer">
      <div class="score-info">
        <span class="score-label">本次成绩：</span>
        <span class="score-value" :class="{ perfect: correctCount === interactiveQuestions.length }">
          {{ correctCount }} / {{ interactiveQuestions.length }}
        </span>
        <span class="score-percent">
          ({{ Math.round(correctCount / interactiveQuestions.length * 100) }}%)
        </span>
      </div>
      <n-space>
        <n-button @click="handleReset">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          重做
        </n-button>
      </n-space>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import InformationCircleOutline from '@vicons/ionicons5/es/InformationCircleOutline'

const message = useMessage();

const props = defineProps({
  // 题目列表（原始数据）
  questions: {
    type: Array,
    default: () => []
  },
  // 紧凑模式（用于内联显示）
  compact: {
    type: Boolean,
    default: false
  },
  // 是否显示底部统计
  showFooter: {
    type: Boolean,
    default: true
  },
  // 是否显示答题反馈消息
  showFeedback: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['answer', 'complete', 'reset']);

// 可交互的题目列表（内部状态）
const interactiveQuestions = ref([]);

// 初始化题目状态
const initQuestions = () => {
  if (!props.questions || props.questions.length === 0) {
    interactiveQuestions.value = [];
    return;
  }

  interactiveQuestions.value = props.questions.map((q, idx) => ({
    id: q.id || `q_${idx}`,
    type: q.type || 'choice',
    stem: q.stem || '',
    options: q.options || [],
    answer: String(q.answer || '').trim(),
    analysis: q.analysis || '',
    userAnswer: q.userAnswer || '',
    answered: q.answered || false,
    isCorrect: q.isCorrect || false
  }));
};

// 监听 questions 变化
watch(() => props.questions, () => {
  initQuestions();
}, { immediate: true, deep: true });

// 计算属性
const allAnswered = computed(() => {
  return interactiveQuestions.value.length > 0 &&
    interactiveQuestions.value.every(q => q.answered);
});

const correctCount = computed(() => {
  return interactiveQuestions.value.filter(q => q.isCorrect).length;
});

// 选择题作答
const handleSelectOption = (index, value) => {
  const q = interactiveQuestions.value[index];
  if (q.answered) return;

  q.userAnswer = value;
  q.answered = true;
  q.isCorrect = value === q.answer;

  if (props.showFeedback) {
    if (q.isCorrect) {
      message.success('回答正确！');
    } else {
      message.error(`回答错误，正确答案是 ${q.answer}`);
    }
  }

  emitAnswer(index, q);
  checkComplete();
};

// 填空题作答
const handleCheckBlank = (index) => {
  const q = interactiveQuestions.value[index];
  if (q.answered || !q.userAnswer) return;

  q.answered = true;
  const userAns = q.userAnswer.trim().toLowerCase();
  const correctAns = q.answer.trim().toLowerCase();
  q.isCorrect = userAns === correctAns;

  if (props.showFeedback) {
    if (q.isCorrect) {
      message.success('回答正确！');
    } else {
      message.error(`回答错误，正确答案是 ${q.answer}`);
    }
  }

  emitAnswer(index, q);
  checkComplete();
};

// 判断题作答
const handleSelectJudge = (index, value) => {
  const q = interactiveQuestions.value[index];
  if (q.answered) return;

  q.userAnswer = value;
  q.answered = true;
  q.isCorrect = value === q.answer;

  if (props.showFeedback) {
    if (q.isCorrect) {
      message.success('回答正确！');
    } else {
      message.error(`回答错误，正确答案是 ${q.answer === '对' ? '正确' : '错误'}`);
    }
  }

  emitAnswer(index, q);
  checkComplete();
};

// 判断题按钮类型
const getJudgeButtonType = (q, value) => {
  if (!q.answered) {
    return q.userAnswer === value ? 'primary' : 'default';
  }
  if (q.userAnswer === value) {
    return q.isCorrect ? 'success' : 'error';
  }
  if (value === q.answer) {
    return 'success';
  }
  return 'default';
};

// 发送答题事件
const emitAnswer = (index, question) => {
  emit('answer', {
    index,
    question: { ...question },
    allAnswered: allAnswered.value,
    correctCount: correctCount.value,
    total: interactiveQuestions.value.length
  });
};

// 检查是否全部完成
const checkComplete = () => {
  if (allAnswered.value) {
    emit('complete', {
      correctCount: correctCount.value,
      total: interactiveQuestions.value.length,
      questions: interactiveQuestions.value.map(q => ({ ...q }))
    });
  }
};

// 重置
const handleReset = () => {
  interactiveQuestions.value.forEach(q => {
    q.userAnswer = '';
    q.answered = false;
    q.isCorrect = false;
  });
  emit('reset');
  if (props.showFeedback) {
    message.info('已重置，可以重新作答');
  }
};

// 暴露方法
defineExpose({
  reset: handleReset,
  getState: () => ({
    questions: interactiveQuestions.value.map(q => ({ ...q })),
    allAnswered: allAnswered.value,
    correctCount: correctCount.value
  })
});

onMounted(() => {
  initQuestions();
});
</script>

<style scoped>
.practice-questions {
  width: 100%;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 题目卡片 */
.question-card {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
  border-left: 3px solid #e0e0e0;
  transition: all 0.3s;
}

.question-card.answered.correct {
  border-left-color: #18a058;
  background: #f6ffed;
}

.question-card.answered.wrong {
  border-left-color: #d03050;
  background: #fff2f0;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.question-number {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.question-stem {
  font-size: 15px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 14px;
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
  padding: 12px 14px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.option-item:hover:not(.disabled):not(.correct):not(.wrong) {
  background: #f0f7ff;
  border-color: #91caff;
}

.option-item.selected:not(.correct):not(.wrong) {
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

.option-item.disabled {
  cursor: default;
}

/* 自定义 radio 样式 */
.option-radio {
  width: 16px;
  height: 16px;
  border: 2px solid #d9d9d9;
  border-radius: 50%;
  margin-right: 10px;
  margin-top: 2px;
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
}

.option-radio.checked {
  border-color: #1890ff;
}

.option-radio.checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #1890ff;
  border-radius: 50%;
}

.option-item.correct .option-radio {
  border-color: #52c41a;
}

.option-item.correct .option-radio.checked::after {
  background: #52c41a;
}

.option-item.wrong .option-radio {
  border-color: #ff4d4f;
}

.option-item.wrong .option-radio.checked::after {
  background: #ff4d4f;
}

.option-label {
  font-weight: 500;
  margin-right: 6px;
  color: #666;
}

.option-text {
  flex: 1;
  color: #333;
  line-height: 1.5;
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
  padding: 10px 12px;
  background: rgba(0,0,0,0.02);
  border-radius: 6px;
}

.correct-answer {
  font-size: 13px;
  color: #666;
}

.correct-answer strong {
  color: #18a058;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.question-analysis summary:hover {
  background: #f0f0f0;
}

.question-analysis[open] summary {
  border-bottom: 1px solid #e8e8e8;
}

.analysis-content {
  padding: 14px;
  font-size: 14px;
  line-height: 1.7;
  color: #555;
  background: white;
}

/* 底部统计 */
.questions-footer {
  margin-top: 20px;
  padding: 16px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
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

.score-value.perfect {
  color: #faad14;
}

.score-percent {
  font-size: 14px;
  color: #999;
}

/* 紧凑模式 */
.practice-questions.compact .question-card {
  padding: 12px;
}

.practice-questions.compact .question-stem {
  font-size: 14px;
  margin-bottom: 10px;
}

.practice-questions.compact .option-item {
  padding: 8px 10px;
}

.practice-questions.compact .questions-footer {
  padding: 12px;
}

.practice-questions.compact .score-value {
  font-size: 18px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .question-card {
    padding: 12px;
  }

  .option-item {
    padding: 10px 12px;
  }

  .questions-footer {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}
</style>
