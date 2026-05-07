<!--
  书写作品全屏练习组件
  用于临摹字帖，完成后保存到作品库
-->
<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    class="calligraphy-modal"
    preset="card"
    :style="{ width: '100vw', height: '100vh', maxWidth: '100vw' }"
    :content-style="{ padding: 0, height: '100%' }"
    :header-style="{ display: 'none' }"
  >
    <div class="practice-container" @contextmenu.prevent @selectstart.prevent>
      <!-- 顶部工具栏 -->
      <div class="practice-header">
        <div class="header-left">
          <n-button text @click="handleClose">
            <template #icon><n-icon size="24"><CloseOutline /></n-icon></template>
          </n-button>
          <span class="title">临摹练习</span>
          <n-tag type="info" size="small">
            {{ currentIndex + 1 }} / {{ characters.length }}
          </n-tag>
        </div>

        <div class="header-center">
          <div class="current-char-info">
            <span class="current-char" :style="fontStyle">{{ currentCharacter }}</span>
          </div>
        </div>

        <div class="header-right">
          <!-- 缩放控制 -->
          <div class="zoom-controls">
            <n-button size="small" :disabled="canvasScale <= 1" @click="zoomOut">
              <template #icon><n-icon><RemoveOutline /></n-icon></template>
            </n-button>
            <span class="zoom-label">{{ Math.round(canvasScale * 100) }}%</span>
            <n-button size="small" :disabled="canvasScale >= 2" @click="zoomIn">
              <template #icon><n-icon><AddOutline /></n-icon></template>
            </n-button>
          </div>
          <n-divider vertical />
          <n-radio-group v-model:value="gridType" size="small">
            <n-radio-button value="mi">米字格</n-radio-button>
            <n-radio-button value="tian">田字格</n-radio-button>
            <n-radio-button value="english">英文格</n-radio-button>
          </n-radio-group>
        </div>
      </div>

      <!-- 主练习区域 -->
      <div class="practice-main">
        <!-- 左侧：参考字 -->
        <div class="reference-area">
          <div class="reference-grid" :class="gridType">
            <canvas ref="refGridCanvas" class="ref-grid-canvas" />
            <span class="reference-char" :style="fontStyle">{{ currentCharacter }}</span>
          </div>
        </div>

        <!-- 中间：书写区域 -->
        <div class="writing-area">
          <div class="writing-grid-container" :class="gridType" :style="writingContainerStyle">
            <div v-if="tracingMode" class="tracing-char" :style="{ ...fontStyle, fontSize: actualCanvasSize * 0.67 + 'px' }">{{ currentCharacter }}</div>
            <canvas
              ref="writingCanvas"
              class="writing-canvas"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
              @pointercancel="handlePointerUp"
              @pointerleave="handlePointerUp"
              @contextmenu.prevent
              @touchstart.prevent
              @touchmove.prevent
            />
          </div>

          <!-- 书写工具栏 -->
          <div class="writing-toolbar">
            <n-button-group>
              <n-button @click="undoStroke" :disabled="!hasStrokes">
                <template #icon><n-icon><ArrowUndoOutline /></n-icon></template>
                撤销
              </n-button>
              <n-button @click="clearCanvas" :disabled="!hasStrokes">
                <template #icon><n-icon><TrashOutline /></n-icon></template>
                清除
              </n-button>
            </n-button-group>

            <n-button
              :type="tracingMode ? 'primary' : 'default'"
              @click="tracingMode = !tracingMode"
            >
              <template #icon><n-icon><EyeOutline /></n-icon></template>
              临摹
            </n-button>

            <div class="pen-settings">
              <span class="label">笔宽:</span>
              <n-slider
                v-model:value="penWidth"
                :min="2"
                :max="12"
                :step="1"
                style="width: 100px"
              />
              <n-color-picker
                v-model:value="penColor"
                :swatches="colorSwatches"
                size="small"
                :show-preview="true"
              />
            </div>
          </div>
        </div>

        <!-- 右侧：已完成的字 -->
        <div class="history-area">
          <div class="history-title">已完成 <span class="history-hint">(点击可编辑)</span></div>
          <div class="history-list">
            <div
              v-for="(record, idx) in completedRecords"
              :key="idx"
              class="history-item"
              :class="{ 'history-item-active': editingIndex === idx }"
              @click="editCompletedChar(idx)"
            >
              <img
                v-if="record.preview"
                :src="record.preview"
                alt="练习记录"
                class="history-preview"
              />
              <div class="history-char">{{ record.character }}</div>
            </div>
          </div>
          <n-empty v-if="completedRecords.length === 0" description="开始书写吧" size="small" />
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="practice-footer">
        <div class="footer-left">
          <n-button
            :disabled="currentIndex === 0"
            @click="prevCharacter"
          >
            <template #icon><n-icon><ChevronBackOutline /></n-icon></template>
            上一个
          </n-button>
        </div>

        <div class="footer-center">
          <n-button
            v-if="editingIndex >= 0"
            @click="cancelEdit"
            style="margin-right: 12px"
          >
            取消编辑
          </n-button>
          <n-button
            type="primary"
            size="large"
            :loading="saving"
            :disabled="!hasStrokes"
            @click="saveAndNext"
          >
            <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
            {{ editingIndex >= 0 ? '保存修改' : (isLastCharacter ? '保存并完成' : '保存并下一个') }}
          </n-button>
        </div>

        <div class="footer-right">
          <n-button
            :disabled="isLastCharacter"
            @click="skipToNext"
          >
            跳过
            <template #icon><n-icon><ChevronForwardOutline /></n-icon></template>
          </n-button>
        </div>
      </div>
    </div>

    <!-- 完成预览弹窗 -->
    <n-modal v-model:show="showPreview" preset="card" title="作品预览" style="width: 600px">
      <div class="preview-content">
        <div class="preview-grid">
          <div v-for="(record, idx) in completedRecords" :key="idx" class="preview-item">
            <img :src="record.preview" :alt="record.character" />
          </div>
        </div>
        <div class="preview-text">{{ props.text }}</div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px">
          <n-button @click="showPreview = false">继续编辑</n-button>
          <n-button type="primary" :loading="saving" @click="saveWork">
            保存到作品库
          </n-button>
        </div>
      </template>
    </n-modal>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import ArrowUndoOutline from '@vicons/ionicons5/es/ArrowUndoOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import ChevronBackOutline from '@vicons/ionicons5/es/ChevronBackOutline'
