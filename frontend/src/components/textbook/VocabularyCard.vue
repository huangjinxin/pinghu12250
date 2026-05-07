<!--
  生词卡片组件
  显示单个生字/词，支持米字格/田字格显示
  点击向右展开详情
-->
<template>
  <div
    class="vocabulary-card"
    :class="{ expanded: isExpanded, selected: selected }"
    @click="handleClick"
  >
    <!-- 主内容区（字符 + 拼音） -->
    <div class="card-main">
      <!-- 米字格/田字格显示区 -->
      <div class="grid-container" :class="gridType">
        <canvas
          ref="gridCanvas"
          class="grid-canvas"
          :width="canvasSize"
          :height="canvasSize"
        />
        <span class="character">{{ character }}</span>
      </div>

      <!-- 拼音（始终显示） -->
      <div v-if="pinyin" class="pinyin">{{ pinyin }}</div>
    </div>

    <!-- 展开的详情（向右展开） -->
    <transition name="slide-right">
      <div v-if="isExpanded" class="details" @click.stop>
        <!-- 解释 -->
        <div v-if="definition" class="definition">
          <div class="label">释义</div>
          <div class="content">{{ definition }}</div>
        </div>

        <!-- 组词 -->
        <div v-if="words && words.length > 0" class="words">
          <div class="label">组词</div>
          <div class="content">
            <n-tag v-for="word in words" :key="word" size="small" class="word-tag">
              {{ word }}
            </n-tag>
          </div>
        </div>

        <!-- 笔顺（如果有） -->
        <div v-if="strokeOrder" class="stroke-order">
          <div class="label">笔顺</div>
          <div class="content">{{ strokeOrder }}</div>
        </div>

        <!-- 操作按钮：只显示书写练习和更多 -->
        <div class="actions">
          <n-button size="small" type="primary" @click.stop="startPractice">
            <template #icon><n-icon><CreateOutline /></n-icon></template>
            书写练习
          </n-button>
          <n-dropdown
            trigger="click"
            :options="moreOptions"
            @select="handleMoreSelect"
          >
            <n-button size="small" quaternary @click.stop>
              <template #icon><n-icon><EllipsisHorizontalOutline /></n-icon></template>
              更多
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, h } from 'vue';
import { NIcon } from 'naive-ui';
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import Heart from '@vicons/ionicons5/es/Heart'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import EllipsisHorizontalOutline from '@vicons/ionicons5/es/EllipsisHorizontalOutline'
import TimeOutline from '@vicons/ionicons5/es/TimeOutline'

const props = defineProps({
  // 笔记数据
  note: {
    type: Object,
    required: true
  },
  // 格子类型：'mi' 米字格 | 'tian' 田字格
  gridType: {
    type: String,
    default: 'mi'
  },
  // 是否选中
  selected: {
    type: Boolean,
    default: false
  },
  // 练习记录列表
  practiceRecords: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['click', 'practice', 'favorite', 'view-record', 'delete']);

const gridCanvas = ref(null);
const isExpanded = ref(false);
const canvasSize = 80; // 格子大小

// 从笔记数据提取信息
const character = computed(() => {
  return props.note?.query || props.note?.content?.character || '字';
});

const pinyin = computed(() => {
  return props.note?.content?.pinyin || '';
});

const definition = computed(() => {
  return props.note?.content?.definition || props.note?.content?.meaning || '';
});

const words = computed(() => {
  return props.note?.content?.words || props.note?.content?.compounds || [];
});

const strokeOrder = computed(() => {
  return props.note?.content?.strokeOrder || '';
});

const isFavorite = computed(() => {
  return props.note?.isFavorite || false;
});

// 更多菜单选项
const moreOptions = computed(() => {
  const options = [];

  // 收藏选项
  options.push({
    key: 'favorite',
    label: isFavorite.value ? '取消收藏' : '收藏',
    icon: () => h(NIcon, null, { default: () => h(isFavorite.value ? Heart : HeartOutline) })
  });

  // 练习记录选项（如果有）
  if (props.practiceRecords.length > 0) {
    options.push({
      key: 'records',
      label: `练习记录 (${props.practiceRecords.length}次)`,
      icon: () => h(NIcon, null, { default: () => h(TimeOutline) })
    });
  }

  // 分隔线
  options.push({ type: 'divider' });

  // 删除选项
  options.push({
    key: 'delete',
    label: '删除',
    icon: () => h(NIcon, { color: '#ff4d4f' }, { default: () => h(TrashOutline) })
  });

  return options;
});

// 处理更多菜单选择
const handleMoreSelect = (key) => {
  switch (key) {
    case 'favorite':
      toggleFavorite();
      break;
    case 'records':
      if (props.practiceRecords.length > 0) {
        viewRecord(props.practiceRecords[0]);
      }
      break;
    case 'delete':
      handleDelete();
      break;
  }
};

// 删除生词
const handleDelete = () => {
  emit('delete', props.note);
};

// 绘制米字格/田字格背景
const drawGrid = () => {
  const canvas = gridCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvasSize;
  const dpr = window.devicePixelRatio || 1;

  // 设置高清显示
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  // 填充米黄色背景
  ctx.fillStyle = '#FDF5E6';
  ctx.fillRect(0, 0, size, size);

  // 绘制外框 - 深黑色
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  // 绘制内部线条 - 暗红色（传统红线）
  ctx.strokeStyle = '#CD5C5C';
  ctx.lineWidth = 1;

  if (props.gridType === 'mi') {
    // 米字格：十字 + 对角线
    ctx.setLineDash([4, 4]);

    // 横线
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // 竖线
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    // 对角线
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();
  } else {
    // 田字格：十字
    ctx.setLineDash([4, 4]);

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

// 点击卡片
const handleClick = () => {
  isExpanded.value = !isExpanded.value;
  emit('click', props.note);
};

// 开始练习
const startPractice = () => {
  emit('practice', props.note);
};

// 切换收藏
const toggleFavorite = () => {
  emit('favorite', props.note);
};

// 查看练习记录
const viewRecord = (record) => {
  emit('view-record', record);
};

onMounted(() => {
  nextTick(() => {
    drawGrid();
  });
});

watch(() => props.gridType, () => {
  nextTick(() => {
    drawGrid();
  });
});
</script>

<style scoped>
.vocabulary-card {
  display: inline-flex;
  align-items: flex-start;
  background: white;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  vertical-align: top;
}

.vocabulary-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.vocabulary-card.expanded {
  border-color: #1890ff;
}

.vocabulary-card.selected {
  border-color: #52c41a;
  background: #f6ffed;
}

/* 主内容区 */
.card-main {
  flex-shrink: 0;
}

/* 格子容器 */
.grid-container {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
}

.grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.character {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-family: 'KaiTi', 'STKaiti', 'SimKai', serif;
  color: #CC0000;  /* 正红色 */
  z-index: 1;
  pointer-events: none;
}

/* 拼音 */
.pinyin {
  text-align: center;
  font-size: 14px;
  color: #1890ff;
}

/* 展开详情（向右） */
.details {
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid #f0f0f0;
  min-width: 160px;
  max-width: 200px;
}

.label {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.content {
  font-size: 13px;
  color: #333;
  line-height: 1.4;
}

.definition,
.words,
.stroke-order {
  margin-bottom: 8px;
}

.word-tag {
  margin: 2px 4px 2px 0;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

/* 向右滑出动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  max-width: 0;
  margin-left: 0;
  padding-left: 0;
}

.slide-right-enter-to,
.slide-right-leave-from {
  opacity: 1;
  max-width: 200px;
}
</style>
