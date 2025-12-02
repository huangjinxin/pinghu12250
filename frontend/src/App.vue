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
import { zhCN, dateZhCN } from 'naive-ui';

// 主题覆盖配置 - 蓝紫色系主色调
const themeOverrides = {
  common: {
    primaryColor: '#6366f1',
    primaryColorHover: '#818cf8',
    primaryColorPressed: '#4f46e5',
    primaryColorSuppl: '#a5b4fc',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusLarge: '10px',
  },
  Card: {
    borderRadius: '12px',
  },
  Input: {
    borderRadius: '8px',
  },
  Select: {
    borderRadius: '8px',
  },
  Tag: {
    borderRadius: '6px',
  },
  Message: {
    borderRadius: '8px',
  },
  Dialog: {
    borderRadius: '12px',
  },
};
</script>
