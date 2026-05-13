/**
 * 统一提交逻辑
 * 支持日记、书法、照片等多种类型
 * 包含历史记录、动态积分预测、日记模板等功能
 */
import { ref, computed, watch, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import { diaryAPI, photoAPI, calligraphyAPI, diaryTemplateAPI } from '@/api';

const DRAFT_KEY = 'submit_draft';

// 默认的"自由写作"模板（始终存在）
const FREE_TEMPLATE = {
  id: 'free',
  name: '自由写作',
  icon: '✏️',
  description: '不限主题，自由发挥',
  title: '',
  content: '',
  isSystem: true,
  authorName: '系统',
};

// 任务类型配置
const TASK_CONFIG = {
  diary: {
    name: '日记',
    icon: '📝',
    basePoints: 10,
    tips: [
      '试试用今天学的新词语',
      '描述一下你的心情变化',
      '记录一件有趣的小事',
    ],
  },
  calligraphy: {
    name: '书法',
    icon: '🖌️',
    basePoints: 15,
    tips: [
      '注意笔画的起笔和收笔',
      '保持字体大小一致',
      '先慢后快，稳中求进',
    ],
  },
  photo: {
    name: '照片',
    icon: '📷',
    basePoints: 5,
    tips: [
      '选择光线充足的照片',
      '记录照片背后的故事',
      '添加标签方便以后查找',
    ],
  },
};

export function useSubmission() {
  const message = useMessage();

  // 当前类型
  const currentType = ref('diary');

  // 当前选中的模板
  const selectedTemplate = ref('free');

  // 表单数据
  const diaryForm = ref({
    title: '',
    content: '',
    mood: 'happy',
    weather: 'sunny',
    tags: [],
    enableAI: false, // 默认关闭，防止误触
  });

  // 模板相关状态
  const diaryTemplates = ref([FREE_TEMPLATE]);
  const loadingTemplates = ref(false);
  const templateExpanded = ref(false); // 模板区域是否展开

  // 加载模板列表
  const loadTemplates = async () => {
    loadingTemplates.value = true;
    try {
      const result = await diaryTemplateAPI.getList();
      // 始终保留"自由写作"在最前面
      diaryTemplates.value = [FREE_TEMPLATE, ...(result.data || [])];
    } catch (e) {
      console.error('加载模板失败:', e);
      diaryTemplates.value = [FREE_TEMPLATE];
    } finally {
      loadingTemplates.value = false;
    }
  };

  // 应用模板
  const applyTemplate = async (template) => {
    if (template.id === 'free') {
      selectedTemplate.value = 'free';
      return;
    }
    selectedTemplate.value = template.id;
    diaryForm.value.title = template.title || '';
    diaryForm.value.content = template.content || '';
    // 记录使用次数
    if (template.id !== 'free') {
      try {
        await diaryTemplateAPI.use(template.id);
      } catch (e) {
        // 忽略错误
      }
    }
  };

  // 保存当前内容为模板
  const saveAsTemplate = async (name, icon = '📝') => {
    if (!diaryForm.value.content.trim()) {
      message.warning('请先输入内容再保存为模板');
      return null;
    }
    if (!name || !name.trim()) {
      message.warning('请输入模板名称');
      return null;
    }
    try {
      const result = await diaryTemplateAPI.create({
        name: name.trim(),
        icon,
        title: diaryForm.value.title,
        content: diaryForm.value.content,
      });
      message.success('模板保存成功');
      // 刷新模板列表
      await loadTemplates();
      return result.data;
    } catch (e) {
      message.error(e.error || '保存模板失败');
      return null;
    }
  };

  // 删除模板
  const deleteTemplate = async (templateId) => {
    try {
      await diaryTemplateAPI.delete(templateId);
      message.success('模板已删除');
      await loadTemplates();
    } catch (e) {
      message.error(e.error || '删除失败');
    }
  };

  // 查重相关状态
  const duplicateResult = ref(null);
  const checkingDuplicate = ref(false);

  // 查重检测
  const checkDuplicate = async () => {
    if (detailedWordCount.value.words < 800) {
      message.warning('内容需要超过800字才能进行查重');
      return null;
    }

    checkingDuplicate.value = true;
    try {
      const result = await diaryAPI.checkDuplicate(diaryForm.value.content);
      duplicateResult.value = result.data;
      return result.data;
    } catch (e) {
      message.error(e.error || '查重失败');
      return null;
    } finally {
      checkingDuplicate.value = false;
    }
  };

  // 清除查重结果
  const clearDuplicateResult = () => {
    duplicateResult.value = null;
  };

  const calligraphyForm = ref({
    fontId: null,
    imageData: null,
    description: '',
  });

  const photoForm = ref({
    files: [],
    description: '',
    mood: 'happy',
    tags: [],
  });

  // 提交状态
  const submitting = ref(false);
  const submitted = ref(false);
  const earnedPoints = ref(0);

  // 提交结果信息
  const lastDiaryId = ref(null);
  const submissionInfo = ref(null);

  // 历史记录
  const recentHistory = ref([]);
  const loadingHistory = ref(false);

  // 动态积分显示（带动画效果）
  const displayPoints = ref(0);
  let pointsAnimationTimer = null;

  // 获取当前任务配置
  const currentTaskConfig = computed(() => TASK_CONFIG[currentType.value] || TASK_CONFIG.diary);

  // 写作等级配置
  const WRITING_LEVELS = [
    { name: '入门', minWords: 800 },
    { name: '良好', minWords: 1000 },
    { name: '优秀', minWords: 1200 },
    { name: '卓越', minWords: 1500 },
    { name: '大师', minWords: 2000 },
  ];

  // 详细字数统计
  const detailedWordCount = computed(() => {
    const content = diaryForm.value.content || '';

    // 总字符数
    const total = content.length;

    // 汉字数量（CJK统一汉字）
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;

    // 英文字母数量
    const englishChars = (content.match(/[a-zA-Z]/g) || []).length;

    // 数字数量
    const numbers = (content.match(/[0-9]/g) || []).length;

    // 文字 = 汉字 + 英文字母 + 数字
    const words = chineseChars + englishChars + numbers;

    // 标点符号（中英文标点）
    const punctuation = (content.match(/[，。！？、；：""''（）【】《》…—,.!?;:'"()\[\]<>]/g) || []).length;

    // 空格和换行
    const spaces = (content.match(/[\s]/g) || []).length;

    return {
      total,
      words,        // 文字（汉字+字母+数字）
      chinese: chineseChars,
      english: englishChars,
      numbers,
      punctuation,
      spaces,
    };
  });

  // 当前等级和进度
  const writingLevel = computed(() => {
    const words = detailedWordCount.value.words;

    // 找到当前等级
    let currentLevel = null;
    let nextLevel = WRITING_LEVELS[0];

    for (let i = WRITING_LEVELS.length - 1; i >= 0; i--) {
      if (words >= WRITING_LEVELS[i].minWords) {
        currentLevel = WRITING_LEVELS[i];
        nextLevel = WRITING_LEVELS[i + 1] || null;
        break;
      }
    }

    // 如果没达到任何等级
    if (!currentLevel) {
      nextLevel = WRITING_LEVELS[0];
    }

    // 计算进度百分比（相对于下一等级）
    let progress = 0;
    let wordsNeeded = 0;

    if (nextLevel) {
      const prevMin = currentLevel ? currentLevel.minWords : 0;
      const range = nextLevel.minWords - prevMin;
      progress = Math.min(100, Math.round(((words - prevMin) / range) * 100));
      wordsNeeded = Math.max(0, nextLevel.minWords - words);
    } else {
      progress = 100;
      wordsNeeded = 0;
    }

    return {
      current: currentLevel,
      next: nextLevel,
      progress,
      wordsNeeded,
      levels: WRITING_LEVELS,
    };
  });

  // 简单字数统计（兼容）
  const wordCount = computed(() => {
    if (currentType.value === 'diary') {
      return detailedWordCount.value.words;
    }
    if (currentType.value === 'photo') {
      return photoForm.value.description.length;
    }
    return 0;
  });

  // 积分预估（返回范围）
  const estimatedPointsRange = computed(() => {
    if (currentType.value === 'diary') {
      const count = wordCount.value;
      if (count >= 500) return { min: 25, max: 35 };
      if (count >= 300) return { min: 20, max: 28 };
      if (count >= 200) return { min: 15, max: 22 };
      if (count >= 100) return { min: 10, max: 15 };
      if (count >= 50) return { min: 8, max: 12 };
      return { min: 5, max: 10 };
    }
    if (currentType.value === 'calligraphy') {
      return { min: 12, max: 20 };
    }
    if (currentType.value === 'photo') {
      const count = photoForm.value.files.length;
      return { min: count * 4, max: count * 8 };
    }
    return { min: 0, max: 0 };
  });

  // 积分预估（单值，用于兼容）
  const estimatedPoints = computed(() => {
    if (currentType.value === 'diary') {
      const count = wordCount.value;
      if (count >= 500) return 30;
      if (count >= 200) return 20;
      if (count >= 50) return 10;
      return 5;
    }
    if (currentType.value === 'calligraphy') {
      return 15;
    }
    if (currentType.value === 'photo') {
      return photoForm.value.files.length * 5;
    }
    return 0;
  });

  // 动态积分动画
  const animatePoints = (targetMin, targetMax) => {
    if (pointsAnimationTimer) {
      clearInterval(pointsAnimationTimer);
    }
    const target = Math.floor((targetMin + targetMax) / 2);
    const step = target > displayPoints.value ? 1 : -1;
    pointsAnimationTimer = setInterval(() => {
      if (displayPoints.value === target) {
        clearInterval(pointsAnimationTimer);
        return;
      }
      displayPoints.value += step;
    }, 30);
  };

  // 监听积分变化，触发动画
  watch(estimatedPointsRange, (newRange) => {
    animatePoints(newRange.min, newRange.max);
  }, { immediate: true });

  // 加载历史记录
  const loadHistory = async () => {
    loadingHistory.value = true;
    try {
      let result;
      switch (currentType.value) {
        case 'diary':
          result = await diaryAPI.getDiaries({ limit: 3 });
          recentHistory.value = (result.data || []).map(item => ({
            id: item.id,
            title: item.title,
            preview: item.content?.substring(0, 50) + '...',
            date: item.createdAt,
            points: item.points || 10,
          }));
          break;
        case 'calligraphy':
          result = await calligraphyAPI.myList({ limit: 3 });
          recentHistory.value = ((result.data?.works) || []).map(item => ({
            id: item.id,
            title: item.title || '书法作品',
            preview: item.charCount ? `${item.charCount}字` : '',
            date: item.createdAt,
            points: item.points || 15,
          }));
          break;
        case 'photo':
          result = await photoAPI.getList({ limit: 3 });
          recentHistory.value = (result.data || []).map(item => ({
            id: item.id,
            title: item.description || '照片',
            preview: `${item.photoCount || 1}张照片`,
            date: item.createdAt,
            points: item.points || 5,
          }));
          break;
      }
    } catch (e) {
      console.error('加载历史记录失败:', e);
      recentHistory.value = [];
    } finally {
      loadingHistory.value = false;
    }
  };

  // 切换类型时加载历史
  watch(currentType, () => {
    loadHistory();
  });

  // 清理定时器
  onUnmounted(() => {
    if (pointsAnimationTimer) {
      clearInterval(pointsAnimationTimer);
    }
  });

  // 心情选项
  const moodOptions = [
    { value: 'happy', label: '开心', emoji: '😊' },
    { value: 'excited', label: '兴奋', emoji: '🎉' },
    { value: 'calm', label: '平静', emoji: '😌' },
    { value: 'sad', label: '难过', emoji: '😢' },
    { value: 'angry', label: '生气', emoji: '😠' },
    { value: 'tired', label: '疲惫', emoji: '😴' },
  ];

  // 天气选项
  const weatherOptions = [
    { value: 'sunny', label: '晴天', emoji: '☀️' },
    { value: 'cloudy', label: '多云', emoji: '⛅' },
    { value: 'rainy', label: '雨天', emoji: '🌧️' },
    { value: 'snowy', label: '雪天', emoji: '❄️' },
    { value: 'windy', label: '大风', emoji: '💨' },
  ];

  // 加载草稿
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const data = JSON.parse(draft);
        currentType.value = data.type || 'diary';
        if (data.diary) diaryForm.value = { ...diaryForm.value, ...data.diary };
        if (data.photo) photoForm.value = { ...photoForm.value, ...data.photo };
      }
    } catch (e) {
      console.error('加载草稿失败:', e);
    }
  };

  // 保存草稿
  const saveDraft = () => {
    try {
      const draft = {
        type: currentType.value,
        diary: currentType.value === 'diary' ? diaryForm.value : null,
        photo: currentType.value === 'photo' ? {
          description: photoForm.value.description,
          mood: photoForm.value.mood,
          tags: photoForm.value.tags,
        } : null,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error('保存草稿失败:', e);
    }
  };

  // 清除草稿
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  // 自动保存草稿
  watch([currentType, diaryForm, photoForm], () => {
    saveDraft();
  }, { deep: true });

  // 提交日记
  const submitDiary = async () => {
    if (!diaryForm.value.title.trim()) {
      message.warning('请输入日记标题');
      return false;
    }
    if (!diaryForm.value.content.trim()) {
      message.warning('请输入日记内容');
      return false;
    }

    if (diaryForm.value.content.trim().length < 1200) {
      message.warning('日记字数需达1200字以上才能提交审核~');
      return false;
    }

    if (!duplicateResult.value) {
      message.warning('请先点击"检测重复内容"进行查重~');
      return false;
    }

    const { selfRepeatRate, overallRate, globalRepeatRate } = duplicateResult.value;
    const selfRate = selfRepeatRate || 0;
    const historyRate = overallRate - selfRate - (globalRepeatRate || 0);
    const globalRate = globalRepeatRate || 0;

    if (selfRate >= 10) {
      message.warning('自身重复率需低于10%才能提交');
      return false;
    }
    if (historyRate >= 10) {
      message.warning('历史重复率需低于10%才能提交');
      return false;
    }
    if (globalRate >= 10) {
      message.warning('全站重复率需低于10%才能提交');
      return false;
    }

    const result = await diaryAPI.createDiary({
      title: diaryForm.value.title,
      content: diaryForm.value.content,
      mood: diaryForm.value.mood,
      weather: diaryForm.value.weather,
      tags: diaryForm.value.tags,
      enableAI: diaryForm.value.enableAI,
      wordStats: detailedWordCount.value,
      duplicateStats: duplicateResult.value || null,
    });
    return result;
  };

  // 提交书法
  const submitCalligraphy = async () => {
    if (!calligraphyForm.value.imageData) {
      message.warning('请先书写内容');
      return false;
    }

    const formData = new FormData();
    // 将 base64 转为 blob
    const blob = await fetch(calligraphyForm.value.imageData).then(r => r.blob());
    formData.append('image', blob, 'calligraphy.png');
    if (calligraphyForm.value.fontId) {
      formData.append('fontId', calligraphyForm.value.fontId);
    }
    if (calligraphyForm.value.description) {
      formData.append('description', calligraphyForm.value.description);
    }

    const result = await calligraphyAPI.create(formData);
    return result;
  };

  // 提交照片
  const submitPhoto = async () => {
    if (photoForm.value.files.length === 0) {
      message.warning('请选择要上传的照片');
      return false;
    }

    const formData = new FormData();
    photoForm.value.files.forEach((file, index) => {
      formData.append('photos', file.file);
    });
    formData.append('description', photoForm.value.description);
    formData.append('mood', photoForm.value.mood);
    formData.append('tags', JSON.stringify(photoForm.value.tags));

    const result = await photoAPI.create(formData);
    return result;
  };

  // 统一提交
  const submit = async () => {
    submitting.value = true;
    try {
      let result;
      switch (currentType.value) {
        case 'diary':
          result = await submitDiary();
          break;
        case 'calligraphy':
          result = await submitCalligraphy();
          break;
        case 'photo':
          result = await submitPhoto();
          break;
      }

      if (result) {
        submitted.value = true;
        earnedPoints.value = result.diary?.earnedPoints || result.data?.points || estimatedPoints.value;

        // 保存日记ID和提交信息（用于AI分析）
        if (currentType.value === 'diary' && result.diary) {
          lastDiaryId.value = result.diary.id;
          submissionInfo.value = result.submission || null;
        }

        clearDraft();
        return result;
      }
    } catch (error) {
      message.error(error.error || '提交失败');
    } finally {
      submitting.value = false;
    }
    return null;
  };

  // 重置表单
  const reset = () => {
    diaryForm.value = {
      title: '',
      content: '',
      mood: 'happy',
      weather: 'sunny',
      tags: [],
    };
    calligraphyForm.value = {
      fontId: null,
      imageData: null,
      description: '',
    };
    photoForm.value = {
      files: [],
      description: '',
      mood: 'happy',
      tags: [],
    };
    selectedTemplate.value = 'free';
    submitted.value = false;
    earnedPoints.value = 0;
    lastDiaryId.value = null;
    submissionInfo.value = null;
    duplicateResult.value = null;
    clearDraft();
  };

  return {
    // 状态
    currentType,
    diaryForm,
    calligraphyForm,
    photoForm,
    submitting,
    submitted,
    earnedPoints,
    lastDiaryId,
    submissionInfo,
    // 积分相关
    estimatedPoints,
    estimatedPointsRange,
    displayPoints,
    wordCount,
    // 字数统计（详细）
    detailedWordCount,
    writingLevel,
    // 模板
    diaryTemplates,
    selectedTemplate,
    templateExpanded,
    loadingTemplates,
    loadTemplates,
    applyTemplate,
    saveAsTemplate,
    deleteTemplate,
    // 查重
    duplicateResult,
    checkingDuplicate,
    checkDuplicate,
    clearDuplicateResult,
    // 字数
    detailedWordCount,
    // 配置
    currentTaskConfig,
    moodOptions,
    weatherOptions,
    // 历史记录
    recentHistory,
    loadingHistory,
    loadHistory,
    // 草稿
    loadDraft,
    saveDraft,
    clearDraft,
    // 操作
    submit,
    reset,
  };
}
