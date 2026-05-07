<template>
  <div class="space-y-6">
    <!-- 用户选择 -->
    <div class="card">
      <div class="flex items-center gap-4">
        <n-select
          v-model:value="selectedUserId"
          filterable
          remote
          :options="userSelectOptions"
          :loading="loadingUserSearch"
          placeholder="搜索并选择用户"
          style="flex: 1"
          @search="handleUserSearch"
          @update:value="handleUserSelect"
        />
        <n-button type="primary" :disabled="!selectedUserId" @click="loadSettings">
          加载设置
        </n-button>
      </div>
    </div>

    <template v-if="loadedUser">
      <!-- 用户信息卡片 -->
      <div class="card">
        <div class="flex items-center space-x-4">
          <AvatarText :username="loadedUser.username" size="lg" />
          <div class="flex-1">
            <h3 class="text-lg font-bold">{{ loadedUser.profile?.nickname || loadedUser.username }}</h3>
            <p class="text-gray-500 text-sm">{{ loadedUser.email }}</p>
            <div class="flex items-center gap-2 mt-1">
              <n-tag :type="getRoleTag(loadedUser.role).type" size="small">{{ getRoleTag(loadedUser.role).text }}</n-tag>
              <n-tag :type="getStatusTag(loadedUser.status).type" size="small">{{ getStatusTag(loadedUser.status).text }}</n-tag>
            </div>
          </div>
        </div>
      </div>

      <n-tabs type="line" animated>
        <!-- 基本资料 -->
        <n-tab-pane name="basic" tab="基本资料">
          <div class="card">
            <n-form :model="basicForm" label-placement="left" label-width="100">
              <n-form-item label="昵称">
                <n-input v-model:value="basicForm.nickname" placeholder="请输入昵称" />
              </n-form-item>
              <n-form-item label="年级">
                <n-input v-model:value="basicForm.grade" placeholder="如：三年级" />
              </n-form-item>
              <n-form-item label="个人简介">
                <n-input v-model:value="basicForm.bio" type="textarea" placeholder="介绍一下用户" :rows="3" />
              </n-form-item>
              <n-form-item label="兴趣爱好">
                <n-dynamic-tags v-model:value="basicForm.interests" />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" :loading="savingBasic" @click="saveBasic">保存修改</n-button>
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>

        <!-- 隐私设置 -->
        <n-tab-pane name="privacy" tab="隐私设置">
          <div class="card space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">公开个人主页</div>
                <div class="text-sm text-gray-500">允许他人查看该用户的个人资料</div>
              </div>
              <n-switch v-model:value="privacyForm.profilePublic" @update:value="savePrivacy" />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">显示统计数据</div>
                <div class="text-sm text-gray-500">在个人主页展示学习统计</div>
              </div>
              <n-switch v-model:value="privacyForm.showStats" @update:value="savePrivacy" />
            </div>
            <div v-if="loadedUser.role === 'STUDENT'" class="flex items-center justify-between">
              <div>
                <div class="font-medium">停止对家长共享</div>
                <div class="text-sm text-gray-500">家长将无法查看该用户的任何数据</div>
              </div>
              <n-switch v-model:value="privacyForm.hideFromParents" @update:value="savePrivacy" />
            </div>
          </div>
        </n-tab-pane>

        <!-- 安全设置 -->
        <n-tab-pane name="security" tab="安全设置">
          <div class="space-y-6">
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-medium">两步验证 (2FA)</h3>
                <n-tag :type="securityForm.twoFactorEnabled ? 'success' : 'default'" size="small">
                  {{ securityForm.twoFactorEnabled ? '已启用' : '未启用' }}
                </n-tag>
              </div>
              <p v-if="securityForm.twoFactorEnabledAt" class="text-sm text-gray-500">
                启用时间：{{ formatDateTime(securityForm.twoFactorEnabledAt) }}
              </p>
              <div class="flex gap-2 mt-3">
                <n-button v-if="securityForm.twoFactorEnabled" type="warning" ghost :loading="clearing2FA" @click="confirmClear2FA">
                  清空两步验证
                </n-button>
              </div>
            </div>

            <div class="card">
              <h3 class="font-medium mb-4">重置登录密码</h3>
              <n-form :model="passwordForm" label-placement="left" label-width="100">
                <n-form-item label="新密码">
                  <n-input v-model:value="passwordForm.newPassword" type="password" placeholder="至少6位" show-password-on="click" />
                </n-form-item>
                <n-form-item label="确认密码">
                  <n-input v-model:value="passwordForm.confirmPassword" type="password" placeholder="再次输入" show-password-on="click" />
                </n-form-item>
                <n-alert v-if="passwordError" type="error" :title="passwordError" class="mb-3" />
                <n-form-item>
                  <n-button type="primary" :loading="resettingPassword" @click="confirmResetPassword">重置密码</n-button>
                </n-form-item>
              </n-form>
            </div>

            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-medium">好友设置</h3>
              </div>
              <n-form label-placement="left" label-width="120">
                <n-form-item label="自动接受好友">
                  <n-switch v-model:value="securityForm.autoAcceptFriend" @update:value="saveSecurity" />
                </n-form-item>
                <n-form-item label="好友请求消息">
                  <n-input v-model:value="securityForm.friendRequestMessage" placeholder="发送好友请求时的默认消息" maxlength="50" show-count />
                </n-form-item>
                <n-form-item>
                  <n-button type="primary" :loading="savingSecurity" @click="saveSecurity">保存好友设置</n-button>
                </n-form-item>
              </n-form>
            </div>
          </div>
        </n-tab-pane>

        <!-- 学校班级 -->
        <n-tab-pane v-if="loadedUser.role === 'STUDENT'" name="school" tab="学校班级">
          <div class="card">
            <div v-if="schoolInfo" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <span class="text-gray-500">学校：</span>
                  <span class="font-medium">{{ schoolInfo.schoolName || '未分配' }}</span>
                </div>
                <div>
                  <span class="text-gray-500">班级：</span>
                  <span class="font-medium">{{ schoolInfo.className || '未分配' }}</span>
                </div>
              </div>
              <n-alert v-if="!schoolInfo.schoolName" type="info">
                该用户尚未分配学校班级，请在用户列表中操作分配。
              </n-alert>
            </div>
            <div v-else class="text-gray-400 text-center py-8">暂无学校班级信息</div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </template>

    <div v-else-if="!loadingSettings" class="text-center text-gray-400 py-16">
      <p class="text-lg">请先选择用户并加载设置</p>
    </div>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { adminAPI } from '@/api'
