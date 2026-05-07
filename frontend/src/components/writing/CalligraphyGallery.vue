<template>
  <div class="calligraphy-gallery">
    <!-- 筛选栏 -->
    <WorksFilterBar v-if="!isAnalysisMode" @reset="resetFilters">
      <n-input
        v-model:value="searchText"
        placeholder="搜索用户名..."
        clearable
        style="width: 160px"
        @update:value="handleSearchDebounced"
      >
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>

      <n-radio-group v-model:value="sortBy" size="small">
        <n-radio-button value="latest">最新</n-radio-button>
        <n-radio-button value="popular">最热</n-radio-button>
      </n-radio-group>

      <n-radio-group v-model:value="viewMode" size="small">
        <n-radio-button value="all">全部作品</n-radio-button>
        <n-radio-button value="my">我的作品</n-radio-button>
      </n-radio-group>

      <router-link to="/works?tab=calligraphy">
        <n-button size="small" quaternary type="primary">去作品展廊</n-button>
      </router-link>
    </WorksFilterBar>

    <!-- 顶部分页 -->
    <WorksPagination
      v-model:page="page"
      v-model:pageSize="pageSize"
      :total="total"
      position="top"
      @update:page="loadWorks"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 作品列表 -->
    <n-spin :show="loading">
      <div v-if="works.length === 0 && !loading" class="empty-state">
        <n-empty :description="isAnalysisMode ? '还没有书写练习记录' : viewMode === 'my' ? '还没有创作作品' : '暂无作品'">
          <template #extra>
            <n-text depth="3">{{ isAnalysisMode ? '去"临摹"页面完成一次书写后，就可以在这里查看记录并手动发起 AI 分析' : '去"临摹"页面创作你的第一个作品吧' }}</n-text>
          </template>
        </n-empty>
      </div>

      <div v-else class="works-grid">
        <div
          v-for="work in works"
          :key="work.id"
          class="work-card"
          @click="showDetail(work)"
        >
          <!-- 田字格预览 -->
          <div class="work-preview">
            <div class="mini-copybook">
              <div v-for="(item, idx) in work.previewItems" :key="idx" class="mini-cell">
                <div class="cell-grid"></div>
                <span class="mini-ref-char">{{ item.character }}</span>
                <img v-if="item.preview" :src="item.preview" class="mini-char-img" />
                <div v-else-if="work.preview" class="mini-char-crop" :style="getCropStyle(idx, work)"></div>
              </div>
              <div v-for="i in work.previewPadCount" :key="'empty-' + i" class="mini-cell">
                <div class="cell-grid"></div>
              </div>
            </div>
            <!-- 评分徽章 -->
            <div v-if="work.evaluationScore != null" class="score-badge" :class="getScoreClass(work.evaluationScore)">
              {{ work.evaluationScore }}
            </div>
          </div>
          <div class="work-info">
            <div class="work-title">{{ work.title }}</div>
            <div class="work-meta">
              <div class="author">
                <n-avatar :size="20" :src="work.author?.avatar" />
                <span>{{ work.author?.profile?.nickname || work.author?.username }}</span>
              </div>
              <div v-if="!isAnalysisMode" class="stats">
                <span class="like-count" :class="{ liked: work.isLiked }">
                  <n-icon :component="work.isLiked ? Heart : HeartOutline" />
                  {{ work.likesCount || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部分页 -->
      <WorksPagination
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="total"
        position="bottom"
        @update:page="loadWorks"
        @update:pageSize="handlePageSizeChange"
      />
    </n-spin>

    <!-- 作品详情弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" style="width: 700px; max-width: 95vw">
      <template #header>
        <div class="detail-header">
          <span>{{ selectedWork?.title }}</span>
          <div class="header-actions">
            <!-- 打印按钮（有评分时显示） -->
            <n-button
              v-if="selectedWork?.evaluationScore != null"
              size="small"
              @click.stop="printEvaluation"
            >
              <template #icon>
                <n-icon :component="PrintOutline" />
              </template>
              打印
            </n-button>
            <!-- 管理员提示词按钮 -->
            <n-button
              v-if="isAdmin"
              size="small"
              @click.stop="showPromptModal = true"
            >
              提示词
            </n-button>
            <n-button
              v-if="canEvaluateSelectedWork"
              size="small"
              type="warning"
              :loading="evaluating"
              @click.stop="evaluateWork"
            >
              {{ isAnalysisMode ? 'AI分析' : 'AI评分' }}
            </n-button>
            <n-button
              v-if="selectedWork?.authorId === currentUserId"
              text
              type="error"
              @click="deleteWork"
            >
              删除
            </n-button>
          </div>
        </div>
      </template>

      <div v-if="selectedWork" class="detail-content">
        <!-- 作者信息（置顶显示） -->
        <div class="detail-author-top">
          <n-avatar :size="36" :src="selectedWork.author?.avatar" />
          <div class="author-text">
            <div class="author-name">
              {{ selectedWork.author?.profile?.nickname || selectedWork.author?.username }}
            </div>
            <div class="create-time">{{ formatTime(selectedWork.createdAt) }}</div>
          </div>
        </div>

        <!-- 字帖样式预览：每个字一个田字格 -->
        <div class="detail-preview-wrapper">
          <!-- 新格式：每个字单独显示 -->
          <div v-if="hasCharPreviews(selectedWork)" class="copybook-grid">
            <div
              v-for="(item, idx) in getContentItems(selectedWork)"
              :key="idx"
              class="char-cell clickable"
              :class="{ 'is-playing': playingCharIndex === idx }"
              @click="playStrokeAnimation(item, idx)"
            >
              <div class="cell-grid"></div>
              <!-- 半透明参考字 -->
              <span v-if="showReference" class="ref-char">{{ item.character }}</span>
              <!-- 用户书写的字 -->
              <img v-if="item.preview" :src="item.preview" class="char-img" />
              <!-- 笔划动画容器（最上层） -->
              <div :id="`stroke-target-${idx}`" class="stroke-animation-target"></div>
              <!-- 播放/停止提示 -->
              <div class="play-hint">
                <n-icon><StopOutline v-if="playingCharIndex === idx" /><PlayOutline v-else /></n-icon>
              </div>
            </div>
          </div>
          <!-- 旧格式：显示整体预览图 -->
          <div v-else class="legacy-preview">
            <div class="legacy-grid-bg">
              <img :src="selectedWork.preview" :alt="selectedWork.title" />
            </div>
            <div class="legacy-hint">旧版作品，暂不支持单字预览</div>
          </div>
          <div class="preview-controls">
            <n-switch v-model:value="showReference" size="small" :disabled="!hasCharPreviews(selectedWork)" />
            <span class="control-label">显示临摹参考</span>
          </div>
        </div>

        <!-- 快速分析（无需AI）- 始终显示 -->
        <div v-if="selectedWork.content?.length" class="quick-analysis-section">
          <div class="qa-header">
            <span class="qa-title">✍️ 快速分析</span>
            <span class="qa-badge">无需AI</span>
          </div>
          <div class="qa-bars compact-top">
            <div class="qa-bar-item">
              <span class="qa-bar-label">笔画</span>
              <div class="qa-bar-track">
                <div class="qa-bar-fill" :style="{ width: quickMetrics.strokeCount.score * 100 / 30 + '%' }" :class="quickMetrics.strokeCount.status"></div>
              </div>
              <span class="qa-bar-score">{{ quickMetrics.strokeCount.actual }}/{{ quickMetrics.strokeCount.expected }}</span>
            </div>
            <div class="qa-bar-item">
              <span class="qa-bar-label">流畅</span>
              <div class="qa-bar-track">
                <div class="qa-bar-fill" :style="{ width: quickMetrics.pauseCount.score * 100 / 20 + '%' }" :class="quickMetrics.pauseCount.status"></div>
              </div>
              <span class="qa-bar-score">{{ quickMetrics.pauseCount.count }}次</span>
            </div>
            <div class="qa-bar-item">
              <span class="qa-bar-label">速度</span>
              <div class="qa-bar-track">
                <div class="qa-bar-fill" :style="{ width: quickMetrics.speedControl.score * 100 / 15 + '%' }" :class="quickMetrics.speedControl.status"></div>
              </div>
              <span class="qa-bar-score">{{ quickMetrics.speedControl.text }}</span>
            </div>
            <div class="qa-bar-item">
              <span class="qa-bar-label">字心</span>
              <div class="qa-bar-track">
                <div class="qa-bar-fill" :style="{ width: quickMetrics.centerOffset.score * 100 / 15 + '%' }" :class="quickMetrics.centerOffset.status"></div>
              </div>
              <span class="qa-bar-score">{{ quickMetrics.centerOffset.text }}</span>
            </div>
            <div class="qa-bar-item">
              <span class="qa-bar-label">占比</span>
              <div class="qa-bar-track">
                <div class="qa-bar-fill" :style="{ width: quickMetrics.areaCoverage.score * 100 / 10 + '%' }" :class="quickMetrics.areaCoverage.status"></div>
              </div>
              <span class="qa-bar-score">{{ quickMetrics.areaCoverage.percent }}%</span>
            </div>
          </div>
        </div>

        <!-- AI详细分析（有数据时显示展开按钮） -->
        <div v-if="selectedWork.evaluationData" class="ai-analysis-section">
          <div class="ai-header" @click="showDetailedEval = !showDetailedEval">
            <span class="ai-title">🤖 AI详细分析</span>
            <n-button text size="small" class="expand-btn">
              {{ showDetailedEval ? '收起' : '展开查看' }}
              <n-icon :component="showDetailedEval ? ChevronUp : ChevronDown" />
            </n-button>
          </div>
          <n-collapse-transition :show="showDetailedEval">
            <div class="detailed-evaluation">
              <!-- 字形分析 -->
              <div class="eval-block" v-if="selectedWork.evaluationData.shapeMatch || selectedWork.evaluationData.recognition">
                <div class="eval-block-title">
                  <n-icon :component="DocumentText" />
                  字形分析
                </div>
                <div class="eval-block-content">
                  <p v-if="(selectedWork.evaluationData.shapeMatch || selectedWork.evaluationData.recognition)?.comment">
                    {{ (selectedWork.evaluationData.shapeMatch || selectedWork.evaluationData.recognition).comment }}
                  </p>
                  <!-- 逐字分析 -->
                  <div v-if="getCharScores(selectedWork.evaluationData).length" class="char-details">
                    <div v-for="(detail, idx) in getCharScores(selectedWork.evaluationData)" :key="idx" class="char-detail-item">
                      <div class="char-header">
                        <span class="char-name">「{{ detail.char }}」</span>
                        <span class="char-similarity" :class="getSimilarityClass(detail.similarity)">
                          相似度 {{ Math.round((detail.similarity || 0) * 100) }}%
                        </span>
                      </div>
                      <div v-if="detail.reason" class="char-reason">{{ detail.reason }}</div>
                      <div v-if="detail.improvements?.length" class="char-improvements">
                        <div class="improvement-label">改进建议：</div>
                        <n-tag v-for="(imp, i) in detail.improvements" :key="i" size="small" type="info">
                          {{ imp }}
                        </n-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 笔画质量 -->
              <div class="eval-block" v-if="selectedWork.evaluationData.strokeQuality?.comment">
                <div class="eval-block-title">
                  <n-icon :component="Brush" />
                  笔画质量
                </div>
                <div class="eval-block-content">
                  <p>{{ selectedWork.evaluationData.strokeQuality.comment }}</p>
                </div>
              </div>

              <!-- 整体美观 -->
              <div class="eval-block" v-if="selectedWork.evaluationData.aesthetics?.comment">
                <div class="eval-block-title">
                  <n-icon :component="Sparkles" />
                  整体美观
                </div>
                <div class="eval-block-content">
                  <p>{{ selectedWork.evaluationData.aesthetics.comment }}</p>
                </div>
              </div>

              <!-- 改进建议 -->
              <div class="eval-block improvements" v-if="selectedWork.evaluationData.improvements?.length">
                <div class="eval-block-title">
                  <n-icon :component="Bulb" />
                  改进建议
                </div>
                <div class="eval-block-content">
                  <ul class="improvement-list">
                    <li v-for="(item, idx) in selectedWork.evaluationData.improvements" :key="idx">
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>

              <!-- 总结 -->
              <div class="eval-summary" v-if="selectedWork.evaluationData.summary">
                <n-icon :component="ChatboxEllipses" />
                <span>{{ selectedWork.evaluationData.summary }}</span>
              </div>
            </div>
          </n-collapse-transition>
        </div>

        <div class="detail-actions" v-if="!isAnalysisMode">
          <n-button
            :type="selectedWork.isLiked ? 'primary' : 'default'"
            @click="toggleLike"
          >
            <template #icon>
              <n-icon :component="selectedWork.isLiked ? Heart : HeartOutline" />
            </template>
            {{ selectedWork.likesCount || 0 }}
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 提示词管理弹窗 -->
    <n-modal v-model:show="showPromptModal" preset="card" title="评分提示词管理" style="width: 800px; max-width: 95vw">
      <n-spin :show="loadingPrompt">
        <n-input
          v-model:value="promptContent"
          type="textarea"
          :rows="20"
          placeholder="输入评分提示词..."
        />
        <div class="prompt-hint">
          <n-text depth="3">可用变量：{{text}} - 作品文本，{{charCount}} - 字符数量</n-text>
        </div>
      </n-spin>
      <template #footer>
        <div style="display: flex; justify-content: space-between">
          <n-button @click="resetPrompt" :loading="resettingPrompt">恢复默认</n-button>
          <div style="display: flex; gap: 8px">
            <n-button @click="showPromptModal = false">取消</n-button>
            <n-button type="primary" @click="savePrompt" :loading="savingPrompt">保存</n-button>
          </div>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick, onUnmounted } from 'vue';

const props = defineProps({
  mode: {
    type: String,
    default: 'gallery'
  }
});
import { useMessage, NCollapseTransition } from 'naive-ui';
import Heart from '@vicons/ionicons5/es/Heart'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import ChevronDown from '@vicons/ionicons5/es/ChevronDown'
import ChevronUp from '@vicons/ionicons5/es/ChevronUp'
import DocumentText from '@vicons/ionicons5/es/DocumentText'
import Brush from '@vicons/ionicons5/es/Brush'
import Sparkles from '@vicons/ionicons5/es/Sparkles'
import Bulb from '@vicons/ionicons5/es/Bulb'
import ChatboxEllipses from '@vicons/ionicons5/es/ChatboxEllipses'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import StopOutline from '@vicons/ionicons5/es/StopOutline'
import PrintOutline from '@vicons/ionicons5/es/PrintOutline'
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import CloseCircle from '@vicons/ionicons5/es/CloseCircle'
import Speedometer from '@vicons/ionicons5/es/Speedometer'
import { calligraphyAPI, calligraphyListAPI, aiPromptAPI } from '@/api/index';
import { useAuthStore } from '@/stores/auth';
import WorksFilterBar from '@/components/works/WorksFilterBar.vue';
import WorksPagination from '@/components/works/WorksPagination.vue';
import { isStrokeData } from '@/composables/useStrokeData';

const message = useMessage();
const authStore = useAuthStore();

const loading = ref(false);
const works = ref([]);
const sortBy = ref('latest');
const viewMode = ref('my');
const searchText = ref('');
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);

