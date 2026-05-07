<template>
  <div class="focus-mode">
    <!-- 顶部导航栏 -->
    <div class="focus-header">
      <n-button text @click="goBack" class="back-btn">
        <template #icon><n-icon :size="20"><ArrowBackOutline /></n-icon></template>
        返回
      </n-button>
      <div class="header-info">
        <span class="textbook-title">{{ note?.textbook?.title || '教材笔记' }}</span>
        <n-tag size="small" type="info">P{{ note?.page || 1 }}</n-tag>
      </div>
      <div class="header-actions">
        <!-- AI评价操作（仅writing_practice类型显示） -->
        <div v-if="showEvaluationSection" class="evaluation-status">
          <n-button
            v-if="!evaluation"
            size="small"
            type="primary"
            :disabled="!canAnalyze || analyzing"
            :loading="analyzing"
            @click="showConfirmModal = true"
          >
            AI分析
          </n-button>
          <n-button
            v-else-if="canAnalyze"
            size="small"
            :loading="analyzing"
            @click="showConfirmModal = true"
          >
            重新分析
          </n-button>
          <span v-if="!canAnalyze && remainingHours > 0" class="cooldown-hint">
            {{ remainingHours }}h后可重新分析
          </span>
        </div>

        <n-button v-if="canEdit" text @click="toggleEdit">
          <template #icon><n-icon><CreateOutline /></n-icon></template>
          {{ isEditing ? '完成' : '编辑' }}
        </n-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="focus-content">
      <n-spin :show="loading">
        <div v-if="note" class="note-container">
          <!-- 笔记类型标签 -->
          <div class="note-meta">
            <div class="meta-left">
              <n-tag :type="getNoteTypeStyle(note.sourceType)" size="small">
                {{ getNoteTypeLabel(note.sourceType) }}
              </n-tag>
              <span class="note-time">{{ formatTime(note.createdAt) }}</span>
            </div>
            <!-- 老师打分（红笔手写风格） -->
            <div
              v-if="evaluation && showEvaluationSection"
              class="teacher-score"
              @click="showEvaluationDetail = true"
            >
              <span class="score-num">{{ evaluation.overallScore }}</span>
              <div class="score-underline"></div>
            </div>
          </div>

          <!-- 笔记标题/查询 -->
          <h2 class="note-title">{{ note.query }}</h2>

          <!-- 笔记内容 -->
          <div class="note-body">
            <!-- 书写练习类型 -->
            <template v-if="note.sourceType === 'writing_practice' || note.sourceType === 'dict'">
              <!-- 历史版本切换 -->
              <div v-if="practiceHistory.length > 1" class="history-selector">
                <span class="label">练习记录:</span>
                <n-select
                  v-model:value="currentHistoryIndex"
                  :options="historyOptions"
                  size="small"
                  style="width: 200px"
                  @update:value="switchHistory"
                />
              </div>

              <!-- 练字展示区 -->
              <div class="writing-display">
                <!-- 米字格/田字格选择 -->
                <div class="grid-type-selector">
                  <n-radio-group v-model:value="displayGridType" size="small">
                    <n-radio-button value="mi">米字格</n-radio-button>
                    <n-radio-button value="tian">田字格</n-radio-button>
                  </n-radio-group>
                </div>

                <!-- 练字画布区域 -->
                <div class="writing-canvas-area">
                  <!-- 网格背景 -->
                  <canvas ref="gridCanvasRef" class="grid-canvas" />

                  <!-- 参考字（半透明） -->
                  <div class="reference-char">{{ currentCharacter }}</div>

                  <!-- 笔画渲染 -->
                  <div class="stroke-layer">
                    <StrokeRenderer
                      v-if="currentStrokeData"
                      :content="currentStrokeData"
                      :preview-mode="false"
                      :show-playback="true"
                      :max-width="300"
                      :max-height="300"
                      background-color="transparent"
                    />
                  </div>
                </div>

                <!-- 字符信息 -->
                <div v-if="characterInfo" class="character-info">
                  <div v-if="characterInfo.pinyin" class="pinyin">{{ characterInfo.pinyin }}</div>
                  <div v-if="characterInfo.definition" class="definition">{{ characterInfo.definition }}</div>
                </div>
              </div>

              <!-- 练习统计 -->
              <div v-if="practiceHistory.length > 0" class="practice-stats">
                <n-statistic label="练习次数" :value="practiceHistory.length" />
              </div>
            </template>

            <!-- 草稿类型 -->
            <template v-else-if="note.sourceType === 'drawing' && note.content">
              <StrokeRenderer
                :content="note.content"
                :preview-mode="false"
                :max-width="600"
                :show-playback="true"
              />
            </template>

            <!-- 练习题类型（多题） -->
            <template v-else-if="note.sourceType === 'practice' && getPracticeQuestions(note).length > 0">
              <PracticeQuestions
                :questions="getPracticeQuestions(note)"
                :show-footer="true"
                :show-feedback="true"
                @complete="handlePracticeComplete"
              />
            </template>

            <!-- 普通文本笔记 -->
            <template v-else>
              <div v-if="isEditing" class="edit-area">
                <n-input
                  v-model:value="editContent"
                  type="textarea"
                  :autosize="{ minRows: 5, maxRows: 20 }"
                  placeholder="编辑笔记内容..."
                />
                <div class="edit-actions">
                  <n-button @click="cancelEdit">取消</n-button>
                  <n-button type="primary" @click="saveEdit" :loading="saving">保存</n-button>
                </div>
              </div>
              <div v-else class="text-content">
                <div v-if="note.content?.text" class="snippet-text">{{ note.content.text }}</div>
                <div v-else class="snippet-text">{{ note.snippet }}</div>
              </div>
            </template>
          </div>

          <!-- 底部操作 -->
          <div class="note-footer">
            <n-button @click="goToPage">
              <template #icon><n-icon><BookOutline /></n-icon></template>
              跳转到教材第 {{ note.page }} 页
            </n-button>
          </div>
        </div>

        <n-empty v-else-if="!loading" description="笔记不存在或已删除">
          <template #extra>
            <n-button @click="goBack">返回</n-button>
          </template>
        </n-empty>
      </n-spin>
    </div>

    <!-- AI分析确认弹窗 -->
    <n-modal v-model:show="showConfirmModal" preset="dialog" title="AI书写评价">
      <div class="confirm-content">
        <p>将使用AI对当前练字进行书写评价</p>
        <p>分析过程预计需要30秒~1分钟</p>
        <p style="color: #999; font-size: 13px;">分析期间请勿切换页面</p>
      </div>
      <template #action>
        <n-button @click="showConfirmModal = false">取消</n-button>
        <n-button type="primary" @click="startAnalyze">开始分析</n-button>
      </template>
    </n-modal>

    <!-- 评价详情抽屉（右侧弹出） -->
    <n-drawer v-model:show="showEvaluationDetail" :width="400" placement="right">
      <n-drawer-content title="书写评价详情" closable>
        <div v-if="evaluation" class="evaluation-detail">
          <!-- 综合评分 -->
          <div class="score-section">
            <div class="score-circle" :class="evaluation.scoreLevel">
              {{ evaluation.overallScore }}
            </div>
            <div class="score-level">{{ getLevelText(evaluation.scoreLevel) }}</div>
          </div>

          <!-- 各维度评分 -->
          <div class="dimensions">
            <div v-for="(dim, key) in evaluation.dimensions" :key="key" class="dimension-item">
              <div class="dim-header">
                <span class="dim-name">{{ getDimensionName(key) }}</span>
                <span class="dim-score">{{ dim.score }}分</span>
              </div>
              <n-progress
                type="line"
                :percentage="getDimensionPercent(dim.score, key)"
                :show-indicator="false"
                :height="6"
                :border-radius="3"
                :color="getProgressColor(dim.score, key)"
              />
              <div class="dim-comment">{{ dim.comment }}</div>
              <!-- 字形识别显示 Top3 -->
              <div v-if="key === 'recognition' && dim.top3?.length" class="recognition-top3">
                AI识别: {{ dim.top3.join('、') }}
                <span v-if="dim.matchRank > 0" class="match-hint">(第{{ dim.matchRank }}位命中)</span>
                <span v-else class="no-match-hint">(未命中目标字)</span>
              </div>
            </div>
          </div>

          <!-- 改进建议 -->
          <div v-if="evaluation.suggestions?.length" class="suggestions">
            <div class="section-title">改进建议</div>
            <ul>
              <li v-for="(s, i) in evaluation.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>

          <!-- 鼓励语 -->
          <div v-if="evaluation.encouragement" class="encouragement">
            {{ evaluation.encouragement }}
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import ArrowBackOutline from '@vicons/ionicons5/es/ArrowBackOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import { textbookNoteAPI, writingEvaluationAPI } from '@/api/index';
import { calculateStrokeMetrics } from '@/composables/useStrokeMetrics';
import PracticeQuestions from '@/components/textbook/PracticeQuestions.vue';
import StrokeRenderer from '@/components/textbook/StrokeRenderer.vue';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(true);
const note = ref(null);
const isEditing = ref(false);
const editContent = ref('');
const saving = ref(false);

