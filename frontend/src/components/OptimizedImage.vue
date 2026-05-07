<template>
  <div class="optimized-image-wrapper" :style="{ width: width, height: height }" @click="showModal = true">
    <img
      v-if="!isLoaded"
      :src="placeholderSrc"
      :alt="alt"
      class="optimized-image blur-placeholder"
      :style="{ objectFit: fit }"
    />
    <img
      v-show="isLoaded"
      :src="thumbnailSrc"
      :alt="alt"
      class="optimized-image"
      :style="{ objectFit: fit }"
      @load="onLoad"
    />
    <n-modal v-model:show="showModal" preset="card" :style="{ maxWidth: '90vw', maxHeight: '90vh' }" @click="showModal = false">
      <div class="modal-image-container">
        <img :src="fullSrc" :alt="alt" class="full-image" />
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { NModal } from 'naive-ui'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  thumbnailWidth: { type: Number, default: 400 },
  width: { type: String, default: '100%' },
  height: { type: String, default: 'auto' },
  fit: { type: String, default: 'cover' }
})

const showModal = ref(false)
const isLoaded = ref(false)

const API_BASE = '/api/img-proxy'

const thumbnailSrc = computed(() => {
  if (!props.src) return ''
  return `${API_BASE}?url=${encodeURIComponent(props.src)}&w=${props.thumbnailWidth}`
})

const fullSrc = computed(() => {
  if (!props.src) return ''
  if (props.src.startsWith('http')) return props.src
  return props.src
})

const placeholderSrc = computed(() => {
  return thumbnailSrc.value
})

function onLoad() {
  isLoaded.value = true
}
</script>

<style scoped>
.optimized-image-wrapper {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.optimized-image {
  width: 100%;
  height: 100%;
  display: block;
  transition: opacity 0.3s ease;
}
.blur-placeholder {
  filter: blur(10px);
  transform: scale(1.1);
}
.modal-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 80vh;
}
.full-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}
</style>
