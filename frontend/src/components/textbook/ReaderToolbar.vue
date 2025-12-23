<template>
  <div class="reader-toolbar" v-show="!isFullscreen">
    <!-- 左侧：返回 + 标题 -->
    <div class="toolbar-left">
      <n-button text @click="$emit('back')">
        <template #icon>
          <n-icon><ArrowBack /></n-icon>
        </template>
      </n-button>
      <h1 class="toolbar-title">{{ title }}</h1>
    </div>

    <!-- 中间：模式切换 Tab -->
    <div class="toolbar-center">
      <n-tabs
        :value="mode"
        @update:value="$emit('update:mode', $event)"
        type="segment"
        size="small"
      >
        <n-tab name="flipbook">原版教材</n-tab>
        <n-tab name="assist">辅助功能</n-tab>
      </n-tabs>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="toolbar-right">
      <!-- 页码显示（辅助模式下显示在顶部） -->
      <div v-if="mode === 'assist'" class="page-indicator">
        <n-icon size="16"><BookOutline /></n-icon>
        <span>{{ currentPage }} / {{ totalPages }}</span>
      </div>

      <!-- 缩放控制（辅助模式下显示在顶部） -->
      <n-button-group v-if="mode === 'assist'" size="small">
        <n-button @click="$emit('zoom-out')" :disabled="zoom <= 0.5">
          <template #icon>
            <n-icon><Remove /></n-icon>
          </template>
        </n-button>
        <n-button class="zoom-display">
          {{ Math.round(zoom * 100) }}%
        </n-button>
        <n-button @click="$emit('zoom-in')" :disabled="zoom >= 2">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
        </n-button>
      </n-button-group>

      <!-- 全屏按钮 -->
      <n-button size="small" @click="$emit('toggle-fullscreen')">
        <template #icon>
          <n-icon><Expand /></n-icon>
        </template>
      </n-button>

      <!-- 更多操作下拉菜单（仅原版教材模式） -->
      <n-dropdown
        v-if="mode === 'flipbook'"
        trigger="click"
        :options="moreOptions"
        @select="handleMoreSelect"
      >
        <n-button size="small">
          <template #icon>
            <n-icon><EllipsisVertical /></n-icon>
          </template>
        </n-button>
      </n-dropdown>

      <!-- 隐藏的上传组件 -->
      <n-upload
        ref="uploadRef"
        :custom-request="handleUpload"
        accept=".pdf"
        :show-file-list="false"
        style="display: none;"
      >
        <n-button ref="uploadTriggerRef" style="display: none;"></n-button>
      </n-upload>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { NIcon } from 'naive-ui';
import { ArrowBack, TrashOutline, Expand, Add, Remove, BookOutline, EllipsisVertical, CloudUploadOutline } from '@vicons/ionicons5';

const props = defineProps({
  title: {
    type: String,
    default: '加载中...'
  },
  mode: {
    type: String,
    default: 'flipbook' // 'flipbook' | 'assist'
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 0
  },
  zoom: {
    type: Number,
    default: 1
  },
  pdfLoaded: {
    type: Boolean,
    default: false
  },
  isFullscreen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'back',
  'update:mode',
  'zoom-in',
  'zoom-out',
  'toggle-fullscreen',
  'delete-pdf',
  'upload-pdf'
]);

// 上传组件引用
const uploadRef = ref(null);

// 更多操作菜单选项
const moreOptions = computed(() => {
  const options = [];

  // 重新上传教材（始终显示）
  options.push({
    label: props.pdfLoaded ? '重新上传教材' : '上传教材',
    key: 'upload',
    icon: () => h(NIcon, null, { default: () => h(CloudUploadOutline) })
  });

  // 删除教材（仅已加载PDF时显示）
  if (props.pdfLoaded) {
    options.push({
      label: '删除教材',
      key: 'delete',
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
    });
  }

  return options;
});

// 更多菜单选择处理
const handleMoreSelect = (key) => {
  if (key === 'upload') {
    // 触发文件上传
    uploadRef.value?.openOpenFileDialog();
  } else if (key === 'delete') {
    emit('delete-pdf');
  }
};

// 上传处理
const handleUpload = (options) => {
  emit('upload-pdf', options);
};
</script>

<style scoped>
.reader-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: white;
  border-bottom: 2px solid #d9d9d9;
  gap: 20px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.toolbar-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-center {
  flex-shrink: 0;
}

.toolbar-center :deep(.n-tabs) {
  --n-tab-padding: 12px 24px;
}

.toolbar-center :deep(.n-tabs-tab) {
  padding: 10px 32px !important;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  transition: all 0.3s;
}

.toolbar-center :deep(.n-tabs-tab:hover) {
  color: #1890ff;
}

.toolbar-center :deep(.n-tabs-tab--active) {
  color: #1890ff !important;
  font-weight: 700;
}

.toolbar-center :deep(.n-tabs-tab__label) {
  white-space: nowrap;
}

.toolbar-center :deep(.n-tabs .n-tabs-rail) {
  background: #e0e0e0;
  border-radius: 8px;
  padding: 4px;
  border: 1px solid #ccc;
}

.toolbar-center :deep(.n-tabs .n-tabs-capsule) {
  background: white !important;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #1890ff;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  justify-content: flex-end;
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #e8e8e8;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.zoom-display {
  min-width: 56px;
  text-align: center;
  cursor: default !important;
  font-weight: 600;
  color: #333;
}

.toolbar-right :deep(.n-button) {
  border: 1px solid #ccc;
}

.toolbar-right :deep(.n-button:hover) {
  border-color: #1890ff;
}
</style>
