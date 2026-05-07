<template>
  <div class="card mb-4">
    <n-space wrap :size="12">
      <slot></slot>
      <n-button v-if="showReset" @click="$emit('reset')" quaternary>
        <template #icon>
          <n-icon><RefreshOutline /></n-icon>
        </template>
        重置
      </n-button>
    </n-space>
  </div>
</template>

<script setup>
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'

defineProps({
  showReset: {
    type: Boolean,
    default: true
  }
});

defineEmits(['reset']);
</script>