import { format } from 'date-fns'

const message = useMessage()

const selectedUserId = ref(null)
const loadingUserSearch = ref(false)
const userSelectOptions = ref([])
const loadedUser = ref(null)
const loadingSettings = ref(false)

const basicForm = ref({ nickname: '', grade: '', bio: '', interests: [] })
const privacyForm = ref({ profilePublic: true, showStats: true, hideFromParents: false })
const securityForm = ref({ twoFactorEnabled: false, twoFactorEnabledAt: null, autoAcceptFriend: false, friendRequestMessage: '' })
const schoolInfo = ref(null)

const savingBasic = ref(false)
const savingSecurity = ref(false)
const clearing2FA = ref(false)
const resettingPassword = ref(false)
const passwordForm = ref({ newPassword: '', confirmPassword: '' })
const passwordError = ref('')

const getStatusTag = (status) => {
  const config = { PENDING: { type: 'warning', text: '待审核' }, ACTIVE: { type: 'success', text: '已激活' }, DISABLED: { type: 'error', text: '已禁用' } }
  return config[status] || { type: 'default', text: status }
}

const getRoleTag = (role) => {
  const config = { STUDENT: { type: 'info', text: '学生' }, PARENT: { type: 'default', text: '家长' }, TEACHER: { type: 'success', text: '老师' }, ADMIN: { type: 'error', text: '管理员' } }
  return config[role] || { type: 'default', text: role }
}

