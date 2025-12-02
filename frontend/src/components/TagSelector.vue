<template>
  <div class="tag-selector">
    <n-select
      v-model:value="selectedTags"
      multiple
      filterable
      tag
      :options="tagOptions"
      :loading="loading"
      placeholder="选择或创建标签"
      @update:value="handleChange"
      @create="handleCreate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { tagAPI } from '@/api';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

const loading = ref(false);
const tags = ref([]);
const selectedTags = ref([...props.modelValue]);

const tagOptions = computed(() =>
  tags.value.map(tag => ({
    label: tag.name,
    value: tag.id,
    style: tag.color ? { '--tag-color': tag.color } : {},
  }))
);

const loadTags = async () => {
  loading.value = true;
  try {
    const data = await tagAPI.getTags();
    tags.value = data.tags || data;
  } catch (error) {
    console.error('加载标签失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleChange = (value) => {
  emit('update:modelValue', value);
};

const handleCreate = async (label) => {
  try {
    const data = await tagAPI.createTag({ name: label });
    const newTag = data.tag || data;
    tags.value.push(newTag);
    selectedTags.value.push(newTag.id);
    emit('update:modelValue', selectedTags.value);
    return newTag.id;
  } catch (error) {
    console.error('创建标签失败:', error);
    return false;
  }
};

onMounted(() => {
  loadTags();
});
</script>
