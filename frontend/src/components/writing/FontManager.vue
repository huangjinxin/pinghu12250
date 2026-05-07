<template>
  <div class="font-manager">
    <!-- 上传区域 -->
    <div class="upload-section">
      <n-upload
        :custom-request="handleUpload"
        :show-file-list="false"
        accept=".ttf,.otf,.woff,.woff2"
      >
        <n-button type="primary">
          <template #icon><n-icon :component="CloudUploadOutline" /></template>
          上传字体
        </n-button>
      </n-upload>
      <span class="upload-hint">支持 TTF、OTF、WOFF、WOFF2 格式，最大 20MB</span>
    </div>

    <!-- 字体列表 -->
    <n-spin :show="loading">
      <div v-if="fonts.length === 0" class="empty-state">
        <n-empty description="还没有上传字体">
          <template #extra>
            <n-text depth="3">上传自己喜欢的字体，用于临摹练习</n-text>
          </template>
        </n-empty>
      </div>

      <div v-else class="font-grid">
        <div
          v-for="font in fonts"
          :key="font.id"
          class="font-card"
          :class="{ 'is-default': font.isDefault }"
        >
          <div class="font-preview" :style="getFontStyle(font)">
            <n-spin v-if="isFontLoading(font)" size="small" />
            <template v-else>永字八法</template>
          </div>
          <div class="font-info">
            <div class="font-name">{{ font.name }}</div>
            <div class="font-meta">
              <span>{{ formatSize(font.fileSize) }}</span>
              <n-tag v-if="font.isDefault" size="small" type="success">默认</n-tag>
            </div>
          </div>
          <div class="font-actions">
            <n-button
              v-if="!font.isDefault"
              size="small"
              @click="setDefault(font)"
            >
              设为默认
            </n-button>
            <n-popconfirm @positive-click="deleteFont(font)">
              <template #trigger>
                <n-button size="small" type="error" quaternary>
                  <template #icon><n-icon :component="TrashOutline" /></template>
                </n-button>
              </template>
              确定删除这个字体吗？
            </n-popconfirm>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import CloudUploadOutline from '@vicons/ionicons5/es/CloudUploadOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import { fontAPI } from '@/api/index';

const emit = defineEmits(['font-selected']);
const message = useMessage();
const loading = ref(false);
const fonts = ref([]);
const loadedFonts = ref(new Set());
const loadingFonts = ref(new Set()); // 正在加载的字体

// 加载字体列表
const loadFonts = async () => {
  loading.value = true;
  try {
    const res = await fontAPI.list();
    if (res.success) {
      fonts.value = res.data || [];
      // 并行加载所有字体文件（不阻塞UI）
      loadAllFontsAsync();
    }
  } catch (error) {
    console.error('加载字体失败:', error);
    message.error('加载字体失败');
  } finally {
    loading.value = false;
  }
};

// 异步并行加载所有字体
const loadAllFontsAsync = () => {
  // 优先加载默认字体
  const defaultFont = fonts.value.find(f => f.isDefault);
  if (defaultFont) {
    loadFontFile(defaultFont);
  }
  // 并行加载其他字体
  fonts.value.forEach(font => {
    if (!font.isDefault) {
      loadFontFile(font);
    }
  });
};

// 加载字体文件到浏览器
const loadFontFile = async (font) => {
  if (loadedFonts.value.has(font.id) || loadingFonts.value.has(font.id)) return;

  loadingFonts.value.add(font.id);
  try {
    const fontFace = new FontFace(
      `UserFont_${font.id}`,
      `url(${fontAPI.getFileUrl(font.id)})`
    );
    await fontFace.load();
    document.fonts.add(fontFace);
    loadedFonts.value.add(font.id);
    console.log('✅ 字体加载成功:', font.name);
  } catch (error) {
    console.error('❌ 加载字体文件失败:', font.name, error);
  } finally {
    loadingFonts.value.delete(font.id);
  }
};

// 获取字体样式
const getFontStyle = (font) => {
  if (loadedFonts.value.has(font.id)) {
    return { fontFamily: `UserFont_${font.id}` };
  }
  // 未加载时使用楷体作为后备
  return { fontFamily: 'STKaiti, KaiTi, serif' };
};

// 检查字体是否正在加载
const isFontLoading = (font) => {
  return loadingFonts.value.has(font.id) && !loadedFonts.value.has(font.id);
};

// 上传字体
const handleUpload = async ({ file, onFinish, onError }) => {
  const formData = new FormData();
  formData.append('font', file.file);
  formData.append('name', file.name.replace(/\.[^.]+$/, ''));

  try {
    const res = await fontAPI.upload(formData);
    if (res.success) {
      message.success('上传成功');
      await loadFonts();
      onFinish();
    } else {
      throw new Error(res.error);
    }
  } catch (error) {
    message.error(error.message || '上传失败');
    onError();
  }
};

// 设为默认
const setDefault = async (font) => {
  try {
    const res = await fontAPI.setDefault(font.id);
    if (res.success) {
      fonts.value.forEach(f => f.isDefault = f.id === font.id);
      emit('font-selected', font);
      message.success('已设为默认字体');
    }
  } catch (error) {
    message.error('设置失败');
  }
};

// 删除字体
const deleteFont = async (font) => {
  try {
    const res = await fontAPI.delete(font.id);
    if (res.success) {
      fonts.value = fonts.value.filter(f => f.id !== font.id);
      message.success('删除成功');
    }
  } catch (error) {
    message.error('删除失败');
  }
};

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

onMounted(() => {
  loadFonts();
});
</script>

<style scoped>
.font-manager {
  padding: 16px;
}

.upload-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.upload-hint {
  color: #999;
  font-size: 13px;
}

.empty-state {
  padding: 60px 0;
}

.font-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.font-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.font-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.font-card.is-default {
  border-color: #18a058;
}

.font-preview {
  font-size: 36px;
  text-align: center;
  padding: 24px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 12px;
  color: #333;
}

.font-info {
  margin-bottom: 12px;
}

.font-name {
  font-weight: 500;
  font-size: 15px;
  margin-bottom: 4px;
}

.font-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 13px;
}

.font-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