const formatDateTime = (d) => d ? format(new Date(d), 'yyyy-MM-dd HH:mm') : ''

const handleUserSearch = async (keyword) => {
  if (!keyword || keyword.length < 1) {
    userSelectOptions.value = []
    return
  }
  loadingUserSearch.value = true
  try {
    const data = await adminAPI.getUsers({ keyword, limit: 20 })
    userSelectOptions.value = data.users.map(u => ({
      label: `${u.profile?.nickname || u.username} (${u.email})`,
      value: u.id,
      user: u,
    }))
  } catch (error) { console.error('搜索用户失败:', error) }
  finally { loadingUserSearch.value = false }
}

const handleUserSelect = (id) => {
  const opt = userSelectOptions.value.find(o => o.value === id)
  if (opt) loadedUser.value = opt.user
}

const loadSettings = async () => {
  if (!selectedUserId.value) return
  loadingSettings.value = true
  try {
    const result = await adminAPI.getUserSettings(selectedUserId.value)
    const settings = result.data
    if (settings.basic) basicForm.value = { ...settings.basic }
    if (settings.privacy) privacyForm.value = { ...settings.privacy }
    if (settings.security) securityForm.value = { ...settings.security }
    if (settings.school) schoolInfo.value = settings.school
    else schoolInfo.value = null
  } catch (error) { message.error(error.error || '加载设置失败') }
  finally { loadingSettings.value = false }
}

const saveBasic = async () => {
  savingBasic.value = true
  try {
    await adminAPI.updateUserSettings(selectedUserId.value, { basic: basicForm.value })
    message.success('基本资料已更新')
  } catch (error) { message.error(error.error || '保存失败') }
  finally { savingBasic.value = false }
}

const savePrivacy = async () => {
  try {
    await adminAPI.updateUserSettings(selectedUserId.value, { privacy: privacyForm.value })
    message.success('隐私设置已更新')
  } catch (error) { message.error(error.error || '更新失败') }
}

const saveSecurity = async () => {
  savingSecurity.value = true
  try {
    await adminAPI.updateUserSettings(selectedUserId.value, {
      security: { autoAcceptFriend: securityForm.value.autoAcceptFriend, friendRequestMessage: securityForm.value.friendRequestMessage },
    })
    message.success('好友设置已更新')
  } catch (error) { message.error(error.error || '更新失败') }
  finally { savingSecurity.value = false }
}

const confirmClear2FA = async () => {
  clearing2FA.value = true
  try {
    await adminAPI.clearUser2FA(selectedUserId.value)
    message.success('两步验证已清空')
    securityForm.value.twoFactorEnabled = false
    securityForm.value.twoFactorEnabledAt = null
  } catch (error) { message.error(error.error || '清空失败') }
  finally { clearing2FA.value = false }
}

const confirmResetPassword = async () => {
  passwordError.value = ''
  if (!passwordForm.value.newPassword) { passwordError.value = '请输入新密码'; return }
  if (passwordForm.value.newPassword.length < 6) { passwordError.value = '密码至少6位'; return }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) { passwordError.value = '两次密码不一致'; return }
  resettingPassword.value = true
  try {
    await adminAPI.resetUserPassword(selectedUserId.value, { newPassword: passwordForm.value.newPassword })
    message.success('密码已重置')
    passwordForm.value = { newPassword: '', confirmPassword: '' }
  } catch (error) { passwordError.value = error.error || '重置失败' }
  finally { resettingPassword.value = false }
}

onMounted(() => {
  adminAPI.getUsers({ limit: 20 }).then(data => {
    userSelectOptions.value = data.users.map(u => ({
      label: `${u.profile?.nickname || u.username} (${u.email})`,
      value: u.id,
      user: u,
    }))
  }).catch(() => {})
})
</script>
