<template>
  <div class="message-sidebar">
    <div class="sidebar-header">
      <n-tabs v-model:value="activeTab" type="line" size="small">
        <n-tab name="chat">聊天</n-tab>
        <n-tab name="contacts">通讯录</n-tab>
      </n-tabs>
    </div>

    <div class="search-box">
      <n-input v-model:value="searchQuery" placeholder="搜索" clearable size="small">
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>
    </div>

    <div class="list-container">
      <slot :activeTab="activeTab" :searchQuery="searchQuery" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'

const activeTab = ref('chat')
const searchQuery = ref('')
</script>

<style scoped>
.message-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 12px 16px 0;
  border-bottom: 1px solid #e5e7eb;
}

.search-box {
  padding: 12px 16px;
}

.list-container {
  flex: 1;
  overflow-y: auto;
}
</style>
