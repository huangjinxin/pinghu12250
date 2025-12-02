<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的日记</h1>
        <p class="text-gray-500 mt-1">记录每一天的成长</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        写日记
      </n-button>
    </div>

    <!-- 筛选 -->
    <div class="card">
      <n-space>
        <n-date-picker v-model:value="filters.dateRange" type="daterange" clearable />
        <n-select v-model:value="filters.mood" placeholder="心情" :options="moodOptions" clearable style="width: 120px" />
      </n-space>
    </div>

    <!-- 日记列表 -->
    <div v-if="loading" class="space-y-4">
      <n-skeleton v-for="i in 3" :key="i" height="120px" :sharp="false" />
    </div>

    <n-empty v-else-if="!diaries.length" description="还没有日记，开始记录吧" />

    <div v-else class="space-y-4">
      <div v-for="diary in diaries" :key="diary.id" class="card hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">{{ getMoodEmoji(diary.mood) }}</span>
            <div>
              <div class="font-bold text-gray-800">{{ diary.title }}</div>
              <div class="text-sm text-gray-500">{{ formatDate(diary.createdAt) }} · {{ diary.weather }}</div>
            </div>
          </div>
        </div>
        <p class="text-gray-700 whitespace-pre-wrap mb-3">{{ diary.content }}</p>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div v-if="diary.tags?.length" class="flex items-center space-x-1">
              <n-tag v-for="tag in diary.tags" :key="tag.tag.id" size="small">
                {{ tag.tag.name }}
              </n-tag>
            </div>
            <span class="text-xs text-gray-400">· {{ getDiaryStats(diary.content) }}</span>
          </div>
          <n-space size="small">
            <n-button size="small" quaternary @click="copyDiaryContent(diary)">
              <template #icon><n-icon><CopyOutline /></n-icon></template>
              复制
            </n-button>
            <n-button size="small" quaternary @click="handleEdit(diary)">
              <template #icon><n-icon><CreateOutline /></n-icon></template>
              编辑
            </n-button>
            <n-button size="small" quaternary type="error" @click="handleDelete(diary)">
              <template #icon><n-icon><TrashOutline /></n-icon></template>
              删除
            </n-button>
          </n-space>
        </div>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <n-modal v-model:show="showModal" preset="card" :title="editingDiary ? '编辑日记' : '写日记'" style="width: 600px">
      <n-form :model="form" label-placement="top">
        <n-form-item label="标题">
          <n-input v-model:value="form.title" placeholder="给日记起个标题..." />
        </n-form-item>
        <div class="grid grid-cols-2 gap-4">
          <n-form-item label="心情">
            <n-select v-model:value="form.mood" :options="moodOptions" />
          </n-form-item>
          <n-form-item label="天气">
            <n-select v-model:value="form.weather" :options="weatherOptions" />
          </n-form-item>
        </div>
        <n-form-item label="内容">
          <n-input v-model:value="form.content" type="textarea" placeholder="今天发生了什么..." :rows="8" />
          <!-- 字数统计 -->
          <div class="mt-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">字数统计</span>
              <n-button size="tiny" quaternary @click="copyStatistics">
                <template #icon><n-icon><CopyOutline /></n-icon></template>
                复制统计
              </n-button>
            </div>
            <div class="grid grid-cols-4 gap-2 mb-3">
              <div class="text-center">
                <div class="text-xs text-gray-500">总字符</div>
                <div class="text-lg font-bold text-gray-800">{{ contentStats.total }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500">文字</div>
                <div class="text-lg font-bold text-primary-600">{{ contentStats.chars }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500">标点</div>
                <div class="text-lg font-bold text-gray-600">{{ contentStats.punctuation }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500">空格</div>
                <div class="text-lg font-bold text-gray-600">{{ contentStats.spaces }}</div>
              </div>
            </div>
            <!-- 等级进度 -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span :class="contentStats.level >= 1 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                  {{ contentStats.level >= 1 ? '✓' : '○' }} 入门 (800字)
                </span>
                <span :class="contentStats.level >= 2 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                  {{ contentStats.level >= 2 ? '✓' : '○' }} 良好 (1000字)
                </span>
                <span :class="contentStats.level >= 3 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                  {{ contentStats.level >= 3 ? '✓' : '○' }} 优秀 (1200字)
                </span>
                <span :class="contentStats.level >= 4 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                  {{ contentStats.level >= 4 ? '✓' : '○' }} 卓越 (1500字)
                </span>
                <span :class="contentStats.level >= 5 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                  {{ contentStats.level >= 5 ? '✓' : '○' }} 大师 (2000字)
                </span>
              </div>
              <n-progress
                type="line"
                :percentage="contentStats.progress"
                :color="contentStats.levelColor"
                :height="8"
                :border-radius="4"
              />
              <div class="text-xs text-center text-gray-500">
                {{ contentStats.levelText }}
              </div>
            </div>
          </div>
        </n-form-item>
        <n-form-item label="付费设置">
          <n-input-number
            v-model:value="form.price"
            :min="0"
            :max="100"
            placeholder="0表示免费"
            style="width: 100%"
          >
            <template #suffix>金币</template>
          </n-input-number>
          <div class="text-xs text-gray-500 mt-1">
            设置价格后，其他用户需要购买才能查看完整内容（0表示免费）
          </div>
        </n-form-item>
        <n-form-item label="标签">
          <TagSelector v-model="form.tagIds" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingDiary ? '保存' : '发布' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { diaryAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline, CopyOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5';
import TagSelector from '@/components/TagSelector.vue';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const diaries = ref([]);
const editingDiary = ref(null);

const filters = ref({ dateRange: null, mood: null });

const form = ref({ title: '', content: '', mood: 'happy', weather: 'sunny', tagIds: [], price: null });

const moodOptions = [
  { label: '😊 开心', value: 'happy' },
  { label: '😐 平静', value: 'neutral' },
  { label: '😢 难过', value: 'sad' },
  { label: '😠 生气', value: 'angry' },
  { label: '😴 疲惫', value: 'tired' },
];

const weatherOptions = [
  { label: '☀️ 晴天', value: 'sunny' },
  { label: '☁️ 多云', value: 'cloudy' },
  { label: '🌧️ 雨天', value: 'rainy' },
  { label: '❄️ 雪天', value: 'snowy' },
];

const getMoodEmoji = (mood) => {
  const emojis = { happy: '😊', neutral: '😐', sad: '😢', angry: '😠', tired: '😴' };
  return emojis[mood] || '😊';
};

const formatDate = (date) => format(new Date(date), 'yyyy年M月d日 HH:mm');

// 字数统计
const contentStats = computed(() => {
  const content = form.value.content || '';

  // 统计不同类型字符
  const total = content.length;
  const spaces = (content.match(/\s/g) || []).length;
  const punctuation = (content.match(/[，。！？；：、""''《》【】（）,\.!?;:'"<>(){}\[\]]/g) || []).length;
  const chars = total - spaces - punctuation;

  // 计算等级（基于文字数量，不包括空格和标点）
  let level = 0;
  let nextTarget = 800;
  let levelText = `还需 ${800 - chars} 字达到入门等级`;
  let levelColor = '#18a058';

  if (chars >= 2000) {
    level = 5;
    levelText = `已达大师等级！超出 ${chars - 2000} 字`;
    levelColor = '#d03050';
  } else if (chars >= 1500) {
    level = 4;
    nextTarget = 2000;
    levelText = `卓越等级，还需 ${2000 - chars} 字达到大师`;
    levelColor = '#f0a020';
  } else if (chars >= 1200) {
    level = 3;
    nextTarget = 1500;
    levelText = `优秀等级，还需 ${1500 - chars} 字达到卓越`;
    levelColor = '#2080f0';
  } else if (chars >= 1000) {
    level = 2;
    nextTarget = 1200;
    levelText = `良好等级，还需 ${1200 - chars} 字达到优秀`;
    levelColor = '#18a058';
  } else if (chars >= 800) {
    level = 1;
    nextTarget = 1000;
    levelText = `入门等级，还需 ${1000 - chars} 字达到良好`;
    levelColor = '#18a058';
  }

  // 计算进度百分比
  let progress = 0;
  if (level === 5) {
    progress = 100;
  } else {
    const ranges = [
      { min: 0, max: 800 },
      { min: 800, max: 1000 },
      { min: 1000, max: 1200 },
      { min: 1200, max: 1500 },
      { min: 1500, max: 2000 },
    ];
    const range = ranges[level];
    const rangeProgress = ((chars - range.min) / (range.max - range.min)) * 100;
    progress = (level * 20) + (rangeProgress * 0.2);
  }

  return {
    total,
    chars,
    punctuation,
    spaces,
    level,
    progress: Math.min(progress, 100),
    levelText,
    levelColor,
  };
});

// 复制统计数据
const copyStatistics = async () => {
  const stats = contentStats.value;
  const text = `字数统计
总字符：${stats.total}
文字：${stats.chars}
标点：${stats.punctuation}
空格：${stats.spaces}
等级：${stats.levelText}`;

  try {
    await navigator.clipboard.writeText(text);
    message.success('统计数据已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

// 获取日记统计信息
const getDiaryStats = (content) => {
  if (!content) return '0字';
  const chars = content.length - (content.match(/\s/g) || []).length - (content.match(/[，。！？；：、""''《》【】（）,\.!?;:'"<>(){}\[\]]/g) || []).length;
  return `${chars}字`;
};

// 复制日记内容
const copyDiaryContent = async (diary) => {
  const text = `${diary.title}

${diary.content}

${formatDate(diary.createdAt)} · ${getMoodEmoji(diary.mood)} ${diary.weather}`;

  try {
    await navigator.clipboard.writeText(text);
    message.success('日记内容已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

const loadDiaries = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.value.mood) params.mood = filters.value.mood;
    const data = await diaryAPI.getDiaries(params);
    diaries.value = data.diaries || data;
  } catch (error) {
    message.error('加载日记失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingDiary.value = null;
  form.value = { title: '', content: '', mood: 'happy', weather: 'sunny', tagIds: [], price: null };
  showModal.value = true;
};

const handleEdit = (diary) => {
  editingDiary.value = diary;
  form.value = {
    title: diary.title || '',
    content: diary.content,
    mood: diary.mood,
    weather: diary.weather,
    tagIds: diary.tags?.map(t => t.tag.id) || [],
  };
  showModal.value = true;
};

const handleDelete = (diary) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这篇日记吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await diaryAPI.deleteDiary(diary.id);
        message.success('删除成功');
        loadDiaries();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning('请输入日记标题');
    return;
  }
  if (!form.value.content.trim()) {
    message.warning('请输入日记内容');
    return;
  }
  submitting.value = true;
  try {
    if (editingDiary.value) {
      await diaryAPI.updateDiary(editingDiary.value.id, form.value);
      message.success('保存成功');
    } else {
      await diaryAPI.createDiary(form.value);
      message.success('发布成功');
    }
    showModal.value = false;
    loadDiaries();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadDiaries();
});
</script>
