<template>
  <div class="share-card" :class="{ 'is-sent': isSent }" @click="handleClick">
    <div class="share-card-header">
      <n-icon :size="16" :color="iconColor">
        <component :is="icon" />
      </n-icon>
      <span class="text-xs font-medium">{{ typeLabel }}</span>
    </div>

    <div class="share-card-body">
      <div v-if="shareData.share_data.cover" class="share-cover">
        <img :src="shareData.share_data.cover" alt="封面" />
      </div>
      <div class="share-info">
        <div class="share-title">{{ shareData.share_data.title }}</div>
        <div v-if="shareData.share_data.description" class="share-desc">
          {{ shareData.share_data.description }}
        </div>
      </div>
    </div>

    <div class="share-card-footer">
      <span class="text-xs">点击查看</span>
      <n-icon :size="14"><ChevronForwardOutline /></n-icon>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  BookOutline,
  DocumentTextOutline,
  BrushOutline,
  LibraryOutline,
  GameControllerOutline,
  ChevronForwardOutline,
  TrophyOutline,
  HelpCircleOutline
} from '@vicons/ionicons5';

const props = defineProps({
  shareData: {
    type: Object,
    required: true
  },
  isSent: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();

const typeLabel = computed(() => {
  const labels = {
    diary: '日记分享',
    homework: '作业分享',
    work: '作品分享',
    book: '书籍分享',
    game: '游戏分享',
    achievement: '成就分享',
    question: '问答分享'
  };
  return labels[props.shareData.share_type] || '分享';
});

const icon = computed(() => {
  const icons = {
    diary: BookOutline,
    homework: DocumentTextOutline,
    work: BrushOutline,
    book: LibraryOutline,
    game: GameControllerOutline,
    achievement: TrophyOutline,
    question: HelpCircleOutline
  };
  return icons[props.shareData.share_type] || BookOutline;
});

const iconColor = computed(() => {
  const colors = {
    diary: '#f59e0b',
    homework: '#3b82f6',
    work: '#8b5cf6',
    book: '#10b981',
    game: '#ef4444',
    achievement: '#fbbf24',
    question: '#06b6d4'
  };
  return colors[props.shareData.share_type] || '#6b7280';
});

const handleClick = () => {
  const { share_type, share_id } = props.shareData;

  switch (share_type) {
    case 'diary':
      router.push('/diaries');
      break;
    case 'homework':
      router.push('/homeworks');
      break;
    case 'work':
      router.push(`/works/${share_id}`);
      break;
    case 'book':
      router.push(`/books/${share_id}`);
      break;
    case 'game':
      router.push(`/games/${share_id}`);
      break;
    case 'achievement':
      router.push(`/achievements/${share_id}`);
      break;
    case 'question':
      router.push(`/questions/${share_id}`);
      break;
  }
};
</script>

<style scoped>
.share-card {
  max-width: 280px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.share-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.share-card.is-sent {
  background: linear-gradient(135deg, #f0e7ff 0%, #ede9fe 100%);
  border-color: #8b5cf6;
}

.share-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.share-card.is-sent .share-card-header {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
}

.share-card-body {
  padding: 12px;
  display: flex;
  gap: 12px;
}

.share-cover {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
}

.share-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.share-info {
  flex: 1;
  min-width: 0;
}

.share-title {
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.share-desc {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.share-card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
}

.share-card.is-sent .share-card-footer {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.share-card-footer:hover {
  color: #8b5cf6;
}
</style>