import ChevronForwardOutline from '@vicons/ionicons5/es/ChevronForwardOutline'
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline'
import EyeOutline from '@vicons/ionicons5/es/EyeOutline'
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import RemoveOutline from '@vicons/ionicons5/es/RemoveOutline'
import { useStrokeData, generatePreviewImage } from '@/composables/useStrokeData';
import { calligraphyAPI, fontAPI } from '@/api/index';

const props = defineProps({
  text: { type: String, required: true },
  font: { type: Object, default: null }
});

const emit = defineEmits(['close', 'complete']);

const message = useMessage();
const visible = ref(true);

// 练习状态
const currentIndex = ref(0);
const gridType = ref('mi');
const saving = ref(false);
const completedRecords = ref([]);
const tracingMode = ref(false);
const showPreview = ref(false);
const editingIndex = ref(-1);  // 正在编辑的已完成字的索引，-1表示不在编辑模式

// 笔画数据管理
const strokeData = useStrokeData();
const { strokes, initCanvas, startStroke, addPoint, endStroke, clearStrokes, undoLastStroke, exportStrokeData, importStrokeData, hasContent } = strokeData;

// 画笔设置
const penWidth = ref(4);
const penColor = ref('#333333');
const colorSwatches = ['#333333', '#1890ff', '#f5222d', '#52c41a', '#faad14'];

// Canvas 引用
const refGridCanvas = ref(null);
const writingCanvas = ref(null);

// 绘制状态
const isDrawing = ref(false);
const baseCanvasSize = 300;  // 基础大小
const canvasScale = ref(1);  // 缩放比例 1-2

// 计算实际画布大小
const actualCanvasSize = computed(() => Math.round(baseCanvasSize * canvasScale.value));

// 书写容器样式
const writingContainerStyle = computed(() => ({
  width: actualCanvasSize.value + 'px',
  height: actualCanvasSize.value + 'px'
}));

// 缩放控制
const zoomIn = () => {
  if (canvasScale.value < 2) {
    canvasScale.value = Math.min(2, canvasScale.value + 0.25);
    nextTick(() => initCanvases());
  }
};

const zoomOut = () => {
  if (canvasScale.value > 1) {
    canvasScale.value = Math.max(1, canvasScale.value - 0.25);
    nextTick(() => initCanvases());
  }
};

// 字体加载状态
const fontLoaded = ref(false);

// 字符列表（去除空白字符）
const characters = computed(() => {
  return props.text.replace(/\s/g, '').split('');
});

const currentCharacter = computed(() => characters.value[currentIndex.value] || '');
const isLastCharacter = computed(() => currentIndex.value >= characters.value.length - 1);
const hasStrokes = computed(() => hasContent());

// 字体样式
const fontStyle = computed(() => {
  if (props.font && fontLoaded.value) {
    return { fontFamily: `UserFont_${props.font.id}` };
  }
  return { fontFamily: 'KaiTi, STKaiti, serif' };
});

