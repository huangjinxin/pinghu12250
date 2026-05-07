<template>
  <div
    class="task-card"
    :class="[statusClass, { clickable: isClickable }]"
    @click="handleClick"
  >
    <!-- 积分角标 -->
    <div v-if="points" class="points-badge" :class="points > 0 ? 'positive' : 'negative'">
      {{ points > 0 ? '+' : '' }}{{ points }}
    </div>

    <!-- 图标区域 -->
    <div class="icon-wrapper" :style="{ backgroundColor: iconBgColor }">
      <n-icon :size="24" :color="iconColor">
        <component :is="icon" />
      </n-icon>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <div class="title">{{ title }}</div>
      <div class="status-row">
        <n-icon v-if="statusIcon" :size="14" class="status-icon">
          <component :is="statusIcon" />
        </n-icon>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- 右侧箭头（可点击时显示） -->
    <n-icon v-if="isClickable" :size="16" class="arrow-icon">
      <ChevronForward />
    </n-icon>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import Time from '@vicons/ionicons5/es/Time'
import AlertCircle from '@vicons/ionicons5/es/AlertCircle'
import RadioButtonOff from '@vicons/ionicons5/es/RadioButtonOff'
import ChevronForward from '@vicons/ionicons5/es/ChevronForward'

const props = defineProps({
  // 任务标题
  title: {
    type: String,
    required: true,
  },
  // 任务状态：pending_submit | pending_review | approved | rejected
  status: {
    type: String,
    default: 'pending_submit',
  },
  // 积分（正数或负数）
  points: {
    type: Number,
    default: 0,
  },
  // 图标组件
  icon: {
    type: Object,
    required: true,
  },
  // 图标颜色
  iconColor: {
    type: String,
    default: '#6366f1',
  },
  // 图标背景色
  iconBgColor: {
    type: String,
    default: '#eef2ff',
  },
  // 点击跳转路径
  to: {
    type: String,
    default: '',
  },
  // 退回原因（状态为 rejected 时显示）
  rejectReason: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['click']);
const router = useRouter();

// 状态配置
const statusConfig = {
  pending_submit: {
    text: '待提交',
    class: 'status-pending-submit',
    icon: RadioButtonOff,
    clickable: true,
  },
  pending_review: {
    text: '待审核',
    class: 'status-pending-review',
    icon: Time,
    clickable: false,
  },
  approved: {
    text: '已通过',
    class: 'status-approved',
    icon: CheckmarkCircle,
    clickable: false,
  },
  rejected: {
    text: '已退回',
    class: 'status-rejected',
    icon: AlertCircle,
    clickable: true,
  },
  pending_complete: {
    text: '待完成',
    class: 'status-pending-submit',
    icon: RadioButtonOff,
    clickable: true,
  },
  completed: {
    text: '已完成',
    class: 'status-approved',
    icon: CheckmarkCircle,
    clickable: false,
  },
};

const currentConfig = computed(() => statusConfig[props.status] || statusConfig.pending_submit);
const statusClass = computed(() => currentConfig.value.class);
const statusText = computed(() => {
  if (props.status === 'rejected' && props.rejectReason) {
    return `已退回 - ${props.rejectReason}`;
  }
  return currentConfig.value.text;
});
const statusIcon = computed(() => currentConfig.value.icon);
const isClickable = computed(() => currentConfig.value.clickable && props.to);

function handleClick() {
  if (isClickable.value) {
    emit('click');
    if (props.to) {
      router.push(props.to);
    }
  }
}
</script>

<style scoped>
.task-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.task-card.clickable {
  cursor: pointer;
}

.task-card.clickable:hover {
  border-color: var(--primary-300, #a5b4fc);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

/* 状态样式 */
.task-card.status-pending-submit {
  background: #f9fafb;
}

.task-card.status-pending-review {
  border-color: #fbbf24;
  background: #fffbeb;
}

.task-card.status-approved {
  border-color: #22c55e;
  background: #f0fdf4;
}

.task-card.status-rejected {
  border-color: #ef4444;
  background: #fef2f2;
}

/* 积分角标 */
.points-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.points-badge.positive {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
}

.points-badge.negative {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: white;
}

/* 图标区域 */
.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 内容区域 */
.content {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.status-pending-submit .status-row {
  color: #6b7280;
}

.status-pending-review .status-row {
  color: #d97706;
}

.status-approved .status-row {
  color: #16a34a;
}

.status-rejected .status-row {
  color: #dc2626;
}

.status-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 箭头图标 */
.arrow-icon {
  color: #9ca3af;
  flex-shrink: 0;
}
</style>
