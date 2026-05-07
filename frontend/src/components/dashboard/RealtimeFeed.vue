<template>
  <div class="realtime-feed" :class="{ 'theme-light': theme === 'light' }">
    <TransitionGroup name="feed" tag="ul" class="feed-list">
      <li v-for="event in events" :key="event.id" class="feed-item" :class="getEventClass(event)">
        <div class="feed-avatar">
          <n-avatar :src="event.avatar" :size="28" round>
            {{ event.username?.charAt(0) }}
          </n-avatar>
        </div>
        <div class="feed-content">
          <span class="feed-username">{{ event.username }}</span>
          <span class="feed-action" :class="getActionClass(event)">{{ event.action }}</span>
        </div>
        <span class="feed-time">{{ formatTime(event.timestamp) }}</span>
      </li>
    </TransitionGroup>
    <div v-if="events.length === 0" class="feed-empty">暂无动态</div>
  </div>
</template>

<script setup>
import { NAvatar } from 'naive-ui';

defineProps({
  events: { type: Array, default: () => [] },
  theme: { type: String, default: 'dark' },
});

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

function getEventClass(event) {
  if (event.type === 'submission') {
    return event.status === 'APPROVED' ? 'approved' : 'rejected';
  }
  return '';
}

function getActionClass(event) {
  if (event.type === 'submission') {
    return event.status === 'APPROVED' ? 'action-approved' : 'action-rejected';
  }
  return '';
}
</script>

<style scoped>
.realtime-feed {
  height: 100%;
  overflow: hidden;
}

.feed-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 100%;
  overflow-y: auto;
}

.feed-list::-webkit-scrollbar {
  width: 4px;
}

.feed-list::-webkit-scrollbar-thumb {
  background: rgba(64, 158, 255, 0.3);
  border-radius: 2px;
}

.feed-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.feed-item:hover {
  background: rgba(64, 158, 255, 0.1);
}

.feed-avatar {
  flex-shrink: 0;
}

.feed-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.feed-username {
  color: #36cfc9;
  font-weight: 500;
  font-size: 13px;
}

.feed-action {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.feed-action.action-approved {
  color: #52c41a;
}

.feed-action.action-rejected {
  color: #ff4d4f;
}

.feed-item.approved {
  border-left: 3px solid #52c41a;
}

.feed-item.rejected {
  border-left: 3px solid #ff4d4f;
}

.feed-time {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  flex-shrink: 0;
}

.feed-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 40px 0;
}

/* 动画 */
.feed-enter-active {
  transition: all 0.4s ease;
}

.feed-leave-active {
  transition: all 0.3s ease;
}

.feed-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.feed-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.feed-move {
  transition: transform 0.3s ease;
}

/* 亮色主题 */
.realtime-feed.theme-light .feed-item {
  background: rgba(0, 0, 0, 0.02);
}

.realtime-feed.theme-light .feed-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.realtime-feed.theme-light .feed-username {
  color: #1890ff;
}

.realtime-feed.theme-light .feed-action {
  color: rgba(0, 0, 0, 0.65);
}

.realtime-feed.theme-light .feed-time {
  color: rgba(0, 0, 0, 0.4);
}

.realtime-feed.theme-light .feed-empty {
  color: rgba(0, 0, 0, 0.4);
}
</style>
