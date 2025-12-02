<template>
  <n-modal v-model:show="visible" preset="card" :title="modalTitle" style="width: 500px;">
    <div class="share-selector">
      <!-- 搜索框 -->
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索..."
        clearable
        class="mb-4"
      >
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>

      <!-- 内容列表 -->
      <n-spin :show="loading">
        <div v-if="filteredItems.length === 0" class="empty-state">
          <n-empty description="暂无内容" size="small" />
        </div>
        <div v-else class="items-list">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="item-card"
            :class="{ 'selected': selectedId === item.id }"
            @click="selectedId = item.id"
          >
            <n-checkbox :checked="selectedId === item.id" />
            <div v-if="item.cover" class="item-cover">
              <img :src="item.cover" alt="封面" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-meta">{{ formatDate(item.createdAt) }}</div>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" :disabled="!selectedId" @click="handleConfirm">
          分享
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { SearchOutline } from '@vicons/ionicons5';
import api from '@/api';

const props = defineProps({
  shareType: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['select']);

const visible = defineModel('visible', { type: Boolean, default: false });

const loading = ref(false);
const searchQuery = ref('');
const items = ref([]);
const selectedId = ref('');

const modalTitle = computed(() => {
  const titles = {
    diary: '选择要分享的日记',
    homework: '选择要分享的作业',
    work: '选择要分享的作品',
    book: '选择要分享的书籍',
    game: '选择要分享的游戏',
    achievement: '选择要分享的成就',
    question: '选择要分享的问答'
  };
  return titles[props.shareType] || '选择分享内容';
});

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const query = searchQuery.value.toLowerCase();
  return items.value.filter(item =>
    item.title.toLowerCase().includes(query)
  );
});

const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
};

const loadItems = async () => {
  loading.value = true;
  try {
    let endpoint = '';
    switch (props.shareType) {
      case 'diary':
        endpoint = '/diaries';
        break;
      case 'homework':
        endpoint = '/homeworks';
        break;
      case 'work':
        endpoint = '/html-works/my';
        break;
      case 'book':
        endpoint = '/books';
        break;
      case 'game':
        endpoint = '/games';
        break;
      case 'achievement':
        endpoint = '/achievements/my';
        break;
      case 'question':
        endpoint = '/questions';
        break;
    }

    const response = await api.get(endpoint, {
      params: { page: 1, limit: 20 }
    });

    // 根据不同类型处理返回数据
    if (props.shareType === 'diary') {
      items.value = (response.diaries || []).map(d => ({
        id: d.id,
        title: d.content.substring(0, 50) + (d.content.length > 50 ? '...' : ''),
        createdAt: d.createdAt,
        description: d.content.substring(0, 100)
      }));
    } else if (props.shareType === 'homework') {
      items.value = (response.homeworks || []).map(h => ({
        id: h.id,
        title: h.content.substring(0, 50) + (h.content.length > 50 ? '...' : ''),
        createdAt: h.createdAt,
        description: h.content.substring(0, 100)
      }));
    } else if (props.shareType === 'work') {
      items.value = (response.works || []).map(w => ({
        id: w.id,
        title: w.title,
        cover: w.screenshot,
        createdAt: w.createdAt,
        description: w.description
      }));
    } else if (props.shareType === 'book') {
      items.value = (response.books || []).map(b => ({
        id: b.id,
        title: b.title,
        cover: b.cover,
        createdAt: b.createdAt,
        description: b.summary
      }));
    } else if (props.shareType === 'game') {
      items.value = (response.games || []).map(g => ({
        id: g.id,
        title: g.title,
        cover: g.cover,
        createdAt: g.createdAt,
        description: g.description
      }));
    } else if (props.shareType === 'achievement') {
      items.value = (response.achievements || []).map(a => ({
        id: a.id,
        title: a.title,
        cover: a.icon,
        createdAt: a.unlockedAt || a.createdAt,
        description: a.description
      }));
    } else if (props.shareType === 'question') {
      items.value = (response.questions || []).map(q => ({
        id: q.id,
        title: q.title,
        createdAt: q.createdAt,
        description: q.content?.substring(0, 100)
      }));
    }
  } catch (error) {
    console.error('加载分享内容失败:', error);
    window.$message?.error('加载失败');
    items.value = [];
  } finally {
    loading.value = false;
  }
};

const handleConfirm = () => {
  const selectedItem = items.value.find(i => i.id === selectedId.value);
  if (!selectedItem) return;

  const shareData = {
    share_type: props.shareType,
    share_id: selectedItem.id,
    share_data: {
      title: selectedItem.title,
      cover: selectedItem.cover,
      description: selectedItem.description
    }
  };

  emit('select', shareData);
  visible.value = false;
  selectedId.value = '';
};

// 监听弹窗打开，加载数据
watch(visible, (newVal) => {
  if (newVal) {
    loadItems();
  } else {
    searchQuery.value = '';
    selectedId.value = '';
  }
});
</script>

<style scoped>
.share-selector {
  min-height: 300px;
  max-height: 500px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.item-card:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.item-card.selected {
  background: #ede9fe;
  border-color: #8b5cf6;
}

.item-cover {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f3f4f6;
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-title {
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 12px;
  color: #6b7280;
}

.items-list::-webkit-scrollbar {
  width: 6px;
}

.items-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.items-list::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.items-list::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