let searchTimeout = null;

const showDetailModal = ref(false);
const selectedWork = ref(null);
const showDetailedEval = ref(false);
const showReference = ref(true);  // 默认显示临摹参考
const evaluating = ref(false);

// 获取偏移方向文字
const getOffsetDirection = (dx, dy) => {
  const threshold = 15;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < threshold && absDy < threshold) return '';
  if (absDx > absDy * 2) return dx > 0 ? '右' : '左';
  if (absDy > absDx * 2) return dy > 0 ? '下' : '上';
  return (dx > 0 ? '右' : '左') + (dy > 0 ? '下' : '上');
};

// 快速分析指标
const quickMetrics = computed(() => {
  // content 是数组，每个元素有 strokeData
  const contentItems = selectedWork.value?.content || [];
  let allStrokes = [];
  let totalChars = 0;
  
  contentItems.forEach(item => {
    if (item.strokeData?.strokes) {
      allStrokes = allStrokes.concat(item.strokeData.strokes);
      totalChars++;
    }
  });
  
  if (!allStrokes.length) {
    return {
      strokeCount: { actual: 0, expected: 0, score: 0, status: 'unknown' },
      writingDuration: { ms: 0, text: '-', score: 0, status: 'unknown' },
      pauseCount: { count: 0, score: 0, status: 'unknown' },
      speedControl: { avgSpeed: 0, text: '-', score: 0, status: 'unknown' },
      centerOffset: { x: 0, y: 0, text: '-', score: 0, status: 'unknown' },
      areaCoverage: { percent: 0, score: 0, status: 'unknown' },
      totalScore: 0
    };
  }

  // 笔画数量
  const actualStrokeCount = allStrokes.length;
  const expectedStrokeCount = totalChars * 8; // 假设平均每字8笔
  const strokeCountScore = actualStrokeCount >= expectedStrokeCount - 2 && actualStrokeCount <= expectedStrokeCount + 2 ? 30 : 
    actualStrokeCount >= expectedStrokeCount - 4 ? 20 : 10;
  const strokeCountStatus = actualStrokeCount >= expectedStrokeCount - 2 && actualStrokeCount <= expectedStrokeCount + 2 ? 'pass' : 'warning';

  // 书写时长
  let minT = Infinity, maxT = 0;
  allStrokes.forEach(s => {
    if (s.points) {
      s.points.forEach(p => {
        if (p.t) {
          if (p.t < minT) minT = p.t;
          if (p.t > maxT) maxT = p.t;
        }
      });
    }
  });
  const durationMs = maxT > minT ? maxT - minT : 0;
  const durationSec = durationMs / 1000;
  const durationScore = durationSec > 0 && durationSec < 30 ? 15 : durationSec > 0 && durationSec < 60 ? 10 : 5;
  const durationStatus = durationSec > 0 && durationSec < 30 ? 'good' : durationSec > 0 && durationSec < 60 ? 'normal' : 'warning';
  const durationText = durationSec > 0 ? durationSec.toFixed(1) + 's' : '-';

  // 停顿次数
  let pauseCount = 0;
  let allPoints = [];
  allStrokes.forEach(s => {
    if (s.points) allPoints = allPoints.concat(s.points);
  });
  for (let i = 1; i < allPoints.length; i++) {
    if (allPoints[i].t - allPoints[i-1].t > 150) pauseCount++;
  }
  const pauseCountScore = pauseCount === 0 ? 20 : pauseCount <= 2 ? 15 : pauseCount <= 5 ? 10 : 5;
  const pauseCountStatus = pauseCount === 0 ? 'pass' : pauseCount <= 2 ? 'good' : pauseCount <= 5 ? 'warning' : 'error';

  // 速度控制
  let totalDist = 0;
  for (let i = 1; i < allPoints.length; i++) {
    const dx = allPoints[i].x - allPoints[i-1].x;
    const dy = allPoints[i].y - allPoints[i-1].y;
    totalDist += Math.sqrt(dx*dx + dy*dy);
  }
  const avgSpeed = durationMs > 0 ? totalDist / (durationMs / 1000) : 0;
  const speedScore = avgSpeed > 50 && avgSpeed < 300 ? 15 : avgSpeed > 0 ? 10 : 5;
  const speedStatus = avgSpeed > 50 && avgSpeed < 300 ? 'good' : avgSpeed > 0 ? 'warning' : 'unknown';
  const speedText = avgSpeed > 0 ? Math.round(avgSpeed) + 'px/s' : '-';

  // 区域边界和字心偏移
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  allPoints.forEach(p => {
    if (p.x !== undefined) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      sumX += p.x;
    }
    if (p.y !== undefined) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      sumY += p.y;
    }
  });
  const canvasWidth = 500;
  const canvasHeight = 500;
  const strokeWidth = maxX - minX;
  const strokeHeight = maxY - minY;
  const areaPercent = Math.min(100, Math.round((strokeWidth * strokeHeight) / (canvasWidth * canvasHeight) * 100));
  const areaScore = areaPercent >= 40 && areaPercent <= 80 ? 10 : areaPercent > 0 ? 5 : 0;
  const areaStatus = areaPercent >= 40 && areaPercent <= 80 ? 'pass' : areaPercent > 0 ? 'warning' : 'unknown';

  // 字心偏移（笔画质心 vs 田字格中心）
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const centroidX = allPoints.length > 0 ? sumX / allPoints.length : centerX;
  const centroidY = allPoints.length > 0 ? sumY / allPoints.length : centerY;
  const offsetDx = centroidX - centerX;
  const offsetDy = centroidY - centerY;
  const offsetDist = Math.sqrt(offsetDx * offsetDx + offsetDy * offsetDy);
  // 偏移占画布对角线的比例（对角线约707px，20%以内约140px）
  const offsetRatio = offsetDist / (Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2);
  const offsetPercent = Math.round(offsetRatio * 100);
  let offsetText = '-';
  let offsetScore = 0;
  let offsetStatus = 'unknown';
  if (allPoints.length > 0) {
    if (offsetDist < 30) {
      offsetText = '居中';
      offsetScore = 15;
      offsetStatus = 'pass';
    } else if (offsetDist < 60) {
      offsetText = '偏' + getOffsetDirection(offsetDx, offsetDy);
      offsetScore = 10;
      offsetStatus = 'good';
    } else if (offsetDist < 100) {
      offsetText = '偏' + getOffsetDirection(offsetDx, offsetDy);
      offsetScore = 5;
      offsetStatus = 'warning';
    } else {
      offsetText = '偏' + getOffsetDirection(offsetDx, offsetDy);
      offsetScore = 0;
      offsetStatus = 'error';
    }
  }

  const totalScore = strokeCountScore + durationScore + pauseCountScore + speedScore + offsetScore + areaScore;

  return {
    strokeCount: { actual: actualStrokeCount, expected: expectedStrokeCount, score: strokeCountScore, status: strokeCountStatus },
    writingDuration: { ms: durationMs, text: durationText, score: durationScore, status: durationStatus },
    pauseCount: { count: pauseCount, score: pauseCountScore, status: pauseCountStatus },
    speedControl: { avgSpeed, text: speedText, score: speedScore, status: speedStatus },
    centerOffset: { dist: offsetDist, text: offsetText, score: offsetScore, status: offsetStatus },
    areaCoverage: { percent: areaPercent, score: areaScore, status: areaStatus },
    totalScore
  };
});

