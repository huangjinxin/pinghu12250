<template>
  <div class="music-container">
    <n-card title="音乐" :bordered="false">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- Tab 1: 我的音乐库 -->
        <n-tab-pane name="library" tab="我的音乐库">
          <div class="mb-4 flex items-center justify-between">
            <n-radio-group v-model:value="libraryStatus" name="status">
              <n-radio-button value="all">全部</n-radio-button>
              <n-radio-button value="WANT_TO_LISTEN">想听</n-radio-button>
              <n-radio-button value="LISTENING">在听</n-radio-button>
              <n-radio-button value="COMPLETED">听完</n-radio-button>
            </n-radio-group>
            <n-button type="primary" @click="showAddMusicModal = true">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加音乐
            </n-button>
          </div>

          <n-spin :show="loadingLibrary">
            <div v-if="musicLibrary.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <n-card
                v-for="item in musicLibrary"
                :key="item.id"
                class="music-card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div class="flex gap-4">
                  <img
                    :src="item.music.coverUrl || 'https://via.placeholder.com/100x100?text=No+Cover'"
                    :alt="item.music.title"
                    class="w-20 h-20 object-cover rounded"
                  />
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold mb-1 line-clamp-1">{{ item.music.title }}</h3>
                    <p class="text-sm text-gray-500 mb-2">{{ item.music.artist }}</p>
                    <n-tag :type="getStatusType(item.status)" size="small">
                      {{ getStatusLabel(item.status) }}
                    </n-tag>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="暂无音乐，快去添加吧" class="py-8" />
          </n-spin>
        </n-tab-pane>

        <!-- Tab 2: 听后感动态 -->
        <n-tab-pane name="feed" tab="听后感动态">
          <n-spin :show="loadingFeed">
            <div v-if="musicLogs.length > 0" class="space-y-4">
              <n-card
                v-for="log in musicLogs"
                :key="log.id"
                class="music-log-card"
              >
                <div class="flex items-start gap-3">
                  <AvatarText :username="log.user.username" size="md" />
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="font-semibold">{{ log.user.profile?.nickname || log.user.username }}</span>
                      <span class="text-gray-400 text-sm">听了</span>
                      <span class="text-primary-600">
                        《{{ log.music.title }}》
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
            <n-empty v-else description="还没有听后感动态" class="py-8" />
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 添加音乐弹窗 -->
    <n-modal v-model:show="showAddMusicModal" preset="card" title="添加音乐到音乐库" style="width: 600px">
      <n-form ref="addMusicFormRef" :model="newMusic">
        <n-form-item label="音乐名" path="title">
          <n-input v-model:value="newMusic.title" placeholder="请输入音乐名" />
        </n-form-item>
        <n-form-item label="艺术家" path="artist">
          <n-input v-model:value="newMusic.artist" placeholder="请输入艺术家" />
        </n-form-item>
        <n-form-item label="专辑" path="album">
          <n-input v-model:value="newMusic.album" placeholder="请输入专辑（可选）" />
        </n-form-item>
        <n-form-item label="封面URL" path="coverUrl">
          <n-input v-model:value="newMusic.coverUrl" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>
        <n-form-item label="流派" path="genre">
          <n-input v-model:value="newMusic.genre" placeholder="请输入流派（可选）" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddMusicModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddMusic" :loading="submittingMusic">提交</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue';
import { ref, onMounted, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { musicAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline } from '@vicons/ionicons5';

const message = useMessage();

const activeTab = ref('library');
const libraryStatus = ref('all');
const loadingLibrary = ref(false);
const loadingFeed = ref(false);
const showAddMusicModal = ref(false);
const submittingMusic = ref(false);
const musicLibrary = ref([]);
const musicLogs = ref([]);

const newMusic = ref({
  title: '',
  artist: '',
  album: '',
  coverUrl: '',
  genre: '',
});

const getStatusType = (status) => {
  const types = {
    WANT_TO_LISTEN: 'default',
    LISTENING: 'info',
    COMPLETED: 'success',
  };
  return types[status] || 'default';
};

const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_LISTEN: '想听',
    LISTENING: '在听',
    COMPLETED: '听完',
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
    const data = await musicAPI.getMyMusicLibrary(params);
    musicLibrary.value = data.musicLibrary || [];
  } catch (error) {
    message.error('加载音乐库失败');
  } finally {
    loadingLibrary.value = false;
  }
};

const loadFeed = async () => {
  loadingFeed.value = true;
  try {
    const data = await musicAPI.getMusicLogs();
    musicLogs.value = data.musicLogs || [];
  } catch (error) {
    message.error('加载听后感动态失败');
  } finally {
    loadingFeed.value = false;
  }
};

const handleAddMusic = async () => {
  if (!newMusic.value.title.trim()) {
    message.warning('请输入音乐名');
    return;
  }
  submittingMusic.value = true;
  try {
    await musicAPI.addMusic(newMusic.value);
    message.success('音乐添加成功');
    showAddMusicModal.value = false;
    newMusic.value = {
      title: '',
      artist: '',
      album: '',
      coverUrl: '',
      genre: '',
    };
    loadLibrary();
  } catch (error) {
    message.error(error.error || '添加失败');
  } finally {
    submittingMusic.value = false;
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
.music-card {
  transition: all 0.3s ease;
}

.music-card:hover {
  transform: translateY(-2px);
}
</style>
