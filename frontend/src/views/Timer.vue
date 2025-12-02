<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <div class="w-full max-w-2xl">
      <!-- 返回按钮 -->
      <div class="mb-4">
        <n-button text @click="handleBack">
          <template #icon>
            <n-icon><ArrowBackOutline /></n-icon>
          </template>
          返回学习追踪
        </n-button>
      </div>

      <!-- 主计时器卡片 -->
      <div class="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <!-- 项目信息 -->
        <div class="text-center space-y-2">
          <div class="flex items-center justify-center space-x-3">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center"
              :style="{ backgroundColor: projectColor + '30' }"
            >
              <n-icon size="24" :color="projectColor"><BookOutline /></n-icon>
            </div>
            <h1 class="text-3xl font-bold text-gray-800">{{ projectName }}</h1>
          </div>
          <div class="flex items-center justify-center space-x-2">
            <n-tag :type="currentMode === 'POMODORO' ? 'error' : 'info'" :bordered="false">
              {{ currentMode === 'POMODORO' ? '番茄钟模式' : '自由计时模式' }}
            </n-tag>
            <n-button size="small" text @click="showModeModal = true">
              <n-icon><SwapHorizontalOutline /></n-icon>
            </n-button>
          </div>
        </div>

        <!-- 番茄钟状态显示 -->
        <div v-if="currentMode === 'POMODORO'" class="text-center">
          <n-tag :type="pomodoroPhase === 'focus' ? 'error' : 'success'" size="large" :bordered="false">
            {{ pomodoroPhase === 'focus' ? '专注时间' : '休息时间' }}
          </n-tag>
          <p class="text-sm text-gray-500 mt-2">
            第 {{ pomodoroCount + 1 }}/4 个番茄钟
          </p>
        </div>

        <!-- 超大计时器显示 -->
        <div class="text-center py-8">
          <div
            class="text-8xl font-mono font-bold transition-colors duration-300"
            :class="{
              'text-blue-600': currentMode === 'FREE',
              'text-red-600': currentMode === 'POMODORO' && pomodoroPhase === 'focus',
              'text-green-600': currentMode === 'POMODORO' && pomodoroPhase === 'rest'
            }"
          >
            {{ formattedTime }}
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="flex justify-center space-x-4">
          <n-button
            v-if="!isRunning"
            size="large"
            type="success"
            @click="startTimer"
            :disabled="!activeTimerId"
          >
            <template #icon>
              <n-icon><PlayOutline /></n-icon>
            </template>
            {{ isPaused ? '继续' : '开始' }}
          </n-button>

          <n-button
            v-else
            size="large"
            type="warning"
            @click="pauseTimer"
          >
            <template #icon>
              <n-icon><PauseOutline /></n-icon>
            </template>
            暂停
          </n-button>

          <n-button
            size="large"
            type="error"
            @click="confirmStop"
            :disabled="!activeTimerId"
          >
            <template #icon>
              <n-icon><StopOutline /></n-icon>
            </template>
            停止记录
          </n-button>
          <n-button
            size="large"
            quaternary
            @click="confirmAbandon"
            :disabled="!activeTimerId"
            >
            <template #icon>
              <n-icon><CloseCircleOutline /></n-icon>
            </template>
            放弃学习
          </n-button>
        </div>

        <!-- 进度提示 -->
        <div v-if="currentMode === 'POMODORO'" class="flex justify-center space-x-2">
          <div
            v-for="i in 4"
            :key="i"
            class="w-3 h-3 rounded-full transition-colors"
            :class="{
              'bg-red-500': i <= pomodoroCount + 1,
              'bg-gray-300': i > pomodoroCount + 1
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 停止后的记录表单弹窗 -->
    <n-modal
      v-model:show="showSessionModal"
      preset="card"
      title="记录学习感受"
      style="max-width: 600px"
      :mask-closable="false"
      :closable="false"
    >
      <n-form ref="sessionFormRef" :model="sessionForm" :rules="sessionRules">
        <n-form-item label="学习时长" path="duration">
          <n-input
            :value="formatDuration(sessionForm.duration)"
            disabled
            placeholder="自动计算"
          />
        </n-form-item>

        <n-form-item label="学习感受" path="content">
          <n-input
            v-model:value="sessionForm.content"
            type="textarea"
            placeholder="分享你的学习心得、遇到的问题或收获...(20-500字)"
            :autosize="{ minRows: 4, maxRows: 8 }"
            show-count
            :maxlength="500"
          />
          <template #feedback>
            <span :class="{ 'text-red-500': wordCount < 20, 'text-green-600': wordCount >= 20 }">
              当前 {{ wordCount }} 字 / 最少 20 字
            </span>
          </template>
        </n-form-item>

        <n-form-item label="学习进度" path="progress">
          <n-input
            v-model:value="sessionForm.progress"
            placeholder="例如：第3章、第50-80页（可选）"
          />
        </n-form-item>

        <n-form-item label="标签" path="tags">
          <n-dynamic-tags v-model:value="sessionForm.tags" :max="5" />
          <template #feedback>
            <span class="text-gray-500 text-xs">
              可以添加标签如：重点难点、轻松愉快、需要复习等
            </span>
          </template>
        </n-form-item>

        <n-alert v-if="earnedPoints > 0" type="success" title="积分奖励" class="mb-4">
          本次学习将获得 <strong>+{{ earnedPoints }}</strong> 积分！
        </n-alert>
      </n-form>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <n-button @click="cancelSessionForm">取消</n-button>
          <n-button
            type="primary"
            @click="submitSession"
            :loading="submitting"
            :disabled="wordCount < 20"
          >
            保存记录
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 模式切换弹窗 -->
    <n-modal
      v-model:show="showModeModal"
      preset="card"
      title="切换学习模式"
      style="max-width: 500px"
    >
      <div class="space-y-4">
        <div
          class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md"
          :class="{
            'border-blue-500 bg-blue-50': currentMode === 'FREE',
            'border-gray-300': currentMode !== 'FREE'
          }"
          @click="currentMode = 'FREE'"
        >
          <h3 class="font-semibold text-lg mb-2">自由计时</h3>
          <p class="text-gray-600 text-sm">自由控制学习时间，适合灵活的学习安排</p>
        </div>

        <div
          class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md"
          :class="{
            'border-red-500 bg-red-50': currentMode === 'POMODORO',
            'border-gray-300': currentMode !== 'POMODORO'
          }"
          @click="currentMode = 'POMODORO'"
        >
          <h3 class="font-semibold text-lg mb-2">番茄钟模式</h3>
          <p class="text-gray-600 text-sm">
            专注 25 分钟，休息 5 分钟<br />
            完成 4 个番茄钟后，长休息 15 分钟
          </p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <n-button type="primary" @click="showModeModal = false">确定</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { learningAPI } from '@/api';