// 书写练习相关
const practiceHistory = ref([]);  // 练习历史记录列表
const currentHistoryIndex = ref(0);
const displayGridType = ref('mi');
const gridCanvasRef = ref(null);
const gridCanvasSize = 300;

// AI评价相关
const evaluation = ref(null);
const analyzing = ref(false);
const canAnalyze = ref(true);
const remainingHours = ref(0);
const showConfirmModal = ref(false);
const showEvaluationDetail = ref(false);

// 当前选中的历史记录
const currentHistoryRecord = computed(() => {
  if (practiceHistory.value.length > 0 && currentHistoryIndex.value < practiceHistory.value.length) {
    return practiceHistory.value[currentHistoryIndex.value];
  }
  return note.value;
});

// 当前显示的笔画数据
const currentStrokeData = computed(() => {
  // 优先从历史记录中获取
  if (practiceHistory.value.length > 0 && currentHistoryIndex.value < practiceHistory.value.length) {
    return practiceHistory.value[currentHistoryIndex.value].content;
  }
  // 回退到当前笔记
  return note.value?.content || null;
});

// 当前练习的字符
const currentCharacter = computed(() => {
  if (note.value?.sourceType === 'writing_practice') {
    return note.value.content?.character || note.value.query || '';
  }
  return note.value?.query || note.value?.content?.character || '';
});

