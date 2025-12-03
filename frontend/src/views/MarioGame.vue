<template>
  <div class="mario-game-container" :class="{ 'fullscreen': isFullscreen }">
    <div class="game-header" v-if="!isFullscreen">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <n-button @click="goBack" circle>
            <template #icon>
              <n-icon><ArrowBackOutline /></n-icon>
            </template>
          </n-button>
          <h1 class="text-2xl font-bold text-gray-800">超级玛丽</h1>
        </div>
        <div class="flex items-center gap-2">
          <n-button type="primary" @click="toggleFullscreen">
            <template #icon>
              <n-icon><ExpandOutline v-if="!isFullscreen" /><ContractOutline v-else /></n-icon>
            </template>
            {{ isFullscreen ? '退出全屏' : '全屏游戏' }}
          </n-button>
        </div>
      </div>

      <n-card class="mb-4">
        <div class="text-sm text-gray-600 space-y-2">
          <p><strong>操作说明：</strong></p>
          <ul class="list-disc list-inside space-y-1 text-gray-500">
            <li>方向键 ← → 或 A / D 键：左右移动</li>
            <li>方向键 ↑ 或 W / 空格键：跳跃</li>
            <li>游戏内左下角可开关音乐</li>
          </ul>
          <p class="text-xs text-gray-400 mt-2">
            <strong>提示：</strong>完整的超级马里奥兄弟1-1关卡重制版！游戏速度已优化为40帧/秒，操作更流畅。
          </p>
        </div>
      </n-card>
    </div>

    <div class="game-frame-wrapper" :class="{ 'fullscreen-frame': isFullscreen }">
      <div v-if="!isFullscreen" class="frame-controls">
        <n-button size="small" @click="toggleFullscreen">
          <template #icon>
            <n-icon><ExpandOutline /></n-icon>
          </template>
        </n-button>
      </div>

      <iframe
        ref="gameFrame"
        src="/games/mario/index.html"
        class="game-iframe"
        :class="{ 'fullscreen-iframe': isFullscreen }"
        frameborder="0"
        allowfullscreen
        allow="fullscreen"
        @load="handleFrameLoad"
      ></iframe>

      <div v-if="isFullscreen" class="fullscreen-controls">
        <n-button type="error" @click="toggleFullscreen" size="large">
          <template #icon>
            <n-icon><ContractOutline /></n-icon>
          </template>
          退出全屏
        </n-button>
      </div>
    </div>

    <n-spin :show="loading" class="loading-overlay">
      <div class="loading-content">
        <p class="text-gray-600">加载游戏中...</p>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowBackOutline,
  ExpandOutline,
  ContractOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const gameFrame = ref(null);
const isFullscreen = ref(false);
const loading = ref(true);

const goBack = () => {
  router.back();
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;

  if (isFullscreen.value) {
    // 进入全屏
    document.body.style.overflow = 'hidden';
    if (gameFrame.value) {
      try {
        if (gameFrame.value.requestFullscreen) {
          gameFrame.value.requestFullscreen();
        } else if (gameFrame.value.webkitRequestFullscreen) {
          gameFrame.value.webkitRequestFullscreen();
        } else if (gameFrame.value.mozRequestFullScreen) {
          gameFrame.value.mozRequestFullScreen();
        } else if (gameFrame.value.msRequestFullscreen) {
          gameFrame.value.msRequestFullscreen();
        }
      } catch (e) {
        console.log('Fullscreen API not available');
      }
    }
  } else {
    // 退出全屏
    document.body.style.overflow = '';
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (e) {
      console.log('Exit fullscreen error');
    }
  }
};

const handleFrameLoad = () => {
  // iframe加载完成后延迟一下再隐藏loading，确保游戏初始化完成
  setTimeout(() => {
    loading.value = false;
  }, 1000);
};

const handleFullscreenChange = () => {
  const fullscreenElement = document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement;

  if (!fullscreenElement && isFullscreen.value) {
    isFullscreen.value = false;
    document.body.style.overflow = '';
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('msfullscreenchange', handleFullscreenChange);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.mario-game-container {
  min-height: calc(100vh - 200px);
  position: relative;
}

.mario-game-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #000;
  padding: 0;
  margin: 0;
}

.game-frame-wrapper {
  position: relative;
  width: 100%;
  height: 600px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.fullscreen-frame {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  z-index: 10000;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.fullscreen-iframe {
  width: 100vw;
  height: 100vh;
}

.frame-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.fullscreen-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10001;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}

.loading-content {
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
}
</style>
