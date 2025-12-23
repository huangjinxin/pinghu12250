<template>
  <div class="public-recitation-tab">
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 6" :key="i" height="200px" :sharp="false" />
    </div>

    <n-empty v-else-if="!works.length" description="暂无朗诵作品" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="work in works"
        :key="work.id"
        class="work-card"
      >
        <!-- 音频封面 -->
        <div class="audio-cover">
          <div class="cover-icon">
            <n-icon size="48" color="#667eea">
              <MusicalNotesOutline />
            </n-icon>
          </div>
          <div class="play-btn" @click="togglePlay(work)">
            <n-icon size="24" color="white">
              <component :is="currentPlaying === work.id ? PauseOutline : PlayOutline" />
            </n-icon>
          </div>
        </div>

        <!-- 作品信息 -->
        <div class="info-section">
          <h3 class="work-title">{{ work.title || '朗诵作品' }}</h3>
          <div class="author-row">
            <span class="author-name">{{ work.author?.nickname || work.author?.username }}</span>
            <span class="create-time">{{ formatDate(work.createdAt) }}</span>
          </div>
        </div>

        <!-- 隐藏的音频播放器 -->
        <audio
          :ref="el => { if (el) audioRefs[work.id] = el }"
          :src="work.audio"
          @ended="handleAudioEnded(work.id)"
        />
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="!loading && total > pageSize" class="pagination-container">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        :page-size="pageSize"
        @update:page="loadWorks"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { MusicalNotesOutline, PlayOutline, PauseOutline } from '@vicons/ionicons5';
import axios from 'axios';

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);

const audioRefs = ref({});
const currentPlaying = ref(null);

const loadWorks = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/gallery/recitation/public', {
      params: { page: page.value, pageSize: pageSize.value }
    });
    works.value = response.data.works || [];
    total.value = response.data.pagination?.total || 0;
  } catch (error) {
    console.error('加载朗诵作品失败:', error);
  } finally {
    loading.value = false;
  }
};

const togglePlay = (work) => {
  const audio = audioRefs.value[work.id];
  if (!audio) return;

  if (currentPlaying.value === work.id) {
    audio.pause();
    currentPlaying.value = null;
  } else {
    // 暂停其他正在播放的
    if (currentPlaying.value && audioRefs.value[currentPlaying.value]) {
      audioRefs.value[currentPlaying.value].pause();
    }
    audio.play();
    currentPlaying.value = work.id;
  }
};

const handleAudioEnded = (id) => {
  if (currentPlaying.value === id) {
    currentPlaying.value = null;
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

onMounted(() => {
  loadWorks();
});

onUnmounted(() => {
  // 停止所有播放
  Object.values(audioRefs.value).forEach(audio => {
    if (audio) audio.pause();
  });
});
</script>

<style scoped>
.public-recitation-tab {
  padding: 0;
}

.work-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.work-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.audio-cover {
  height: 140px;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cover-icon {
  opacity: 0.6;
}

.play-btn {
  position: absolute;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.play-btn:hover {
  transform: scale(1.1);
}

.info-section {
  padding: 12px 16px;
}

.work-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-name {
  font-size: 13px;
  color: #666;
}

.create-time {
  font-size: 12px;
  color: #999;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
