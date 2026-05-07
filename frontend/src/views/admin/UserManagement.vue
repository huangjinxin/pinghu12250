<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">用户管理</h1>
        <p class="text-gray-500 mt-1">用户列表、审核、邀请码与校区班级</p>
      </div>
    </div>

    <n-tabs v-model:value="activeMainTab" type="line">
      <n-tab-pane name="users" tab="用户列表">
        <UserList @open-settings="handleOpenSettings" />
      </n-tab-pane>

      <n-tab-pane name="settings" tab="用户设置">
        <UserSettings ref="userSettingsRef" />
      </n-tab-pane>

      <n-tab-pane name="review" tab="用户审核">
        <UserReview :embedded="true" />
      </n-tab-pane>

      <n-tab-pane name="invite" tab="邀请码">
        <InviteCodeManagement :embedded="true" />
      </n-tab-pane>

      <n-tab-pane name="campus-class" tab="校区班级">
        <CampusClassManagement :embedded="true" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import UserList from './UserList.vue'
import UserSettings from './UserSettings.vue'
import UserReview from './UserReview.vue'
import InviteCodeManagement from './InviteCodeManagement.vue'
import CampusClassManagement from './CampusClassManagement.vue'
import { ref } from 'vue'

const activeMainTab = ref('users')
const userSettingsRef = ref(null)

const handleOpenSettings = (user) => {
  activeMainTab.value = 'settings'
  if (userSettingsRef.value && user) {
    userSettingsRef.value.selectedUserId = user.id
    userSettingsRef.value.loadedUser = user
    userSettingsRef.value.loadSettings()
  }
}
</script>
