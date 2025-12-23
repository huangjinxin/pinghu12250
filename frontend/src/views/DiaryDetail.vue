<template>
  <div class="diary-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <n-result status="error" :title="error" description="该日记可能已被删除或设为私密">
        <template #footer>
          <n-button @click="goHome">返回首页</n-button>
        </template>
      </n-result>
    </div>

    <!-- 日记内容 -->
    <article v-else-if="diary" class="diary-article">
      <!-- 头部信息 -->
      <header class="article-header">
        <h1 class="article-title">{{ diary.title }}</h1>
        <div class="article-meta">
          <div class="author-info">
            <n-avatar :src="diary.author?.avatar" :size="40" round>
              {{ diary.author?.username?.charAt(0) || '?' }}
            </n-avatar>
            <div class="author-text">
              <span class="author-name">{{ diary.author?.username || '匿名' }}</span>
              <span class="publish-time">{{ formatDate(diary.createdAt) }}</span>
            </div>
          </div>
          <div class="diary-mood">
            <span class="mood-emoji">{{ getMoodEmoji(diary.mood) }}</span>
            <span class="weather-text">{{ getWeatherText(diary.weather) }}</span>
          </div>
        </div>
      </header>

      <!-- 正文内容 -->
      <div class="article-content">
        <p v-for="(paragraph, idx) in contentParagraphs" :key="idx">{{ paragraph }}</p>
      </div>

      <!-- 底部信息 -->
      <footer class="article-footer">
        <div class="word-count">{{ wordCount }} 字</div>
      </footer>

      <!-- 评论区 -->
      <section class="comments-section">
        <h2 class="comments-title">
          评论 <span class="comments-count">({{ comments.length }})</span>
        </h2>

        <!-- 匿名评论输入框 -->
        <div class="comment-input-box">
          <n-input
            v-model:value="nickname"
            placeholder="昵称（选填）"
            style="margin-bottom: 8px"
            maxlength="20"
          />
          <n-input
            v-model:value="newComment"
            type="textarea"
            placeholder="写下你的评论..."
            :autosize="{ minRows: 2, maxRows: 4 }"
            maxlength="500"
          />
          <div class="comment-actions">
            <n-button
              type="primary"
              :disabled="!newComment.trim()"
              :loading="submitting"
              @click="submitComment"
            >
              发表评论
            </n-button>
          </div>
        </div>

        <!-- 评论列表 -->
        <div class="comments-list">
          <div v-if="!comments.length" class="no-comments">
            暂无评论，来抢沙发吧~
          </div>
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-main">
              <n-avatar :size="36" round>
                {{ (comment.nickname || '匿名').charAt(0) }}
              </n-avatar>
              <div class="comment-body">
                <div class="comment-header">
                  <span class="commenter-name">{{ comment.nickname || '匿名用户' }}</span>
                  <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
                </div>
                <p class="comment-content">{{ comment.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { diaryAPI } from '@/api';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(true);
const error = ref('');
const diary = ref(null);
const comments = ref([]);
const nickname = ref('');
const newComment = ref('');
const submitting = ref(false);

// 将内容按段落分割
const contentParagraphs = computed(() => {
  if (!diary.value?.content) return [];
  return diary.value.content.split('\n').filter(p => p.trim());
});

// 字数统计
const wordCount = computed(() => {
  if (!diary.value?.content) return 0;
  const content = diary.value.content;
  return content.length - (content.match(/\s/g) || []).length;
});

const getMoodEmoji = (mood) => {
  const emojis = { happy: '😊', neutral: '😐', sad: '😢', angry: '😠', tired: '😴' };
  return emojis[mood] || '😊';
};

const getWeatherText = (weather) => {
  const texts = { sunny: '☀️ 晴', cloudy: '☁️ 多云', rainy: '🌧️ 雨', snowy: '❄️ 雪' };
  return texts[weather] || '';
};

const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy年M月d日 HH:mm', { locale: zhCN });
};

const goHome = () => {
  router.push('/');
};

const fetchDiary = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await diaryAPI.getPublicDiary(route.params.id);
    const data = res.data || res;
    diary.value = data.diary;
    comments.value = data.comments || [];
  } catch (err) {
    console.error('Fetch error:', err);
    error.value = err.response?.data?.error || '加载失败';
  } finally {
    loading.value = false;
  }
};

const submitComment = async () => {
  if (!newComment.value.trim()) return;
  submitting.value = true;
  try {
    const res = await diaryAPI.addComment(route.params.id, {
      content: newComment.value.trim(),
      nickname: nickname.value.trim() || '匿名用户',
    });
    const data = res.data || res;
    comments.value.unshift(data.comment);
    newComment.value = '';
    message.success('评论成功');
  } catch (err) {
    console.error('Comment error:', err);
    message.error(err.response?.data?.error || '评论失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchDiary();
});
</script>

<style scoped>
.diary-detail-page {
  min-height: 100vh;
  background: #fafafa;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 20px;
}

.diary-article {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px 60px;
  background: #fff;
  min-height: 100vh;
}

.article-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  margin: 0 0 20px;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.publish-time {
  font-size: 13px;
  color: #999;
}

.diary-mood {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.mood-emoji {
  font-size: 24px;
}

.article-content {
  font-size: 17px;
  line-height: 1.9;
  color: #333;
}

.article-content p {
  margin: 0 0 1.2em;
  text-indent: 2em;
}

.article-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  text-align: right;
}

.word-count {
  font-size: 13px;
  color: #999;
}

.comments-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid #eee;
}

.comments-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 24px;
}

.comments-count {
  font-weight: 400;
  color: #999;
}

.comment-input-box {
  margin-bottom: 32px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.no-comments {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.comment-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-main {
  display: flex;
  gap: 12px;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.commenter-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-content {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin: 0;
  word-break: break-word;
}

@media (max-width: 640px) {
  .diary-article {
    padding: 16px 12px 40px;
  }

  .article-title {
    font-size: 22px;
  }

  .article-content {
    font-size: 16px;
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
