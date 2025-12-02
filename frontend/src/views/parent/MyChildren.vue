<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">我的孩子</h1>
      <p class="text-gray-500 mt-1">查看孩子的日常记录和成长情况</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <n-skeleton v-for="i in 2" :key="i" height="200px" :sharp="false" />
    </div>

    <!-- 空状态 -->
    <n-empty v-else-if="!children.length" description="暂无关联的孩子">
      <template #extra>
        <p class="text-gray-500 text-sm mb-4">请让孩子在个人设置中关联您的账号</p>
      </template>
    </n-empty>

    <!-- 孩子卡片列表 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="child in children"
        :key="child.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center space-x-4 mb-4">
          <n-avatar
            :src="child.avatar"
            :size="64"
            round
          >
            {{ child.profile?.nickname?.[0] || child.username[0] }}
          </n-avatar>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-800">
              {{ child.profile?.nickname || child.username }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ child.class?.name || '未分配班级' }}
              <span v-if="child.class?.campus">· {{ child.class.campus.name }}</span>
            </p>
          </div>
        </div>

        <!-- 今日概况 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 class="text-sm font-medium text-gray-600 mb-3">今日概况</h4>
          <div class="grid grid-cols-4 gap-2 text-center">
            <div>
              <div class="text-lg font-bold" :class="child.todayStats?.attendance ? 'text-green-500' : 'text-gray-300'">
                <n-icon><CheckmarkCircleOutline /></n-icon>
              </div>
              <div class="text-xs text-gray-500">出勤</div>
            </div>
            <div>
              <div class="text-lg font-bold" :class="child.todayStats?.meal ? 'text-blue-500' : 'text-gray-300'">
                <n-icon><RestaurantOutline /></n-icon>
              </div>
              <div class="text-xs text-gray-500">用餐</div>
            </div>
            <div>
              <div class="text-lg font-bold" :class="child.todayStats?.nap ? 'text-purple-500' : 'text-gray-300'">
                <n-icon><BedOutline /></n-icon>
              </div>
              <div class="text-xs text-gray-500">午睡</div>
            </div>
            <div>
              <div class="text-lg font-bold" :class="child.todayStats?.activity ? 'text-orange-500' : 'text-gray-300'">
                <n-icon><FootballOutline /></n-icon>
              </div>
              <div class="text-xs text-gray-500">活动</div>
            </div>
          </div>
        </div>

        <n-button type="primary" block @click="goToRecords(child)">
          查看详细记录
          <template #icon>
            <n-icon><ArrowForwardOutline /></n-icon>
          </template>
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { userAPI, recordAPI } from '@/api';
import {
  CheckmarkCircleOutline,
  RestaurantOutline,
  BedOutline,
  FootballOutline,
  ArrowForwardOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const children = ref([]);

const loadChildren = async () => {
  loading.value = true;
  try {
    const data = await userAPI.getChildren();
    children.value = data.children || [];

    // 加载每个孩子的今日记录
    const today = new Date().toISOString().split('T')[0];
    for (const child of children.value) {
      try {
        const recordData = await recordAPI.getStudentDayRecords(child.id, today);
        const records = recordData.records || [];
        child.todayStats = {
          attendance: records.some(r => r.recordType === 'ATTENDANCE'),
          meal: records.some(r => r.recordType === 'MEAL'),
          nap: records.some(r => r.recordType === 'NAP'),
          activity: records.some(r => r.recordType === 'ACTIVITY'),
        };
      } catch {
        child.todayStats = {};
      }
    }
  } catch (error) {
    message.error('加载孩子列表失败');
  } finally {
    loading.value = false;
  }
};

const goToRecords = (child) => {
  router.push(`/parent/child/${child.id}/records`);
};

onMounted(() => {
  loadChildren();
});
</script>
