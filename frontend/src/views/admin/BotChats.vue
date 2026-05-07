<template>
  <div class="h-full flex flex-col">
    <div v-if="!embedded" class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">聊天记录</h1>
        <p class="text-gray-500 mt-1">查看Bot与学生的对话记录</p>
      </div>
    </div>

    <div class="flex-1 flex gap-4 min-h-0">
      <!-- 第一栏: Bot列表 -->
      <div class="w-48 flex-shrink-0 bg-white rounded-lg shadow overflow-y-auto">
        <div v-for="bot in stats" :key="bot.botId"
          class="p-3 cursor-pointer border-b hover:bg-blue-50 transition"
          :class="{ 'bg-blue-50 border-l-4 border-l-blue-500': selectedBot === bot.botId }"
          @click="selectBot(bot.botId)">
          <div class="flex items-center gap-2">
            <n-avatar :src="bot.botAvatar" :size="32" round />
            <div class="min-w-0">
              <div class="font-medium text-sm truncate">{{ bot.botName }}</div>
              <div class="text-xs text-gray-400">{{ bot.convCount }}会话 · {{ bot.msgCount }}消息</div>
            </div>
          </div>
          <div v-if="bot.todayActive" class="text-xs text-green-500 mt-1">今日活跃: {{ bot.todayActive }}</div>
        </div>
        <div v-if="!stats.length" class="p-4 text-center text-gray-400 text-sm">暂无Bot</div>
      </div>

      <!-- 第二栏: 学生列表 -->
      <div class="w-56 flex-shrink-0 bg-white rounded-lg shadow overflow-y-auto">
        <div v-if="!selectedBot" class="p-4 text-center text-gray-400 text-sm mt-8">← 选择一个Bot</div>
        <div v-else-if="!convs.length" class="p-4 text-center text-gray-400 text-sm mt-8">暂无会话</div>
        <div v-for="conv in convs" :key="conv.id"
          class="p-3 cursor-pointer border-b hover:bg-gray-50 transition"
          :class="{ 'bg-blue-50': selectedConv === conv.id }"
          @click="selectConv(conv)">
          <div class="font-medium text-sm">{{ conv.user?.profile?.nickname || conv.user?.username || '未知' }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ conv._count?.messages || 0 }}条消息</div>
          <div class="text-xs text-gray-400">{{ formatTime(conv.lastMessageAt) }}</div>
        </div>
      </div>

      <!-- 第三栏: 聊天记录 -->
      <div class="flex-1 bg-white rounded-lg shadow flex flex-col min-w-0">
        <div v-if="!selectedConv" class="flex-1 flex items-center justify-center text-gray-400">← 选择一个学生查看聊天记录</div>
        <template v-else>
          <div class="p-3 border-b font-medium text-sm bg-gray-50">
            {{ selectedStudentName }} 与 {{ selectedBotName }} 的对话 ({{ messages.length }}条)
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="msgContainer">
            <div v-for="msg in messages" :key="msg.id"
              class="flex" :class="msg.senderType === 'USER' ? 'justify-end' : 'justify-start'">
              <div class="max-w-[70%] rounded-2xl px-4 py-2 text-sm"
                :class="msg.senderType === 'USER' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'">
                <div v-if="msg.msgType === 'card' && msg.cardData" class="bg-white text-gray-800 rounded-lg p-2 border">
                  <div class="font-medium text-xs">{{ msg.cardData.title }}</div>
                  <div class="text-xs text-gray-400">→ {{ msg.cardData.target }}</div>
                </div>
                <template v-else>{{ msg.content }}</template>
                <div class="text-[10px] mt-1" :class="msg.senderType === 'USER' ? 'text-blue-200' : 'text-gray-400'">
                  {{ formatMsgTime(msg.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { chatMessageAPI } from '@/api/index.js';

const stats = ref([]);
const convs = ref([]);
const messages = ref([]);
const selectedBot = ref(null);
const selectedConv = ref(null);
const selectedStudentName = ref('');
const selectedBotName = ref('');
const msgContainer = ref(null);

async function loadStats() {
  try {
    const { data } = await chatMessageAPI.adminStats();
    stats.value = data;
  } catch {}
}

async function selectBot(botId) {
  selectedBot.value = botId;
  selectedConv.value = null;
  messages.value = [];
  selectedBotName.value = stats.value.find(b => b.botId === botId)?.botName || '';
  try {
    const { data } = await chatMessageAPI.adminBotConvs(botId);
    convs.value = data;
  } catch {}
}

async function selectConv(conv) {
  selectedConv.value = conv.id;
  selectedStudentName.value = conv.user?.profile?.nickname || conv.user?.username || '未知';
  try {
    const { data } = await chatMessageAPI.adminMessages(conv.id);
    messages.value = data;
    await nextTick();
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
  } catch {}
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMsgTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

loadStats();
</script>
