<template>
  <div class="chat-input-area">
    <!-- 工具栏 -->
    <div class="input-toolbar">
      <!-- 表情包按钮 -->
      <EmojiPicker @select="handleEmojiSelect">
        <n-button text circle size="small" title="表情包">
          <template #icon>
            <n-icon :size="20"><HappyOutline /></n-icon>
          </template>
        </n-button>
      </EmojiPicker>

      <!-- 分享菜单 -->
      <n-dropdown :options="shareOptions" @select="openShareSelector">
        <n-button text circle size="small" title="分享">
          <template #icon>
            <n-icon :size="20"><ShareSocialOutline /></n-icon>
          </template>
        </n-button>
      </n-dropdown>
    </div>

    <!-- 输入框和发送按钮 -->
    <div class="input-row">
      <n-input
        v-model:value="inputText"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 3 }"
        placeholder="输入消息..."
        @keydown.enter.exact.prevent="handleSend"
      />
      <n-button type="primary" @click="handleSend" :loading="sending">
        发送
      </n-button>
    </div>

    <!-- 分享选择器弹窗 -->
    <ShareSelector
      v-model:visible="shareSelectorVisible"
      :share-type="shareType"
      @select="handleShareSelect"
    />
  </div>
</template>

<script setup>
import { ref, h } from 'vue';
import {
  ShareSocialOutline,
  BookOutline,
  DocumentTextOutline,
  BrushOutline,
  LibraryOutline,
  GameControllerOutline,
  TrophyOutline,
  HelpCircleOutline,
  HappyOutline
} from '@vicons/ionicons5';
import ShareSelector from '@/components/ShareSelector.vue';
import EmojiPicker from '@/components/EmojiPicker.vue';

const emit = defineEmits(['send', 'share']);

const inputText = ref('');
const sending = ref(false);
const shareSelectorVisible = ref(false);
const shareType = ref('');

// 分享选项
const shareOptions = [
  { label: '日记', key: 'diary', icon: () => h(BookOutline) },
  { label: '作业', key: 'homework', icon: () => h(DocumentTextOutline) },
  { label: '作品', key: 'work', icon: () => h(BrushOutline) },
  { label: '书籍', key: 'book', icon: () => h(LibraryOutline) },
  { label: '游戏', key: 'game', icon: () => h(GameControllerOutline) },
  { label: '成就', key: 'achievement', icon: () => h(TrophyOutline) },
  { label: '问答', key: 'question', icon: () => h(HelpCircleOutline) }
];

// 发送消息
const handleSend = () => {
  const content = inputText.value.trim();
  if (!content || sending.value) return;

  sending.value = true;
  emit('send', content);

  // 清空输入框
  inputText.value = '';
  sending.value = false;
};

// 选择表情
const handleEmojiSelect = (emoji) => {
  inputText.value += emoji;
};

// 打开分享选择器
const openShareSelector = (key) => {
  shareType.value = key;
  shareSelectorVisible.value = true;
};

// 处理分享选择
const handleShareSelect = (data) => {
  shareSelectorVisible.value = false;
  emit('share', data);
};
</script>

<style scoped>
.chat-input-area {
  border-top: 1px solid #e0e0e0;
  background: white;
  padding: 12px;
}

.input-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-row :deep(.n-input) {
  flex: 1;
}
</style>
