<template>
  <div class="activity-feed">
    <div class="feed-header">
      <n-icon :size="18" color="#6366f1"><Notifications /></n-icon>
      <span>最近动态</span>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      <span>暂无动态</span>
    </div>

    <div v-else class="feed-list">
      <div
        v-for="item in displayItems"
        :key="item.id"
        class="feed-item"
        :class="item.type"
      >
        <div class="feed-icon">
          <n-icon :size="14" :color="getIconColor(item.type)">
            <component :is="getIcon(item.type)" />
          </n-icon>
        </div>
        <div class="feed-content">
          <span class="feed-text">{{ item.text }}</span>
          <span v-if="item.points" class="feed-points" :class="item.points > 0 ? 'positive' : 'negative'">
            {{ item.points > 0 ? '+' : '' }}{{ item.points }}分
          </span>
        </div>
        <div class="feed-time">{{ formatTime(item.time) }}</div>
      </div>

      <!-- 查看更多 -->
      <router-link v-if="items.length > 5" to="/timeline" class="view-more">
        查看全部动态 →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Notifications from '@vicons/ionicons5/es/Notifications'
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import CloseCircle from '@vicons/ionicons5/es/CloseCircle'
import Time from '@vicons/ionicons5/es/Time'
import Trophy from '@vicons/ionicons5/es/Trophy'
import Star from '@vicons/ionicons5/es/Star'
import Ribbon from '@vicons/ionicons5/es/Ribbon'

const props = defineProps({
  // 动态列表
  items: {
    type: Array,
    default: () => [],
  },
  // 最多显示条数
  maxItems: {
    type: Number,
    default: 5,
  },
});

// 显示的项目
const displayItems = computed(() => props.items.slice(0, props.maxItems));

// 获取图标
function getIcon(type) {
  const icons = {
    approved: CheckmarkCircle,
    rejected: CloseCircle,
    pending: Time,
    points: Star,
    achievement: Ribbon,
    streak: Trophy,
  };
  return icons[type] || Notifications;
}

// 获取图标颜色
function getIconColor(type) {
  const colors = {
    approved: '#22c55e',
    rejected: '#ef4444',
    pending: '#f59e0b',
    points: '#eab308',
    achievement: '#8b5cf6',
    streak: '#f97316',
  };
  return colors[type] || '#6b7280';
}

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }

  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}
</script>

<style scoped>
.activity-feed {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #1f2937;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 14px;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feed-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  transition: background 0.2s;
}

.feed-item:hover {
  background: #f3f4f6;
}

.feed-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feed-item.approved .feed-icon {
  background: #dcfce7;
}

.feed-item.rejected .feed-icon {
  background: #fee2e2;
}

.feed-item.pending .feed-icon {
  background: #fef3c7;
}

.feed-item.points .feed-icon {
  background: #fef9c3;
}

.feed-item.achievement .feed-icon {
  background: #ede9fe;
}

.feed-item.streak .feed-icon {
  background: #ffedd5;
}

.feed-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.feed-text {
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-points {
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.feed-points.positive {
  color: #16a34a;
}

.feed-points.negative {
  color: #dc2626;
}

.feed-time {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.view-more {
  display: block;
  text-align: center;
  padding: 10px;
  font-size: 13px;
  color: var(--primary-600, #4f46e5);
  text-decoration: none;
  transition: color 0.2s;
}

.view-more:hover {
  color: var(--primary-700, #4338ca);
}
</style>