// 获取快速评分样式
const getQuickScoreClass = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'normal';
  return 'poor';
};

// 笔划播放状态
const playingCharIndex = ref(-1);  // 当前正在播放的字符索引，-1表示没有播放
const playbackTimer = ref(null);  // 播放定时器

// 提示词管理
const showPromptModal = ref(false);
const promptContent = ref('');
const loadingPrompt = ref(false);
const savingPrompt = ref(false);
const resettingPrompt = ref(false);

const currentUserId = computed(() => authStore.user?.id || '');
const isAdmin = computed(() => ['ADMIN', 'TEACHER'].includes(authStore.user?.role));
const isAnalysisMode = computed(() => props.mode === 'analysis');
const canEvaluateSelectedWork = computed(() => {
  if (!selectedWork.value) return false;
  return isAdmin.value || selectedWork.value.authorId === currentUserId.value;
});

const normalizePreviewItems = (work) => {
  if (Array.isArray(work?.previewItems) && work.previewItems.length > 0) {
    return work.previewItems.slice(0, 4).map(item => ({
      character: item?.character || '',
      preview: item?.preview || null
    }));
  }
  if (Array.isArray(work?.content)) {
    return work.content.slice(0, 4).map(item => ({
      character: item?.character || '',
      preview: item?.preview || null
    }));
  }
  return (work?.title || '').split('').slice(0, 4).map(character => ({ character, preview: null }));
};

