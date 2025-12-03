<template>
  <div class="classic-games-container">
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-gray-800 mb-4">重温经典</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- 超级玛丽卡片 -->
        <n-card class="game-card hover:shadow-lg transition-shadow cursor-pointer" @click="playMario">
          <div class="flex flex-col">
            <img
              src="/games/mario/mario-cover.png"
              alt="超级玛丽"
              class="w-full h-48 object-cover rounded-lg mb-3"
              @error="handleImageError"
            />
            <h3 class="text-lg font-bold text-gray-800 mb-2">超级玛丽</h3>
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">
              经典的超级马里奥兄弟！使用JavaScript和HTML5 Canvas完整重制。支持完整关卡、音效、音乐，原汁原味的游戏体验。
            </p>
            <div class="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <n-tag size="small" type="success">横版闯关</n-tag>
              <n-tag size="small" type="info">经典怀旧</n-tag>
              <n-tag size="small" type="warning">HTML5</n-tag>
            </div>
            <div class="text-xs text-gray-500 mb-3">
              <p>操作: ← → 移动 | ↑ / W / 空格 跳跃</p>
            </div>
            <n-button type="primary" block @click.stop="playMario">
              <template #icon>
                <n-icon><PlayOutline /></n-icon>
              </template>
              开始游戏
            </n-button>
          </div>
        </n-card>

        <!-- 预留其他经典游戏卡片位置 -->
        <n-card class="game-card opacity-50">
          <div class="flex flex-col items-center justify-center h-full min-h-[300px]">
            <n-icon size="48" color="#ccc">
              <GameControllerOutline />
            </n-icon>
            <p class="text-gray-400 mt-4">更多经典游戏</p>
            <p class="text-gray-400 text-sm">敬请期待...</p>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { PlayOutline, GameControllerOutline } from '@vicons/ionicons5';

const router = useRouter();

const playMario = () => {
  router.push('/games/classic/mario');
};

const handleImageError = (e) => {
  // 图片加载失败时使用默认占位图
  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ESuper Mario%3C/text%3E%3C/svg%3E';
};
</script>

<style scoped>
.game-card {
  transition: all 0.3s ease;
}

.game-card:hover:not(.opacity-50) {
  transform: translateY(-4px);
}
</style>
