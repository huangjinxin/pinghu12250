<template>
  <n-modal v-model:show="visible" :mask-closable="false">
    <n-card class="unlock-modal" :bordered="false">
      <div class="text-center">
        <div class="unlock-animation">
          <div class="achievement-icon-huge">{{ achievement.icon }}</div>
          <div class="sparkles">✨✨✨</div>
        </div>
        <h2 class="text-2xl font-bold mt-4">成就解锁！</h2>
        <h3 class="text-xl mt-2">{{ achievement.name }}</h3>
        <p class="text-gray-600 mt-2">{{ achievement.description }}</p>
        <div class="mt-4">
          <n-tag :type="getRarityType(achievement.rarity)" size="large">
            {{ getRarityText(achievement.rarity) }}
          </n-tag>
        </div>
        <n-button type="primary" class="mt-6" @click="handleClose">太棒了！</n-button>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  achievement: { type: Object, required: true },
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['update:show']);

const visible = ref(props.show);

watch(() => props.show, (newValue) => {
  visible.value = newValue;
});

const getRarityType = (rarity) => {
  const types = { common: 'default', rare: 'info', epic: 'warning', legendary: 'error' };
  return types[rarity] || 'default';
};

const getRarityText = (rarity) => {
  const texts = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
  return texts[rarity] || rarity;
};

const handleClose = () => {
  visible.value = false;
  emit('update:show', false);
};
</script>

<style scoped>
.unlock-modal {
  max-width: 500px;
  margin: 0 auto;
}
.unlock-animation {
  position: relative;
  animation: bounce 0.6s ease-in-out;
}
.achievement-icon-huge {
  font-size: 100px;
}
.sparkles {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  animation: sparkle 1s infinite;
}
@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
@keyframes sparkle {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
