/**
 * 日记 AI 分析任务管理
 * 支持后台执行，不阻塞 UI
 */

import { ref, computed } from 'vue';
import { aiAnalysisAPI } from '@/api';

// 任务状态
const tasks = ref([]);
const taskIdCounter = ref(0);

// 超时时间：10分钟
const TASK_TIMEOUT = 10 * 60 * 1000;

/**
 * 创建任务
 */
function createTask(type, title, data) {
  const id = `task-${++taskIdCounter.value}-${Date.now()}`;
  const task = {
    id,
    type, // 'single' | 'batch'
    title,
    data,
    status: 'pending', // pending | running | completed | failed | cancelled
    progress: 0,
    result: null,
    error: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    abortController: null
  };
  tasks.value.unshift(task);
  return task;
}

/**
 * 更新任务状态
 */
function updateTask(taskId, updates) {
  const index = tasks.value.findIndex(t => t.id === taskId);
  if (index !== -1) {
    tasks.value[index] = { ...tasks.value[index], ...updates };
  }
}

/**
 * 移除任务
 */
function removeTask(taskId) {
  const index = tasks.value.findIndex(t => t.id === taskId);
  if (index !== -1) {
    tasks.value.splice(index, 1);
  }
}

/**
 * 取消/停止任务
 */
function cancelTask(taskId) {
  const task = tasks.value.find(t => t.id === taskId);
  if (task) {
    if (task.abortController) {
      task.abortController.abort();
    }
    updateTask(taskId, { status: 'cancelled', completedAt: Date.now() });
  }
}

/**
 * 清除已完成/失败/取消的任务
 */
function clearCompletedTasks() {
  tasks.value = tasks.value.filter(t =>
    t.status === 'pending' || t.status === 'running'
  );
}

/**
 * 执行单条日记分析（后台执行，立即返回 taskId）
 */
function analyzeSingleDiary(diary, onComplete) {
  const task = createTask('single', `${diary.title || '日记'}分析`, { diary });

  // 启动任务
  updateTask(task.id, {
    status: 'running',
    startedAt: Date.now(),
    progress: 10
  });

  // 后台执行 API 调用（不阻塞）
  (async () => {
    try {
      // 永不超时，只等待 API 返回或用户取消
      const res = await aiAnalysisAPI.analyzeDiary({
        diaryId: diary.id,
        content: diary.content,
        title: diary.title,
        mood: diary.mood,
        weather: diary.weather,
        createdAt: diary.createdAt
      });

      // 检查任务是否已被取消
      const currentTask = tasks.value.find(t => t.id === task.id);
      if (!currentTask || currentTask.status === 'cancelled') {
        return;
      }

      if (res.success) {
        updateTask(task.id, {
          status: 'completed',
          progress: 100,
          result: {
            isBatch: false,
            diary: diary,
            analysis: res.data.analysis,
            modelName: res.data.modelName,
            tokensUsed: res.data.tokensUsed,
            responseTime: res.data.responseTime,
            // 评分数据
            totalScore: res.data.totalScore,
            grade: res.data.grade,
            scoreDetails: res.data.scoreDetails,
            highlights: res.data.highlights,
            improvements: res.data.improvements,
            encouragement: res.data.encouragement,
            nextGoal: res.data.nextGoal,
            previousScore: res.data.previousScore,
            previousGrade: res.data.previousGrade
          },
          completedAt: Date.now()
        });

        // 自动保存到历史记录
        try {
          await aiAnalysisAPI.saveDiaryAnalysis({
            isBatch: false,
            diaryId: diary.id,
            diaryCount: 1,
            diarySnapshot: {
              title: diary.title,
              content: diary.content,
              mood: diary.mood,
              weather: diary.weather,
              createdAt: diary.createdAt
            },
            analysis: res.data.analysis,
            modelName: res.data.modelName,
            tokensUsed: res.data.tokensUsed,
            responseTime: res.data.responseTime,
            // 评分数据
            totalScore: res.data.totalScore,
            grade: res.data.grade,
            scoreDetails: res.data.scoreDetails,
            highlights: res.data.highlights,
            improvements: res.data.improvements,
            nextGoal: res.data.nextGoal
          });
        } catch (e) {
          console.error('保存分析记录失败:', e);
        }

        onComplete?.(task.id, tasks.value.find(t => t.id === task.id));
      } else {
        // 后端明确返回失败，标记为业务错误
        const bizError = new Error(res.error || '分析失败');
        bizError._isBusinessError = true;
        throw bizError;
      }
    } catch (error) {
      const currentTask = tasks.value.find(t => t.id === task.id);
      if (currentTask && currentTask.status !== 'cancelled') {
        // 只有后端明确返回失败才是 failed，其他都是 timeout
        const isBusinessError = error._isBusinessError === true;

        if (isBusinessError) {
          updateTask(task.id, {
            status: 'failed',
            error: error.message || '分析失败',
            completedAt: Date.now()
          });
        } else {
          // 网络、超时、连接中断等：后台可能仍在运行
          console.warn('[DiaryAnalysis] 请求异常，后台可能仍在运行:', error.message, error.code);
          updateTask(task.id, {
            status: 'timeout',
            error: '请求中断，后台可能仍在分析中',
            completedAt: Date.now()
          });
        }
        onComplete?.(task.id, tasks.value.find(t => t.id === task.id));
      }
    }
  })();

  // 立即返回 taskId，不等待 API 完成
  return task.id;
}

