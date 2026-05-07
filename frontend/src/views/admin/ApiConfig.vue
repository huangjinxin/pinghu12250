<template>
  <div class="space-y-6">
    <!-- 基础信息 -->
    <n-card title="API 基础信息">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span class="text-gray-500">基础URL</span><div class="font-mono text-xs mt-1">{{ baseUrl }}</div></div>
        <div><span class="text-gray-500">认证方式</span><div class="mt-1">JWT Bearer Token</div></div>
        <div><span class="text-gray-500">WebSocket</span><div class="font-mono text-xs mt-1">{{ wsUrl }}</div></div>
        <div><span class="text-gray-500">静态资源</span><div class="font-mono text-xs mt-1">{{ baseUrl }}/uploads</div></div>
      </div>
    </n-card>

    <!-- 筛选工具栏 -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <div class="flex flex-wrap gap-3 items-center">
        <n-input v-model:value="searchKeyword" placeholder="搜索接口路径/描述" clearable style="width: 220px">
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-select v-model:value="filterCategory" :options="categoryOptions" placeholder="全部分类" clearable style="width: 150px" />
        <n-select v-model:value="filterAuth" :options="authOptions" placeholder="认证状态" clearable style="width: 130px" />
        <n-select v-model:value="filterPlatform" :options="platformOptions" placeholder="使用平台" clearable style="width: 130px" />
        <n-button quaternary @click="resetFilters">
          <template #icon><n-icon :component="CloseCircleOutline" /></template>
          重置
        </n-button>
        <span class="text-sm text-gray-500 ml-auto">共 {{ filteredRoutes.length }} 个接口</span>
      </div>
    </div>

    <!-- 分类表格 -->
    <div v-for="cat in visibleCategories" :key="cat.key">
      <n-card :title="cat.label" size="small">
        <template #header-extra>
          <div class="flex items-center gap-2">
            <n-tag type="info" size="small">{{ cat.count }} 个接口</n-tag>
            <n-button size="tiny" @click="copyCategory(cat.key)">
              <template #icon><n-icon :component="CopyOutline" /></template>
              复制
            </n-button>
          </div>
        </template>
        <n-data-table
          :columns="routeColumns"
          :data="getCategoryRoutes(cat.key)"
          :pagination="{ pageSize: 15 }"
          size="small"
          :bordered="false"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { NTag, NIcon, useMessage } from 'naive-ui';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline';
import CloseCircleOutline from '@vicons/ionicons5/es/CloseCircleOutline';
import CopyOutline from '@vicons/ionicons5/es/CopyOutline';
import LockClosedOutline from '@vicons/ionicons5/es/LockClosedOutline';
import LockOpenOutline from '@vicons/ionicons5/es/LockOpenOutline';
import PhonePortraitOutline from '@vicons/ionicons5/es/PhonePortraitOutline';
import DesktopOutline from '@vicons/ionicons5/es/DesktopOutline';
import GlobeOutline from '@vicons/ionicons5/es/GlobeOutline';

const baseUrl = window.location.origin.replace(/:\d+$/, ':12251') + '/api';
const wsUrl = window.location.origin.replace(/:\d+$/, ':12251');

const message = useMessage();

const searchKeyword = ref('');
const filterCategory = ref(null);
const filterAuth = ref(null);
const filterPlatform = ref(null);

const categoryOptions = [];
const authOptions = [
  { label: '需要认证', value: 'auth' },
  { label: '无需认证', value: 'public' },
  { label: 'API Key', value: 'apikey' },
];
const platformOptions = [
  { label: 'iOS/Android', value: 'mobile' },
  { label: 'Web', value: 'web' },
  { label: '管理员', value: 'admin' },
  { label: '全平台', value: 'all' },
];

