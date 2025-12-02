<template>
  <n-tag
    :type="tagType"
    :size="size"
    :closable="closable"
    :round="round"
    class="tag-chip"
    @click="handleClick"
    @close="handleClose"
  >
    <template #icon>
      <n-icon><PricetagOutline /></n-icon>
    </template>
    {{ displayName }}
  </n-tag>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { PricetagOutline } from '@vicons/ionicons5';

const props = defineProps({
  tag: {
    type: [String, Object],
    required: true,
  },
  size: {
    type: String,
    default: 'small',
  },
  closable: {
    type: Boolean,
    default: false,
  },
  clickable: {
    type: Boolean,
    default: true,
  },
  round: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['close', 'click']);

const router = useRouter();

// 计算标签名称和类型
const displayName = computed(() => {
  if (typeof props.tag === 'string') {
    return `#${props.tag}`;
  }
  return `#${props.tag.name}`;
});

const tagType = computed(() => {
  if (typeof props.tag === 'object' && props.tag.category) {
    const types = {
      learning: 'info',
      creative: 'success',
      life: 'warning',
      game: 'error',
    };
    return types[props.tag.category] || 'default';
  }
  return 'default';
});

// 处理点击
const handleClick = () => {
  if (props.clickable) {
    const tagName = typeof props.tag === 'string' ? props.tag : props.tag.name;
    router.push(`/tags/${tagName}`);
  }
  emit('click', props.tag);
};

// 处理关闭
const handleClose = () => {
  emit('close', props.tag);
};
</script>

<style scoped>
.tag-chip {
  cursor: pointer;
  transition: all 0.3s ease;
}

.tag-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
</style>
