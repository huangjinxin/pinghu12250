<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="item?.title || '预览'"
    style="width: 90vw; max-width: 1000px; max-height: 90vh;"
    :segmented="{ content: true, footer: true }"
  >
    <template #header-extra>
      <n-space align="center" :size="8">
        <n-tag :type="typeTagType" size="small" round>
          {{ typeIcon }} {{ typeLabel }}
        </n-tag>
        <span v-if="items.length > 1" class="nav-info">
          {{ currentIndex + 1 }} / {{ items.length }}
        </span>
      </n-space>
    </template>

    <div v-if="item" class="preview-body">
      <!-- 作者信息 -->
      <div class="author-bar">
        <n-avatar :size="32" :src="item.authorAvatar" round>
          {{ item.authorName?.[0] }}
        </n-avatar>
        <div class="author-text">
          <div class="author-name">{{ item.authorName }}</div>
          <div class="create-time">{{ formatTime(item.createdAt) }}</div>
        </div>
        <n-tag v-if="item.status !== 'PENDING'" :type="statusTagType" size="small">
          {{ statusText }}
        </n-tag>
      </div>

      <!-- ========== 任务提交预览 ========== -->
      <div v-if="item._type === 'submission'" class="preview-content">
        <div v-if="item.typeName || item.standardName" class="rule-tags">
          <n-tag v-if="item.typeName" type="info" size="small">{{ item.typeName }}</n-tag>
          <n-tag v-if="item.standardName" size="small">{{ item.standardName }}</n-tag>
        </div>
        <div v-if="item.content" class="text-content">{{ item.content }}</div>
        <div v-if="item.images?.length" class="image-gallery">
          <n-image-group>
            <n-image
              v-for="(img, idx) in item.images"
              :key="idx"
              :src="img"
              width="120"
              height="120"
              object-fit="cover"
              :preview-src="img"
              class="gallery-img"
            />
          </n-image-group>
        </div>
        <div v-if="item.audios?.length" class="audio-list">
          <audio
            v-for="(audio, idx) in item.audios"
            :key="idx"
            :src="audio"
            controls
            class="audio-player"
          />
        </div>
        <div v-if="item.link" class="link-row">
          <a :href="item.link" target="_blank" class="link">{{ item.link }}</a>
        </div>
      </div>

      <!-- ========== 创意作品预览 ========== -->
      <div v-else-if="item._type === 'creative'" class="preview-content creative-preview">
        <n-tag v-if="item.categoryName" size="small" :bordered="false" class="mb-2">
          {{ item.categoryIcon }} {{ item.categoryName }}
        </n-tag>
        <div class="iframe-container">
          <iframe
            :srcdoc="item.htmlCode"
            class="full-iframe"
            sandbox="allow-scripts"
          ></iframe>
        </div>
      </div>

      <!-- ========== 书法作品预览 ========== -->
      <div v-else-if="item._type === 'calligraphy'" class="preview-content calligraphy-preview">
        <!-- 字帖预览 -->
        <div class="calligraphy-display">
          <div v-if="hasCharPreviews" class="copybook-grid">
            <div v-for="(ch, idx) in contentItems" :key="idx" class="char-cell">
              <div class="cell-grid"></div>
              <span class="ref-char">{{ ch.character }}</span>
              <img v-if="ch.preview" :src="ch.preview" class="char-img" />
            </div>
          </div>
          <div v-else-if="previewSource" class="legacy-preview">
            <img :src="previewSource" :alt="item.title" />
          </div>
        </div>

        <!-- AI 评分 -->
        <div v-if="item.evaluationScore != null" class="evaluation-section">
          <div class="score-display" :class="scoreClass">
            <div class="score-number">{{ item.evaluationScore }}</div>
            <div class="score-label">{{ scoreLabel }}</div>
          </div>
          <div v-if="item.evaluationData" class="eval-details">
            <div class="score-bars">
              <div class="score-item">
                <span class="item-label">字形相似</span>
                <n-progress type="line" :percentage="(item.evaluationData.shapeMatch?.score || 0) * 2" :show-indicator="false" :height="8" />
                <span class="item-score">{{ item.evaluationData.shapeMatch?.score || 0 }}/50</span>
              </div>
              <div class="score-item">
                <span class="item-label">笔画质量</span>
                <n-progress type="line" :percentage="(item.evaluationData.strokeQuality?.score || 0) * 3.33" :show-indicator="false" :height="8" />
                <span class="item-score">{{ item.evaluationData.strokeQuality?.score || 0 }}/30</span>
              </div>
              <div class="score-item">
                <span class="item-label">整体美观</span>
                <n-progress type="line" :percentage="(item.evaluationData.aesthetics?.score || 0) * 5" :show-indicator="false" :height="8" />
                <span class="item-score">{{ item.evaluationData.aesthetics?.score || 0 }}/20</span>
              </div>
            </div>
            <div v-if="item.evaluationData.summary" class="eval-summary">
              {{ item.evaluationData.summary }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <!-- 左侧导航 -->
        <n-space v-if="items.length > 1">
          <n-button :disabled="currentIndex <= 0" @click="$emit('navigate', currentIndex - 1)">
            ← 上一个
          </n-button>
          <n-button :disabled="currentIndex >= items.length - 1" @click="$emit('navigate', currentIndex + 1)">
            下一个 →
          </n-button>
        </n-space>
        <div v-else></div>

        <!-- 右侧操作 -->
        <n-space>
          <template v-if="item?.status === 'PENDING'">
            <n-button type="success" @click="$emit('approve', item)">通过</n-button>
            <n-button type="error" ghost @click="$emit('reject', item)">拒绝</n-button>
          </template>
          <n-button type="error" ghost @click="$emit('delete', item)">删除</n-button>
          <n-button @click="$emit('update:show', false)">关闭</n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps({
  show: Boolean,
  item: Object,
  items: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: 0 },
});