// 字符信息（拼音、释义等）
const characterInfo = computed(() => {
  if (note.value?.sourceType === 'dict') {
    return {
      pinyin: note.value.content?.pinyin,
      definition: note.value.content?.definition || note.value.content?.meaning
    };
  }
  return null;
});

// 是否显示评价区域（仅writing_practice类型）
const showEvaluationSection = computed(() => {
  return note.value?.sourceType === 'writing_practice';
});

// 历史版本选项
const historyOptions = computed(() => {
  return practiceHistory.value.map((record, index) => ({
    label: `第 ${index + 1} 次 - ${formatTime(record.createdAt)}`,
    value: index
  }));
});

// 是否可编辑（仅用户自己写的笔记）
const canEdit = computed(() => {
  return note.value?.sourceType === 'user_note';
});

// 加载笔记详情
const loadNote = async () => {
  const noteId = route.params.noteId;
  if (!noteId) {
    loading.value = false;
    return;
  }

  try {
    const result = await textbookNoteAPI.getDetail(noteId);
    if (result.success && result.data) {
      note.value = result.data;

      // 如果是书写练习或生词，加载相关练习历史
      if (result.data.sourceType === 'writing_practice') {
        // 当前就是练习记录，加载同一个字的其他练习
        await loadPracticeHistory(result.data.content?.originalNoteId, result.data.query);
      } else if (result.data.sourceType === 'dict') {
        // 是生词记录，加载该生词的所有练习
        await loadPracticeHistory(result.data.id, result.data.query);
      }

      // 设置网格类型
      if (result.data.content?.gridType) {
        displayGridType.value = result.data.content.gridType;
      }
    }
  } catch (error) {
    console.error('加载笔记失败:', error);
    message.error('加载笔记失败');
  } finally {
    loading.value = false;
  }
};