// 加载用户字体
const loadFont = async () => {
  if (!props.font) return;
  try {
    const fontFace = new FontFace(
      `UserFont_${props.font.id}`,
      `url(${fontAPI.getFileUrl(props.font.id)})`
    );
    await fontFace.load();
    document.fonts.add(fontFace);
    fontLoaded.value = true;
  } catch (error) {
    console.error('加载字体失败:', error);
  }
};

// 绘制米字格/田字格背景
const drawGridBackground = (canvas, type, size, transparent = false) => {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  if (transparent) {
    ctx.clearRect(0, 0, size, size);
  } else {
    ctx.fillStyle = type === 'english' ? '#fff' : '#FDF5E6';
    ctx.fillRect(0, 0, size, size);
  }

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  ctx.strokeStyle = '#CD5C5C';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  if (type === 'mi') {
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();
  } else if (type === 'english') {
    // 英文四线三格：顶线、上线、中线、下线
    const pad = 8;
    const lineSpacing = (size - pad * 2) / 3;
    
    // 顶线（实线，较浅）
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(size - pad, pad);
    ctx.stroke();

    // 上线（实线，用于大写字母和上升笔画顶部）
    ctx.strokeStyle = '#CD5C5C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad + lineSpacing);
    ctx.lineTo(size - pad, pad + lineSpacing);
    ctx.stroke();

    // 中线（虚线，用于小写字母主体高度）
    ctx.strokeStyle = '#CD5C5C';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + lineSpacing * 2);
    ctx.lineTo(size - pad, pad + lineSpacing * 2);
    ctx.stroke();

    // 下线（实线，用于下降笔画底部）
    ctx.strokeStyle = '#CD5C5C';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pad, size - pad);
    ctx.lineTo(size - pad, size - pad);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();
  }

  ctx.setLineDash([]);
};

// 渲染书写画布
const renderWritingCanvas = () => {
  const canvas = writingCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = actualCanvasSize.value;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  drawGridBackground(canvas, gridType.value, size, true);

  for (const stroke of strokes.value) {
    if (!stroke.points || stroke.points.length < 2) continue;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color || penColor.value;
    ctx.lineWidth = stroke.lineWidth || penWidth.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = stroke.points;
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
  }
};

// 触摸/鼠标事件处理
const getEventPos = (e) => {
  const canvas = writingCanvas.value;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top),
    pressure: e.pressure || 0.5
  };
};

const handlePointerDown = (e) => {
  e.preventDefault();
  writingCanvas.value?.setPointerCapture(e.pointerId);

  const pos = getEventPos(e);
  isDrawing.value = true;

  startStroke(pos.x, pos.y, {
    color: penColor.value,
    lineWidth: penWidth.value,
    pressure: pos.pressure
  });

  renderWritingCanvas();
};

const handlePointerMove = (e) => {
  if (!isDrawing.value) return;
  e.preventDefault();

  const pos = getEventPos(e);
  addPoint(pos.x, pos.y, pos.pressure);

  const canvas = writingCanvas.value;
  const ctx = canvas.getContext('2d');
  const currentStroke = strokeData.currentStroke.value;

  if (currentStroke && currentStroke.points.length >= 2) {
    const points = currentStroke.points;
    const last = points[points.length - 2];
    const curr = points[points.length - 1];

    ctx.beginPath();
    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = currentStroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }
};

const handlePointerUp = (e) => {
  if (!isDrawing.value) return;

  writingCanvas.value?.releasePointerCapture(e.pointerId);
  isDrawing.value = false;
  endStroke();
  renderWritingCanvas();
};

// 撤销
const undoStroke = () => {
  undoLastStroke();
  renderWritingCanvas();
};

// 清除画布
const clearCanvas = () => {
  clearStrokes();
  renderWritingCanvas();
};

