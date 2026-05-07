<template>
  <div class="session-manager">
    <n-card title="登录设备管理" :segmented="{ content: true }">
      <template #header-extra>
        <n-button type="error" ghost @click="handleLogoutAll">
          登出所有设备
        </n-button>
      </template>

      <p class="description">
        您可以查看并管理当前所有已登录的设备。如果您发现异常设备，请立即将其踢出并修改密码。
      </p>

      <n-spin :show="loading">
        <n-list v-if="sessions.length > 0" bordered>
          <n-list-item v-for="session in sessions" :key="session.id">
            <template #prefix>
              <div class="device-icon">
                <n-icon size="24">
                  <component :is="getDeviceIcon(session.device)" />
                </n-icon>
              </div>
            </template>

            <n-thing :title="session.device || '未知设备'">
              <template #description>
                <div class="session-meta">
                  <span>IP: {{ session.ip }}</span>
                  <n-divider vertical />
                  <span>登录时间: {{ formatDate(session.createdAt) }}</span>
                  <n-tag v-if="session.isCurrent" type="success" size="small" class="current-tag">
                    当前设备
                  </n-tag>
                </div>
              </template>
            </n-thing>

            <template #suffix>
              <n-button 
                v-if="!session.isCurrent" 
                size="small" 
                type="error" 
                secondary
                @click="handleRevoke(session.id)"
              >
                踢出
              </n-button>
            </template>
          </n-list-item>
        </n-list>
        <n-empty v-else description="暂无活跃会话" />
      </n-spin>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { authAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { 
  DesktopOutline, 
  PhonePortraitOutline, 
  HelpCircleOutline 
} from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();
const loading = ref(false);
const sessions = ref([]);

const loadSessions = async () => {
  loading.value = true;
  try {
    const res = await authAPI.getSessions();
    if (res.success) {
      sessions.value = res.data;
    }
  } catch (error) {
    message.error('加载会话列表失败');
  } finally {
    loading.value = false;
  }
};

const handleRevoke = (id) => {
  dialog.warning({
    title: '确认下线',
    content: '确定要将该设备强制下线吗？该设备上的用户需要重新登录。',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await authAPI.revokeSession(id);
        message.success('已成功将设备踢出');
        loadSessions();
      } catch (error) {
        message.error('操作失败');
      }
    }
  });
};

const handleLogoutAll = () => {
  dialog.error({
    title: '危险操作',
    content: '确定要从所有设备（包括当前设备）登出吗？',
    positiveText: '确认登出全部',
    negativeText: '取消',
    onPositiveClick: async () => {
      await authStore.logoutAll();
    }
  });
};

const getDeviceIcon = (device) => {
  const ua = (device || '').toLowerCase();
  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return DesktopOutline;
  if (ua.includes('iphone') || ua.includes('android')) return PhonePortraitOutline;
  return HelpCircleOutline;
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString();
};

onMounted(loadSessions);
</script>

<style scoped>
.session-manager {
  max-width: 800px;
  margin: 0 auto;
}
.description {
  color: #666;
  margin-bottom: 20px;
}
.device-icon {
  width: 48px;
  height: 48px;
  background: #f0f2f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #18a058;
}
.session-meta {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #999;
}
.current-tag {
  margin-left: 12px;
}
</style>
