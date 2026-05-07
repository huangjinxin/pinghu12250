<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <router-view />
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { 
  zhCN, 
  dateZhCN,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NLoadingBarProvider
} from 'naive-ui';
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();

const themeOverrides = computed(() => themeStore.naiveThemeOverrides);

onMounted(() => {
  themeStore.initTheme();
});
</script>
