<template>
  <div class="practice-panel">
    <!-- 字体选择 -->
    <div class="font-selector">
      <span class="label">参考字体：</span>
      <n-select
        v-model:value="selectedFontId"
        :options="fontOptions"
        placeholder="选择字体"
        style="width: 200px"
        @update:value="handleFontChange"
      />
      <span v-if="!selectedFontId" class="hint">（未选择字体将使用系统默认楷体）</span>
    </div>

    <!-- 文本输入 -->
    <div class="text-input-section">
      <n-input
        v-model:value="inputText"
        type="textarea"
        placeholder="请输入要临摹的文字（最多500字）..."
        :rows="4"
        :maxlength="500"
        show-count
      />
      <div class="input-hint">建议输入2-50个字，字数过多可能导致AI评分超时</div>
    </div>

    <!-- 预览区域 -->
    <div v-if="inputText" class="preview-section">
      <div class="preview-label">预览效果</div>
      <div class="preview-content" :style="previewStyle">
        {{ inputText }}
      </div>
      <div class="char-count">共 {{ charCount }} 个字符</div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <n-button
        type="primary"
        size="large"
        :disabled="!inputText || inputText.trim().length === 0"
        @click="startPractice"
      >
        <template #icon><n-icon :component="CreateOutline" /></template>
        生成字帖开始练习
      </n-button>
    </div>

    <!-- 提示 -->
    <div class="tips">
      <n-alert type="info" :bordered="false">
        <template #header>使用提示</template>
        <ul>
          <li>输入想要临摹的文字，点击"生成字帖"进入全屏书写模式</li>
          <li>每个字都会显示参考字体，方便对照临摹</li>
          <li>完成所有字的书写后，作品会自动保存到作品库</li>
          <li>建议先上传喜欢的字体，获得更好的临摹体验</li>
        </ul>
      </n-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import { fontAPI } from '@/api/index';

const props = defineProps({
  defaultFont: Object
});

const emit = defineEmits(['start-practice']);

const inputText = ref('');
const selectedFontId = ref(null);
const fonts = ref([]);
const loadedFonts = ref(new Set());

// 字体选项
const fontOptions = computed(() => {
  return [
    { label: '系统楷体', value: null },
    ...fonts.value.map(f => ({
      label: f.name + (f.isDefault ? ' (默认)' : ''),
      value: f.id
    }))
  ];
});

// 字符数量
const charCount = computed(() => {
  return inputText.value.replace(/\s/g, '').length;
});

// 预览样式
const previewStyle = computed(() => {
  if (selectedFontId.value && loadedFonts.value.has(selectedFontId.value)) {
    return { fontFamily: `UserFont_${selectedFontId.value}` };
  }
  return { fontFamily: 'KaiTi, STKaiti, serif' };
});

// 当前选中的字体对象
const selectedFont = computed(() => {
  if (!selectedFontId.value) return null;
  return fonts.value.find(f => f.id === selectedFontId.value);
});

// 加载字体列表
const loadFonts = async () => {
  try {
    const res = await fontAPI.list();
    if (res.success) {
      fonts.value = res.data || [];
      // 设置默认选中
      const defaultFont = fonts.value.find(f => f.isDefault);
      if (defaultFont) {
        selectedFontId.value = defaultFont.id;
      }
      // 加载字体文件
      for (const font of fonts.value) {
        await loadFontFile(font);
      }
    }
  } catch (error) {
    console.error('加载字体失败:', error);
  }
};

// 加载字体文件
const loadFontFile = async (font) => {
  if (loadedFonts.value.has(font.id)) return;
  try {
    const fontFace = new FontFace(
      `UserFont_${font.id}`,
      `url(${fontAPI.getFileUrl(font.id)})`
    );
    await fontFace.load();
    document.fonts.add(fontFace);
    loadedFonts.value.add(font.id);
  } catch (error) {
    console.error('加载字体文件失败:', font.name, error);
  }
};

// 字体变更
const handleFontChange = (fontId) => {
  if (fontId && !loadedFonts.value.has(fontId)) {
    const font = fonts.value.find(f => f.id === fontId);
    if (font) loadFontFile(font);
  }
};

// 开始练习
const startPractice = () => {
  emit('start-practice', {
    text: inputText.value,
    font: selectedFont.value
  });
};

// 监听默认字体变化
watch(() => props.defaultFont, (newFont) => {
  if (newFont && !selectedFontId.value) {
    selectedFontId.value = newFont.id;
  }
});

onMounted(() => {
  loadFonts();
});
</script>

<style scoped>
.practice-panel {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.font-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.font-selector .label {
  font-weight: 500;
}

.font-selector .hint {
  color: #999;
  font-size: 13px;
}

.text-input-section {
  margin-bottom: 20px;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.preview-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.preview-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.preview-content {
  font-size: 32px;
  line-height: 1.8;
  color: #333;
  word-break: break-all;
  white-space: pre-wrap;
}

.char-count {
  margin-top: 12px;
  font-size: 13px;
  color: #999;
  text-align: right;
}

.action-section {
  text-align: center;
  margin-bottom: 24px;
}

.tips {
  margin-top: 24px;
}

.tips ul {
  margin: 0;
  padding-left: 20px;
}

.tips li {
  margin: 4px 0;
  color: #666;
}
</style>
