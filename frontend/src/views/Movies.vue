<template>
  <div class="movies-container">
    <n-card title="影视" :bordered="false">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- Tab 1: 我的影视库 -->
        <n-tab-pane name="library" tab="我的影视库">
          <div class="mb-4 flex items-center justify-between">
            <n-radio-group v-model:value="libraryStatus" name="status">
              <n-radio-button value="all">全部</n-radio-button>
              <n-radio-button value="WANT_TO_WATCH">想看</n-radio-button>
              <n-radio-button value="WATCHING">在看</n-radio-button>
              <n-radio-button value="COMPLETED">看完</n-radio-button>
            </n-radio-group>
            <n-button type="primary" @click="showAddMovieModal = true">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加影视
            </n-button>
          </div>

          <n-spin :show="loadingLibrary">
            <div v-if="movieLibrary.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <n-card
                v-for="item in movieLibrary"
                :key="item.id"
                class="movie-card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div class="flex gap-4">
                  <img
                    :src="item.movie.posterUrl || 'https://via.placeholder.com/100x140?text=No+Poster'"
                    :alt="item.movie.title"
                    class="w-20 h-28 object-cover rounded"
                  />
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold mb-1 line-clamp-1">{{ item.movie.title }}</h3>
                    <p class="text-sm text-gray-500 mb-2">{{ item.movie.director }}</p>
                    <n-tag :type="getStatusType(item.status)" size="small">
                      {{ getStatusLabel(item.status) }}
                    </n-tag>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="暂无影视，快去添加吧" class="py-8" />
          </n-spin>
        </n-tab-pane>

        <!-- Tab 2: 观后感动态 -->
        <n-tab-pane name="feed" tab="观后感动态">
          <n-spin :show="loadingFeed">
            <div v-if="movieLogs.length > 0" class="space-y-4">
              <n-card
                v-for="log in movieLogs"
                :key="log.id"
                class="movie-log-card"
              >
                <div class="flex items-start gap-3">
                  <AvatarText :username="log.user.username" size="md" />
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="font-semibold">{{ log.user.profile?.nickname || log.user.username }}</span>
                      <span class="text-gray-400 text-sm">看了</span>
                      <span class="text-primary-600">
                        《{{ log.movie.title }}》
                      </span>
                    </div>
                    <p class="text-gray-800 mb-3">{{ log.content }}</p>
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                      <span>{{ formatDate(log.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="还没有观后感动态" class="py-8" />
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 添加影视弹窗 -->
    <n-modal v-model:show="showAddMovieModal" preset="card" title="添加影视到影视库" style="width: 600px">
      <n-form ref="addMovieFormRef" :model="newMovie">
        <n-form-item label="影视名" path="title">
          <n-input v-model:value="newMovie.title" placeholder="请输入影视名" />
        </n-form-item>
        <n-form-item label="导演" path="director">
          <n-input v-model:value="newMovie.director" placeholder="请输入导演" />
        </n-form-item>
        <n-form-item label="主演" path="actors">
          <n-input v-model:value="newMovie.actors" placeholder="请输入主演（可选）" />
        </n-form-item>
        <n-form-item label="海报URL" path="posterUrl">
          <n-input v-model:value="newMovie.posterUrl" placeholder="请输入海报图片URL（可选）" />
        </n-form-item>
        <n-form-item label="类型" path="genre">
          <n-input v-model:value="newMovie.genre" placeholder="请输入类型（可选）" />
        </n-form-item>
        <n-form-item label="时长（分钟）" path="duration">
          <n-input-number v-model:value="newMovie.duration" placeholder="请输入时长" :min="1" class="w-full" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddMovieModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddMovie" :loading="submittingMovie">提交</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue';
import { ref, onMounted, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { movieAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline } from '@vicons/ionicons5';

const message = useMessage();

const activeTab = ref('library');
const libraryStatus = ref('all');
const loadingLibrary = ref(false);
const loadingFeed = ref(false);
const showAddMovieModal = ref(false);
const submittingMovie = ref(false);
const movieLibrary = ref([]);
const movieLogs = ref([]);

const newMovie = ref({
  title: '',
  director: '',
  actors: '',
  posterUrl: '',
  genre: '',
  duration: null,
});

const getStatusType = (status) => {
  const types = {
    WANT_TO_WATCH: 'default',
    WATCHING: 'info',
    COMPLETED: 'success',
  };
  return types[status] || 'default';
};

const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_WATCH: '想看',
    WATCHING: '在看',
    COMPLETED: '看完',
  };
  return labels[status] || status;
};

const formatDate = (date) => format(new Date(date), 'yyyy-MM-dd HH:mm');

const loadLibrary = async () => {
  loadingLibrary.value = true;
  try {
    const params = {};
    if (libraryStatus.value !== 'all') {
      params.status = libraryStatus.value;
    }
    const data = await movieAPI.getMyMovieLibrary(params);
    movieLibrary.value = data.movieLibrary || [];
  } catch (error) {
    message.error('加载影视库失败');
  } finally {
    loadingLibrary.value = false;
  }
};

const loadFeed = async () => {
  loadingFeed.value = true;
  try {
    const data = await movieAPI.getMovieLogs();
    movieLogs.value = data.movieLogs || [];
  } catch (error) {
    message.error('加载观后感动态失败');
  } finally {
    loadingFeed.value = false;
  }
};

const handleAddMovie = async () => {
  if (!newMovie.value.title.trim()) {
    message.warning('请输入影视名');
    return;
  }
  submittingMovie.value = true;
  try {
    await movieAPI.addMovie(newMovie.value);
    message.success('影视添加成功');
    showAddMovieModal.value = false;
    newMovie.value = {
      title: '',
      director: '',
      actors: '',
      posterUrl: '',
      genre: '',
      duration: null,
    };
    loadLibrary();
  } catch (error) {
    message.error(error.error || '添加失败');
  } finally {
    submittingMovie.value = false;
  }
};

watch(activeTab, (newTab) => {
  if (newTab === 'library') {
    loadLibrary();
  } else if (newTab === 'feed') {
    loadFeed();
  }
});

watch(libraryStatus, () => {
  loadLibrary();
});

onMounted(() => {
  loadLibrary();
});
</script>

<style scoped>
.movie-card {
  transition: all 0.3s ease;
}

.movie-card:hover {
  transform: translateY(-2px);
}
</style>
