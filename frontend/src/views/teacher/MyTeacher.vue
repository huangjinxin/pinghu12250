<template>
  <div class="my-teacher-page">
    <div class="header">
      <h1 class="title">我的小老师</h1>
      <p class="subtitle">绑定小老师，让TA协助监督和审核你的提交任务</p>
    </div>

    <n-spin :show="loading">
      <n-card class="teacher-card">
        <template v-if="bindingData.myTeacher">
          <div class="bound-teacher-info">
            <n-avatar :size="80" round :src="bindingData.myTeacher.avatar" />
            <div class="info-content">
              <h2>{{ bindingData.myTeacher.profile?.nickname || bindingData.myTeacher.username }}</h2>
              <p class="status-text">
                <n-tag type="success" size="small">已绑定</n-tag>
                <span class="days-info" v-if="!bindingData.canChangeTeacher">
                  还需要 {{ bindingData.remainingDays }} 天才能更换或解绑
                </span>
                <span class="days-info success" v-else>
                  已满 30 天，可以自由更换或解绑
                </span>
              </p>
            </div>
            <div class="actions" v-if="bindingData.canChangeTeacher">
              <n-button type="error" ghost @click="handleUnbind">解绑老师</n-button>
            </div>
          </div>
        </template>
        
        <template v-else>
          <div class="empty-state">
            <n-empty description="你还没有绑定小老师" />
            <n-form :model="form" class="bind-form" inline>
              <n-form-item label="请输入老师的用户ID">
                <n-input v-model:value="form.teacherId" placeholder="例如：123e4567-e89b..." />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" @click="handleBind" :disabled="!form.teacherId">绑定</n-button>
              </n-form-item>
            </n-form>
            <p class="tip-text">注意：一旦绑定，30天内不可解绑或更换。</p>
          </div>
        </template>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { teacherAPI } from '@/api';

const message = useMessage();
const dialog = useDialog();
const loading = ref(false);

const bindingData = ref({
  myTeacher: null,
  canChangeTeacher: false,
  remainingDays: 0
});

const form = ref({
  teacherId: ''
});

async function loadData() {
  loading.value = true;
  try {
    const res = await teacherAPI.getMyBindings();
    if (res.success) {
      bindingData.value = res.data;
    }
  } catch (error) {
    message.error(error.error || '加载数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleBind() {
  dialog.warning({
    title: '确认绑定',
    content: '确定要绑定该用户为小老师吗？绑定后30天内不可解除。',
    positiveText: '确认绑定',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true;
      try {
        const res = await teacherAPI.bindTeacher({ teacherId: form.teacherId });
        if (res.success) {
          message.success('绑定成功');
          form.value.teacherId = '';
          await loadData();
        }
      } catch (error) {
        message.error(error.error || '绑定失败');
      } finally {
        loading.value = false;
      }
    }
  });
}

async function handleUnbind() {
  dialog.warning({
    title: '确认解绑',
    content: '确定要解除绑定当前小老师吗？',
    positiveText: '确认解绑',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true;
      try {
        const res = await teacherAPI.unbindTeacher();
        if (res.success) {
          message.success('解绑成功');
          await loadData();
        }
      } catch (error) {
        message.error(error.error || '解绑失败');
      } finally {
        loading.value = false;
      }
    }
  });
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.my-teacher-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}
.header {
  margin-bottom: 24px;
}
.title {
  margin: 0;
  font-size: 24px;
  color: #333;
}
.subtitle {
  color: #666;
  margin-top: 8px;
}
.bound-teacher-info {
  display: flex;
  align-items: center;
  gap: 20px;
}
.info-content {
  flex: 1;
}
.info-content h2 {
  margin: 0 0 8px;
  font-size: 20px;
}
.status-text {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.days-info {
  font-size: 13px;
  color: #ff9800;
}
.days-info.success {
  color: #18a058;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}
.bind-form {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
.tip-text {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>