import {
  ArrowBackOutline,
  BookOutline,
  PlayOutline,
  PauseOutline,
  StopOutline,
  SwapHorizontalOutline,
} from '@vicons/ionicons5';
import { CloseCircleOutline } from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const projectId = ref('');
const projectName = ref('加载中...');
const projectColor = ref('#3B82F6');
const currentMode = ref('FREE');

const activeTimerId = ref(null);
const isRunning = ref(false);
const isPaused = ref(false);
const startTime = ref(null);
const pausedTime = ref(0);
const elapsedTime = ref(0);
const timerInterval = ref(null);

// 番茄钟相关
const pomodoroCount = ref(0);
const pomodoroPhase = ref('focus'); // focus/rest/longRest
const pomodoroTargetSeconds = ref(25 * 60); // 25分钟

// 表单相关
const showSessionModal = ref(false);
const showModeModal = ref(false);
const sessionForm = ref({
  duration: 0,
  content: '',
  progress: '',
  tags: [],
});
const sessionFormRef = ref(null);
const submitting = ref(false);
const earnedPoints = ref(0);

const sessionRules = {
  content: [
    { required: true, message: '请填写学习感受', trigger: 'blur' },
    { min: 20, message: '学习感受至少需要20字', trigger: 'blur' },
    { max: 500, message: '学习感受不能超过500字', trigger: 'blur' },
  ],
};

