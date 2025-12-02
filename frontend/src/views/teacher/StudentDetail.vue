<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center space-x-4">
      <n-button quaternary circle @click="$router.back()">
        <template #icon>
          <n-icon><ArrowBackOutline /></n-icon>
        </template>
      </n-button>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学生详情</h1>
        <p class="text-gray-500 mt-1">查看和管理学生的日常记录</p>
      </div>
    </div>

    <!-- 学生信息卡片 -->
    <div class="card">
      <div class="flex items-center space-x-4">
        <n-avatar
          :src="student?.avatar"
          :size="64"
          round
        >
          {{ student?.profile?.nickname?.[0] || student?.username?.[0] }}
        </n-avatar>
        <div class="flex-1">
          <h2 class="text-xl font-semibold text-gray-800">
            {{ student?.profile?.nickname || student?.username }}
          </h2>
          <p class="text-gray-500">{{ student?.class?.name }} · {{ student?.class?.campus?.name }}</p>
        </div>
        <n-button type="primary" @click="showRecordModal = true">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          添加记录
        </n-button>
      </div>
    </div>

    <!-- 日期选择和统计 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">日常记录</h3>
        <n-date-picker
          v-model:value="selectedDate"
          type="date"
          clearable
          @update:value="loadRecords"
        />
      </div>

      <!-- 当日统计 -->
      <div class="grid grid-cols-5 gap-2 mb-4">
        <div
          v-for="type in recordTypes"
          :key="type.value"
          class="text-center p-2 rounded-lg"
          :class="type.bgClass"
        >
          <div class="text-lg font-bold" :class="type.textClass">
            {{ getRecordCount(type.value) }}
          </div>
          <div class="text-xs text-gray-500">{{ type.label }}</div>
        </div>
      </div>
    </div>

    <!-- 记录时间线 -->
    <div class="card">
      <n-timeline v-if="records.length">
        <n-timeline-item
          v-for="record in records"
          :key="record.id"
          :type="getRecordTypeColor(record.recordType)"
          :title="getRecordTypeLabel(record.recordType)"
          :time="formatTime(record.createdAt)"
        >
          <template #icon>
            <n-icon :component="getRecordTypeIcon(record.recordType)" />
          </template>
          <div class="text-gray-600">
            {{ record.content?.text || JSON.stringify(record.content) }}
          </div>
          <div class="mt-2 text-xs text-gray-400">
            记录人：{{ record.teacher?.profile?.nickname || record.teacher?.username }}
          </div>
          <div class="mt-2">
            <n-button size="tiny" quaternary type="error" @click="deleteRecord(record.id)">
              删除
            </n-button>
          </div>
        </n-timeline-item>
      </n-timeline>
      <n-empty v-else description="暂无记录" />
    </div>

    <!-- 添加记录弹窗 -->
    <n-modal v-model:show="showRecordModal" preset="dialog" title="添加记录">
      <n-form :model="recordForm" label-placement="top">
        <n-form-item label="记录类型">
          <n-select
            v-model:value="recordForm.recordType"
            :options="recordTypeOptions"
          />
        </n-form-item>
        <n-form-item label="日期">
          <n-date-picker
            v-model:value="recordForm.recordDate"
            type="date"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="内容">
          <n-input
            v-model:value="recordForm.content"
            type="textarea"
            placeholder="请输入记录内容"
            :rows="4"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showRecordModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="submitRecord">
          提交
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { userAPI, recordAPI } from '@/api';
import { format } from 'date-fns';
import {
  ArrowBackOutline,
  AddOutline,
  CheckmarkCircleOutline,
  RestaurantOutline,
  BedOutline,
  FootballOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const message = useMessage();
const dialog = useDialog();

const studentId = route.params.studentId;
const student = ref(null);
const records = ref([]);
const selectedDate = ref(Date.now());
const showRecordModal = ref(false);
const submitting = ref(false);

const recordForm = ref({
  recordType: 'ATTENDANCE',
  recordDate: Date.now(),
  content: '',
});

const recordTypes = [
  { value: 'ATTENDANCE', label: '考勤', bgClass: 'bg-green-50', textClass: 'text-green-500' },
  { value: 'MEAL', label: '用餐', bgClass: 'bg-blue-50', textClass: 'text-blue-500' },
  { value: 'NAP', label: '午睡', bgClass: 'bg-purple-50', textClass: 'text-purple-500' },
  { value: 'ACTIVITY', label: '活动', bgClass: 'bg-orange-50', textClass: 'text-orange-500' },
  { value: 'NOTE', label: '备注', bgClass: 'bg-gray-50', textClass: 'text-gray-500' },
];

const recordTypeOptions = recordTypes.map(t => ({ label: t.label, value: t.value }));

const loadStudent = async () => {
  try {
    const data = await userAPI.getUserById(studentId);
    student.value = data;
  } catch (error) {
    message.error('加载学生信息失败');
  }
};

const loadRecords = async () => {
  try {
    const date = selectedDate.value
      ? format(new Date(selectedDate.value), 'yyyy-MM-dd')
      : undefined;
    const data = await recordAPI.getStudentRecords(studentId, { date });
    records.value = data.records || [];
  } catch (error) {
    message.error('加载记录失败');
  }
};

const getRecordCount = (type) => {
  return records.value.filter(r => r.recordType === type).length;
};

const getRecordTypeLabel = (type) => {
  const found = recordTypes.find(t => t.value === type);
  return found ? found.label : type;
};

const getRecordTypeColor = (type) => {
  const colors = {
    ATTENDANCE: 'success',
    MEAL: 'info',
    NAP: 'warning',
    ACTIVITY: 'error',
    NOTE: 'default',
  };
  return colors[type] || 'default';
};

const getRecordTypeIcon = (type) => {
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

const submitRecord = async () => {
  if (!recordForm.value.content) {
    message.warning('请输入内容');
    return;
  }

  submitting.value = true;
  try {
    const date = format(new Date(recordForm.value.recordDate), 'yyyy-MM-dd');
    await recordAPI.createRecord({
      studentId,
      classId: student.value?.classId,
      recordType: recordForm.value.recordType,
      recordDate: date,
      content: { text: recordForm.value.content },
    });
    message.success('记录成功');
    showRecordModal.value = false;
    recordForm.value = {
      recordType: 'ATTENDANCE',
      recordDate: Date.now(),
      content: '',
    };
    loadRecords();
  } catch (error) {
    message.error(error.error || '记录失败');
  } finally {
    submitting.value = false;
  }
};

const deleteRecord = (recordId) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await recordAPI.deleteRecord(recordId);
        message.success('删除成功');
        loadRecords();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

onMounted(() => {
  loadStudent();
  loadRecords();
});
</script>