const getPreviewSource = (work) => work?.previewUrl || work?.preview || null;

const prepareWorkCard = (work) => {
  const previewItems = normalizePreviewItems(work);
  const charCount = work?.charCount || work?.title?.length || previewItems.length || 0;
  const cols = Math.min(Math.max(charCount, 1), 5);
  const rows = Math.ceil(Math.max(charCount, 1) / cols);

  return {
    ...work,
    preview: getPreviewSource(work),
    previewUrl: work?.previewUrl || null,
    previewItems,
    previewPadCount: Math.max(0, 4 - previewItems.length),
    previewGridMeta: { cols, rows }
  };
};

// 获取作品内容项（兼容新旧格式）
const getContentItems = (work) => {
  if (!work) return [];
  // 新格式：content 是数组，每项有 character 和 preview
  if (Array.isArray(work.content)) {
    return work.content;
  }
  // 旧格式：只有 title，没有单独的字预览
  return work.title.split('').map(char => ({ character: char, preview: null }));
};

// 检查是否有单字预览图（新格式）
const hasCharPreviews = (work) => {
  if (!work) return false;
  if (!Array.isArray(work.content)) return false;
  return work.content.some(item => item.preview);
};

// 获取旧格式预览图裁剪样式（动态网格：cols = min(charCount, 5)）
const getCropStyle = (idx, work) => {
  if (!work?.preview) return {};
  const cols = work.previewGridMeta?.cols || 1;
  const rows = work.previewGridMeta?.rows || 1;

  // 计算当前字符在原图中的位置
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  // 计算背景位置百分比
  const xPercent = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const yPercent = rows > 1 ? (row / (rows - 1)) * 100 : 0;

  return {
    backgroundImage: `url(${work.preview})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${xPercent}% ${yPercent}%`
  };
};

