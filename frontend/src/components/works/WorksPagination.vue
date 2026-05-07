<template>
  <div v-if="show" class="card" :class="position === 'top' ? 'mb-4' : 'mt-4'">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="text-sm text-gray-600">
        共 <span class="font-semibold text-primary-600">{{ total }}</span> {{ itemName }}，
        当前第 <span class="font-semibold text-primary-600">{{ page }}</span> 页，
        共 <span class="font-semibold text-primary-600">{{ totalPages }}</span> 页
      </div>
      <n-pagination
        :page="page"
        :page-count="totalPages"
        :page-size="pageSize"
        show-size-picker
        :page-sizes="pageSizes"
        show-quick-jumper
        @update:page="$emit('update:page', $event)"
        @update:page-size="$emit('update:pageSize', $event)"
      >
        <template #prefix>
          <n-button size="small" @click="$emit('update:page', 1)" :disabled="page === 1">首页</n-button>
        </template>
        <template #suffix>
          <n-button size="small" @click="$emit('update:page', totalPages)" :disabled="page === totalPages">尾页</n-button>
        </template>
      </n-pagination>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  total: {
    type: Number,
    default: 0
  },
  page: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 12
  },
  pageSizes: {
    type: Array,
    default: () => [9, 18, 27, 36]
  },
  itemName: {
    type: String,
    default: '个作品'
  },
  position: {
    type: String,
    default: 'top'
  }
});

defineEmits(['update:page', 'update:pageSize']);

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1);
const show = computed(() => props.total > props.pageSize);
</script>