defineEmits(['update:show', 'approve', 'reject', 'delete', 'navigate']);

const typeIcon = computed(() => {
  const map = { submission: '📝', creative: '🎨', calligraphy: '✍️' };
  return map[props.item?._type] || '';
});

const typeLabel = computed(() => {
  const map = { submission: '任务提交', creative: '创意作品', calligraphy: '书法作品' };
  return map[props.item?._type] || '';
});

const typeTagType = computed(() => {
  const map = { submission: 'info', creative: 'warning', calligraphy: 'default' };
  return map[props.item?._type] || 'default';
});

const statusTagType = computed(() => {
  const map = { APPROVED: 'success', REJECTED: 'error', ARCHIVED: 'default' };
  return map[props.item?.status] || 'default';
});

const statusText = computed(() => {
  const map = { APPROVED: '已通过', REJECTED: '已拒绝', ARCHIVED: '已归档' };
  return map[props.item?.status] || '';
});

// 书法相关
const contentItems = computed(() => {
  if (!props.item) return [];
  const c = props.item.calligraphyContent;
  if (Array.isArray(c)) return c;
  return props.item.title.split('').map(char => ({ character: char, preview: null }));
});

const previewSource = computed(() => props.item?.previewUrl || props.item?.preview || null);

const hasCharPreviews = computed(() => {
  const c = props.item?.calligraphyContent;
  return Array.isArray(c) && c.some(item => item.preview);
});

const scoreClass = computed(() => {
  const s = props.item?.evaluationScore || 0;
  if (s >= 85) return 'excellent';
  if (s >= 60) return 'good';
  return 'needs-work';
});

const scoreLabel = computed(() => {
  const s = props.item?.evaluationScore || 0;
  if (s >= 85) return '优秀';
  if (s >= 60) return '良好';
  return '需努力';
});

function formatTime(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
  } catch { return ''; }
}
</script>

<style scoped>
.nav-info {
  font-size: 13px;
  color: #999;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 65vh;
  overflow-y: auto;
}

.author-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.author-text { flex: 1; }
.author-name { font-weight: 500; font-size: 14px; }
.create-time { font-size: 12px; color: #999; }

/* 任务提交 */
.rule-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.text-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gallery-img {
  border-radius: 6px;
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-player {
  width: 100%;
  height: 36px;
}

.link-row a {
  color: #18a058;
  word-break: break-all;
}

/* 创意作品 */
.creative-preview .iframe-container {
  height: 50vh;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
}

.full-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* 书法作品 */
.calligraphy-display {
  background: #fffef8;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.copybook-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.char-cell {
  width: 80px;
  height: 80px;
  position: relative;
  border: 1px solid #333;
  margin: -0.5px;
  background: #fffef8;
}

.cell-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.cell-grid::before {
  content: '';
  position: absolute;
  top: 50%; left: 0; right: 0;
  height: 1px;
  background: repeating-linear-gradient(to right, #e74c3c 0, #e74c3c 4px, transparent 4px, transparent 8px);
}

.cell-grid::after {
  content: '';
  position: absolute;
  left: 50%; top: 0; bottom: 0;
  width: 1px;
  background: repeating-linear-gradient(to bottom, #e74c3c 0, #e74c3c 4px, transparent 4px, transparent 8px);
}

.ref-char {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 56px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(200, 100, 100, 0.3);
  z-index: 1;
}

.char-img {
  position: absolute;
  top: 2px; left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  object-fit: contain;
  z-index: 2;
}

.legacy-preview img {
  max-width: 100%;
  max-height: 300px;
}

/* 评分 */
.evaluation-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.score-display {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.score-display.excellent { background: linear-gradient(135deg, #f6ffed, #d9f7be); color: #389e0d; }
.score-display.good { background: linear-gradient(135deg, #e6f7ff, #bae7ff); color: #096dd9; }
.score-display.needs-work { background: linear-gradient(135deg, #fffbe6, #fff1b8); color: #d48806; }

.score-number { font-size: 36px; font-weight: bold; }
.score-label { font-size: 14px; margin-top: 4px; }

.score-bars { margin-top: 12px; }

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.item-label { width: 70px; font-size: 13px; color: #666; }
.score-item :deep(.n-progress) { flex: 1; }
.item-score { width: 50px; font-size: 12px; color: #999; text-align: right; }

.eval-summary {
  margin-top: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

/* 底部 */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
