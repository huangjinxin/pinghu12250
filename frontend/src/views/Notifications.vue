<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">通知中心</h1>
        <p class="text-gray-500 mt-1">查看和管理你的所有通知</p>
      </div>
      <n-button
        v-if="unreadCount > 0"
        type="primary"
        @click="handleMarkAllRead"
      >
        全部标记为已读
      </n-button>
    </div>

    <!-- 筛选选项卡 -->
    <n-tabs v-model:value="activeFilter" type="segment" animated>
      <n-tab-pane name="all" tab="全部">
        <div class="space-y-3 mt-6">
          <div
            v-for="notification in filteredNotifications"
            :key="notification.id"
            class="card hover:shadow-md transition-shadow cursor-pointer"
            :class="{ 'bg-blue-50': !notification.read }"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start space-x-4">
              <!-- 未读标记 -->
              <div class="flex-shrink-0 pt-1">
                <div
                  v-if="!notification.read"
                  class="w-2 h-2 rounded-full bg-primary-500"
                ></div>
                <div v-else class="w-2 h-2"></div>
              </div>

              <!-- 图标 -->
              <div class="flex-shrink-0">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center"
                  :class="getNotificationIconClass(notification.type)"
                >
                  <n-icon :size="24">
                    <component :is="getNotificationIcon(notification.type)" />
                  </n-icon>
                </div>
              </div>

              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <h3
                  class="text-base font-medium"
                  :class="notification.read ? 'text-gray-600' : 'text-gray-800'"
                >
                  {{ notification.title }}
                </h3>
                <p
                  class="text-sm mt-1"
                  :class="notification.read ? 'text-gray-500' : 'text-gray-700'"
                >
                  {{ notification.content }}
                </p>
                <p class="text-xs text-gray-400 mt-2">
                  {{ formatDate(notification.createdAt) }}
                </p>
              </div>

              <!-- 操作按钮 -->
              <div class="flex-shrink-0">
                <n-dropdown
                  :options="notificationActions"
                  @select="(key) => handleAction(key, notification)"
                >
                  <n-button text circle>
                    <template #icon>
                      <n-icon><EllipsisVerticalOutline /></n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>
          </div>

          <n-empty
            v-if="filteredNotifications.length === 0"
            description="暂无通知"
            class="py-16"
          />
        </div>
      </n-tab-pane>

      <n-tab-pane name="unread" :tab="`未读 (${unreadCount})`">
        <div class="space-y-3 mt-6">
          <div
            v-for="notification in unreadNotifications"
            :key="notification.id"
            class="card bg-blue-50 hover:shadow-md transition-shadow cursor-pointer"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0 pt-1">
                <div class="w-2 h-2 rounded-full bg-primary-500"></div>
              </div>

              <div class="flex-shrink-0">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center"
                  :class="getNotificationIconClass(notification.type)"
                >
                  <n-icon :size="24">
                    <component :is="getNotificationIcon(notification.type)" />
                  </n-icon>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="text-base font-medium text-gray-800">
                  {{ notification.title }}
                </h3>
                <p class="text-sm text-gray-700 mt-1">
                  {{ notification.content }}
                </p>
                <p class="text-xs text-gray-400 mt-2">
                  {{ formatDate(notification.createdAt) }}
                </p>
              </div>

              <div class="flex-shrink-0">
                <n-dropdown
                  :options="notificationActions"
                  @select="(key) => handleAction(key, notification)"
                >
                  <n-button text circle>
                    <template #icon>
                      <n-icon><EllipsisVerticalOutline /></n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>
          </div>

          <n-empty
            v-if="unreadNotifications.length === 0"
            description="暂无未读通知"
            class="py-16"
          />
        </div>
      </n-tab-pane>

      <n-tab-pane name="read" tab="已读">
        <div class="space-y-3 mt-6">
          <div
            v-for="notification in readNotifications"
            :key="notification.id"
            class="card hover:shadow-md transition-shadow cursor-pointer"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0 pt-1">
                <div class="w-2 h-2"></div>
              </div>

              <div class="flex-shrink-0">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center"
                  :class="getNotificationIconClass(notification.type)"
                >
                  <n-icon :size="24">
                    <component :is="getNotificationIcon(notification.type)" />
                  </n-icon>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="text-base font-medium text-gray-600">
                  {{ notification.title }}
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  {{ notification.content }}
                </p>
                <p class="text-xs text-gray-400 mt-2">
                  {{ formatDate(notification.createdAt) }}
                </p>
              </div>

              <div class="flex-shrink-0">
                <n-dropdown
                  :options="notificationActions"
                  @select="(key) => handleAction(key, notification)"
                >
                  <n-button text circle>
                    <template #icon>
                      <n-icon><EllipsisVerticalOutline /></n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>
          </div>

          <n-empty
            v-if="readNotifications.length === 0"
            description="暂无已读通知"
            class="py-16"
          />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  NotificationsOutline,
  CheckmarkCircleOutline,
  InformationCircleOutline,
  WarningOutline,
  ChatbubbleOutline,
  TrophyOutline,
  DocumentTextOutline,
  EllipsisVerticalOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const activeFilter = ref('all');

