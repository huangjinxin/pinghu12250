<template>
  <div class="review-card" :class="{ selected }" @click="$emit('preview', item)">
    <!-- 顶部：选择框 + 类型标签 + 用户 -->
    <div class="card-top" @click.stop>
      <n-checkbox
        :checked="selected"
        @update:checked="(v) => $emit('select', { key: item._key, checked: v })"
      />
      <n-tag :type="typeTagType" size="tiny" round>
        {{ typeIcon }} {{ typeLabel }}
      </n-tag>
      <div class="user-info">
        <n-avatar :size="22" :src="item.authorAvatar" round>
          {{ item.authorName?.[0] }}
        </n-avatar>
        <span class="username">{{ item.authorName }}</span>
      </div>
      <n-tag :type="item.points > 0 ? 'success' : 'error'" size="small" round>
        {{ pointsText }}
      </n-tag>
    </div>

    <!-- 标题 -->
    <div class="card-title">{{ item.title }}</div>

    <!-- 缩略预览区 - 根据类型不同渲染 -->
    <div class="card-preview">
      <!-- 任务提交：文本+图片 -->
      <template v-if="item._type === 'submission'">
        <div v-if="item.content" class="preview-text">{{ item.content }}</div>
        <div v-if="item.images?.length" class="preview-images" @click.stop>
          <n-image-group>
            <n-image
              v-for="(img, idx) in item.images.slice(0, 3)"
              :key="idx"
              :src="img"
              width="44"
              height="44"
              object-fit="cover"
              :preview-src="img"
              class="thumb-img"
            />
          </n-image-group>
          <span v-if="item.images.length > 3" class="more">+{{ item.images.length - 3 }}</span>
        </div>
        <div v-if="item.audios?.length" class="preview-audio" @click.stop>
          <audio :src="item.audios[0]" controls class="audio-mini" />
        </div>
      </template>

      <!-- 创意作品：mini iframe -->
      <template v-else-if="item._type === 'creative'">
        <div class="preview-iframe-wrap">
          <iframe
            :srcdoc="item.htmlCode"
            class="preview-iframe"
            sandbox="allow-scripts"
          ></iframe>
        </div>
        <n-tag v-if="item.categoryName" size="tiny" :bordered="false">
          {{ item.categoryIcon }} {{ item.categoryName }}
        </n-tag>
      </template>

      <!-- 书法作品：缩略图+评分 -->
      <template v-else-if="item._type === 'calligraphy'">
        <div class="preview-calligraphy">
          <!-- 有字符预览时显示网格 -->
          <div v-if="hasCharPreviews" class="calligraphy-char-grid">
            <div v-for="(ch, idx) in item.previewItems?.slice(0, 4)" :key="idx" class="char-preview-cell">
              <span class="ref-char-mini">{{ ch.character }}</span>
              <img v-if="ch.preview" :src="ch.preview" class="char-preview-img" />
            </div>
          </div>
          <!-- 否则显示整体预览图 -->
          <img v-else-if="item.preview || item.previewUrl" :src="item.preview || item.previewUrl" class="calligraphy-thumb" />
          <div v-else class="calligraphy-placeholder">{{ item.title }}</div>
        </div>
        <div class="calligraphy-meta">
          <span v-if="item.charCount" class="char-count">{{ item.charCount }}字</span>
          <n-tag
            v-if="item.evaluationScore != null"
            :type="item.evaluationScore >= 85 ? 'success' : item.evaluationScore >= 60 ? 'info' : 'warning'"
            size="small"
          >
            {{ item.evaluationScore }}分
          </n-tag>
        </div>
      </template>

      <!-- 无内容 -->
      <div v-if="isEmpty" class="no-content">无附加内容</div>
    </div>

    <!-- 底部：时间 + 操作 -->
    <div class="card-footer" @click.stop>
      <span class="time">{{ formatTime(item.createdAt) }}</span>
      <div class="actions" v-if="item.status === 'PENDING'">
        <n-button
          v-if="item._type === 'submission'"
          type="warning"
          size="tiny"
          @click="$emit('customApprove', item)"
        >
          扣分
        </n-button>
        <n-button type="success" size="tiny" @click="$emit('approve', item)">通过</n-button>
        <n-button type="error" size="tiny" ghost @click="$emit('reject', item)">拒绝</n-button>
      </div>
      <n-tag v-else :type="statusTagType" size="small">{{ statusText }}</n-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps({
  item: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});

