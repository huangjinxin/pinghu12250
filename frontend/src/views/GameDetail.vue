<template>
  <div class="space-y-6">
    <n-spin :show="loading">
      <div v-if="game">
        <!-- 游戏基本信息 -->
        <div class="card">
          <div class="flex gap-6">
            <!-- 封面 -->
            <img
              v-if="game.coverUrl"
              :src="game.coverUrl"
              :alt="game.name"
              class="w-48 h-64 object-cover rounded-lg shadow-lg"
            />
            <div v-else class="w-48 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <n-icon size="64" color="#999"><GameControllerOutline /></n-icon>
            </div>

            <!-- 详细信息 -->
            <div class="flex-1 min-w-0">
              <h1 class="text-3xl font-bold text-gray-800 mb-3">{{ game.name }}</h1>

              <!-- 评分 -->
              <div class="flex items-center gap-3 mb-4">
                <n-rate :value="game.avgScore / 2" readonly size="large" />
                <span class="text-2xl font-bold text-gray-700">{{ game.avgScore?.toFixed(1) || '暂无' }}</span>
                <span class="text-gray-500">/ 10</span>
              </div>

              <!-- 基本信息 -->
              <div class="space-y-2 mb-4">
                <div class="flex items-center gap-2 text-gray-600">
                  <span class="font-medium">类型：</span>
                  <n-tag type="info">{{ game.gameType }}</n-tag>
                </div>
                <div class="flex items-center gap-2 text-gray-600">
                  <span class="font-medium">平台：</span>
                  <n-tag type="success">{{ game.platform }}</n-tag>
                </div>
                <div class="flex items-center gap-2 text-gray-600">
                  <span class="font-medium">记录人数：</span>
                  <span>{{ game.recordCount }} 人</span>
                </div>
                <div class="flex items-center gap-2 text-gray-600">
                  <span class="font-medium">评测数：</span>
                  <span>{{ game.reviewCount || 0 }} 条（短评 {{ game.shortReviewCount || 0 }} / 长评 {{ game.longReviewCount || 0 }}）</span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="flex flex-wrap gap-3">
                <n-dropdown v-if="!game.userRecord" :options="addOptions" @select="handleAddToLibrary">
                  <n-button type="primary">
                    <template #icon>
                      <n-icon><AddCircleOutline /></n-icon>
                    </template>
                    添加到游戏库
                  </n-button>
                </n-dropdown>
                <n-dropdown v-else :options="statusOptions" @select="handleChangeStatus">
                  <n-button type="primary">
                    <template #icon>
                      <n-icon><CheckmarkCircleOutline /></n-icon>
                    </template>
                    {{ getStatusLabel(game.userRecord.status) }}
                  </n-button>
                </n-dropdown>

                <n-button @click="showShortReviewModal = true">
                  <template #icon>
                    <n-icon><ChatboxOutline /></n-icon>
                  </template>
                  写短评
                </n-button>

                <n-button @click="showLongReviewModal = true">
                  <template #icon>
                    <n-icon><CreateOutline /></n-icon>
                  </template>
                  写长评
                </n-button>
              </div>

              <!-- 我的记录 -->
              <div v-if="game.userRecord" class="mt-4 p-3 bg-blue-50 rounded-lg">
                <div class="text-sm text-gray-600">
                  <div>我的总时长：{{ formatPlayTime(game.userRecord.totalPlayTime) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 游戏简介 -->
          <div v-if="game.description" class="mt-6 pt-6 border-t">
            <h3 class="font-bold text-lg mb-2">游戏简介</h3>
            <p class="text-gray-600 leading-relaxed">{{ game.description }}</p>
          </div>
        </div>

        <!-- 评测列表 -->
        <n-tabs type="line" animated>
          <!-- 短评 -->
          <n-tab-pane name="short" tab="短评">
            <div class="mt-4 space-y-3">
              <n-spin :show="loadingShortReviews">
                <div v-if="shortReviews.length > 0" class="space-y-3">
                  <div v-for="review in shortReviews" :key="review.id" class="card">
                    <div class="flex items-start gap-3">
                      <AvatarText :username="review.user.username" size="md" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-2">
                          <span class="font-medium">{{ review.user.username }}</span>
                          <span class="text-sm text-gray-400">{{ formatTime(review.createdAt) }}</span>
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                          <n-rate :value="review.score / 2" readonly size="small" />
                          <span class="text-sm font-medium">{{ review.score }}/10</span>
                          <span class="text-xs text-gray-500">游玩 {{ formatPlayTime(review.playTime) }}</span>
                        </div>
                        <p class="text-gray-700">{{ review.content }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty v-else description="还没有短评" />
              </n-spin>
            </div>
          </n-tab-pane>

          <!-- 长评 -->
          <n-tab-pane name="long" tab="长评">
            <div class="mt-4 space-y-3">
              <n-spin :show="loadingLongReviews">
                <div v-if="longReviews.length > 0" class="space-y-3">
                  <div
                    v-for="review in longReviews"
                    :key="review.id"
                    class="card hover:shadow-md transition-shadow cursor-pointer"
                    @click="$router.push(`/games/review/${review.id}`)"
                  >
                    <div class="flex items-start gap-3">
                      <AvatarText :username="review.user.username" size="md" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-2">
                          <span class="font-medium">{{ review.user.username }}</span>
                          <span class="text-sm text-gray-400">{{ formatTime(review.createdAt) }}</span>
                        </div>
                        <h3 class="font-bold text-lg mb-2">{{ review.title }}</h3>
                        <div class="flex items-center gap-2 mb-3">
                          <n-rate :value="review.score / 2" readonly size="small" />
                          <span class="text-sm font-medium">{{ review.score }}/10</span>
                          <span class="text-xs text-gray-500">游玩 {{ formatPlayTime(review.playTime) }}</span>
                        </div>
                        <div class="text-sm text-gray-600 line-clamp-3 mb-3" v-html="review.content"></div>
                        <div class="flex items-center gap-4 text-sm text-gray-500">
                          <span><n-icon><HeartOutline /></n-icon> {{ review.likesCount }}</span>
                          <span><n-icon><ChatbubbleOutline /></n-icon> {{ review.commentsCount }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty v-else description="还没有长评" />
              </n-spin>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>

    <!-- 写短评模态框 -->
    <n-modal v-model:show="showShortReviewModal" preset="card" title="写短评" style="width: 600px">
      <n-form ref="shortReviewFormRef" :model="shortReviewForm" :rules="shortReviewRules">
        <n-form-item label="评分" path="score">
          <div class="flex items-center gap-3">
            <n-rate v-model:value="shortReviewForm.rateValue" size="large" @update:value="handleRateChange" />
            <n-input-number
              v-model:value="shortReviewForm.score"
              :min="1"
              :max="10"
              :step="1"
              placeholder="1-10分"
              style="width: 120px"
              @update:value="handleScoreChange"
            />
          </div>
        </n-form-item>

        <n-form-item label="游玩时长" path="playTime">
          <n-input-number
            v-model:value="shortReviewForm.playTime"
            :min="0"
            placeholder="分钟"
            style="width: 100%"
          >
            <template #suffix>分钟</template>
          </n-input-number>
        </n-form-item>

        <n-form-item label="评价内容" path="content">
          <n-input
            v-model:value="shortReviewForm.content"
            type="textarea"
            placeholder="分享你的游戏体验（最多100字）"
            :rows="4"
            :maxlength="100"
            show-count
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showShortReviewModal = false">取消</n-button>
          <n-button type="primary" @click="handleSubmitShortReview" :loading="submittingShort">发布</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 写长评模态框 -->
    <n-modal v-model:show="showLongReviewModal" preset="card" title="写长评" style="width: 800px">
      <n-form ref="longReviewFormRef" :model="longReviewForm" :rules="longReviewRules">
        <n-form-item label="评分" path="score">
          <div class="flex items-center gap-3">
            <n-rate v-model:value="longReviewForm.rateValue" size="large" @update:value="handleLongRateChange" />
            <n-input-number
              v-model:value="longReviewForm.score"
              :min="1"
              :max="10"
              :step="1"
              placeholder="1-10分"
              style="width: 120px"
              @update:value="handleLongScoreChange"
            />
          </div>
        </n-form-item>

        <n-form-item label="游玩时长" path="playTime">
          <n-input-number
            v-model:value="longReviewForm.playTime"
            :min="0"
            placeholder="分钟"
            style="width: 100%"
          >
            <template #suffix>分钟</template>
          </n-input-number>
        </n-form-item>

        <n-form-item label="标题" path="title">
          <n-input v-model:value="longReviewForm.title" placeholder="给你的评测起个标题" />
        </n-form-item>

        <n-form-item label="正文" path="content">
          <n-input
            v-model:value="longReviewForm.content"
            type="textarea"
            placeholder="详细写下你的游戏体验..."
            :rows="10"
          />
        </n-form-item>

        <n-form-item label="可见性">
          <n-switch v-model:value="longReviewForm.isPublic">
            <template #checked>公开</template>
            <template #unchecked>私密</template>
          </n-switch>
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showLongReviewModal = false">取消</n-button>
          <n-button type="primary" @click="handleSubmitLongReview" :loading="submittingLong">发布</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { gameAPI } from '@/api';
import {
  GameControllerOutline,
  AddCircleOutline,
  CheckmarkCircleOutline,
  ChatboxOutline,
  CreateOutline,
  HeartOutline,
  ChatbubbleOutline,
} from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const game = ref(null);
const shortReviews = ref([]);
const longReviews = ref([]);
const loading = ref(false);
const loadingShortReviews = ref(false);
const loadingLongReviews = ref(false);

const showShortReviewModal = ref(false);
const showLongReviewModal = ref(false);
const submittingShort = ref(false);
const submittingLong = ref(false);

const shortReviewFormRef = ref(null);
const longReviewFormRef = ref(null);

const shortReviewForm = ref({
  score: 5,
  rateValue: 2.5,
  playTime: 60,
  content: '',
});

const longReviewForm = ref({
  score: 5,
  rateValue: 2.5,
  playTime: 60,
  title: '',
  content: '',
  isPublic: true,
});

const shortReviewRules = {
  score: { required: true, type: 'number', message: '请评分', trigger: 'blur' },
  playTime: { required: true, type: 'number', message: '请输入游玩时长', trigger: 'blur' },
  content: { required: true, message: '请输入评价内容', trigger: 'blur' },
};

const longReviewRules = {
  score: { required: true, type: 'number', message: '请评分', trigger: 'blur' },
  playTime: { required: true, type: 'number', message: '请输入游玩时长', trigger: 'blur' },
  title: { required: true, message: '请输入标题', trigger: 'blur' },
  content: { required: true, message: '请输入正文', trigger: 'blur' },
};

const addOptions = [
  { label: '想玩', key: 'WANT_TO_PLAY' },
  { label: '在玩', key: 'PLAYING' },
  { label: '已通关', key: 'COMPLETED' },
];

const statusOptions = [
  { label: '想玩', key: 'WANT_TO_PLAY' },
  { label: '在玩', key: 'PLAYING' },
  { label: '已通关', key: 'COMPLETED' },
  { label: '已放弃', key: 'DROPPED' },
];

// 加载游戏详情
const loadGame = async () => {
  loading.value = true;
  try {
    game.value = await gameAPI.getGameDetails(route.params.id);
  } catch (error) {
    console.error('加载游戏详情失败', error);
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 加载短评
const loadShortReviews = async () => {
  loadingShortReviews.value = true;
  try {
    const data = await gameAPI.getShortReviews(route.params.id, { pageSize: 20 });
    shortReviews.value = data.reviews || [];
  } catch (error) {
    console.error('加载短评失败', error);
  } finally {
    loadingShortReviews.value = false;
  }
};

// 加载长评
const loadLongReviews = async () => {
  loadingLongReviews.value = true;
  try {
    const data = await gameAPI.getLongReviews(route.params.id, { pageSize: 20 });
    longReviews.value = data.reviews || [];
  } catch (error) {
    console.error('加载长评失败', error);
  } finally {
    loadingLongReviews.value = false;
  }
};

// 添加到游戏库
const handleAddToLibrary = async (key) => {
  try {
    await gameAPI.addToLibrary(route.params.id, { status: key });
    message.success('已添加到游戏库');
    loadGame();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

// 修改状态
const handleChangeStatus = async (key) => {
  try {
    await gameAPI.addToLibrary(route.params.id, { status: key });
    message.success('状态已更新');
    loadGame();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

// 评分改变（短评）
const handleRateChange = (value) => {
  shortReviewForm.value.score = Math.round(value * 2);
};

const handleScoreChange = (value) => {
  shortReviewForm.value.rateValue = value / 2;
};

// 评分改变（长评）
const handleLongRateChange = (value) => {
  longReviewForm.value.score = Math.round(value * 2);
};

const handleLongScoreChange = (value) => {
  longReviewForm.value.rateValue = value / 2;
};

// 提交短评
const handleSubmitShortReview = async () => {
  try {
    await shortReviewFormRef.value.validate();
    submittingShort.value = true;

    await gameAPI.writeShortReview(route.params.id, {
      score: shortReviewForm.value.score,
      playTime: shortReviewForm.value.playTime,
      content: shortReviewForm.value.content,
    });

    message.success('短评发布成功');
    showShortReviewModal.value = false;
    shortReviewForm.value = { score: 5, rateValue: 2.5, playTime: 60, content: '' };
    loadGame();
    loadShortReviews();
  } catch (error) {
    if (error.errors) return;
    message.error(error.error || '发布失败');
  } finally {
    submittingShort.value = false;
  }
};

// 提交长评
const handleSubmitLongReview = async () => {
  try {
    await longReviewFormRef.value.validate();
    submittingLong.value = true;

    await gameAPI.writeLongReview(route.params.id, {
      score: longReviewForm.value.score,
      playTime: longReviewForm.value.playTime,
      title: longReviewForm.value.title,
      content: longReviewForm.value.content,
      isPublic: longReviewForm.value.isPublic,
    });

    message.success('长评发布成功');
    showLongReviewModal.value = false;
    longReviewForm.value = { score: 5, rateValue: 2.5, playTime: 60, title: '', content: '', isPublic: true };
    loadGame();
    loadLongReviews();
  } catch (error) {
    if (error.errors) return;
    message.error(error.error || '发布失败');
  } finally {
    submittingLong.value = false;
  }
};

// 获取状态标签
const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_PLAY: '想玩',
    PLAYING: '在玩',
    COMPLETED: '已通关',
    DROPPED: '已放弃',
  };
  return labels[status] || status;
};

// 格式化游玩时长
const formatPlayTime = (minutes) => {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
};

// 格式化时间
const formatTime = (date) => {
  const now = new Date();
  const created = new Date(date);
  const diff = now - created;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return created.toLocaleDateString('zh-CN');
};

onMounted(() => {
  loadGame();
  loadShortReviews();
  loadLongReviews();
});
</script>