const allRoutes = [
  { category: 'auth', method: 'POST', path: '/api/auth/register', auth: false, platform: 'all', desc: '用户注册（需邀请码）' },
  { category: 'auth', method: 'POST', path: '/api/auth/login', auth: false, platform: 'all', desc: '用户登录' },
  { category: 'auth', method: 'POST', path: '/api/auth/verify-2fa', auth: false, platform: 'all', desc: '两步验证校验' },
  { category: 'auth', method: 'POST', path: '/api/auth/refresh', auth: false, platform: 'all', desc: '刷新JWT Token' },
  { category: 'auth', method: 'DELETE', path: '/api/auth/delete-account', auth: true, platform: 'all', desc: '删除账户' },

  { category: 'user', method: 'GET', path: '/api/users/me', auth: true, platform: 'all', desc: '获取当前用户信息' },
  { category: 'user', method: 'PUT', path: '/api/users/me', auth: true, platform: 'all', desc: '更新用户资料' },
  { category: 'user', method: 'PUT', path: '/api/users/me/password', auth: true, platform: 'all', desc: '修改登录密码' },
  { category: 'user', method: 'PUT', path: '/api/users/me/payment-password', auth: true, platform: 'all', desc: '重置支付密码' },
  { category: 'user', method: 'POST', path: '/api/users/me/payment-password/verify', auth: true, platform: 'all', desc: '验证支付密码' },
  { category: 'user', method: 'GET', path: '/api/users/me/payment-password/check', auth: true, platform: 'all', desc: '检查支付密码状态' },
  { category: 'user', method: 'POST', path: '/api/users/me/avatar', auth: true, platform: 'all', desc: '上传头像' },
  { category: 'user', method: 'GET', path: '/api/users/:id', auth: true, platform: 'all', desc: '获取指定用户信息' },
  { category: 'user', method: 'GET', path: '/api/users/:id/stats', auth: true, platform: 'all', desc: '获取用户统计数据' },
  { category: 'user', method: 'GET', path: '/api/users/search', auth: true, platform: 'all', desc: '搜索用户' },
  { category: 'user', method: 'GET', path: '/api/users/teachers', auth: true, platform: 'all', desc: '获取老师列表' },
  { category: 'user', method: 'POST', path: '/api/users/link-parent', auth: true, platform: 'web', desc: '关联家长（学生）' },
  { category: 'user', method: 'POST', path: '/api/users/invites/generate', auth: true, platform: 'web', desc: '生成邀请码（学生）' },
  { category: 'user', method: 'GET', path: '/api/users/invites/records', auth: true, platform: 'web', desc: '获取邀请记录' },
  { category: 'user', method: 'GET', path: '/api/users/me/children', auth: true, platform: 'mobile', desc: '获取孩子列表（家长端）' },
  { category: 'user', method: 'GET', path: '/api/users/me/children/:childId/financial', auth: true, platform: 'mobile', desc: '孩子积分/钱包明细' },
  { category: 'user', method: 'PUT', path: '/api/users/me/device-token', auth: true, platform: 'mobile', desc: '更新设备推送Token' },
  { category: 'user', method: 'GET', path: '/api/users/me/friend-settings', auth: true, platform: 'web', desc: '获取好友设置' },
  { category: 'user', method: 'PUT', path: '/api/users/me/friend-settings', auth: true, platform: 'web', desc: '更新好友设置' },
  { category: 'user', method: 'PUT', path: '/api/users/me/school-class', auth: true, platform: 'web', desc: '修改学校班级（月限一次）' },
  { category: 'user', method: 'GET', path: '/api/users/:id/dynamics', auth: true, platform: 'all', desc: '获取用户动态聚合' },
  { category: 'user', method: 'GET', path: '/api/users/:id/diaries', auth: true, platform: 'all', desc: '获取用户日记' },
  { category: 'user', method: 'GET', path: '/api/users/:id/homeworks', auth: true, platform: 'all', desc: '获取用户作业' },
  { category: 'user', method: 'GET', path: '/api/users/:id/notes', auth: true, platform: 'all', desc: '获取用户笔记' },
  { category: 'user', method: 'GET', path: '/api/users/:id/reading-logs', auth: true, platform: 'all', desc: '获取阅读记录' },
  { category: 'user', method: 'GET', path: '/api/users/:id/games', auth: true, platform: 'all', desc: '获取游戏记录' },
  { category: 'user', method: 'GET', path: '/api/users/:id/music-logs', auth: true, platform: 'all', desc: '获取音乐记录' },
  { category: 'user', method: 'GET', path: '/api/users/:id/movie-logs', auth: true, platform: 'all', desc: '获取影视记录' },

  { category: 'im', method: 'GET', path: '/api/messages/:userId', auth: true, platform: 'all', desc: '获取与某用户的聊天记录' },
  { category: 'im', method: 'GET', path: '/api/messages/conversations/list', auth: true, platform: 'all', desc: '获取会话列表' },
  { category: 'im', method: 'GET', path: '/api/messages/unread/count', auth: true, platform: 'all', desc: '获取未读消息数' },
  { category: 'im', method: 'GET', path: '/api/messages/system/list', auth: true, platform: 'all', desc: '获取系统消息' },
  { category: 'im', method: 'POST', path: '/api/messages/system/mark-read', auth: true, platform: 'all', desc: '标记系统消息已读' },
  { category: 'im', method: 'POST', path: '/api/messages/send', auth: true, platform: 'all', desc: '发送消息（REST）' },
  { category: 'im', method: 'POST', path: '/api/messages/mark-chat-read', auth: true, platform: 'all', desc: '标记聊天已读' },
  { category: 'im', method: 'DELETE', path: '/api/messages/:messageId', auth: true, platform: 'all', desc: '删除消息' },
  { category: 'im', method: 'GET', path: '/api/conversations', auth: true, platform: 'all', desc: '获取会话列表' },
  { category: 'im', method: 'POST', path: '/api/conversations/create-or-get', auth: true, platform: 'all', desc: '创建或获取会话' },
  { category: 'im', method: 'GET', path: '/api/conversations/:id/messages', auth: true, platform: 'all', desc: '获取会话消息' },
  { category: 'im', method: 'POST', path: '/api/conversations/:id/read', auth: true, platform: 'all', desc: '标记会话已读' },
  { category: 'im', method: 'POST', path: '/api/friend-requests', auth: true, platform: 'all', desc: '发送好友申请' },
  { category: 'im', method: 'GET', path: '/api/friend-requests/received', auth: true, platform: 'all', desc: '收到的好友申请' },
  { category: 'im', method: 'GET', path: '/api/friend-requests/sent', auth: true, platform: 'all', desc: '发出的好友申请' },
  { category: 'im', method: 'POST', path: '/api/friend-requests/:id/accept', auth: true, platform: 'all', desc: '接受好友申请' },
  { category: 'im', method: 'POST', path: '/api/friend-requests/:id/reject', auth: true, platform: 'all', desc: '拒绝好友申请' },
  { category: 'im', method: 'POST', path: '/api/follows/:userId', auth: true, platform: 'all', desc: '关注用户' },
  { category: 'im', method: 'DELETE', path: '/api/follows/:userId', auth: true, platform: 'all', desc: '取消关注' },
  { category: 'im', method: 'DELETE', path: '/api/follows/friends/:userId', auth: true, platform: 'all', desc: '删除好友' },
  { category: 'im', method: 'GET', path: '/api/follows/following', auth: true, platform: 'all', desc: '关注列表' },
  { category: 'im', method: 'GET', path: '/api/follows/followers', auth: true, platform: 'all', desc: '粉丝列表' },
  { category: 'im', method: 'GET', path: '/api/follows/friends', auth: true, platform: 'all', desc: '好友列表' },
  { category: 'im', method: 'GET', path: '/api/follows/status/:userId', auth: true, platform: 'all', desc: '关系状态' },
  { category: 'im', method: 'GET', path: '/api/follows/recommendations', auth: true, platform: 'all', desc: '推荐用户' },

  { category: 'im', method: 'GET', path: '/api/bot', auth: true, platform: 'all', desc: '获取AI机器人列表' },
  { category: 'im', method: 'GET', path: '/api/chat-message/:botId/messages', auth: true, platform: 'all', desc: '获取与机器人聊天记录' },
  { category: 'im', method: 'POST', path: '/api/chat-message/:botId/send', auth: true, platform: 'all', desc: '发送消息给机器人' },
  { category: 'im', method: 'GET', path: '/api/chat-message/conversations', auth: true, platform: 'all', desc: '机器人会话列表' },

  { category: 'socket', method: 'SOCKET', path: 'ws://host:12251', auth: true, platform: 'all', desc: 'WebSocket连接（JWT认证）' },
  { category: 'socket', method: '→', path: 'send_message', auth: true, platform: 'all', desc: '发送消息 {toUserId, content, tempId}' },
  { category: 'socket', method: '→', path: 'mark_read', auth: true, platform: 'all', desc: '标记消息已读 {messageIds[]}' },
  { category: 'socket', method: '→', path: 'sync_messages', auth: true, platform: 'all', desc: '同步消息 {lastMessageId}' },
  { category: 'socket', method: '←', path: 'new_message', auth: true, platform: 'all', desc: '接收新消息推送' },
  { category: 'socket', method: '←', path: 'message_sent', auth: true, platform: 'all', desc: '消息发送确认' },
  { category: 'socket', method: '←', path: 'user_online', auth: true, platform: 'all', desc: '用户上线通知' },
  { category: 'socket', method: '←', path: 'user_offline', auth: true, platform: 'all', desc: '用户下线通知' },
  { category: 'socket', method: '←', path: 'sync_result', auth: true, platform: 'all', desc: '消息同步结果' },
  { category: 'socket', method: '←', path: 'leaderboard_update', auth: true, platform: 'all', desc: '排行榜更新' },

  { category: 'mobile', method: 'POST', path: '/api/push-tokens/register', auth: true, platform: 'mobile', desc: '注册iOS推送Token' },
  { category: 'mobile', method: 'POST', path: '/api/push-tokens/unregister', auth: true, platform: 'mobile', desc: '注销推送Token' },
  { category: 'mobile', method: 'POST', path: '/api/sync/register-device', auth: true, platform: 'mobile', desc: '注册同步设备' },
  { category: 'mobile', method: 'GET', path: '/api/sync/changes', auth: true, platform: 'mobile', desc: '获取增量同步变更' },
  { category: 'mobile', method: 'POST', path: '/api/sync/push', auth: true, platform: 'mobile', desc: '推送本地变更到服务器' },
  { category: 'mobile', method: 'POST', path: '/api/sync/resolve-conflict', auth: true, platform: 'mobile', desc: '解决同步冲突' },
  { category: 'mobile', method: 'GET', path: '/api/sync/status', auth: true, platform: 'mobile', desc: '获取同步状态' },
  { category: 'mobile', method: 'GET', path: '/api/sync/conflicts', auth: true, platform: 'mobile', desc: '获取未解决冲突' },
  { category: 'mobile', method: 'DELETE', path: '/api/sync/device/:deviceId', auth: true, platform: 'mobile', desc: '注销设备' },
  { category: 'mobile', method: 'POST', path: '/api/scan', auth: true, platform: 'mobile', desc: '解析二维码扫描' },
  { category: 'mobile', method: 'GET', path: '/api/scan/logs', auth: true, platform: 'mobile', desc: '获取扫描日志' },
  { category: 'mobile', method: 'GET', path: '/api/img-proxy', auth: false, platform: 'mobile', desc: '图片代理（缩放/缓存）' },

  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/works', auth: true, platform: 'mobile', desc: '获取孩子作品（家长端）' },
  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/works/stats', auth: true, platform: 'mobile', desc: '孩子作品统计' },
  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/works/html/:workId', auth: true, platform: 'mobile', desc: 'HTML作品详情' },
  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/works/poetry/:workId', auth: true, platform: 'mobile', desc: '诗词作品详情' },
  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/works/creative/:workId', auth: true, platform: 'mobile', desc: '创意作品详情' },
  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/diary/analysis', auth: true, platform: 'mobile', desc: '孩子日记分析记录' },
  { category: 'parent', method: 'GET', path: '/api/parent/child/:childId/diary/analysis/:recordId', auth: true, platform: 'mobile', desc: '日记分析详情' },

  { category: 'imessage', method: 'POST', path: '/api/imessage/sync', auth: false, platform: 'mobile', desc: '外部推送单轮对话（API Key）' },
  { category: 'imessage', method: 'POST', path: '/api/imessage/batch-sync', auth: false, platform: 'mobile', desc: '批量推送历史记录（API Key）' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/stats', auth: true, platform: 'admin', desc: 'iMessage统计概览' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/analytics', auth: true, platform: 'admin', desc: '图表分析' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/logs', auth: true, platform: 'admin', desc: '分页日志查看' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/chats', auth: true, platform: 'admin', desc: '按会话分组查看' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/chat/:chatId', auth: true, platform: 'admin', desc: '查看完整对话' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/chat-by-sender/:sender', auth: true, platform: 'admin', desc: '按发送者查看' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/chat-batch', auth: true, platform: 'admin', desc: '批量查看多个会话' },
  { category: 'imessage', method: 'POST', path: '/api/imessage/admin/evaluate/:chatId', auth: true, platform: 'admin', desc: 'AI分析会话' },
  { category: 'imessage', method: 'POST', path: '/api/imessage/admin/evaluate-by-sender/:sender', auth: true, platform: 'admin', desc: 'AI分析发送者所有聊天' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/evaluations/:chatId', auth: true, platform: 'admin', desc: '获取评估历史' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/admin/sender-mappings', auth: true, platform: 'admin', desc: '发送者映射列表' },
  { category: 'imessage', method: 'POST', path: '/api/imessage/admin/sender-mappings', auth: true, platform: 'admin', desc: '创建发送者映射' },
  { category: 'imessage', method: 'DELETE', path: '/api/imessage/admin/sender-mappings/:sender', auth: true, platform: 'admin', desc: '删除发送者映射' },
  { category: 'imessage', method: 'GET', path: '/api/imessage/user/:userId/summary', auth: true, platform: 'all', desc: '用户问题摘要' },

  { category: 'ai', method: 'GET', path: '/api/ai-config/active', auth: true, platform: 'all', desc: '获取活跃AI配置' },
  { category: 'ai', method: 'POST', path: '/api/ai-analysis/chat/stream', auth: true, platform: 'all', desc: 'AI对话（SSE流式）' },
  { category: 'ai', method: 'POST', path: '/api/ai-analysis/chat', auth: true, platform: 'all', desc: 'AI对话（非流式，支持图片）' },
  { category: 'ai', method: 'POST', path: '/api/ai-analysis/abort/:connectionId', auth: true, platform: 'all', desc: '中止AI请求' },
  { category: 'ai', method: 'POST', path: '/api/ai-analysis/diary/analyze', auth: true, platform: 'all', desc: '单篇日记AI分析+评分' },
  { category: 'ai', method: 'POST', path: '/api/ai-analysis/diary/analyze-batch', auth: true, platform: 'all', desc: '批量日记AI分析' },
  { category: 'ai', method: 'GET', path: '/api/ai-analysis/diary/history', auth: true, platform: 'all', desc: '分析历史记录' },
  { category: 'ai', method: 'GET', path: '/api/ai-config/automation-settings', auth: true, platform: 'admin', desc: 'AI自动化设置' },
  { category: 'ai', method: 'PUT', path: '/api/ai-config/automation-settings', auth: true, platform: 'admin', desc: '更新自动化设置' },
  { category: 'ai', method: 'GET', path: '/api/textbook-chat/:textbookId', auth: true, platform: 'all', desc: '课本聊天历史' },
  { category: 'ai', method: 'POST', path: '/api/textbook-chat/:textbookId', auth: true, platform: 'all', desc: '发送课本聊天消息' },

  { category: 'payment', method: 'GET', path: '/api/wallet', auth: true, platform: 'all', desc: '获取钱包信息' },
  { category: 'payment', method: 'GET', path: '/api/wallet/transactions', auth: true, platform: 'all', desc: '钱包交易记录' },
  { category: 'payment', method: 'GET', path: '/api/pay/public/codes', auth: false, platform: 'all', desc: '获取收款码（公开）' },
  { category: 'payment', method: 'GET', path: '/api/pay/scan/:code', auth: true, platform: 'mobile', desc: '扫描收款码' },
  { category: 'payment', method: 'POST', path: '/api/pay/submit', auth: true, platform: 'all', desc: '提交支付（钱包/积分）' },
  { category: 'payment', method: 'GET', path: '/api/pay/my-orders', auth: true, platform: 'all', desc: '我的支付记录' },
  { category: 'payment', method: 'GET', path: '/api/payment-plans', auth: true, platform: 'all', desc: '我的分期计划' },
  { category: 'payment', method: 'POST', path: '/api/payment-plans', auth: true, platform: 'all', desc: '创建分期计划' },
  { category: 'payment', method: 'POST', path: '/api/payment-plans/:id/pay', auth: true, platform: 'all', desc: '支付当前分期' },
  { category: 'payment', method: 'POST', path: '/api/payment-plans/:id/pay-all', auth: true, platform: 'all', desc: '一次性付清' },
  { category: 'payment', method: 'GET', path: '/api/points/me', auth: true, platform: 'all', desc: '获取积分信息' },
  { category: 'payment', method: 'GET', path: '/api/points/records', auth: true, platform: 'all', desc: '积分记录' },
  { category: 'payment', method: 'POST', path: '/api/points/exchange', auth: true, platform: 'all', desc: '积分兑换学习币' },
  { category: 'payment', method: 'GET', path: '/api/points/exchange/history', auth: true, platform: 'all', desc: '兑换历史' },

  { category: 'content', method: 'GET', path: '/api/diaries', auth: true, platform: 'all', desc: '获取日记列表' },
  { category: 'content', method: 'POST', path: '/api/diaries', auth: true, platform: 'all', desc: '创建日记' },
  { category: 'content', method: 'GET', path: '/api/posts', auth: true, platform: 'all', desc: '获取动态列表' },
  { category: 'content', method: 'POST', path: '/api/posts', auth: true, platform: 'all', desc: '创建动态' },
  { category: 'content', method: 'POST', path: '/api/posts/:id/like', auth: true, platform: 'all', desc: '点赞/取消点赞' },
  { category: 'content', method: 'POST', path: '/api/posts/:id/comments', auth: true, platform: 'all', desc: '添加评论' },
  { category: 'content', method: 'GET', path: '/api/homeworks', auth: true, platform: 'all', desc: '获取作业列表' },
  { category: 'content', method: 'GET', path: '/api/notes', auth: true, platform: 'all', desc: '获取笔记列表' },
  { category: 'content', method: 'GET', path: '/api/reading-notes', auth: true, platform: 'all', desc: '获取读书笔记' },
  { category: 'content', method: 'GET', path: '/api/books', auth: true, platform: 'all', desc: '获取书籍列表' },
  { category: 'content', method: 'GET', path: '/api/music', auth: true, platform: 'all', desc: '获取音乐列表' },
  { category: 'content', method: 'GET', path: '/api/movies', auth: true, platform: 'all', desc: '获取影视列表' },
  { category: 'content', method: 'GET', path: '/api/html-works', auth: true, platform: 'all', desc: '获取HTML作品' },
  { category: 'content', method: 'GET', path: '/api/creative-works', auth: true, platform: 'all', desc: '获取创意作品' },
  { category: 'content', method: 'GET', path: '/api/poetry-works', auth: true, platform: 'all', desc: '获取诗词作品' },
  { category: 'content', method: 'GET', path: '/api/calligraphy', auth: false, platform: 'all', desc: '获取书法作品（公开）' },
  { category: 'content', method: 'POST', path: '/api/calligraphy', auth: true, platform: 'all', desc: '创建书法作品' },
  { category: 'content', method: 'GET', path: '/api/photos', auth: true, platform: 'all', desc: '获取照片列表' },
  { category: 'content', method: 'POST', path: '/api/upload', auth: true, platform: 'all', desc: '通用文件上传' },

  { category: 'learning', method: 'POST', path: '/api/typing/practice', auth: true, platform: 'all', desc: '提交打字练习记录' },
  { category: 'learning', method: 'GET', path: '/api/typing/practice/my', auth: true, platform: 'all', desc: '我的打字记录' },
  { category: 'learning', method: 'GET', path: '/api/typing/practice/my/stats', auth: true, platform: 'all', desc: '打字统计' },
  { category: 'learning', method: 'GET', path: '/api/typing/practice/my/today-status', auth: true, platform: 'all', desc: '今日打字状态' },
  { category: 'learning', method: 'GET', path: '/api/typing/practice/leaderboard', auth: false, platform: 'all', desc: '打字排行榜' },
  { category: 'learning', method: 'POST', path: '/api/pinyin/convert', auth: true, platform: 'all', desc: '汉字转拼音' },
  { category: 'learning', method: 'POST', path: '/api/pinyin/practice', auth: true, platform: 'all', desc: '提交拼音练习' },
  { category: 'learning', method: 'GET', path: '/api/pinyin/practice/my/today-status', auth: true, platform: 'all', desc: '今日拼音状态' },
  { category: 'learning', method: 'GET', path: '/api/pinyin/practice/leaderboard', auth: false, platform: 'all', desc: '拼音排行榜' },
  { category: 'learning', method: 'GET', path: '/api/learning/sessions', auth: true, platform: 'all', desc: '学习会话记录' },
  { category: 'learning', method: 'POST', path: '/api/learning/sessions', auth: true, platform: 'all', desc: '创建学习会话' },
  { category: 'learning', method: 'POST', path: '/api/learning/sessions/:id/like', auth: true, platform: 'all', desc: '学习会话点赞' },
  { category: 'learning', method: 'GET', path: '/api/challenges', auth: true, platform: 'all', desc: '挑战列表' },
  { category: 'learning', method: 'POST', path: '/api/challenges/:id/complete', auth: true, platform: 'all', desc: '完成挑战' },
  { category: 'learning', method: 'GET', path: '/api/achievements', auth: true, platform: 'all', desc: '成就列表' },
  { category: 'learning', method: 'GET', path: '/api/feed', auth: true, platform: 'all', desc: '好友动态流' },
  { category: 'learning', method: 'GET', path: '/api/feed/leaderboard', auth: true, platform: 'all', desc: '多维度排行榜' },
  { category: 'learning', method: 'GET', path: '/api/feed/my-rankings', auth: true, platform: 'all', desc: '我的排名' },
  { category: 'learning', method: 'GET', path: '/api/calendar', auth: true, platform: 'all', desc: '日历事件' },
  { category: 'learning', method: 'GET', path: '/api/stats', auth: true, platform: 'all', desc: '学习统计' },
  { category: 'learning', method: 'GET', path: '/api/records', auth: true, platform: 'all', desc: '学习记录' },

  { category: 'textbook', method: 'GET', path: '/api/textbooks/public', auth: false, platform: 'all', desc: '公开课本列表' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/public/:id', auth: false, platform: 'all', desc: '公开课本详情' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/public/:id/toc', auth: false, platform: 'all', desc: '课本文档目录' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/public/lesson/:id', auth: false, platform: 'all', desc: '公开课程详情' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/my', auth: true, platform: 'all', desc: '我的课本' },
  { category: 'textbook', method: 'POST', path: '/api/textbooks', auth: true, platform: 'all', desc: '创建课本' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/:id', auth: true, platform: 'all', desc: '课本详情' },
  { category: 'textbook', method: 'POST', path: '/api/textbooks/:id/pdf', auth: true, platform: 'all', desc: '上传PDF' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/:id/epub/toc', auth: true, platform: 'all', desc: 'EPUB目录' },
  { category: 'textbook', method: 'GET', path: '/api/textbooks/:id/epub/chapter/:chapterId', auth: true, platform: 'all', desc: 'EPUB章节内容' },
  { category: 'textbook', method: 'GET', path: '/api/textbook-notes', auth: true, platform: 'all', desc: '阅读笔记列表' },
  { category: 'textbook', method: 'POST', path: '/api/textbook-notes', auth: true, platform: 'all', desc: '创建阅读笔记' },
  { category: 'textbook', method: 'GET', path: '/api/textbook-notes/child/:childId', auth: true, platform: 'mobile', desc: '孩子阅读笔记（家长）' },

  { category: 'admin', method: 'GET', path: '/api/admin/users', auth: true, platform: 'admin', desc: '用户列表（分页/筛选）' },
  { category: 'admin', method: 'POST', path: '/api/admin/users', auth: true, platform: 'admin', desc: '创建用户' },
  { category: 'admin', method: 'PUT', path: '/api/admin/users/:id/status', auth: true, platform: 'admin', desc: '更新用户状态' },
  { category: 'admin', method: 'PUT', path: '/api/admin/users/:id/reset-password', auth: true, platform: 'admin', desc: '重置用户密码' },
  { category: 'admin', method: 'DELETE', path: '/api/admin/users/:id', auth: true, platform: 'admin', desc: '删除用户' },
  { category: 'admin', method: 'DELETE', path: '/api/admin/users/:id/2fa', auth: true, platform: 'admin', desc: '清除用户2FA' },
  { category: 'admin', method: 'POST', path: '/api/admin/users/:id/approve', auth: true, platform: 'admin', desc: '审核通过用户' },
  { category: 'admin', method: 'POST', path: '/api/admin/users/:id/reject', auth: true, platform: 'admin', desc: '拒绝/禁用用户' },
  { category: 'admin', method: 'GET', path: '/api/admin/pending-users', auth: true, platform: 'admin', desc: '待审核用户' },
  { category: 'admin', method: 'GET', path: '/api/admin/stats', auth: true, platform: 'admin', desc: '管理面板统计' },
  { category: 'admin', method: 'GET', path: '/api/admin/activity-logs', auth: true, platform: 'admin', desc: '活动日志' },
  { category: 'admin', method: 'GET', path: '/api/admin/students', auth: true, platform: 'admin', desc: '学生列表' },
  { category: 'admin', method: 'PUT', path: '/api/admin/users/:id/assign-class', auth: true, platform: 'admin', desc: '分配学生到班级' },
  { category: 'admin', method: 'PUT', path: '/api/admin/users/:id/children', auth: true, platform: 'admin', desc: '更新家长的孩子' },
  { category: 'admin', method: 'GET', path: '/api/admin/users/:id/settings', auth: true, platform: 'admin', desc: '获取用户设置' },
  { category: 'admin', method: 'PUT', path: '/api/admin/users/:id/settings', auth: true, platform: 'admin', desc: '更新用户设置' },
  { category: 'admin', method: 'GET', path: '/api/points/admin/logs', auth: true, platform: 'admin', desc: '所有用户积分日志' },
  { category: 'admin', method: 'POST', path: '/api/points/admin/adjust', auth: true, platform: 'admin', desc: '手动调整积分' },
  { category: 'admin', method: 'GET', path: '/api/invite-codes', auth: true, platform: 'admin', desc: '邀请码列表' },
  { category: 'admin', method: 'POST', path: '/api/invite-codes', auth: true, platform: 'admin', desc: '生成邀请码' },
  { category: 'admin', method: 'GET', path: '/api/invite-codes/cost-settings', auth: true, platform: 'admin', desc: '邀请积分消耗设置' },
  { category: 'admin', method: 'PUT', path: '/api/invite-codes/cost-settings', auth: true, platform: 'admin', desc: '保存邀请消耗设置' },
  { category: 'admin', method: 'GET', path: '/api/campuses', auth: true, platform: 'admin', desc: '学校列表' },
  { category: 'admin', method: 'POST', path: '/api/campuses', auth: true, platform: 'admin', desc: '创建学校' },
  { category: 'admin', method: 'GET', path: '/api/classes', auth: true, platform: 'admin', desc: '班级列表' },
  { category: 'admin', method: 'POST', path: '/api/classes', auth: true, platform: 'admin', desc: '创建班级' },
  { category: 'admin', method: 'GET', path: '/api/ai-analysis/admin/stats', auth: true, platform: 'admin', desc: 'AI管理统计' },
  { category: 'admin', method: 'GET', path: '/api/ai-config/tasks', auth: true, platform: 'admin', desc: 'AI任务列表' },
  { category: 'admin', method: 'GET', path: '/api/backup/list', auth: true, platform: 'admin', desc: '备份文件列表' },
  { category: 'admin', method: 'POST', path: '/api/backup/trigger', auth: true, platform: 'admin', desc: '手动触发备份' },
  { category: 'admin', method: 'GET', path: '/api/analytics/dashboard', auth: true, platform: 'admin', desc: '数据看板' },
  { category: 'admin', method: 'GET', path: '/api/feedback/admin', auth: true, platform: 'admin', desc: '反馈管理' },
  { category: 'admin', method: 'GET', path: '/api/reward/admin/stats', auth: true, platform: 'admin', desc: '奖励管理统计' },

  { category: 'public', method: 'GET', path: '/api/public/leaderboard', auth: false, platform: 'all', desc: '公开挑战排行榜' },
  { category: 'public', method: 'GET', path: '/api/public/unified-feed', auth: false, platform: 'all', desc: '公开统一动态流' },
  { category: 'public', method: 'GET', path: '/api/public/works-feed', auth: false, platform: 'all', desc: '公开作品广场' },
  { category: 'public', method: 'GET', path: '/api/diaries/:id/public', auth: false, platform: 'all', desc: '公开日记详情' },
  { category: 'public', method: 'GET', path: '/api/ai-analysis/diary/public', auth: false, platform: 'all', desc: '公开日记分析' },
  { category: 'public', method: 'GET', path: '/health', auth: false, platform: 'all', desc: '健康检查' },
];

const categories = [
  { key: 'auth', label: '认证 Auth', icon: '🔐' },
  { key: 'user', label: '用户 User', icon: '👤' },
  { key: 'im', label: '即时通讯 IM', icon: '💬' },
  { key: 'socket', label: 'WebSocket', icon: '🔌' },
  { key: 'mobile', label: '移动端 Mobile', icon: '📱' },
  { key: 'parent', label: '家长端 Parent', icon: '👨‍👩‍👧' },
  { key: 'imessage', label: 'iMessage 接入', icon: '📲' },
  { key: 'ai', label: 'AI 服务', icon: '🤖' },
  { key: 'payment', label: '支付/钱包/积分', icon: '💰' },
  { key: 'content', label: '内容管理', icon: '📝' },
  { key: 'learning', label: '学习模块', icon: '📚' },
  { key: 'textbook', label: '课本/笔记', icon: '📖' },
  { key: 'admin', label: '管理后台', icon: '⚙️' },
  { key: 'public', label: '公开接口', icon: '🌐' },
];

categoryOptions.push(...categories.map(c => ({ label: `${c.icon} ${c.label}`, value: c.key })));

const routeColumns = [
  {
    title: '方法',
    key: 'method',
    width: 80,
    render: (row) => {
      const colors = { GET: 'success', POST: 'info', PUT: 'warning', DELETE: 'error', SOCKET: 'default', '→': 'info', '←': 'default' };
      return h(NTag, { size: 'tiny', type: colors[row.method] || 'default', bordered: false }, { default: () => row.method });
    },
  },
  {
    title: '路径',
    key: 'path',
    width: 320,
    render: (row) => h('code', { class: 'text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded' }, row.path),
  },
  {
    title: '认证',
    key: 'auth',
    width: 70,
    render: (row) => {
      if (row.auth === 'apikey') return h(NTag, { size: 'tiny', type: 'warning' }, { icon: () => h(NIcon, { component: LockClosedOutline, size: 12 }), default: () => 'Key' });
      if (row.auth) return h(NTag, { size: 'tiny', type: 'success' }, { icon: () => h(NIcon, { component: LockClosedOutline, size: 12 }), default: () => 'JWT' });
      return h(NTag, { size: 'tiny', type: 'default' }, { icon: () => h(NIcon, { component: LockOpenOutline, size: 12 }), default: () => '公开' });
    },
  },
  {
    title: '平台',
    key: 'platform',
    width: 100,
    render: (row) => {
      const icons = { mobile: PhonePortraitOutline, web: DesktopOutline, admin: '⚙️', all: GlobeOutline };
      const labels = { mobile: '移动端', web: 'Web', admin: '管理', all: '全平台' };
      const colors = { mobile: 'info', web: 'success', admin: 'warning', all: 'default' };
      return h(NTag, { size: 'tiny', type: colors[row.platform] || 'default' }, {
        icon: () => typeof icons[row.platform] === 'string' ? null : h(NIcon, { component: icons[row.platform], size: 12 }),
        default: () => labels[row.platform] || row.platform,
      });
    },
  },
  {
    title: '描述',
    key: 'desc',
    ellipsis: { tooltip: true },
  },
];

const filteredRoutes = computed(() => {
  let result = allRoutes;
  if (filterCategory.value) result = result.filter(r => r.category === filterCategory.value);
  if (filterAuth.value === 'auth') result = result.filter(r => r.auth === true);
  else if (filterAuth.value === 'public') result = result.filter(r => r.auth === false);
  else if (filterAuth.value === 'apikey') result = result.filter(r => r.auth === 'apikey');
  if (filterPlatform.value) result = result.filter(r => r.platform === filterPlatform.value);
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase();
    result = result.filter(r => r.path.toLowerCase().includes(kw) || r.desc.toLowerCase().includes(kw));
  }
  return result;
});

const visibleCategories = computed(() => {
  return categories.map(cat => ({
    ...cat,
    count: filteredRoutes.value.filter(r => r.category === cat.key).length,
  })).filter(cat => cat.count > 0);
});

const getCategoryRoutes = (key) => filteredRoutes.value.filter(r => r.category === key);

const resetFilters = () => {
  searchKeyword.value = '';
  filterCategory.value = null;
  filterAuth.value = null;
  filterPlatform.value = null;
};

const copyCategory = async (key) => {
  const routes = getCategoryRoutes(key);
  const text = routes.map(r => `${r.method} ${r.path} - ${r.desc}`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    message.success(`已复制 ${routes.length} 个接口`);
  } catch {
    message.error('复制失败');
  }
};
</script>