// 模拟通知数据
const notifications = ref([
  {
    id: '1',
    type: 'system',
    title: '系统消息',
    content: '欢迎使用平湖少儿空间',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60),
  },
  {
    id: '2',
    type: 'task',
    title: '任务提醒',
    content: '你有新的任务待完成',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '3',
    type: 'homework',
    title: '作业通知',
    content: '老师发布了新作业',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: '4',
    type: 'point',
    title: '积分奖励',
    content: '你获得了 10 积分奖励',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '5',
    type: 'comment',
    title: '新评论',
    content: '有人评论了你的作品',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
]);

// 下拉菜单选项
const notificationActions = [
  {
    label: '标记为已读',
    key: 'read',
  },
  {
    label: '删除',
    key: 'delete',
  },
];

// 计算属性
const unreadCount = computed(() => {
  return notifications.value.filter((n) => !n.read).length;
});

const filteredNotifications = computed(() => {
  if (activeFilter.value === 'unread') {
    return notifications.value.filter((n) => !n.read);
  } else if (activeFilter.value === 'read') {
    return notifications.value.filter((n) => n.read);
  }
  return notifications.value;
});

const unreadNotifications = computed(() => {
  return notifications.value.filter((n) => !n.read);
});

const readNotifications = computed(() => {
  return notifications.value.filter((n) => n.read);
});

// 获取通知图标
const getNotificationIcon = (type) => {
  const icons = {
    system: InformationCircleOutline,
    task: CheckmarkCircleOutline,
    homework: DocumentTextOutline,
    point: TrophyOutline,
    comment: ChatbubbleOutline,
    warning: WarningOutline,
  };
  return icons[type] || NotificationsOutline;
};

// 获取通知图标样式
const getNotificationIconClass = (type) => {
  const classes = {
    system: 'bg-blue-100 text-blue-600',
    task: 'bg-green-100 text-green-600',
    homework: 'bg-purple-100 text-purple-600',
    point: 'bg-yellow-100 text-yellow-600',
    comment: 'bg-pink-100 text-pink-600',
    warning: 'bg-red-100 text-red-600',
  };
  return classes[type] || 'bg-gray-100 text-gray-600';
};

// 格式化时间
const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

// 点击通知
const handleNotificationClick = (notification) => {
  if (!notification.read) {
    notification.read = true;
  }
  message.info('通知详情功能开发中');
};

// 全部标记为已读
const handleMarkAllRead = () => {
  notifications.value.forEach((n) => {
    n.read = true;
  });
  message.success('已全部标记为已读');
};

// 处理操作
const handleAction = (key, notification) => {
  if (key === 'read') {
    notification.read = true;
    message.success('已标记为已读');
  } else if (key === 'delete') {
    const index = notifications.value.findIndex((n) => n.id === notification.id);
    if (index > -1) {
      notifications.value.splice(index, 1);
      message.success('已删除通知');
    }
  }
};
</script>
