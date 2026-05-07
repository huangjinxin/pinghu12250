<template>
  <div class="stroke-renderer" :class="{ 'is-preview': previewMode, 'show-controls': showPlayback }">
    <!-- 预览模式：显示预览图 -->
    <img
      v-if="previewMode && previewUrl"
      :src="previewUrl"
      :alt="alt"
      class="preview-image"
      @click="handleClick"
    />

    <!-- 完整渲染模式：使用 Canvas -->
    <canvas
      v-else
      ref="canvasRef"
      class="stroke-canvas"
      :style="canvasStyle"
      @click="handleClick"
    />

    <!-- 加载中 -->
    <div v-if="loading" class="loading-overlay">
      <n-spin size="small" />
    </div>

    <!-- 回放控制 -->
    <div v-if="showPlayback && !previewMode" class="playback-controls">
      <n-button-group size="small">
        <n-button @click.stop="replay" :disabled="isPlaying" type="primary" ghost>
          <template #icon><n-icon><PlayOutline /></n-icon></template>
          播放
        </n-button>
        <n-button @click.stop="stopPlayback" :disabled="!isPlaying">
          <template #icon><n-icon><StopOutline /></n-icon></template>
        </n-button>
      </n-button-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import StopOutline from '@vicons/ionicons5/es/StopOutline'
import {
  renderStrokesToCanvas,
  isStrokeData,
  isLegacyImageData,
  getDrawingPreviewUrl,
  generatePreviewImage
} from '@/composables/useStrokeData';

const props = defineProps({
  // 笔画数据或旧版图片数据
  content: {
    type: Object,
    default: null
  },
  // 是否为预览模式（使用预览图，用于列表）
  previewMode: {
    type: Boolean,
    default: false
  },
  // 显示回放控制
  showPlayback: {
    type: Boolean,
    default: false
  },
  // 最大宽度
  maxWidth: {
    type: Number,
    default: 0
  },
  // 最大高度
  maxHeight: {
    type: Number,
    default: 0
  },
  // 背景色
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  // alt 文字
  alt: {
    type: String,
    default: '手写草稿'
  }
});

const emit = defineEmits(['click', 'preview-generated']);

const canvasRef = ref(null);
const loading = ref(false);
const isPlaying = ref(false);
const playbackTimer = ref(null);

// 预览图 URL
const previewUrl = computed(() => {
  return getDrawingPreviewUrl(props.content);
});

// Canvas 样式
const canvasStyle = computed(() => {
  if (!props.content) return {};

  let width, height;

  if (isStrokeData(props.content)) {
    width = props.content.canvas?.width || 800;
    height = props.content.canvas?.height || 600;
  } else {
    // 旧版数据默认尺寸
    width = 800;
    height = 600;
  }

  // 应用最大尺寸限制
  if (props.maxWidth && width > props.maxWidth) {
    const scale = props.maxWidth / width;
    width = props.maxWidth;
    height = Math.round(height * scale);
  }
  if (props.maxHeight && height > props.maxHeight) {
    const scale = props.maxHeight / height;
    height = props.maxHeight;
    width = Math.round(width * scale);
  }

  return {
    width: `${width}px`,
    height: `${height}px`
  };
});

// 渲染笔画到 Canvas
const renderStrokes = async () => {
  if (!canvasRef.value || props.previewMode) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');

  if (!props.content) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // 设置 Canvas 实际尺寸
  let targetWidth, targetHeight;

  if (isStrokeData(props.content)) {
    targetWidth = props.content.canvas?.width || 800;
    targetHeight = props.content.canvas?.height || 600;
  } else if (isLegacyImageData(props.content)) {
    // 旧版图片数据，直接绘制图片
    await renderLegacyImage(ctx);
    return;
  } else {
    return;
  }

  // 计算缩放
  let scale = 1;
  let displayWidth = targetWidth;
  let displayHeight = targetHeight;

  if (props.maxWidth && displayWidth > props.maxWidth) {
    scale = props.maxWidth / displayWidth;
    displayWidth = props.maxWidth;
    displayHeight = Math.round(displayHeight * scale);
  }
  if (props.maxHeight && displayHeight > props.maxHeight) {
    const newScale = props.maxHeight / displayHeight;
    scale *= newScale;
    displayHeight = props.maxHeight;
    displayWidth = Math.round(displayWidth * newScale);
  }

  // 设置 Canvas 尺寸
  const dpr = window.devicePixelRatio || 1;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  ctx.scale(dpr, dpr);

  // 填充背景
  ctx.fillStyle = props.backgroundColor;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // 渲染笔画
  renderStrokesToCanvas(ctx, props.content, { scale });
};

