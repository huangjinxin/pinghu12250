<!--
  全屏书写练习组件
  支持米字格/田字格背景
  多字练习时逐个保存独立记录
-->
<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    class="practice-modal"
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
          <span class="title">书写练习</span>
          <n-tag v-if="characters.length > 1" type="info" size="small">
            {{ currentIndex + 1 }} / {{ characters.length }}
          </n-tag>
        </div>

        <div class="header-center">
          <div class="current-char-info">
            <span class="current-char">{{ currentCharacter }}</span>
            <span v-if="currentPinyin" class="current-pinyin">{{ currentPinyin }}</span>
          </div>
        </div>

        <div class="header-right">
          <n-radio-group v-model:value="gridType" size="small">
            <n-radio-button value="mi">米字格</n-radio-button>
            <n-radio-button value="tian">田字格</n-radio-button>
          </n-radio-group>
        </div>
      </div>

      <!-- 主练习区域 -->
      <div class="practice-main">
        <!-- 左侧：参考字 -->
        <div class="reference-area">
          <div class="reference-grid" :class="gridType">
            <canvas ref="refGridCanvas" class="ref-grid-canvas" />
            <span class="reference-char">{{ currentCharacter }}</span>
          </div>
          <div v-if="currentDefinition" class="reference-definition">
            {{ currentDefinition }}
          </div>
        </div>

        <!-- 中间：书写区域 -->
        <div class="writing-area">
          <div class="writing-grid-container">
            <!-- 临摹参考字（半透明） -->
            <div v-if="tracingMode" class="tracing-char">{{ currentCharacter }}</div>
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

        <!-- 右侧：历史记录 -->
        <div class="history-area">
          <div class="history-title">本次练习</div>
          <div class="history-list">
            <div
              v-for="(record, idx) in currentSessionRecords"
              :key="idx"
              class="history-item"
              :class="{ active: idx === currentSessionRecords.length - 1 }"
            >
              <img
                v-if="record.preview"
                :src="record.preview"
                alt="练习记录"
                class="history-preview"
              />
              <div class="history-meta">
                <span class="history-char">{{ record.character }}</span>
                <span class="history-time">{{ formatTime(record.createdAt) }}</span>
              </div>
            </div>
          </div>
          <n-empty v-if="currentSessionRecords.length === 0" description="开始书写吧" size="small" />
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
            type="primary"
            size="large"
            :loading="saving"
            :disabled="!hasStrokes"
            @click="saveAndNext"
          >
            <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
            {{ isLastCharacter ? '保存并完成' : '保存并下一个' }}
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
import { useStrokeData, generatePreviewImage } from '@/composables/useStrokeData';
import { textbookNoteAPI } from '@/api';