// 保存当前字并进入下一个
const saveAndNext = async () => {
  if (!hasStrokes.value) {
    message.warning('请先书写');
    return;
  }

  saving.value = true;
  try {
    const data = exportStrokeData();
    const preview = await generatePreviewImage(data, {
      width: actualCanvasSize.value,
      height: actualCanvasSize.value,
      gridType: gridType.value
    });

    // 如果是编辑模式，更新已完成的记录
    if (editingIndex.value >= 0) {
      completedRecords.value[editingIndex.value] = {
        character: currentCharacter.value,
        strokeData: data,
        preview
      };
      message.success('已更新');
      // 退出编辑模式，回到原来的位置
      editingIndex.value = -1;
      clearStrokes();
      await nextTick();
      initCanvases();
    } else {
      // 正常模式，添加新记录
      completedRecords.value.push({
        character: currentCharacter.value,
        strokeData: data,
        preview
      });

      if (isLastCharacter.value) {
        // 最后一个字，显示预览
        showPreview.value = true;
      } else {
        // 进入下一个
        currentIndex.value++;
        clearStrokes();
        await nextTick();
        initCanvases();
      }
    }
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 编辑已完成的字
const editCompletedChar = async (idx) => {
  const record = completedRecords.value[idx];
  if (!record) return;

  // 找到这个字在原始字符列表中的位置
  const charIndex = characters.value.indexOf(record.character);
  if (charIndex === -1) return;

  // 设置编辑模式
  editingIndex.value = idx;
  currentIndex.value = charIndex;

  // 导入已有的笔画数据
  if (record.strokeData) {
    importStrokeData(record.strokeData);
  } else {
    clearStrokes();
  }

  await nextTick();
  initCanvases();
  renderWritingCanvas();
  message.info(`正在编辑「${record.character}」，修改后点击保存`);
};

// 取消编辑
const cancelEdit = async () => {
  editingIndex.value = -1;
  clearStrokes();
  await nextTick();
  initCanvases();
};

// 保存作品到作品库
const saveWork = async () => {
  saving.value = true;
  try {
    // 生成合并预览图
    const combinedPreview = await generateCombinedPreview();

    const res = await calligraphyAPI.create({
      title: props.text,
      content: completedRecords.value.map(r => ({
        character: r.character,
        strokeData: r.strokeData,
        preview: r.preview  // 保存每个字的预览图
      })),
      preview: combinedPreview,
      fontId: props.font?.id,
      charCount: completedRecords.value.length
    });

    if (res.success) {
      message.success('作品已保存');
      emit('complete');
    } else {
      throw new Error(res.error);
    }
  } catch (error) {
    console.error('保存作品失败:', error);
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 生成合并预览图
const generateCombinedPreview = async () => {
  const records = completedRecords.value;
  const cols = Math.min(records.length, 5);
  const rows = Math.ceil(records.length / cols);
  const cellSize = 100;
  const padding = 10;

  const canvas = document.createElement('canvas');
  canvas.width = cols * cellSize + padding * 2;
  canvas.height = rows * cellSize + padding * 2;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < records.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * cellSize;
    const y = padding + row * cellSize;

    const img = new Image();
    img.src = records[i].preview;
    await new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    ctx.drawImage(img, x, y, cellSize, cellSize);
  }

  return canvas.toDataURL('image/webp', 0.8);
};

// 跳过当前字
const skipToNext = () => {
  if (!isLastCharacter.value) {
    currentIndex.value++;
    clearStrokes();
    nextTick(() => initCanvases());
  }
};

// 上一个字
const prevCharacter = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    clearStrokes();
    nextTick(() => initCanvases());
  }
};

// 关闭
const handleClose = () => {
  visible.value = false;
  emit('close');
};

// 初始化画布
const initCanvases = () => {
  drawGridBackground(refGridCanvas.value, gridType.value, 120);
  initCanvas(actualCanvasSize.value, actualCanvasSize.value, window.devicePixelRatio || 1);
  renderWritingCanvas();
};

// 监听格子类型变化
watch(gridType, () => {
  initCanvases();
});

onMounted(async () => {
  await loadFont();
  await nextTick();
  initCanvases();
});
</script>

<style scoped>
.practice-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  user-select: none;
  -webkit-user-select: none;
}

.practice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 500;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.current-char-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.current-char {
  font-size: 32px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-label {
  font-size: 13px;
  color: #666;
  min-width: 45px;
  text-align: center;
}

.practice-main {
  flex: 1;
  display: flex;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
}

.reference-area {
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reference-grid {
  position: relative;
  width: 120px;
  height: 120px;
}

.reference-grid.english {
  background: #fff;
}

.ref-grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.reference-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 72px;
  color: #333;
  pointer-events: none;
}

.writing-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
}

.writing-grid-container {
  position: relative;
  background: #FDF5E6;
  border: 2px solid #1a1a1a;
  border-radius: 4px;
  flex-shrink: 0;
}

.writing-grid-container.english {
  background: #fff;
}

.tracing-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(0, 0, 0, 0.1);
  pointer-events: none;
  z-index: 1;
}

.writing-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  touch-action: none;
}

.writing-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
}

.pen-settings {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pen-settings .label {
  font-size: 13px;
  color: #666;
}

.history-area {
  width: 180px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  overflow-y: auto;
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
}

.history-hint {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.history-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.history-item {
  text-align: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.history-item:hover {
  background-color: #f5f5f5;
}

.history-item-active {
  background-color: #e6f7ff;
  border: 1px solid #1890ff;
}

.history-preview {
  width: 70px;
  height: 70px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.history-char {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.practice-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

.footer-left,
.footer-right {
  width: 120px;
}

.footer-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* 预览弹窗 */
.preview-content {
  text-align: center;
}

.preview-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.preview-item img {
  width: 80px;
  height: 80px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.preview-text {
  font-size: 18px;
  color: #333;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
