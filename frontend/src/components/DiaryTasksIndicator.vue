<template>
  <n-popover trigger="click" placement="bottom-end" :width="360">
    <template #trigger>
      <n-badge :value="activeTasks.length" :show="activeTasks.length > 0" :offset="[-4, 4]">
        <n-button quaternary circle :loading="hasRunningTasks">
          <template #icon>
            <n-icon :color="hasActiveTasks ? '#18a058' : undefined">
              <FlashOutline v-if="hasActiveTasks" />
              <FlashOffOutline v-else />
            </n-icon>
          </template>
        </n-button>
      </n-badge>
    </template>

    <div class="tasks-panel">
      <div class="tasks-header">
        <span class="tasks-title">AI 分析任务</span>
        <n-button v-if="completedOrFailedTasks.length > 0" size="tiny" quaternary @click="clearCompletedTasks">
          清除已完成
        </n-button>
      </div>

      <div v-if="tasks.length === 0" class="tasks-empty">
        <n-icon size="32" color="#ccc"><DocumentTextOutline /></n-icon>
        <p>暂无分析任务</p>
      </div>

      <div v-else class="tasks-list">
        <div
          v-for="task in sortedTasks"
          :key="task.id"
          class="task-item"
          :class="[`task-${task.status}`]"
          @click="handleTaskClick(task)"
        >
          <div class="task-header">
            <div class="task-info">
              <n-icon v-if="task.type === 'batch'" size="16" color="#2080f0"><LayersOutline /></n-icon>
              <n-icon v-else size="16" color="#18a058"><DocumentOutline /></n-icon>
              <span class="task-title">{{ task.title }}</span>
            </div>
            <div class="task-actions">
              <n-button
                v-if="task.status === 'running' || task.status === 'pending'"
                size="tiny"
                quaternary
                type="error"
                @click.stop="cancelTask(task.id)"
              >
                <template #icon><n-icon><StopCircleOutline /></n-icon></template>
              </n-button>
              <n-button
                v-if="task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'"
                size="tiny"
                quaternary
                @click.stop="removeTask(task.id)"
              >
                <template #icon><n-icon><CloseOutline /></n-icon></template>
              </n-button>
            </div>
          </div>

          <div class="task-status">
            <!-- 进行中 -->
            <template v-if="task.status === 'running'">
              <n-progress
                type="line"
                :percentage="task.progress"
                :height="6"
                :border-radius="3"
                :show-indicator="false"
                status="success"
              />
              <span class="status-text">{{ getLoadingText() }}</span>
            </template>

            <!-- 排队中 -->
            <template v-else-if="task.status === 'pending'">
              <span class="status-text status-pending">排队中...</span>
            </template>

            <!-- 已完成 -->
            <template v-else-if="task.status === 'completed'">
              <span class="status-text status-success">
                <n-icon><CheckmarkCircleOutline /></n-icon>
                已完成 · {{ formatDuration(task.completedAt - task.startedAt) }}
              </span>
            </template>

            <!-- 失败 -->
            <template v-else-if="task.status === 'failed'">
              <span class="status-text status-error">
                <n-icon><AlertCircleOutline /></n-icon>
                {{ task.error || '分析失败' }}
              </span>
            </template>

            <!-- 已取消 -->
            <template v-else-if="task.status === 'cancelled'">
              <span class="status-text status-cancelled">
                <n-icon><BanOutline /></n-icon>
                已取消
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </n-popover>
</template>

<script setup>
import { computed } from 'vue';
import FlashOutline from '@vicons/ionicons5/es/FlashOutline'
import FlashOffOutline from '@vicons/ionicons5/es/FlashOffOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import LayersOutline from '@vicons/ionicons5/es/LayersOutline'
import DocumentOutline from '@vicons/ionicons5/es/DocumentOutline'
import StopCircleOutline from '@vicons/ionicons5/es/StopCircleOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import AlertCircleOutline from '@vicons/ionicons5/es/AlertCircleOutline'
import BanOutline from '@vicons/ionicons5/es/BanOutline'
import { useDiaryAnalysisTasks } from '@/composables/useDiaryAnalysisTasks';
import { useLoadingText } from '@/composables/useLoadingText';

const emit = defineEmits(['view-result']);

const {
  tasks,
  activeTasks,
  hasActiveTasks,
  cancelTask,
  removeTask,
  clearCompletedTasks
} = useDiaryAnalysisTasks();

// 加载文本
const loadingTexts = [
  'GPU 正在预热...',
  'AI 正在起床...',
  '模型正在加载...',
  '正在分析日记...',
  '正在理解童言童语...',
  '正在寻找闪光点...',
  '神经网络运算中...'
];
const { loadingText: getLoadingText } = useLoadingText(loadingTexts, 2000);

// 是否有正在运行的任务
const hasRunningTasks = computed(() =>
  tasks.value.some(t => t.status === 'running')
);

// 已完成或失败的任务
const completedOrFailedTasks = computed(() =>
  tasks.value.filter(t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled')
);

// 排序：运行中 > 排队 > 已完成 > 失败 > 取消
const sortedTasks = computed(() => {
  const statusOrder = { running: 0, pending: 1, completed: 2, failed: 3, cancelled: 4 };
  return [...tasks.value].sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    return b.createdAt - a.createdAt;
  });
});

// 格式化时长
function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// 点击任务
function handleTaskClick(task) {
  if (task.status === 'completed' && task.result) {
    emit('view-result', task.result);
  }
}
</script>

<style scoped>
.tasks-panel {
  padding: 8px 0;
}

.tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.tasks-title {
  font-weight: 600;
  font-size: 14px;
}

.tasks-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #999;
}

.tasks-empty p {
  margin-top: 8px;
  font-size: 13px;
}

.tasks-list {
  max-height: 320px;
  overflow-y: auto;
}

.task-item {
  padding: 12px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.task-item:hover {
  background-color: #fafafa;
}

.task-item:last-child {
  border-bottom: none;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-status {
  font-size: 12px;
}

.status-text {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  color: #666;
}

.status-pending {
  color: #faad14;
}

.status-success {
  color: #52c41a;
}

.status-error {
  color: #ff4d4f;
}

.status-cancelled {
  color: #999;
}

.task-completed {
  opacity: 0.8;
}

.task-failed,
.task-cancelled {
  opacity: 0.7;
}
</style>
