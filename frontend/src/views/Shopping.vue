<template>
  <div class="shopping-page space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">成长兑换</h1>
      <p class="text-gray-500 mt-1">用积分兑换学习商品</p>
    </div>
    <n-card>
      <ShoppingTab />
    </n-card>
  </div>
</template>

<script setup>
import ShoppingTab from './works-tabs/ShoppingTab.vue';
</script>

<style scoped>
.shopping-page {
  padding: 0;
}
</style>