defineEmits(['select', 'approve', 'reject', 'preview', 'delete', 'customApprove']);

const typeIcon = computed(() => {
  const map = { submission: '📝', creative: '🎨', calligraphy: '✍️' };
  return map[props.item._type] || '';
});

const typeLabel = computed(() => {
  const map = { submission: '任务', creative: '作品', calligraphy: '书法' };
  return map[props.item._type] || '';
});

const typeTagType = computed(() => {
  const map = { submission: 'info', creative: 'warning', calligraphy: 'default' };
  return map[props.item._type] || 'default';
});

const pointsText = computed(() => {
  const p = props.item.points || 0;
  const q = props.item.quantity || 1;
  if (q > 1) return `${p > 0 ? '+' : ''}${p}×${q}`;
  return `${p > 0 ? '+' : ''}${p}`;
});

const statusTagType = computed(() => {
  const map = { APPROVED: 'success', REJECTED: 'error', ARCHIVED: 'default' };
  return map[props.item.status] || 'default';
});

const statusText = computed(() => {
  const map = { APPROVED: '已通过', REJECTED: '已拒绝', ARCHIVED: '已归档', PENDING: '待审核' };
  return map[props.item.status] || props.item.status;
});

const isEmpty = computed(() => {
  const i = props.item;
  if (i._type === 'submission') {
    return !i.content && !i.images?.length && !i.audios?.length && !i.link;
  }
  return false;
});

const hasCharPreviews = computed(() => {
  const i = props.item;
  if (i._type !== 'calligraphy') return false;
  return Array.isArray(i.previewItems) && i.previewItems.some(item => item.preview);
});

function formatTime(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
  } catch { return ''; }
}
</script>

<style scoped>
.review-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  overflow: hidden;
  min-width: 0;
}

.review-card:hover {
  border-color: #b0b0b0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.review-card.selected {
  border-color: #18a058;
  border-width: 3px;
  background: #f0fdf4;
  box-shadow: 0 4px 16px rgba(24, 160, 88, 0.25);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  flex-wrap: wrap;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 预览区 */
.card-preview {
  min-height: 48px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.preview-text {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-images {
  display: flex;
  gap: 4px;
  align-items: center;
}

.thumb-img {
  border-radius: 4px;
}

.more {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 5px;
  border-radius: 4px;
}

.audio-mini {
  width: 100%;
  height: 28px;
}

/* iframe 预览 */
.preview-iframe-wrap {
  height: 100px;
  overflow: hidden;
  border-radius: 6px;
  background: #f5f5f5;
  position: relative;
}

.preview-iframe {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
}

/* 书法预览 */
.preview-calligraphy {
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fffef8;
  border-radius: 6px;
  border: 1px solid #eee;
  overflow: hidden;
}

.calligraphy-thumb {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.calligraphy-placeholder {
  font-family: 'KaiTi', 'STKaiti', serif;
  font-size: 28px;
  color: rgba(200, 100, 100, 0.4);
  letter-spacing: 4px;
}

.calligraphy-char-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 4px;
}

.char-preview-cell {
  position: relative;
  aspect-ratio: 1;
  background: #fffef8;
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ref-char-mini {
  font-family: 'KaiTi', 'STKaiti', serif;
  font-size: 20px;
  color: rgba(200, 100, 100, 0.3);
  position: absolute;
  z-index: 1;
}

.char-preview-img {
  position: absolute;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  object-fit: contain;
  z-index: 2;
}

.calligraphy-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.char-count {
  font-size: 12px;
  color: #999;
}

.no-content {
  font-size: 13px;
  color: #ccc;
  font-style: italic;
}

/* 底部 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
}

.time {
  font-size: 12px;
  color: #999;
}

.actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