/**
 * 执行批量日记分析（后台执行，立即返回 taskId）
 */
function analyzeBatchDiaries(diaries, period, periodText, onComplete) {
  const task = createTask('batch', `${periodText}日记分析`, { diaries, period });

  // 启动任务
  updateTask(task.id, {
    status: 'running',
    startedAt: Date.now(),
    progress: 10
  });

  // 后台执行 API 调用（不阻塞）
  (async () => {
    try {
      // 永不超时，只等待 API 返回或用户取消
      const res = await aiAnalysisAPI.analyzeDiariesBatch({
        diaries: diaries.map(d => ({
          title: d.title,
          content: d.content,
          mood: d.mood,
          weather: d.weather,
          createdAt: d.createdAt
        })),
        period
      });

      // 检查任务是否已被取消
      const currentTask = tasks.value.find(t => t.id === task.id);
      if (!currentTask || currentTask.status === 'cancelled') {
        return;
      }

      if (res.success) {
        updateTask(task.id, {
          status: 'completed',
          progress: 100,
          result: {
            isBatch: true,
            diary: null,
            analysis: res.data.analysis,
            period: periodText,
            diaryCount: diaries.length,
            modelName: res.data.modelName,
            tokensUsed: res.data.tokensUsed,
            responseTime: res.data.responseTime,
            // 评分数据
            totalScore: res.data.totalScore,
            grade: res.data.grade,
            summary: res.data.summary,
            emotionTrend: res.data.emotionTrend,
            writingProgress: res.data.writingProgress,
            highlights: res.data.highlights,
            improvements: res.data.improvements,
            nextGoal: res.data.nextGoal,
            // 人物画像
            authorProfile: res.data.authorProfile,
            charactersProfile: res.data.charactersProfile,
            socialStyle: res.data.socialStyle,
            funSummary: res.data.funSummary,
            // 周心理摘要
            psychologySummary: res.data.psychologySummary
          },
          completedAt: Date.now()
        });

        // 自动保存到历史记录
        try {
          await aiAnalysisAPI.saveDiaryAnalysis({
            isBatch: true,
            period: periodText,
            diaryIds: diaries.map(d => d.id),
            diaryCount: diaries.length,
            diarySnapshot: diaries.map(d => ({
              title: d.title,
              content: d.content,
              mood: d.mood,
              weather: d.weather,
              createdAt: d.createdAt
            })),
            analysis: res.data.analysis,
            modelName: res.data.modelName,
            tokensUsed: res.data.tokensUsed,
            responseTime: res.data.responseTime,
            // 评分数据
            totalScore: res.data.totalScore,
            grade: res.data.grade,
            highlights: res.data.highlights,
            improvements: res.data.improvements,
            nextGoal: res.data.nextGoal,
            // 人物画像
            authorProfile: res.data.authorProfile,
            charactersProfile: res.data.charactersProfile,
            socialStyle: res.data.socialStyle,
            funSummary: res.data.funSummary,
            // 周心理摘要
            psychologySummary: res.data.psychologySummary
          });
        } catch (e) {
          console.error('保存分析记录失败:', e);
        }

        onComplete?.(task.id, tasks.value.find(t => t.id === task.id));
      } else {
        // 后端明确返回失败，标记为业务错误
        const bizError = new Error(res.error || '分析失败');
        bizError._isBusinessError = true;
        throw bizError;
      }
    } catch (error) {
      const currentTask = tasks.value.find(t => t.id === task.id);
      if (currentTask && currentTask.status !== 'cancelled') {
        // 只有后端明确返回失败才是 failed，其他都是 timeout
        const isBusinessError = error._isBusinessError === true;

        if (isBusinessError) {
          updateTask(task.id, {
            status: 'failed',
            error: error.message || '分析失败',
            completedAt: Date.now()
          });
        } else {
          // 网络、超时、连接中断等：后台可能仍在运行
          console.warn('[DiaryAnalysis] 请求异常，后台可能仍在运行:', error.message, error.code);
          updateTask(task.id, {
            status: 'timeout',
            error: '请求中断，后台可能仍在分析中',
            completedAt: Date.now()
          });
        }
        onComplete?.(task.id, tasks.value.find(t => t.id === task.id));
      }
    }
  })();

  // 立即返回 taskId，不等待 API 完成
  return task.id;
}

/**
 * 导出 composable
 */
export function useDiaryAnalysisTasks() {
  // 计算属性
  const pendingTasks = computed(() =>
    tasks.value.filter(t => t.status === 'pending')
  );

  const runningTasks = computed(() =>
    tasks.value.filter(t => t.status === 'running')
  );

  const activeTasks = computed(() =>
    tasks.value.filter(t => t.status === 'pending' || t.status === 'running')
  );

  const completedTasks = computed(() =>
    tasks.value.filter(t => t.status === 'completed')
  );

  const failedTasks = computed(() =>
    tasks.value.filter(t => t.status === 'failed')
  );

  const hasActiveTasks = computed(() => activeTasks.value.length > 0);

  return {
    // 状态
    tasks,
    pendingTasks,
    runningTasks,
    activeTasks,
    completedTasks,
    failedTasks,
    hasActiveTasks,

    // 方法
    analyzeSingleDiary,
    analyzeBatchDiaries,
    cancelTask,
    removeTask,
    clearCompletedTasks,

    // 获取单个任务
    getTask: (taskId) => tasks.value.find(t => t.id === taskId)
  };
}