// 加载练习历史
const loadPracticeHistory = async (originalNoteId, character) => {
  try {
    const result = await textbookNoteAPI.list({
      sourceType: 'writing_practice',
      search: character,
      limit: 50,
      sortBy: 'oldest'
    });

    if (result.success && result.data?.notes) {
      // 筛选出同一个字的练习记录
      practiceHistory.value = result.data.notes.filter(n =>
        n.content?.originalNoteId === originalNoteId ||
        n.query === character ||
        n.content?.character === character
      );

      // 如果当前是练习记录，找到它在历史中的位置
      if (note.value?.sourceType === 'writing_practice') {
        const index = practiceHistory.value.findIndex(n => n.id === note.value.id);
        if (index >= 0) {
          currentHistoryIndex.value = index;
        }
      }
    }
  } catch (error) {
    console.error('加载练习历史失败:', error);
  }
};

// 切换历史版本
const switchHistory = async (index) => {
  currentHistoryIndex.value = index;
  const record = practiceHistory.value[index];
  if (record?.content?.gridType) {
    displayGridType.value = record.content.gridType;
  }
  // 加载该记录的评价
  await loadEvaluationForRecord(record?.id);
};

// 加载指定记录的评价
const loadEvaluationForRecord = async (recordId) => {
  if (!recordId) {
    evaluation.value = null;
    canAnalyze.value = true;
    remainingHours.value = 0;
    return;
  }
  try {
    const statusRes = await writingEvaluationAPI.getStatus(recordId);
    if (statusRes.success && statusRes.data) {
      canAnalyze.value = statusRes.data.canAnalyze;
      remainingHours.value = statusRes.data.remainingHours || 0;
      if (statusRes.data.hasEvaluation) {
        const evalRes = await writingEvaluationAPI.get(recordId);
        evaluation.value = evalRes.success ? evalRes.data : null;
      } else {
        evaluation.value = null;
      }
    }
  } catch (error) {
    console.error('加载评价失败:', error);
    evaluation.value = null;
  }
};

