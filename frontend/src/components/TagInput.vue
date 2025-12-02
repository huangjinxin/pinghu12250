<template>
  <div class="tag-input-wrapper">
    <n-dynamic-tags
      v-model:value="localTags"
      :max="maxTags"
      @update:value="handleTagsUpdate"
    >
      <template #input="{ deactivate }">
        <n-auto-complete
          v-model:value="inputValue"
          :options="suggestions"
          size="small"
          placeholder="输入标签..."
          :get-show="() => true"
          @select="handleSelect(deactivate)"
          @blur="deactivate"
          @keyup.enter="handleEnter(deactivate)"
        />
      </template>
      <template #trigger="{ activate, disabled }">
        <n-button
          size="small"
          type="primary"
          dashed
          :disabled="disabled"
          @click="activate()"
        >
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          添加标签
        </n-button>
      </template>
    </n-dynamic-tags>
    <div class="text-xs text-gray-500 mt-2">
      最多{{ maxTags }}个标签，按回车添加
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/api';
import { AddOutline } from '@vicons/ionicons5';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  maxTags: {
    type: Number,
    default: 5,
  },
  category: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);

const message = useMessage();
const localTags = ref([...props.modelValue]);
const inputValue = ref('');
const allSuggestions = ref([]);

// 计算建议列表
const suggestions = computed(() => {
  if (!inputValue.value) return [];

  const filtered = allSuggestions.value
    .filter(tag =>
      tag.name.toLowerCase().includes(inputValue.value.toLowerCase()) &&
      !localTags.value.includes(tag.name)
    )
    .slice(0, 10);

  return filtered.map(tag => ({
    label: `#${tag.name} (${tag.usageCount || 0})`,
    value: tag.name,
  }));
});

// 加载标签建议
const loadSuggestions = async () => {
  try {
    const params = {};
    if (props.category) {
      params.category = props.category;
    }
    const response = await api.get('/tags/search', { params });
    allSuggestions.value = response.tags || [];
  } catch (error) {
    console.error('加载标签建议失败:', error);
  }
};

// 处理标签选择
const handleSelect = (deactivate) => {
  if (inputValue.value && !localTags.value.includes(inputValue.value)) {
    localTags.value.push(inputValue.value);
    inputValue.value = '';
    deactivate();
  }
};

// 处理回车
const handleEnter = (deactivate) => {
  if (inputValue.value && !localTags.value.includes(inputValue.value)) {
    localTags.value.push(inputValue.value);
    inputValue.value = '';
    deactivate();
  }
};

// 处理标签更新
const handleTagsUpdate = (tags) => {
  emit('update:modelValue', tags);
};

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  localTags.value = [...newValue];
});

// 组件挂载时加载建议
loadSuggestions();
</script>

<style scoped>
.tag-input-wrapper {
  width: 100%;
}
</style>