const props = defineProps({
  // 要练习的笔记列表
  notes: {
    type: Array,
    required: true
  },
  // 初始索引
  initialIndex: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['close', 'save', 'complete']);

const message = useMessage();
const visible = ref(true);

// 练习状态
const currentIndex = ref(props.initialIndex);
const gridType = ref('mi');
const saving = ref(false);
const currentSessionRecords = ref([]);
const tracingMode = ref(false);  // 临摹模式

// 笔画数据管理
const strokeData = useStrokeData();
const { strokes, initCanvas, startStroke, addPoint, endStroke, clearStrokes, undoLastStroke, exportStrokeData, hasContent } = strokeData;

// 画笔设置
const penWidth = ref(4);
const penColor = ref('#333333');
const colorSwatches = ['#333333', '#1890ff', '#f5222d', '#52c41a', '#faad14'];

// Canvas 引用
const refGridCanvas = ref(null);
const writingCanvas = ref(null);

// 绘制状态
const isDrawing = ref(false);
const canvasSize = 300;

// 当前字符信息
const characters = computed(() => {
  return props.notes.map(note => ({
    character: note.query || note.content?.character || '字',
    pinyin: note.content?.pinyin || '',
    definition: note.content?.definition || note.content?.meaning || '',
    noteId: note.id,
    textbookId: note.textbookId
  }));
});

const currentCharacter = computed(() => characters.value[currentIndex.value]?.character || '');
const currentPinyin = computed(() => characters.value[currentIndex.value]?.pinyin || '');
const currentDefinition = computed(() => characters.value[currentIndex.value]?.definition || '');
const isLastCharacter = computed(() => currentIndex.value >= characters.value.length - 1);
const hasStrokes = computed(() => hasContent());

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
    // 透明背景（用于书写区域，让临摹字显示）
    ctx.clearRect(0, 0, size, size);
  } else {
    // 填充米黄色背景
    ctx.fillStyle = '#FDF5E6';
    ctx.fillRect(0, 0, size, size);
  }

  // 外框 - 深黑色
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  // 内部线条 - 暗红色（传统红线）
  ctx.strokeStyle = '#CD5C5C';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  if (type === 'mi') {
    // 米字格
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
  } else {
    // 田字格
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
  const size = canvasSize;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  // 绘制背景格子（透明背景，让临摹字显示）
  drawGridBackground(canvas, gridType.value, size, true);

  // 绘制所有笔画
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
  const dpr = window.devicePixelRatio || 1;
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

  // 实时渲染当前笔画
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

// 保存当前练习并进入下一个
const saveAndNext = async () => {
  if (!hasStrokes.value) {
    message.warning('请先书写');
    return;
  }

  saving.value = true;

  try {
    // 导出笔画数据
    const data = exportStrokeData();

    // 生成预览图
    const preview = await generatePreviewImage(data, {
      maxWidth: 200,
      maxHeight: 200,
      backgroundColor: '#ffffff'
    });

    // 构建保存数据
    const currentNote = props.notes[currentIndex.value];
    const saveData = {
      textbookId: currentNote.textbookId || 'vocabulary',
      sessionId: `practice_${Date.now()}`,
      sourceType: 'writing_practice',
      query: currentCharacter.value,
      content: {
        ...data,
        preview,
        character: currentCharacter.value,
        originalNoteId: currentNote.id,
        gridType: gridType.value
      },
      snippet: `书写练习: ${currentCharacter.value}`,
      page: currentNote.page || 1
    };

    // 保存到后端
    const res = await textbookNoteAPI.create(saveData);

    if (res.success) {
      // 添加到本次会话记录
      currentSessionRecords.value.push({
        id: res.data?.id,
        character: currentCharacter.value,
        preview,
        createdAt: new Date().toISOString()
      });

      emit('save', {
        noteId: currentNote.id,
        practiceId: res.data?.id,
        character: currentCharacter.value
      });

      message.success('保存成功');

      // 清除画布准备下一个
      clearCanvas();

      // 进入下一个或完成
      if (isLastCharacter.value) {
        emit('complete', currentSessionRecords.value);
        handleClose();
      } else {
        currentIndex.value++;
      }
    } else {
      message.error('保存失败');
    }
  } catch (error) {
    console.error('保存练习失败:', error);
    message.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
};

// 跳过当前字
const skipToNext = () => {
  if (!isLastCharacter.value) {
    clearCanvas();
    currentIndex.value++;
  }
};

// 上一个字
const prevCharacter = () => {
  if (currentIndex.value > 0) {
    clearCanvas();
    currentIndex.value--;
  }
};

// 关闭
const handleClose = () => {
  visible.value = false;
  emit('close');
};

// 格式化时间
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 初始化
onMounted(() => {
  nextTick(() => {
    // 初始化画布尺寸
    initCanvas(canvasSize, canvasSize, window.devicePixelRatio || 1);

    // 绘制参考格子
    drawGridBackground(refGridCanvas.value, gridType.value, 120);

    // 绘制书写画布
    renderWritingCanvas();
  });
});

// 监听格子类型变化
watch(gridType, () => {
  nextTick(() => {
    drawGridBackground(refGridCanvas.value, gridType.value, 120);
    renderWritingCanvas();
  });
});

// 监听当前字符变化
watch(currentIndex, () => {
  nextTick(() => {
    renderWritingCanvas();
  });
});
</script>

<style scoped>
.practice-modal :deep(.n-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.practice-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  /* 防止触摸设备上的文本选择和上下文菜单 */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* 顶部工具栏 */
.practice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.current-char-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.current-char {
  font-size: 36px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: #CC0000;  /* 正红色 */
  line-height: 1;
}

.current-pinyin {
  font-size: 14px;
  color: #1890ff;
  margin-top: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 主练习区域 */
.practice-main {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

/* 左侧参考区 */
.reference-area {
  width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

.reference-grid {
  position: relative;
  width: 120px;
  height: 120px;
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
  font-family: 'KaiTi', 'STKaiti', serif;
  color: #CC0000;  /* 正红色 */
  z-index: 1;
}

.reference-definition {
  margin-top: 16px;
  font-size: 13px;
  color: #666;
  text-align: center;
  line-height: 1.5;
}

/* 中间书写区 */
.writing-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.writing-grid-container {
  position: relative;
  background: #FDF5E6;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* 临摹参考字 */
.tracing-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 200px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(204, 0, 0, 0.15);  /* 半透明红色 */
  pointer-events: none;
  z-index: 1;
  user-select: none;
  -webkit-user-select: none;
}

.writing-canvas {
  position: relative;
  z-index: 2;
  display: block;
  cursor: crosshair;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.writing-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: white;
  border-radius: 8px;
}

.pen-settings {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pen-settings .label {
  font-size: 13px;
  color: #666;
}

/* 右侧历史记录 */
.history-area {
  width: 180px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.history-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f0f5ff;
}

.history-item.active {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.history-preview {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.history-meta {
  display: flex;
  flex-direction: column;
}

.history-char {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.history-time {
  font-size: 11px;
  color: #999;
}

/* 底部操作栏 */
.practice-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
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

/* 响应式 */
@media (max-width: 768px) {
  .practice-main {
    flex-direction: column;
  }

  .reference-area,
  .history-area {
    width: 100%;
    flex-direction: row;
    justify-content: center;
    gap: 20px;
  }

  .history-list {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
