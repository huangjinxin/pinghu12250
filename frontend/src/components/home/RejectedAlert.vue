<template>
  <div v-if="items.length > 0" class="rejected-alerts">
    <div class="section-header">
      <n-icon :size="18" color="#ef4444"><AlertCircle /></n-icon>
      <span>需要处理</span>
      <n-badge :value="items.length" :max="9" />
    </div>

    <div class="alerts-list">
      <div
        v-for="item in displayItems"
        :key="item.id"
        class="alert-item"
        @click="handleClick(item)"
      >
        <div class="alert-content">
          <div class="alert-title">
            <span class="template-name">{{ item.templateName }}</span>
            <span class="label">被退回</span>
          </div>
          <div class="alert-reason">原因：{{ item.reason || '未说明' }}</div>
          <div class="alert-time">{{ formatTime(item.rejectedAt) }}</div>
        </div>
        <n-button size="small" type="primary" ghost>
          重新提交
        </n-button>
      </div>

      <!-- 展开/收起 -->
      <div v-if="items.length > 2" class="expand-toggle" @click="expanded = !expanded">
        <span>{{ expanded ? '收起' : `查看全部 ${items.length} 条` }}</span>
        <n-icon :size="14">
          <ChevronUp v-if="expanded" />
          <ChevronDown v-else />
        </n-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AlertCircle from '@vicons/ionicons5/es/AlertCircle'
import ChevronDown from '@vicons/ionicons5/es/ChevronDown'
import ChevronUp from '@vicons/ionicons5/es/ChevronUp'

const props = defineProps({
  // 退回的提交列表
  items: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['resubmit']);
const router = useRouter();
const expanded = ref(false);

// 显示的项目（默认最多2条）
const displayItems = computed(() => {
  if (expanded.value) {
    return props.items;
  }
  return props.items.slice(0, 2);
});

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

// 点击处理
function handleClick(item) {
  emit('resubmit', item);
  // 跳转到重新提交页面
  if (item.submissionId) {
    router.push(`/submissions/${item.submissionId}/edit`);
  } else {
    router.push('/my-growth');
  }
}
</script>

<style scoped>
.rejected-alerts {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #dc2626;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.alert-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.template-name {
  font-weight: 500;
  color: #1f2937;
}

.label {
  font-size: 12px;
  color: #dc2626;
  background: #fee2e2;
  padding: 1px 6px;
  border-radius: 4px;
}

.alert-reason {
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s;
}

.expand-toggle:hover {
  color: var(--primary-600, #4f46e5);
}
</style>