// 渲染旧版图片数据
const renderLegacyImage = (ctx) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.value;
      const dpr = window.devicePixelRatio || 1;

      let width = img.width;
      let height = img.height;

      // 应用最大尺寸限制
      if (props.maxWidth && width > props.maxWidth) {
        const scale = props.maxWidth / width;
        width = props.maxWidth;
        height = Math.round(height * scale);
      }
      if (props.maxHeight && height > props.maxHeight) {
        const scale = props.maxHeight / height;
        height = props.maxHeight;
        width = Math.round(width * scale);
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };
    img.onerror = resolve;
    img.src = props.content.image;
  });
};

// 回放动画
const replay = async () => {
  if (!canvasRef.value || !isStrokeData(props.content) || isPlaying.value) return;

  isPlaying.value = true;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const strokes = props.content.strokes || [];
  const dpr = window.devicePixelRatio || 1;

  // 清除画布（先clearRect再填充背景）
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);  // 重置变换
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 重新应用 dpr 缩放
  ctx.save();
  ctx.scale(dpr, dpr);

  // 填充背景（如果不是透明）
  if (props.backgroundColor && props.backgroundColor !== 'transparent') {
    ctx.fillStyle = props.backgroundColor;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  // 计算缩放
  const targetWidth = props.content.canvas?.width || 800;
  let scale = canvas.width / (window.devicePixelRatio || 1) / targetWidth;

  // 逐笔画回放
  for (const stroke of strokes) {
    if (!isPlaying.value) break;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color || '#000000';
    ctx.lineWidth = (stroke.lineWidth || 2) * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = stroke.points;
    if (points.length < 2) continue;

    ctx.moveTo(points[0].x * scale, points[0].y * scale);

    for (let i = 1; i < points.length; i++) {
      if (!isPlaying.value) break;

      ctx.lineTo(points[i].x * scale, points[i].y * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(points[i].x * scale, points[i].y * scale);

      // 根据时间间隔延迟
      const delay = Math.min(points[i].t - points[i - 1].t, 50);
      if (delay > 0) {
        await new Promise(resolve => {
          playbackTimer.value = setTimeout(resolve, delay);
        });
      }
    }

    ctx.stroke();
  }

  ctx.restore();  // 恢复之前保存的状态
  isPlaying.value = false;
};

// 停止回放
const stopPlayback = () => {
  isPlaying.value = false;
  if (playbackTimer.value) {
    clearTimeout(playbackTimer.value);
    playbackTimer.value = null;
  }
  // 重新渲染完整内容
  renderStrokes();
};

// 点击处理
const handleClick = () => {
  emit('click');
};

// 监听内容变化
watch(() => props.content, () => {
  if (!props.previewMode) {
    nextTick(renderStrokes);
  }
}, { deep: true });

// 监听预览模式变化
watch(() => props.previewMode, (newVal) => {
  if (!newVal) {
    nextTick(renderStrokes);
  }
});

onMounted(() => {
  if (!props.previewMode) {
    renderStrokes();
  }
});

onUnmounted(() => {
  stopPlayback();
});

// 暴露方法
defineExpose({
  replay,
  stopPlayback,
  renderStrokes
});
</script>

<style scoped>
.stroke-renderer {
  position: relative;
  display: inline-block;
}

.preview-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  cursor: pointer;
}

.stroke-canvas {
  display: block;
  border-radius: 4px;
  cursor: pointer;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
}

.playback-controls {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 当 showPlayback 时始终显示控制按钮 */
.stroke-renderer.show-controls .playback-controls {
  opacity: 1;
}

.stroke-renderer:hover .playback-controls {
  opacity: 1;
}
</style>
