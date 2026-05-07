<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">互动管理</h1>
      <p class="text-gray-500 mt-1">用户反馈、Bot、聊天记录与二维码</p>
    </div>

    <n-tabs v-model:value="activeTab" type="line">
      <n-tab-pane name="feedback" tab="用户反馈">
        <FeedbackAdmin :embedded="true" />
      </n-tab-pane>

      <n-tab-pane name="bots" tab="Bot管理">
        <BotManagement :embedded="true" />
      </n-tab-pane>

      <n-tab-pane name="chats" tab="聊天记录" display-directive="show">
        <div style="min-height: 500px">
          <BotChats :embedded="true" />
        </div>
      </n-tab-pane>

      <n-tab-pane name="imessage" tab="勤学好问" display-directive="show">
        <div style="min-height: 500px">
          <ImessageLogs :embedded="true" />
        </div>
      </n-tab-pane>

      <n-tab-pane name="qrcode" tab="二维码生成">
        <QRCodeGenerator :embedded="true" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import FeedbackAdmin from './FeedbackAdmin.vue';
import BotManagement from './BotManagement.vue';
import BotChats from './BotChats.vue';
import ImessageLogs from './ImessageLogs.vue';
import QRCodeGenerator from './QRCodeGenerator.vue';

const route = useRoute();
const activeTab = ref('imessage');

watch(() => route.query.tab, (tab) => {
  if (tab && ['feedback', 'bots', 'chats', 'imessage', 'qrcode'].includes(tab)) {
    activeTab.value = tab;
  }
}, { immediate: true });
</script>
