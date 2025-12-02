<template>
  <div class="tag-cloud">
    <n-spin :show="loading">
      <div v-if="tags.length > 0" class="tag-grid">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          :style="getTagStyle(tag)"
          @click="handleTagClick(tag)"
        >
          <span class="tag-name">#{{ tag.name }}</span>
          <span class="tag-count">{{ tag.usageCount || 0 }}</span>
        </div>
      </div>

      <n-empty v-else description="暂无标签" class="py-12" />
    </n-spin>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  tags: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();

// 根据使用次数计算标签大小
const getTagStyle = (tag) => {
  const minSize = 14;
  const maxSize = 32;
  const minCount = Math.min(...props.tags.map(t => t.usageCount || 0));
  const maxCount = Math.max(...props.tags.map(t => t.usageCount || 0));

  let fontSize = minSize;
  if (maxCount > minCount) {
    const ratio = (tag.usageCount - minCount) / (maxCount - minCount);
    fontSize = minSize + (maxSize - minSize) * ratio;
  }

  return {
    fontSize: `${fontSize}px`,
  };
};

// 处理标签点击
const handleTagClick = (tag) => {
  router.push(`/tags/${tag.name}`);
};
</script>

<style scoped>
.tag-cloud {
  min-height: 200px;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.tag-item {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.tag-item:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.tag-name {
  white-space: nowrap;
}

.tag-count {
  font-size: 0.75em;
  opacity: 0.9;
}
</style>