// 获取评分等级样式
const getScoreClass = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 60) return 'good';
  return 'needs-work';
};

// 获取评分等级文字
const getScoreLabel = (score) => {
  if (score >= 85) return '优秀';
  if (score >= 60) return '良好';
  return '需努力';
};

// 获取相似度等级样式
const getSimilarityClass = (similarity) => {
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.6) return 'medium';
  return 'low';
};

// 获取逐字评分数据（兼容新旧格式）
const getCharScores = (evalData) => {
  if (!evalData) return [];
  const shapeData = evalData.shapeMatch || evalData.recognition || {};
  return shapeData.charScores || shapeData.details || [];
};

// 加载作品列表
const loadWorks = async () => {
  loading.value = true;

  try {
    const api = isAnalysisMode.value || viewMode.value === 'my' ? calligraphyListAPI.myList : calligraphyListAPI.list;
    const params = {
      page: page.value,
      limit: pageSize.value,
      sort: sortBy.value
    };
    if (searchText.value) params.search = searchText.value;

    const res = await api(params);

    if (res.success) {
      works.value = (res.data.works || []).map(prepareWorkCard);
      total.value = res.data.total || res.data.works.length;
    }
  } catch (error) {
    console.error('加载作品失败:', error);
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 搜索防抖
const handleSearchDebounced = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadWorks();
  }, 500);
};

// 重置筛选
const resetFilters = () => {
  searchText.value = '';
  sortBy.value = 'latest';
  viewMode.value = isAnalysisMode.value ? 'my' : 'all';
  page.value = 1;
  loadWorks();
};

// 分页大小变化
const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize;
  page.value = 1;
  loadWorks();
};

// 显示详情
const showDetail = async (work) => {
  try {
    const res = await calligraphyAPI.get(work.id);
    if (res.success) {
      selectedWork.value = prepareWorkCard(res.data);
      showDetailModal.value = true;
      showReference.value = true;  // 默认显示临摹参考
      stopStrokeAnimation();  // 停止之前的动画
    }
  } catch (error) {
    console.error('获取详情失败:', error);
  }
};

// 停止笔划动画
const stopStrokeAnimation = () => {
  if (playbackTimer.value) {
    clearTimeout(playbackTimer.value);
    playbackTimer.value = null;
  }
  const target = document.getElementById(`stroke-target-${playingCharIndex.value}`);
  if (target) target.innerHTML = '';
  playingCharIndex.value = -1;
};

