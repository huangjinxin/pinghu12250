<template>
  <div class="my-students-page">
    <div class="header">
      <h1 class="title">我的学生</h1>
      <p class="subtitle">绑定你为小老师的同学列表</p>
    </div>

    <n-spin :show="loading">
      <n-card>
        <n-list hoverable clickable v-if="students.length > 0">
          <n-list-item v-for="student in students" :key="student.id">
            <template #prefix>
              <n-avatar round :src="student.avatar" />
            </template>
            <n-thing :title="student.profile?.nickname || student.username">
              <template #description>
                ID: {{ student.id }}
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
        
        <div v-else class="empty-state">
          <n-empty description="暂时没有同学绑定你为小老师" />
        </div>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { teacherAPI } from '@/api';

const message = useMessage();
const loading = ref(false);
const students = ref([]);

async function loadData() {
  loading.value = true;
  try {
    const res = await teacherAPI.getMyBindings();
    if (res.success) {
      students.value = res.data.myStudents || [];
    }
  } catch (error) {
    message.error(error.error || '加载数据失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.my-students-page {
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
.empty-state {
  padding: 40px;
}
</style>
