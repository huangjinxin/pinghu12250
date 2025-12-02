<template>
  <n-card size="small" class="content-card" hoverable @click="handleClick">
    <h3 class="font-bold truncate">{{ content.title }}</h3>
    <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ getContentPreview(content) }}</p>
    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center gap-2">
        <AvatarText :username="content.author?.username" size="sm" />
        <span class="text-xs text-gray-500">{{ content.author?.username }}</span>
      </div>
      <n-tag size="tiny" :type="getTypeTag(content.type)">{{ getTypeText(content.type) }}</n-tag>
    </div>
  </n-card>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { useRouter } from 'vue-router';

const props = defineProps({ content: { type: Object, required: true } });
const router = useRouter();

const handleClick = () => {
  const routes = {
    work: `/works/${props.content.id}`,
    diary: `/diaries/${props.content.id}`,
    note: `/notes/${props.content.id}`,
    book: `/books/${props.content.id}`
  };
  const path = routes[props.content.type];
  if (path) router.push(path);
};

const getContentPreview = (content) => {
  return content.content || content.description || '暂无描述';
};

const getTypeTag = (type) => {
  const tags = { work: 'success', diary: 'info', note: 'warning', book: 'error' };
  return tags[type] || 'default';
};

const getTypeText = (type) => {
  const texts = { work: '作品', diary: '日记', note: '笔记', book: '读书' };
  return texts[type] || type;
};
</script>

<style scoped>
.content-card { cursor: pointer; transition: all 0.3s; }
.content-card:hover { transform: translateY(-2px); }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
