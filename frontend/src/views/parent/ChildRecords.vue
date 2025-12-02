<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center space-x-4">
      <n-button quaternary circle @click="$router.back()">
        <template #icon>
          <n-icon><ArrowBackOutline /></n-icon>
        </template>
      </n-button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-800">
          {{ child?.profile?.nickname || child?.username }}的记录
        </h1>
        <p class="text-gray-500 mt-1">
          {{ child?.class?.name }}
          <span v-if="child?.class?.campus">· {{ child.class.campus.name }}</span>
        </p>
      </div>
    </div>

    <!-- 日期选择 -->
    <div class="card">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">选择日期</h3>
        <n-date-picker
          v-model:value="selectedDate"
          type="date"
          @update:value="loadRecords"
        />
      </div>
    </div>

    <!-- 当日统计 -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div
        v-for="type in recordTypes"
        :key="type.value"
        class="card text-center"
        :class="type.bgClass"
      >
        <div class="text-2xl font-bold" :class="type.textClass">
          {{ getRecordCount(type.value) }}
        </div>
        <div class="text-sm text-gray-600">{{ type.label }}</div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">详细记录</h3>

      <n-timeline v-if="records.length">
        <n-timeline-item
          v-for="record in records"
          :key="record.id"
          :type="getTimelineType(record.recordType)"
          :title="getRecordTypeLabel(record.recordType)"
          :time="formatTime(record.createdAt)"
        >
          <template #icon>
            <n-icon :component="getRecordIcon(record.recordType)" />
          </template>
          <div class="text-gray-700 bg-gray-50 p-3 rounded-lg">
            {{ record.content?.text || JSON.stringify(record.content) }}
          </div>
          <div class="mt-2 text-xs text-gray-400">
            记录老师：{{ record.teacher?.profile?.nickname || record.teacher?.username }}
          </div>
        </n-timeline-item>
      </n-timeline>

      <n-empty v-else description="当日暂无记录">
        <template #extra>
          <p class="text-gray-500 text-sm">选择其他日期查看记录</p>
        </template>
      </n-empty>
    </div>

    <!-- 周统计 -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">本周出勤统计</h3>
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="text-center p-2 rounded-lg"
          :class="day.hasAttendance ? 'bg-green-100' : 'bg-gray-100'"
        >
          <div class="text-xs text-gray-500">{{ day.label }}</div>
          <div class="text-sm font-medium" :class="day.hasAttendance ? 'text-green-600' : 'text-gray-400'">
            {{ day.day }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import { userAPI, recordAPI } from '@/api';
import { format, startOfWeek, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowBackOutline,
  CheckmarkCircleOutline,
  RestaurantOutline,
  BedOutline,
  FootballOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const message = useMessage();

const childId = route.params.childId;
const child = ref(null);
const records = ref([]);
const weekAttendance = ref([]);
const selectedDate = ref(Date.now());

const recordTypes = [
  { value: 'ATTENDANCE', label: '考勤', bgClass: 'bg-green-50', textClass: 'text-green-500' },
  { value: 'MEAL', label: '用餐', bgClass: 'bg-blue-50', textClass: 'text-blue-500' },
  { value: 'NAP', label: '午睡', bgClass: 'bg-purple-50', textClass: 'text-purple-500' },
  { value: 'ACTIVITY', label: '活动', bgClass: 'bg-orange-50', textClass: 'text-orange-500' },
  { value: 'NOTE', label: '备注', bgClass: 'bg-gray-50', textClass: 'text-gray-500' },
];

const weekDays = computed(() => {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      date: dateStr,
      day: format(date, 'd'),
      label: format(date, 'EEE', { locale: zhCN }),
      hasAttendance: weekAttendance.value.includes(dateStr),
    };
  });
});

const loadChild = async () => {
  try {
    const data = await userAPI.getUserById(childId);
    child.value = data;
  } catch (error) {
    message.error('加载孩子信息失败');
  }
};

const loadRecords = async () => {
  try {
    const date = format(new Date(selectedDate.value), 'yyyy-MM-dd');
    const data = await recordAPI.getStudentDayRecords(childId, date);
    records.value = data.records || [];
  } catch (error) {
    message.error('加载记录失败');
  }
};

const loadWeekAttendance = async () => {
  try {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const date = format(addDays(start, i), 'yyyy-MM-dd');
      try {
        const data = await recordAPI.getStudentDayRecords(childId, date);
        if (data.records?.some(r => r.recordType === 'ATTENDANCE')) {
          dates.push(date);
        }
      } catch {
        // ignore
      }
    }
    weekAttendance.value = dates;
  } catch (error) {
    console.error('加载周出勤失败:', error);
  }
};

const getRecordCount = (type) => {
  return records.value.filter(r => r.recordType === type).length;
};

const getRecordTypeLabel = (type) => {
  const found = recordTypes.find(t => t.value === type);
  return found ? found.label : type;
};

const getTimelineType = (type) => {
  const types = {
    ATTENDANCE: 'success',
    MEAL: 'info',
    NAP: 'warning',
    ACTIVITY: 'error',
    NOTE: 'default',
  };
  return types[type] || 'default';
};

const getRecordIcon = (type) => {
  const icons = {
    ATTENDANCE: CheckmarkCircleOutline,
    MEAL: RestaurantOutline,
    NAP: BedOutline,
    ACTIVITY: FootballOutline,
    NOTE: DocumentTextOutline,
  };
  return icons[type] || DocumentTextOutline;
};

const formatTime = (dateStr) => {
  return format(new Date(dateStr), 'HH:mm');
};

onMounted(() => {
  loadChild();
  loadRecords();
  loadWeekAttendance();
});
</script>
