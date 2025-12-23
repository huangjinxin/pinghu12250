<template>
  <div class="deep-learn-wrapper">
    <!-- 主按钮 -->
    <n-tooltip trigger="hover" placement="left">
      <template #trigger>
        <n-button
          class="deep-learn-btn"
          :class="{ loading: loading }"
          type="primary"
          circle
          size="large"
          :loading="loading"
          @click="handleClick"
        >
          <template #icon>
            <n-icon size="24"><SparklesOutline /></n-icon>
          </template>
        </n-button>
      </template>
      <div class="tooltip-content">
        <div class="tooltip-title">深入学习</div>
        <div class="tooltip-desc">AI 分析当前页面内容</div>
      </div>
    </n-tooltip>

    <!-- 设置下拉（已移到 tabs 区域） -->

    <!-- 页面范围选择弹窗 -->
    <n-modal v-model:show="showRangeModal" preset="dialog" title="选择分析范围" style="width: 360px;">
      <n-form>
        <n-form-item label="分析模式">
          <n-radio-group v-model:value="rangeMode">
            <n-space vertical>
              <n-radio value="current">仅当前页 (P{{ currentPage }})</n-radio>
              <n-radio value="context">当前页 + 上下文 (P{{ contextRange }})</n-radio>
              <n-radio value="custom">自定义范围</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="rangeMode === 'custom'" label="页码范围">
          <n-space>
            <n-input-number v-model:value="customStart" :min="1" :max="totalPages" size="small" style="width: 80px;" />
            <span>至</span>
            <n-input-number v-model:value="customEnd" :min="customStart" :max="totalPages" size="small" style="width: 80px;" />
          </n-space>
        </n-form-item>
        <n-form-item label="提示词模板">
          <n-select
            v-model:value="selectedPromptId"
            :options="promptOptions"
            placeholder="使用默认模板"
            clearable
            size="small"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showRangeModal = false">取消</n-button>
        <n-button type="primary" @click="startAnalysis" :loading="loading">开始分析</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useMessage } from 'naive-ui';
import { NIcon } from 'naive-ui';
import {
  SparklesOutline,
  SettingsOutline,
  ExpandOutline,
  DocumentTextOutline
} from '@vicons/ionicons5';
import { aiPromptAPI, aiAnalysisAPI } from '@/api/index';

const message = useMessage();

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  textbookId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: ''
  },
  pdfDoc: {
    type: Object,
    default: null
  },
  showSettings: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['analyze', 'update:loading']);

// 状态
const showRangeModal = ref(false);
const rangeMode = ref('context');
const customStart = ref(1);
const customEnd = ref(1);
const selectedPromptId = ref(null);
const prompts = ref([]);

// 计算上下文范围
const contextRange = computed(() => {
  const start = Math.max(1, props.currentPage - 1);
  const end = Math.min(props.totalPages, props.currentPage + 1);
  return `${start}-${end}`;
});

// 提示词选项
const promptOptions = computed(() => {
  return prompts.value.map(p => ({
    label: p.name + (p.isDefault ? ' (默认)' : ''),
    value: p.id
  }));
});

// 设置菜单选项
const settingsOptions = [
  {
    label: '选择分析范围',
    key: 'range',
    icon: () => h(NIcon, null, { default: () => h(ExpandOutline) })
  },
  {
    label: '选择提示词模板',
    key: 'prompt',
    icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) })
  }
];

// 加载提示词列表
const loadPrompts = async () => {
  try {
    const res = await aiPromptAPI.getList({ subject: props.subject });
    prompts.value = res.data || [];
  } catch (error) {
    console.warn('加载提示词失败:', error);
  }
};

// 处理按钮点击
const handleClick = () => {
  // 默认使用当前页+上下文模式直接分析
  rangeMode.value = 'context';
  startAnalysis();
};

// 处理设置选择
const handleSettingSelect = (key) => {
  if (key === 'range' || key === 'prompt') {
    customStart.value = props.currentPage;
    customEnd.value = props.currentPage;
    showRangeModal.value = true;
  }
};

// 开始分析
const startAnalysis = async () => {
  if (!props.pdfDoc) {
    message.warning('请先加载 PDF 文档');
    return;
  }

  // 计算页码范围
  let startPage, endPage;
  if (rangeMode.value === 'current') {
    startPage = endPage = props.currentPage;
  } else if (rangeMode.value === 'context') {
    startPage = Math.max(1, props.currentPage - 1);
    endPage = Math.min(props.totalPages, props.currentPage + 1);
  } else {
    startPage = customStart.value;
    endPage = customEnd.value;
  }

  showRangeModal.value = false;
  emit('update:loading', true);

  try {
    // 提取 PDF 文本
    const pageTexts = [];
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await props.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join('');
        if (text.trim()) {
          pageTexts.push(`【第${pageNum}页】\n${text}`);
        }
      } catch (e) {
        console.warn(`提取第${pageNum}页文本失败:`, e);
      }
    }

    if (pageTexts.length === 0) {
      message.warning('未能提取到页面文本');
      emit('update:loading', false);
      return;
    }

    const inputText = pageTexts.join('\n\n');

    // 调用 AI 分析 API
    const result = await aiAnalysisAPI.analyze({
      textbookId: props.textbookId,
      inputPages: `${startPage}-${endPage}`,
      inputText: inputText,
      promptId: selectedPromptId.value || undefined
    });

    if (result.success) {
      emit('analyze', {
        content: result.data.outputText,
        info: {
          pages: `P${startPage}-${endPage}`,
          responseTime: result.data.responseTime,
          tokensUsed: result.data.tokensUsed
        }
      });
    } else {
      message.error(result.message || 'AI 分析失败');
    }
  } catch (error) {
    console.error('AI 分析失败:', error);
    message.error(error.message || 'AI 分析失败，请检查 API 配置');
  } finally {
    emit('update:loading', false);
  }
};

onMounted(() => {
  loadPrompts();
});

defineExpose({
  openSettings: () => {
    showRangeModal.value = true;
  },
  triggerAnalysis: () => {
    handleClick();
  }
});
</script>

<style scoped>
.deep-learn-wrapper {
  position: fixed;
  right: 420px; /* 右侧面板宽度 + 间距 */
  bottom: 100px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.deep-learn-btn {
  width: 56px;
  height: 56px;
  box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
}

.deep-learn-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(24, 144, 255, 0.4);
}

.deep-learn-btn.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);
  }
  50% {
    box-shadow: 0 4px 24px rgba(24, 144, 255, 0.6);
  }
}

.settings-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.settings-btn:hover {
  opacity: 1;
}

.tooltip-content {
  text-align: center;
}

.tooltip-title {
  font-weight: 600;
  font-size: 14px;
}

.tooltip-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}
</style>