const wordCount = computed(() => sessionForm.value.content.length);

const formattedTime = computed(() => {
  let totalSeconds = Math.floor(elapsedTime.value / 1000);

  // 番茄钟模式下显示倒计时
  if (currentMode.value === 'POMODORO' && isRunning.value) {
    totalSeconds = Math.max(0, pomodoroTargetSeconds.value - totalSeconds);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const formatDuration = (minutes) => {
  if (!minutes) return '0分钟';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

// 浏览器通知
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
    });
  }
};

// 计时器更新函数
const updateTimer = () => {
  if (!isRunning.value) return;

  const now = Date.now();
  elapsedTime.value = now - startTime.value + pausedTime.value;

  // 番茄钟模式检查
  if (currentMode.value === 'POMODORO') {
    const elapsedSeconds = Math.floor(elapsedTime.value / 1000);

    if (elapsedSeconds >= pomodoroTargetSeconds.value) {
      handlePomodoroComplete();
    }
  }
};

// 番茄钟完成处理
const handlePomodoroComplete = () => {
  pauseTimer();

  if (pomodoroPhase.value === 'focus') {
    pomodoroCount.value++;

    if (pomodoroCount.value >= 4) {
      // 长休息
      pomodoroPhase.value = 'longRest';
      pomodoroTargetSeconds.value = 15 * 60;
      showNotification('番茄钟提醒', '已完成4个番茄钟！请休息15分钟');
      message.success('已完成4个番茄钟！请休息15分钟', { duration: 5000 });
    } else {
      // 短休息
      pomodoroPhase.value = 'rest';
      pomodoroTargetSeconds.value = 5 * 60;
      showNotification('番茄钟提醒', '专注时间结束！请休息5分钟');
      message.success('专注时间结束！请休息5分钟', { duration: 5000 });
    }
  } else {
    // 休息结束，开始下一个专注
    if (pomodoroPhase.value === 'longRest') {
      pomodoroCount.value = 0;
    }
    pomodoroPhase.value = 'focus';
    pomodoroTargetSeconds.value = 25 * 60;
    showNotification('番茄钟提醒', '休息结束！开始新的专注时间');
    message.info('休息结束！开始新的专注时间', { duration: 5000 });
  }

  // 重置计时器
  elapsedTime.value = 0;
  pausedTime.value = 0;
  startTime.value = Date.now();
  isRunning.value = true;
};

const startTimer = () => {
  if (!isPaused.value) {
    startTime.value = Date.now();
    pausedTime.value = 0;
  } else {
    startTime.value = Date.now();
  }

  isRunning.value = true;
  timerInterval.value = setInterval(updateTimer, 100);
};

