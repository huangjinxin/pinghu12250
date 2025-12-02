<template>
  <n-card size="small" class="user-card" hoverable @click="handleClick">
    <div class="flex items-center gap-4">
      <div class="relative">
        <AvatarText :username="user.username" size="lg" />
        <!-- 在线状态指示器 -->
        <div
          v-if="isOnline"
          class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
          title="在线"
        ></div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-bold truncate">{{ user.profile?.nickname || user.username }}</h3>
          <span v-if="isOnline" class="text-xs text-green-600">在线</span>
        </div>
        <p class="text-xs text-gray-500 truncate">{{ user.profile?.bio || '暂无简介' }}</p>
        <div class="flex gap-3 mt-2 text-xs text-gray-600">
          <span>{{ user.stats?.followers || user.followersCount || 0 }} 粉丝</span>
          <span>{{ user.stats?.works || 0 }} 作品</span>
        </div>
      </div>

      <!-- 好友显示发消息按钮 -->
      <n-button
        v-if="shouldShowMessageButton"
        type="primary"
        size="small"
        @click.stop="handleSendMessage"
      >
        <template #icon>
          <n-icon><ChatbubbleOutline /></n-icon>
        </template>
        发消息
      </n-button>

      <!-- 非好友显示关注按钮 -->
      <FollowButton
        v-else
        :user-id="user.id"
        :initial-status="getFollowStatus"
        :tab-status="tabStatus"
        @click.stop
      />
    </div>
  </n-card>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { useMessage } from 'naive-ui';
import { ChatbubbleOutline } from '@vicons/ionicons5';
import FollowButton from './FollowButton.vue';

const props = defineProps({
  user: { type: Object, required: true },
  isFriend: { type: Boolean, default: false },
  tabStatus: { type: String, default: '' } // 用户来源标签页: friends/following/followers/recommended
});

const router = useRouter();
const chatStore = useChatStore();
const message = useMessage();

// 检查用户是否在线
const isOnline = computed(() => {
  return chatStore.onlineUsers.has(props.user.id);
});

// 根据标签页状态判断是否显示发消息按钮
const shouldShowMessageButton = computed(() => {
  // 如果明确是好友，显示发消息
  if (props.isFriend) return true;
  // 如果来自好友标签页，显示发消息
  if (props.tabStatus === 'friends') return true;
  // 如果用户的followStatus是friend，显示发消息
  if (props.user.followStatus === 'friend') return true;
  return false;
});

const handleClick = () => {
  router.push(`/users/${props.user.id}`);
};

// 获取关注状态
const getFollowStatus = computed(() => {
  // 如果有followStatus字段，直接使用
  if (props.user.followStatus) {
    return props.user.followStatus;
  }
  // 根据标签页推断
  if (props.tabStatus === 'following') return 'following'; // 我关注的
  if (props.tabStatus === 'followers') return 'follower'; // 关注我的
  return 'none'; // 默认未关注
});

const handleSendMessage = () => {
  // 打开聊天面板
  chatStore.requestOpenPanel();
  message.success('正在打开聊天');
};
</script>

<style scoped>
.user-card {
  cursor: pointer;
  transition: all 0.3s;
}
.user-card:hover {
  transform: translateY(-2px);
}
</style>