// 播放笔划动画（使用实际笔画数据）
const playStrokeAnimation = async (item, idx) => {
  // 如果点击的是正在播放的字，停止动画
  if (playingCharIndex.value === idx) {
    stopStrokeAnimation();
    return;
  }

  // 如果有其他字在播放，先停止
  if (playingCharIndex.value !== -1) {
    stopStrokeAnimation();
  }

  // 检查是否有笔画数据
  const strokeData = item.strokeData;
  if (!strokeData || !isStrokeData(strokeData)) {
    message.warning('该字没有笔画数据，无法播放');
    return;
  }

  playingCharIndex.value = idx;
  await nextTick();

  const targetId = `stroke-target-${idx}`;
  const target = document.getElementById(targetId);
  if (!target) {
    playingCharIndex.value = -1;
    return;
  }

  // 创建 Canvas
  target.innerHTML = '';
  const canvas = document.createElement('canvas');
  const size = 76;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  target.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 计算缩放比例
  const canvasWidth = strokeData.canvas?.width || 200;
  const canvasHeight = strokeData.canvas?.height || 200;
  const scale = Math.min(size / canvasWidth, size / canvasHeight);

  // 居中偏移
  const offsetX = (size - canvasWidth * scale) / 2;
  const offsetY = (size - canvasHeight * scale) / 2;

  const strokes = strokeData.strokes || [];

  // 逐笔画回放
  for (const stroke of strokes) {
    if (playingCharIndex.value !== idx) break;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color || '#e74c3c';
    ctx.lineWidth = (stroke.lineWidth || 2) * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = stroke.points;
    if (!points || points.length < 2) continue;

    ctx.moveTo(points[0].x * scale + offsetX, points[0].y * scale + offsetY);

    for (let i = 1; i < points.length; i++) {
      if (playingCharIndex.value !== idx) break;

      ctx.lineTo(points[i].x * scale + offsetX, points[i].y * scale + offsetY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(points[i].x * scale + offsetX, points[i].y * scale + offsetY);

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

  // 动画完成后延迟重置
  if (playingCharIndex.value === idx) {
    playbackTimer.value = setTimeout(() => {
      if (playingCharIndex.value === idx) {
        target.innerHTML = '';
        playingCharIndex.value = -1;
      }
    }, 1000);
  }
};

// 点赞
const toggleLike = async () => {
  if (!selectedWork.value) return;

  try {
    const res = await calligraphyAPI.toggleLike(selectedWork.value.id);
    if (res.success) {
      selectedWork.value.isLiked = res.data.liked;
      selectedWork.value.likesCount += res.data.liked ? 1 : -1;

      // 更新列表中的数据
      const idx = works.value.findIndex(w => w.id === selectedWork.value.id);
      if (idx >= 0) {
        works.value[idx].isLiked = res.data.liked;
        works.value[idx].likesCount = selectedWork.value.likesCount;
      }
    }
  } catch (error) {
    message.error('操作失败');
  }
};

// 删除作品
const deleteWork = async () => {
  if (!selectedWork.value) return;

  try {
    const res = await calligraphyAPI.delete(selectedWork.value.id);
    if (res.success) {
      message.success('删除成功');
      showDetailModal.value = false;
      works.value = works.value.filter(w => w.id !== selectedWork.value.id);
    }
  } catch (error) {
    message.error('删除失败');
  }
};

// AI评分
const evaluateWork = async () => {
  if (!selectedWork.value || evaluating.value) return;

  evaluating.value = true;
  try {
    const res = await calligraphyAPI.evaluate(selectedWork.value.id);
    if (res.success) {
      message.success(`评分完成：${res.data.score}分`);
      selectedWork.value.evaluationScore = res.data.score;
      selectedWork.value.evaluationData = res.data.evaluation;
      // 更新列表
      const idx = works.value.findIndex(w => w.id === selectedWork.value.id);
      if (idx >= 0) {
        works.value[idx].evaluationScore = res.data.score;
      }
    }
  } catch (error) {
    message.error(error.response?.data?.error || '评分失败');
  } finally {
    evaluating.value = false;
  }
};

// 打印评分报告
const printEvaluation = () => {
  if (!selectedWork.value || selectedWork.value.evaluationScore == null) return;

  const work = selectedWork.value;
  const evalData = work.evaluationData || {};

  // 构建作品预览HTML（田字格）
  let previewHtml = '';
  if (hasCharPreviews(work)) {
    const items = getContentItems(work);
    previewHtml = `
      <div class="print-copybook">
        ${items.map(item => `
          <div class="print-char-cell">
            <div class="print-cell-grid"></div>
            <span class="print-ref-char">${item.character}</span>
            ${item.preview ? `<img src="${item.preview}" class="print-char-img" />` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } else if (work.preview) {
    previewHtml = `<div class="print-legacy-preview"><img src="${work.preview}" /></div>`;
  }

  // 构建改进建议HTML（最多显示3条）
  let improvementsHtml = '';
  if (evalData.improvements?.length) {
    const tips = evalData.improvements.slice(0, 3);
    improvementsHtml = `
      <div class="print-improvements">
        <div class="print-section-title">改进建议</div>
        <ul>
          ${tips.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>书写评分报告 - ${work.title}</title>
      <style>
        @page {
          size: A4;
          margin: 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          height: 100%;
          overflow: hidden;
        }
        body {
          font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #333;
        }
        .print-container {
          height: 277mm;
          max-height: 277mm;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .print-header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 12px;
          margin-bottom: 15px;
          flex-shrink: 0;
        }
        .print-title {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .print-subtitle {
          font-size: 13pt;
          color: #666;
        }
        .print-meta {
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
          color: #666;
          margin-top: 8px;
        }
        .print-copybook {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0;
          margin: 15px auto;
          max-width: 360px;
          flex-shrink: 0;
        }
        .print-char-cell {
          width: 55px;
          height: 55px;
          position: relative;
          border: 1px solid #333;
          margin: -0.5px;
          background: #fffef8;
        }
        .print-cell-grid {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
        }
        .print-cell-grid::before {
          content: '';
          position: absolute;
          top: 50%; left: 0; right: 0;
          border-top: 1px dashed #c44;
        }
        .print-cell-grid::after {
          content: '';
          position: absolute;
          left: 50%; top: 0; bottom: 0;
          border-left: 1px dashed #c44;
        }
        .print-ref-char {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          font-size: 36px;
          font-family: 'KaiTi', 'STKaiti', serif;
          color: rgba(200, 100, 100, 0.25);
          z-index: 1;
        }
        .print-char-img {
          position: absolute;
          top: 2px; left: 2px;
          width: calc(100% - 4px);
          height: calc(100% - 4px);
          object-fit: contain;
          z-index: 2;
        }
        .print-legacy-preview {
          text-align: center;
          margin: 15px 0;
          flex-shrink: 0;
        }
        .print-legacy-preview img {
          max-width: 280px;
          max-height: 150px;
        }
        .print-score-section {
          text-align: center;
          margin: 15px 0;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .print-score-big {
          font-size: 42pt;
          font-weight: bold;
          color: #1890ff;
          line-height: 1;
        }
        .print-score-label {
          font-size: 12pt;
          color: #666;
          margin-top: 3px;
        }
        .print-score-bars {
          display: flex;
          justify-content: center;
          gap: 25px;
          margin-top: 12px;
        }
        .print-score-bar-item {
          text-align: center;
        }
        .print-score-bar-label {
          font-size: 9pt;
          color: #666;
        }
        .print-score-bar-value {
          font-size: 12pt;
          font-weight: bold;
          color: #333;
        }
        .print-content-area {
          flex: 1;
          overflow: hidden;
        }
        .print-section-title {
          font-size: 12pt;
          font-weight: bold;
          margin: 12px 0 6px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
        }
        .print-comment {
          margin: 8px 0;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .print-comment-label {
          font-weight: bold;
          color: #666;
          font-size: 9pt;
        }
        .print-comment-text {
          font-size: 10pt;
          line-height: 1.4;
          max-height: 2.8em;
          overflow: hidden;
        }
        .print-improvements {
          margin: 10px 0;
        }
        .print-improvements ul {
          padding-left: 18px;
          font-size: 10pt;
        }
        .print-improvements li {
          margin-bottom: 3px;
        }
        .print-summary {
          margin: 12px 0;
          padding: 10px;
          background: #e6f7ff;
          border-radius: 6px;
          text-align: center;
          font-size: 10pt;
          max-height: 3em;
          overflow: hidden;
        }
        .print-footer {
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 9pt;
          color: #999;
          flex-shrink: 0;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="print-header">
          <div class="print-title">书写评分报告</div>
          <div class="print-subtitle">${work.title}</div>
          <div class="print-meta">
            <span>作者：${work.author?.profile?.nickname || work.author?.username || '未知'}</span>
            <span>评分时间：${new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        ${previewHtml}

        <div class="print-score-section">
          <div class="print-score-big">${work.evaluationScore}</div>
          <div class="print-score-label">${getScoreLabel(work.evaluationScore)}</div>
          <div class="print-score-bars">
            <div class="print-score-bar-item">
              <div class="print-score-bar-label">字形相似</div>
              <div class="print-score-bar-value">${evalData.shapeMatch?.score || evalData.recognition?.score || 0}/50</div>
            </div>
            <div class="print-score-bar-item">
              <div class="print-score-bar-label">笔画质量</div>
              <div class="print-score-bar-value">${evalData.strokeQuality?.score || 0}/30</div>
            </div>
            <div class="print-score-bar-item">
              <div class="print-score-bar-label">整体美观</div>
              <div class="print-score-bar-value">${evalData.aesthetics?.score || 0}/20</div>
            </div>
          </div>
        </div>

        <div class="print-content-area">
          ${(evalData.shapeMatch?.comment || evalData.recognition?.comment) ? `
            <div class="print-comment">
              <div class="print-comment-label">字形评价</div>
              <div class="print-comment-text">${evalData.shapeMatch?.comment || evalData.recognition?.comment}</div>
            </div>
          ` : ''}

          ${evalData.strokeQuality?.comment ? `
            <div class="print-comment">
              <div class="print-comment-label">笔画质量</div>
              <div class="print-comment-text">${evalData.strokeQuality.comment}</div>
            </div>
          ` : ''}

          ${evalData.aesthetics?.comment ? `
            <div class="print-comment">
              <div class="print-comment-label">整体美观</div>
              <div class="print-comment-text">${evalData.aesthetics.comment}</div>
            </div>
          ` : ''}

          ${improvementsHtml}

          ${evalData.summary ? `
            <div class="print-summary">${evalData.summary}</div>
          ` : ''}
        </div>

        <div class="print-footer">
          完整内容请登录系统查看 · 本报告由AI自动生成
        </div>
      </div>
    </body>
    </html>
  `;

  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    // 等待图片加载后打印
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  } else {
    message.error('无法打开打印窗口，请检查浏览器设置');
  }
};

// 加载提示词
const loadPrompt = async () => {
  loadingPrompt.value = true;
  try {
    const res = await aiPromptAPI.getEvalPrompt('calligraphy_eval');
    if (res.success && res.data) {
      promptContent.value = res.data.content || '';
    }
  } catch (error) {
    console.error('加载提示词失败:', error);
  } finally {
    loadingPrompt.value = false;
  }
};

// 保存提示词
const savePrompt = async () => {
  if (!promptContent.value.trim()) {
    message.warning('提示词内容不能为空');
    return;
  }
  savingPrompt.value = true;
  try {
    const res = await aiPromptAPI.saveEvalPrompt('calligraphy_eval', promptContent.value);
    if (res.success) {
      message.success('保存成功');
      showPromptModal.value = false;
    }
  } catch (error) {
    message.error('保存失败');
  } finally {
    savingPrompt.value = false;
  }
};

// 重置提示词
const resetPrompt = async () => {
  resettingPrompt.value = true;
  try {
    const res = await aiPromptAPI.resetEvalPrompt('calligraphy_eval');
    if (res.success) {
      promptContent.value = res.data?.content || '';
      message.success('已恢复默认');
    }
  } catch (error) {
    message.error('重置失败');
  } finally {
    resettingPrompt.value = false;
  }
};

// 监听提示词弹窗打开
watch(showPromptModal, (val) => {
  if (val) loadPrompt();
});

// 格式化时间
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 监听筛选变化
watch([sortBy, viewMode], () => {
  if (isAnalysisMode.value) return;
  page.value = 1;
  loadWorks();
});

onMounted(() => {
  if (isAnalysisMode.value) {
    viewMode.value = 'my';
  }
  loadWorks();
});
</script>

<style scoped>
.calligraphy-gallery {
  padding: 0;
}

.empty-state {
  padding: 60px 0;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.work-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e8e8e8;
}

.work-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 卡片预览区域 */
.work-preview {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: #fffef8;
}

.mini-copybook {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  width: 100%;
  height: 100%;
}

.mini-cell {
  position: relative;
  border: 1px solid #333;
  margin: -0.5px;
  background: #fffef8;
  box-sizing: border-box;
}

.mini-cell .cell-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.mini-cell .cell-grid::before,
.mini-cell .cell-grid::after {
  content: '';
  position: absolute;
}

.mini-cell .cell-grid::before {
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: repeating-linear-gradient(
    to right,
    #e74c3c 0,
    #e74c3c 3px,
    transparent 3px,
    transparent 6px
  );
}

.mini-cell .cell-grid::after {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: repeating-linear-gradient(
    to bottom,
    #e74c3c 0,
    #e74c3c 3px,
    transparent 3px,
    transparent 6px
  );
}

.mini-char-img {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  object-fit: contain;
  z-index: 2;
}

.mini-char-crop {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  z-index: 2;
}

.mini-ref-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 40px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(200, 100, 100, 0.25);
  z-index: 1;
  line-height: 1;
}

/* 旧格式整体预览图叠加 */
.overlay-preview-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 3;
}

.mini-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 40px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(100, 100, 100, 0.4);
  z-index: 1;
}

/* 旧格式预览图 */
.legacy-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 评分徽章 */
.score-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  z-index: 2;
}

