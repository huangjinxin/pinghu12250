<template>
  <div class="avatar-text" :class="sizeClass" :style="{ backgroundColor: bgColor }" :title="username">
    {{ char }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { avatarColorSeed } from '@/utils/avatar.js'

const props = defineProps({
  username: { type: String, default: '' },
  size: { type: String, default: 'md' }
})

const cleanName = computed(() => props.username?.trim() || '')

const char = computed(() => {
  const s = cleanName.value
  if (!s) return ''
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i]
    if (/[0-9A-Za-z\u4e00-\u9fa5]/.test(c)) return c.toUpperCase()
  }
  return s[0]?.toUpperCase() || ''
})

const sizeClass = computed(() => `avatar-${props.size}`)
const bgColor = computed(() => avatarColorSeed(cleanName.value))
</script>

<style scoped>
.avatar-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  user-select: none;
}
.avatar-sm { width: 28px; height: 28px; font-size: 14px; }
.avatar-md { width: 40px; height: 40px; font-size: 18px; }
.avatar-lg { width: 56px; height: 56px; font-size: 24px; }
</style>