const pauseTimer = () => {
  isRunning.value = false;
  isPaused.value = true;
  pausedTime.value = elapsedTime.value;

  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const confirmStop = () => {
  dialog.warning({
    title: '确认停止学习',
    content: '停止后将保存本次学习记录，确定要停止吗？',
    positiveText: '确定停止',
    negativeText: '继续学习',
    onPositiveClick: () => {
      stopTimer();
    },
  });
};

const stopTimer = () => {
  pauseTimer();

  const durationMinutes = Math.floor(elapsedTime.value / 60000);

  if (durationMinutes < 1) {
    message.error('学习时长至少需要1分钟');
    return;
  }

  // 计算积分
  if (durationMinutes >= 120) {
    earnedPoints.value = 20;
  } else if (durationMinutes >= 60) {
    earnedPoints.value = 10;
  } else if (durationMinutes >= 30) {
    earnedPoints.value = 5;
  } else if (durationMinutes >= 10) {
    earnedPoints.value = 2;
  } else {
    earnedPoints.value = 0;
  }

  // 显示表单
  sessionForm.value.duration = durationMinutes;
  showSessionModal.value = true;
};

const submitSession = async () => {
  try {
    await sessionFormRef.value?.validate();

    if (wordCount.value < 20) {
      message.error('学习感受至少需要20字');
      return;
    }

    submitting.value = true;

    await learningAPI.stopLearning({
      timerId: activeTimerId.value,
      content: sessionForm.value.content,
      progress: sessionForm.value.progress || null,
      tags: sessionForm.value.tags,
    });

    message.success(`学习记录保存成功！${earnedPoints.value > 0 ? `获得 +${earnedPoints.value} 积分` : ''}`);
    showSessionModal.value = false;
    router.push('/learning-tracker');
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    submitting.value = false;
  }
};

const cancelSessionForm = () => {
  dialog.warning({
    title: '确认取消',
    content: '取消后本次学习记录将不会保存，确定要取消吗？',
    positiveText: '确定取消',
    negativeText: '继续填写',
    onPositiveClick: () => {
      showSessionModal.value = false;
      router.push('/learning-tracker');
    },
  });
};

const confirmAbandon = () => {
  dialog.warning({
    title: '确认放弃学习',
    content: '放弃后将不会保存任何学习记录，计时器将被删除。一旦开始计时，学习和暂停期间的时长都会被清除，确定要放弃吗？',
    positiveText: '确定放弃',
    negativeText: '继续学习',
    onPositiveClick: () => {
      abandonLearning();
    },
  });
};

const abandonLearning = async () => {
  try {
    submitting.value = true;

    // 调用API删除活跃计时器
    await learningAPI.abandonTimer();

    message.success('已放弃本次学习');

    // 重置状态并返回
    elapsedTime.value = 0;
    pauseTimer();
    router.push('/learning-tracker');
  } catch (error) {
    message.error('放弃学习失败');
  } finally {
    submitting.value = false;
  }
};

const handleBack = () => {
  if (isRunning.value) {
    dialog.warning({
      title: '计时进行中',
      content: '计时进行中，确定要离开吗？离开后计时将继续，你可以稍后返回。',
      positiveText: '确定离开',
      negativeText: '继续学习',
      onPositiveClick: () => {
        router.push('/learning-tracker');
      },
    });
  } else {
    router.push('/learning-tracker');
  }
};

// 页面离开提示
const beforeUnloadHandler = (e) => {
  if (isRunning.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

onMounted(async () => {
  projectId.value = route.params.projectId;

  // 请求通知权限
  await requestNotificationPermission();

  // 获取项目信息
  try {
    const data = await learningAPI.getProjects();
    const project = data.projects.find(p => p.id === projectId.value);
    if (project) {
      projectName.value = project.name;
      projectColor.value = project.color || '#3B82F6';
    }
  } catch (error) {
    console.error('获取项目信息失败:', error);
  }

  // 获取活跃计时器
  try {
    const data = await learningAPI.getActiveTimer();
    if (data.timer && data.timer.projectId === projectId.value) {
      activeTimerId.value = data.timer.id;
      currentMode.value = data.timer.mode || 'FREE';
      pomodoroCount.value = data.timer.pomodoroCount || 0;

      const serverStartTime = new Date(data.timer.startTime).getTime();
      startTime.value = serverStartTime; // Use original server start time
      pausedTime.value = 0; // No accumulated pause time
      elapsedTime.value = Date.now() - serverStartTime; // Calculate current elapsed time

      // 自动开始计时
      isRunning.value = true;
      timerInterval.value = setInterval(updateTimer, 100);
    } else {
      message.error('未找到活跃的计时器');
      router.push('/learning-tracker');
    }
  } catch (error) {
    message.error('加载计时器失败');
    router.push('/learning-tracker');
  }

  // 添加页面离开监听
  window.addEventListener('beforeunload', beforeUnloadHandler);
});

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  window.removeEventListener('beforeunload', beforeUnloadHandler);
});
</script>

<style scoped>
.font-mono {
  font-family: 'Courier New', 'Monaco', monospace;
  letter-spacing: 0.1em;
}
</style>
