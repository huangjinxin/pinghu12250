<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <n-button quaternary circle @click="$router.back()">
          <template #icon>
            <n-icon><ArrowBackOutline /></n-icon>
          </template>
        </n-button>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">{{ classInfo?.name || '班级详情' }}</h1>
          <p class="text-gray-500 mt-1">{{ classInfo?.campus?.name }} · {{ classInfo?.grade }}</p>
        </div>
      </div>
      <n-button type="primary" @click="showBatchRecordModal = true">
        <template #icon>
          <n-icon><CreateOutline /></n-icon>
        </template>
        批量记录
      </n-button>
    </div>

    <!-- 今日统计 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card text-center">
        <div class="text-2xl font-bold text-green-500">{{ todayStats.attendance }}</div>
        <div class="text-sm text-gray-500">今日出勤</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-blue-500">{{ todayStats.meal }}</div>
        <div class="text-sm text-gray-500">用餐记录</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-purple-500">{{ todayStats.nap }}</div>
        <div class="text-sm text-gray-500">午睡记录</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-orange-500">{{ todayStats.activity }}</div>
        <div class="text-sm text-gray-500">活动记录</div>
      </div>
    </div>

    <!-- 学生网格 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">学生列表</h3>
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索学生"
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <n-skeleton v-for="i in 12" :key="i" height="120px" :sharp="false" />
      </div>

      <!-- 空状态 -->
      <n-empty v-else-if="!filteredStudents.length" description="暂无学生" />

      <!-- 学生卡片 -->
      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="student in filteredStudents"
          :key="student.id"
          class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-center"
          @click="goToStudent(student)"
        >
          <n-avatar
            :src="student.avatar"
            :size="48"
            round
            class="mb-2"
          >
            {{ student.profile?.nickname?.[0] || student.username[0] }}
          </n-avatar>
          <div class="font-medium text-gray-800 truncate">
            {{ student.profile?.nickname || student.username }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            <n-tag v-if="getTodayAttendance(student.id)" size="tiny" type="success">已到</n-tag>
            <n-tag v-else size="tiny" type="warning">未到</n-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量记录弹窗 -->
    <n-modal v-model:show="showBatchRecordModal" preset="dialog" title="批量记录" style="width: 600px">
      <n-form :model="batchForm" label-placement="top">
        <n-form-item label="记录类型">
          <n-select
            v-model:value="batchForm.recordType"
            :options="recordTypeOptions"
          />
        </n-form-item>
        <n-form-item label="选择学生">
          <n-checkbox-group v-model:value="batchForm.studentIds">
            <n-space>
              <n-checkbox
                v-for="student in students"
                :key="student.id"
                :value="student.id"
                :label="student.profile?.nickname || student.username"
              />
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="内容">
          <n-input
            v-model:value="batchForm.content"
            type="textarea"
            placeholder="请输入记录内容"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showBatchRecordModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="submitBatchRecord">
          提交
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { classAPI, recordAPI } from '@/api';
import {
  ArrowBackOutline,
  CreateOutline,
  SearchOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const classId = route.params.classId;
const loading = ref(false);
const submitting = ref(false);
const classInfo = ref(null);
const students = ref([]);
const todayRecords = ref([]);
const searchQuery = ref('');
const showBatchRecordModal = ref(false);

const todayStats = ref({
  attendance: 0,
  meal: 0,
  nap: 0,
  activity: 0,
});

const batchForm = ref({
  recordType: 'ATTENDANCE',
  studentIds: [],
  content: '',
});

const recordTypeOptions = [
  { label: '考勤', value: 'ATTENDANCE' },
  { label: '用餐', value: 'MEAL' },
  { label: '午睡', value: 'NAP' },
  { label: '活动', value: 'ACTIVITY' },
  { label: '备注', value: 'NOTE' },
];

const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value;
  const query = searchQuery.value.toLowerCase();
  return students.value.filter(s =>
    s.username.toLowerCase().includes(query) ||
    s.profile?.nickname?.toLowerCase().includes(query)
  );
});

const loadClassInfo = async () => {
  loading.value = true;
  try {
    const data = await classAPI.getClass(classId);
    classInfo.value = data;
    students.value = data.students || [];
  } catch (error) {
    message.error('加载班级信息失败');
  } finally {
    loading.value = false;
  }
};

const loadTodayRecords = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await recordAPI.getRecords({
      classId,
      date: today,
    });
    todayRecords.value = data.records || [];

    // 计算今日统计
    const stats = { attendance: 0, meal: 0, nap: 0, activity: 0 };
    todayRecords.value.forEach(record => {
      const type = record.recordType.toLowerCase();
      if (stats[type] !== undefined) {
        stats[type]++;
      }
    });
    todayStats.value = stats;
  } catch (error) {
    console.error('加载今日记录失败:', error);
  }
};

const getTodayAttendance = (studentId) => {
  return todayRecords.value.some(
    r => r.studentId === studentId && r.recordType === 'ATTENDANCE'
  );
};

const goToStudent = (student) => {
  router.push(`/teacher/student/${student.id}`);
};

const submitBatchRecord = async () => {
  if (!batchForm.value.studentIds.length) {
    message.warning('请选择学生');
    return;
  }
  if (!batchForm.value.content) {
    message.warning('请输入内容');
    return;
  }

  submitting.value = true;
  try {
    const today = new Date().toISOString().split('T')[0];
    const promises = batchForm.value.studentIds.map(studentId =>
      recordAPI.createRecord({
        studentId,
        classId,
        recordType: batchForm.value.recordType,
        recordDate: today,
        content: { text: batchForm.value.content },
      })
    );
    await Promise.all(promises);
    message.success('批量记录成功');
    showBatchRecordModal.value = false;
    batchForm.value = { recordType: 'ATTENDANCE', studentIds: [], content: '' };
    loadTodayRecords();
  } catch (error) {
    message.error(error.error || '记录失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadClassInfo();
  loadTodayRecords();
});
</script>
