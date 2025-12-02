<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">作业记录</h1>
        <p class="text-gray-500 mt-1">记录每次作业完成情况</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        记录作业
      </n-button>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <n-space>
        <n-select v-model:value="filters.subject" placeholder="科目" :options="subjectOptions" clearable style="width: 120px" @update:value="loadHomeworks" />
        <n-rate v-model:value="filters.difficulty" allow-half @update:value="loadHomeworks" />
        <span class="text-sm text-gray-500">难度筛选</span>
      </n-space>
    </div>

    <!-- 作业列表 -->
    <div v-if="loading" class="space-y-4">
      <n-skeleton v-for="i in 3" :key="i" height="100px" :sharp="false" />
    </div>

    <n-empty v-else-if="!homeworks.length" description="还没有作业记录" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="hw in homeworks" :key="hw.id" class="card">
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="font-medium text-gray-800 mb-1">{{ hw.title }}</h3>
            <div>
              <n-tag :type="getSubjectType(hw.subject)" size="small">{{ hw.subject }}</n-tag>
              <span class="text-sm text-gray-500 ml-2">{{ formatDate(hw.createdAt) }}</span>
            </div>
          </div>
          <n-button size="tiny" quaternary type="error" @click="handleDelete(hw)">删除</n-button>
        </div>
        <p class="text-gray-700 mb-2">{{ hw.content }}</p>
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center space-x-3">
            <span class="text-gray-500">难度：</span>
            <n-rate :value="hw.difficulty" readonly size="small" />
          </div>
          <span class="text-gray-500">用时：{{ hw.timeSpent }}分钟</span>
        </div>
      </div>
    </div>

    <!-- 创建弹窗 -->
    <n-modal v-model:show="showModal" preset="card" title="记录作业" style="width: 500px">
      <n-form :model="form" label-placement="top">
        <n-form-item label="标题" required>
          <n-input v-model:value="form.title" placeholder="作业标题" />
        </n-form-item>
        <n-form-item label="科目" required>
          <n-select v-model:value="form.subject" :options="subjectOptions" placeholder="选择科目" />
        </n-form-item>
        <n-form-item label="作业内容" required>
          <n-input v-model:value="form.content" type="textarea" placeholder="描述作业内容" :rows="3" />
        </n-form-item>
        <div class="grid grid-cols-2 gap-4">
          <n-form-item label="难度">
            <n-rate v-model:value="form.difficulty" allow-half />
          </n-form-item>
          <n-form-item label="用时(分钟)">
            <n-input-number v-model:value="form.timeSpent" :min="1" :max="300" />
          </n-form-item>
        </div>
        <n-form-item label="标签">
          <TagSelector v-model="form.tagIds" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { homeworkAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline } from '@vicons/ionicons5';
import TagSelector from '@/components/TagSelector.vue';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const homeworks = ref([]);

const filters = ref({ subject: null, difficulty: 0 });
const form = ref({ title: '', subject: '', content: '', difficulty: 3, timeSpent: 30, tagIds: [] });

const subjectOptions = [
  { label: '语文', value: '语文' },
  { label: '数学', value: '数学' },
  { label: '英语', value: '英语' },
  { label: '科学', value: '科学' },
  { label: '美术', value: '美术' },
  { label: '音乐', value: '音乐' },
  { label: '体育', value: '体育' },
  { label: '其他', value: '其他' },
];

const getSubjectType = (subject) => {
  const types = { '语文': 'error', '数学': 'info', '英语': 'success', '科学': 'warning' };
  return types[subject] || 'default';
};

const formatDate = (date) => format(new Date(date), 'M月d日');

const loadHomeworks = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.value.subject) params.subject = filters.value.subject;
    const data = await homeworkAPI.getHomeworks(params);
    homeworks.value = data.homeworks || data;
  } catch (error) {
    message.error('加载作业失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  form.value = { title: '', subject: '', content: '', difficulty: 3, timeSpent: 30, tagIds: [] };
  showModal.value = true;
};

const handleDelete = (hw) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条作业记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await homeworkAPI.deleteHomework(hw.id);
        message.success('删除成功');
        loadHomeworks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const handleSubmit = async () => {
  if (!form.value.title.trim() || !form.value.subject || !form.value.content.trim()) {
    message.warning('请填写标题、科目和内容');
    return;
  }
  submitting.value = true;
  try {
    await homeworkAPI.createHomework(form.value);
    message.success('记录成功');
    showModal.value = false;
    loadHomeworks();
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadHomeworks();
});
</script>
