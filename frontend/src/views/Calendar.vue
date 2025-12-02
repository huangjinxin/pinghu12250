<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">日历</h1>
        <p class="text-gray-500 mt-1">管理日程和事件</p>
      </div>
      <n-button type="primary" @click="openCreateModal()">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        添加事件
      </n-button>
    </div>

    <!-- 日历控制 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <n-button quaternary @click="prevMonth">
          <n-icon><ChevronBackOutline /></n-icon>
        </n-button>
        <h2 class="text-lg font-semibold">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
        <n-button quaternary @click="nextMonth">
          <n-icon><ChevronForwardOutline /></n-icon>
        </n-button>
      </div>

      <!-- 星期标题 -->
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div v-for="day in weekDays" :key="day" class="text-center text-sm font-medium text-gray-500 py-2">
          {{ day }}
        </div>
      </div>

      <!-- 日历网格 -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="min-h-[80px] p-1 border border-gray-100 rounded cursor-pointer hover:bg-gray-50"
          :class="{ 'bg-gray-50': !day.isCurrentMonth, 'bg-primary-50': day.isToday }"
          @click="day.date && openCreateModal(day.date)"
        >
          <div class="text-sm" :class="day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'">
            {{ day.day }}
          </div>
          <div class="space-y-1 mt-1">
            <div
              v-for="event in day.events?.slice(0, 2)"
              :key="event.id"
              class="text-xs px-1 py-0.5 rounded truncate"
              :style="{ backgroundColor: event.color || '#e0e7ff', color: '#4338ca' }"
              @click.stop="viewEvent(event)"
            >
              {{ event.title }}
            </div>
            <div v-if="day.events?.length > 2" class="text-xs text-gray-500">
              +{{ day.events.length - 2 }} 更多
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 今日事件 -->
    <div class="card">
      <h3 class="font-medium mb-3">今日事件</h3>
      <n-empty v-if="!todayEvents.length" description="今天没有事件" size="small" />
      <div v-else class="space-y-2">
        <div
          v-for="event in todayEvents"
          :key="event.id"
          class="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: event.color || '#6366f1' }"></div>
            <span>{{ event.title }}</span>
          </div>
          <n-button size="tiny" quaternary type="error" @click="deleteEvent(event)">删除</n-button>
        </div>
      </div>
    </div>

    <!-- 创建事件弹窗 -->
    <n-modal v-model:show="showModal" preset="card" title="添加事件" style="width: 400px">
      <n-form :model="eventForm" label-placement="top">
        <n-form-item label="标题" required>
          <n-input v-model:value="eventForm.title" placeholder="事件标题" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="eventForm.description" type="textarea" placeholder="事件描述" :rows="2" />
        </n-form-item>
        <n-form-item label="日期">
          <n-date-picker v-model:value="eventForm.startDate" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item label="颜色">
          <n-color-picker v-model:value="eventForm.color" :swatches="colorSwatches" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="createEvent">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { calendarAPI } from '@/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns';
import { AddOutline, ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const events = ref([]);
const currentDate = ref(new Date());

const eventForm = ref({
  title: '',
  description: '',
  startDate: Date.now(),
  color: '#6366f1',
});

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const colorSwatches = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentDate.value);
  const monthEnd = endOfMonth(currentDate.value);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = [];
  let day = calendarStart;

  while (day <= calendarEnd) {
    const dayEvents = events.value.filter(e =>
      isSameDay(new Date(e.startDate), day)
    );
    days.push({
      date: new Date(day),
      day: day.getDate(),
      isCurrentMonth: isSameMonth(day, currentDate.value),
      isToday: isToday(day),
      events: dayEvents,
    });
    day = addDays(day, 1);
  }

  return days;
});

const todayEvents = computed(() => {
  return events.value.filter(e => isToday(new Date(e.startDate)));
});

const prevMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
  loadEvents();
};

const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
  loadEvents();
};

const loadEvents = async () => {
  loading.value = true;
  try {
    const start = format(startOfMonth(currentDate.value), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentDate.value), 'yyyy-MM-dd');
    const data = await calendarAPI.getEvents({ start, end });
    events.value = data.events || data;
  } catch (error) {
    message.error('加载事件失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = (date) => {
  eventForm.value = {
    title: '',
    description: '',
    startDate: date ? date.getTime() : Date.now(),
    color: '#6366f1',
  };
  showModal.value = true;
};

const createEvent = async () => {
  if (!eventForm.value.title.trim()) {
    message.warning('请输入事件标题');
    return;
  }
  submitting.value = true;
  try {
    await calendarAPI.createEvent({
      ...eventForm.value,
      startDate: format(new Date(eventForm.value.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(eventForm.value.startDate), 'yyyy-MM-dd'),
    });
    message.success('创建成功');
    showModal.value = false;
    loadEvents();
  } catch (error) {
    message.error(error.error || '创建失败');
  } finally {
    submitting.value = false;
  }
};

const viewEvent = (event) => {
  message.info(event.description || event.title);
};

const deleteEvent = (event) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除"${event.title}"吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await calendarAPI.deleteEvent(event.id);
        message.success('删除成功');
        loadEvents();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

onMounted(() => {
  loadEvents();
});
</script>