.score-badge.excellent {
  background: linear-gradient(135deg, #52c41a, #389e0d);
}

.score-badge.good {
  background: linear-gradient(135deg, #1890ff, #096dd9);
}

.score-badge.needs-work {
  background: linear-gradient(135deg, #faad14, #d48806);
}

.work-info {
  padding: 12px;
}

.work-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

.like-count {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #999;
}

.like-count.liked {
  color: #f5222d;
}

/* 详情弹窗 */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-content {
  text-align: center;
}

/* 顶部作者信息 */
.detail-author-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.detail-author-top .author-text {
  text-align: left;
}

.detail-author-top .author-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.detail-author-top .create-time {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* 底部操作按钮 */
.detail-actions {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.detail-preview-wrapper {
  margin-bottom: 16px;
}

/* 字帖网格 */
.copybook-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  background: #fffef8;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.char-cell {
  width: 80px;
  height: 80px;
  position: relative;
  border: 1px solid #333;
  margin: -0.5px;
  background: #fffef8;
  box-sizing: border-box;
}

/* 田字格内的十字虚线 */
.cell-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.cell-grid::before,
.cell-grid::after {
  content: '';
  position: absolute;
}

/* 横线 */
.cell-grid::before {
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: repeating-linear-gradient(
    to right,
    #e74c3c 0,
    #e74c3c 4px,
    transparent 4px,
    transparent 8px
  );
}

/* 竖线 */
.cell-grid::after {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: repeating-linear-gradient(
    to bottom,
    #e74c3c 0,
    #e74c3c 4px,
    transparent 4px,
    transparent 8px
  );
}

/* 参考字（半透明） */
.char-cell .ref-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 56px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(200, 100, 100, 0.3);
  z-index: 1;
  line-height: 1;
}

/* 用户书写的字图片 */
.char-cell .char-img {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  object-fit: contain;
  z-index: 2;
}

/* 旧格式预览（详情弹窗） */
.legacy-preview {
  text-align: center;
}

.legacy-grid-bg {
  background: #fffef8;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  display: inline-block;
}

.legacy-grid-bg img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.legacy-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.control-label {
  font-size: 13px;
  color: #666;
}

/* 快速分析 */
.quick-analysis-section {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.qa-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.qa-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.qa-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 4px;
}

.qa-score-row {
  text-align: center;
  margin-bottom: 16px;
}

.qa-big-score {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.qa-big-score.excellent { color: #52c41a; }
.qa-big-score.good { color: #1890ff; }
.qa-big-score.normal { color: #faad14; }
.qa-big-score.poor { color: #f5222d; }

.qa-score-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.qa-bars.compact-top {
  margin-top: 0;
}

.qa-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qa-bar-label {
  width: 28px;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.qa-bar-track {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.qa-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.qa-bar-fill.pass { background: linear-gradient(90deg, #52c41a, #73d13d); }
.qa-bar-fill.good { background: linear-gradient(90deg, #1890ff, #40a9ff); }
.qa-bar-fill.normal { background: linear-gradient(90deg, #faad14, #ffc53d); }
.qa-bar-fill.warning { background: linear-gradient(90deg, #fa8c16, #ffa940); }
.qa-bar-fill.error { background: linear-gradient(90deg, #f5222d, #ff4d4f); }
.qa-bar-fill.unknown { background: #d9d9d9; }

.qa-bar-score {
  width: 60px;
  font-size: 12px;
  color: #999;
  text-align: right;
  flex-shrink: 0;
}

/* AI详细分析 */
.ai-analysis-section {
  margin-bottom: 16px;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
}

.ai-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
}

/* 评分展示 */
.evaluation-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.score-display {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.score-display.excellent {
  background: linear-gradient(135deg, #f6ffed, #d9f7be);
  color: #389e0d;
}

.score-display.good {
  background: linear-gradient(135deg, #e6f7ff, #bae7ff);
  color: #096dd9;
}

.score-display.needs-work {
  background: linear-gradient(135deg, #fffbe6, #fff1b8);
  color: #d48806;
}

.score-number {
  font-size: 36px;
  font-weight: bold;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  margin-top: 4px;
}

.score-details {
  text-align: left;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.item-label {
  width: 70px;
  font-size: 13px;
  color: #666;
}

.score-item .n-progress {
  flex: 1;
}

.item-score {
  width: 50px;
  font-size: 12px;
  color: #999;
  text-align: right;
}

.score-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
  font-size: 13px;
  color: #666;
  text-align: left;
}

/* 评分头部 */
.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
}

.score-bars {
  margin-top: 12px;
}

/* 详细评价 */
.detailed-evaluation {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
}

.eval-block {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  text-align: left;
}

.eval-block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.eval-block-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.eval-block-content p {
  margin: 0;
}

/* 逐字分析 */
.char-details {
  margin-top: 10px;
}

.char-detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
}

.char-detail-item .char-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.char-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.char-similarity {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.char-similarity.high {
  background: #d9f7be;
  color: #389e0d;
}

.char-similarity.medium {
  background: #fff1b8;
  color: #d48806;
}

.char-similarity.low {
  background: #ffccc7;
  color: #cf1322;
}

.char-improvements {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.improvement-label {
  font-size: 12px;
  color: #888;
}

.char-reason {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  padding: 6px 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.char-issues {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  margin-top: 4px;
}

/* 改进建议 */
.eval-block.improvements {
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.improvement-list {
  margin: 0;
  padding-left: 20px;
}

.improvement-list li {
  margin-bottom: 6px;
}

.improvement-list li:last-child {
  margin-bottom: 0;
}

/* 总结 */
.eval-summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #e6f7ff, #f0f5ff);
  border-radius: 8px;
  font-size: 13px;
  color: #1890ff;
  text-align: left;
}

.eval-summary .n-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.prompt-hint {
  margin-top: 8px;
}

/* 笔划动画相关样式 */
.char-cell.clickable {
  cursor: pointer;
}

.char-cell.clickable:hover {
  background: #fffbe6;
}

.char-cell.is-playing {
  background: #fff;
}

.stroke-animation-target {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  z-index: 10;
  pointer-events: none;
}

.play-hint {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 15;
}

.char-cell.clickable:hover .play-hint,
.char-cell.is-playing .play-hint {
  opacity: 1;
}

.char-cell.is-playing .play-hint {
  background: rgba(231, 76, 60, 0.8);
}
</style>