// 绘制网格背景
const drawGrid = () => {
  const canvas = gridCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = gridCanvasSize;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  // 填充米黄色背景
  ctx.fillStyle = '#FDF5E6';
  ctx.fillRect(0, 0, size, size);

  // 外框 - 深黑色
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  // 内部线条 - 暗红色
  ctx.strokeStyle = '#CD5C5C';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  if (displayGridType.value === 'mi') {
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

// 返回
const goBack = () => {
  router.back();
};

// 跳转到教材页码
const goToPage = () => {
  if (note.value?.textbookId) {
    router.push(`/textbook/reader/${note.value.textbookId}?page=${note.value.page || 1}`);
  }
};

// 编辑相关
const toggleEdit = () => {
  if (isEditing.value) {
    saveEdit();
  } else {
    editContent.value = note.value?.content?.text || note.value?.snippet || '';
    isEditing.value = true;
  }
};

const cancelEdit = () => {
  isEditing.value = false;
  editContent.value = '';
};

const saveEdit = async () => {
  if (!note.value?.id) return;

  saving.value = true;
  try {
    await textbookNoteAPI.update(note.value.id, {
      content: { text: editContent.value },
      snippet: editContent.value.slice(0, 100)
    });
    note.value.content = { text: editContent.value };
    note.value.snippet = editContent.value.slice(0, 100);
    isEditing.value = false;
    message.success('保存成功');
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 获取练习题数组
const getPracticeQuestions = (note) => {
  if (!note?.content) return [];
  if (Array.isArray(note.content.questions) && note.content.questions.length > 0) {
    return note.content.questions;
  }
  if (note.content.question && note.content.question.stem) {
    return [note.content.question];
  }
  return [];
};

// 练习完成回调
const handlePracticeComplete = (result) => {
  message.success(`练习完成！正确率：${result.correctCount}/${result.total}`);
};

// 笔记类型
const getNoteTypeLabel = (sourceType) => {
  const map = {
    'dict': '生词', 'search': '搜索', 'ai_analysis': 'AI分析',
    'ai_quote': 'AI对话', 'user_note': '笔记', 'pdf_selection': '摘录',
    'practice': '练习', 'exercise': '练习', 'solving': '解题',
    'highlight': '高亮', 'region_screenshot': '截图',
    'writing_practice': '书写练习', 'drawing': '草稿'
  };
  return map[sourceType] || '笔记';
};

const getNoteTypeStyle = (sourceType) => {
  const map = {
    'dict': 'info', 'search': 'default', 'ai_analysis': 'success',
    'ai_quote': 'success', 'user_note': 'warning', 'practice': 'primary',
    'exercise': 'primary', 'solving': 'error', 'highlight': 'info',
    'region_screenshot': 'default', 'writing_practice': 'success',
    'drawing': 'warning'
  };
  return map[sourceType] || 'default';
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// ============ AI评价相关方法 ============

// 加载评价状态
const loadEvaluationStatus = async () => {
  if (!showEvaluationSection.value) return;
  const recordId = currentHistoryRecord.value?.id || note.value?.id;
  if (!recordId) return;
  await loadEvaluationForRecord(recordId);
};

// 生成画布预览图
const generatePreviewImage = async () => {
  const canvas = gridCanvasRef.value;
  if (!canvas) return null;

  // 创建临时画布合并网格和笔画
  const tempCanvas = document.createElement('canvas');
  const size = gridCanvasSize;
  const dpr = window.devicePixelRatio || 1;
  tempCanvas.width = size * dpr;
  tempCanvas.height = size * dpr;
  const ctx = tempCanvas.getContext('2d');

  // 绘制背景网格
  ctx.drawImage(canvas, 0, 0);

  // 获取笔画画布
  const strokeCanvas = document.querySelector('.stroke-layer canvas');
  if (strokeCanvas) {
    ctx.drawImage(strokeCanvas, 0, 0, size * dpr, size * dpr);
  }

  return tempCanvas.toDataURL('image/png');
};

// 开始AI分析
const startAnalyze = async () => {
  showConfirmModal.value = false;
  analyzing.value = true;

  try {
    // 计算指标
    const metrics = calculateStrokeMetrics(currentStrokeData.value);
    if (!metrics) {
      throw new Error('无法解析笔画数据');
    }

    // 生成预览图
    const renderedImage = await generatePreviewImage();

    // 使用当前选中的历史记录ID
    const targetNoteId = currentHistoryRecord.value?.id || note.value.id;

    // 调用API
    const res = await writingEvaluationAPI.analyze({
      noteId: targetNoteId,
      character: currentCharacter.value,
      metrics,
      renderedImage
    });

    if (res.success && res.data) {
      evaluation.value = res.data;
      canAnalyze.value = false;
      remainingHours.value = 24;
      message.success('分析完成');
    } else {
      throw new Error(res.error || '分析失败');
    }
  } catch (error) {
    console.error('AI分析失败:', error);
    message.error(error.message || '分析失败，请稍后重试');
  } finally {
    analyzing.value = false;
  }
};

// 评分等级对应的标签类型
const getScoreTagType = (level) => {
  const map = {
    excellent: 'success',
    good: 'info',
    needsWork: 'warning'
  };
  return map[level] || 'default';
};

// 等级文本
const getLevelText = (level) => {
  const map = {
    excellent: '优秀',
    good: '良好',
    needsWork: '继续加油'
  };
  return map[level] || '';
};

// 维度名称
const getDimensionName = (key) => {
  const map = {
    recognition: '字形识别',
    structure: '结构准确',
    quality: '书写质量',
    // 兼容旧版本
    similarity: '相似度',
    strokeOrderCorrect: '笔顺合规',
    strokeOrder: '笔顺',
    rhythm: '节奏',
    stability: '稳定性'
  };
  return map[key] || key;
};

// 进度条颜色（根据维度类型调整满分）
const getProgressColor = (score, key) => {
  // 新版本各维度满分不同
  const maxScores = { recognition: 40, structure: 30, quality: 30 };
  const max = maxScores[key] || 100;
  const percent = (score / max) * 100;
  if (percent >= 80) return '#18a058';
  if (percent >= 60) return '#2080f0';
  return '#f0a020';
};

// 获取维度进度百分比
const getDimensionPercent = (score, key) => {
  const maxScores = { recognition: 40, structure: 30, quality: 30 };
  const max = maxScores[key] || 100;
  return Math.round((score / max) * 100);
};

// 监听网格类型变化重绘
watch(displayGridType, () => {
  nextTick(() => {
    drawGrid();
  });
});

// 监听笔记加载完成后绘制网格和加载评价状态
watch(note, (newNote) => {
  if (newNote && (newNote.sourceType === 'writing_practice' || newNote.sourceType === 'dict')) {
    nextTick(() => {
      drawGrid();
    });
  }
  // 加载AI评价状态
  if (newNote && newNote.sourceType === 'writing_practice') {
    loadEvaluationStatus();
  }
}, { immediate: true });

onMounted(() => {
  loadNote();
});
</script>

<style scoped>
.focus-mode {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.focus-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 15px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.textbook-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.header-actions {
  min-width: 60px;
  text-align: right;
}

/* 主内容 */
.focus-content {
  flex: 1;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.note-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.note-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-time {
  font-size: 12px;
  color: #999;
}

.note-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px;
  line-height: 1.4;
}

.note-body {
  min-height: 200px;
}

.text-content {
  font-size: 15px;
  line-height: 1.8;
  color: #444;
  white-space: pre-wrap;
}

/* 历史版本选择器 */
.history-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.history-selector .label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

/* 练字展示区 */
.writing-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.grid-type-selector {
  margin-bottom: 8px;
}

/* 练字画布区域 */
.writing-canvas-area {
  position: relative;
  width: 300px;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.reference-char {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 180px;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: rgba(204, 0, 0, 0.1);
  z-index: 2;
  pointer-events: none;
  user-select: none;
}

.stroke-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stroke-layer :deep(.stroke-renderer) {
  background: transparent !important;
}

.stroke-layer :deep(.stroke-canvas) {
  background: transparent !important;
}

/* 老师打分样式 */
.teacher-score {
  cursor: pointer;
  text-align: center;
  padding: 0 8px;
  transition: transform 0.2s;
  transform: rotate(-8deg);
}

.teacher-score:hover {
  transform: rotate(-8deg) scale(1.05);
}

.teacher-score .score-num {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 96px;
  font-weight: 500;
  color: #C41E3A;
  line-height: 1;
  letter-spacing: -4px;
}

.teacher-score .score-underline {
  margin-top: 4px;
  height: 6px;
  background: repeating-linear-gradient(
    to bottom,
    #C41E3A 0px,
    #C41E3A 2px,
    transparent 2px,
    transparent 4px
  );
  border-radius: 0;
}

/* 字符信息 */
.character-info {
  text-align: center;
  margin-top: 12px;
}

.character-info .pinyin {
  font-size: 18px;
  color: #1890ff;
  margin-bottom: 8px;
}

.character-info .definition {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 练习统计 */
.practice-stats {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

/* 编辑区域 */
.edit-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 底部操作 */
.note-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: center;
}

/* 响应式 */
@media (max-width: 640px) {
  .writing-canvas-area {
    width: 280px;
    height: 280px;
  }

  .reference-char {
    font-size: 160px;
  }

  .history-selector {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* AI评价状态 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.evaluation-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cooldown-hint {
  font-size: 12px;
  color: #999;
}

/* 确认弹窗 */
.confirm-content p {
  margin: 8px 0;
  font-size: 14px;
  color: #333;
}

/* 评价详情 */
.evaluation-detail {
  padding: 8px 0;
}

.score-section {
  text-align: center;
  margin-bottom: 24px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: white;
  background: #2080f0;
  margin-bottom: 8px;
}

.score-circle.excellent {
  background: linear-gradient(135deg, #18a058, #36ad6a);
}

.score-circle.good {
  background: linear-gradient(135deg, #2080f0, #4098fc);
}

.score-circle.needsWork {
  background: linear-gradient(135deg, #f0a020, #fcb040);
}

.score-level {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.dimensions {
  margin-bottom: 20px;
}

.dimension-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.dimension-item:last-child {
  border-bottom: none;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dim-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.dim-score {
  font-size: 14px;
  font-weight: 600;
  color: #666;
}

.dim-comment {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
  line-height: 1.5;
}

.recognition-top3 {
  font-size: 12px;
  color: #888;
  margin-top: 6px;
  padding: 6px 10px;
  background: #f8f8f8;
  border-radius: 4px;
}

.match-hint {
  color: #18a058;
  font-weight: 500;
}

.no-match-hint {
  color: #d03050;
  font-weight: 500;
}

.suggestions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.suggestions li {
  font-size: 13px;
  color: #555;
  line-height: 1.8;
}

.encouragement {
  text-align: center;
  font-size: 15px;
  color: #18a058;
  font-weight: 500;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 8px;
}
</style>
