<template>
  <div class="space-y-6">
    <!-- 用户信息头部 -->
    <div class="card">
      <div class="flex items-center space-x-4">
        <div class="relative flex-shrink-0">
          <n-avatar :src="user?.avatar" :size="80" round>
            {{ user?.profile?.nickname?.[0] || user?.username?.[0] }}
          </n-avatar>
          <n-button circle size="small" type="primary"
            class="absolute bottom-0 right-0"
            @click="showAvatarModal = true">
            <template #icon><n-icon><CameraOutline /></n-icon></template>
          </n-button>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-gray-800 truncate">
            {{ user?.profile?.nickname || user?.username }}
          </h2>
          <p class="text-gray-500 truncate">{{ user?.email }}</p>
          <n-tag :type="roleTagType" size="small" class="mt-1">{{ roleLabel }}</n-tag>
        </div>
        <!-- 移动端退出登录按钮 -->
        <div class="md:hidden flex-shrink-0">
          <n-button
            type="error"
            secondary
            round
            @click="handleLogout"
          >
            <template #icon>
              <n-icon size="18"><LogOutOutline /></n-icon>
            </template>
            退出登录
          </n-button>
        </div>
        <!-- PC端显示统计数据 -->
        <div class="hidden md:grid grid-cols-3 gap-4 text-center flex-shrink-0">
          <div>
            <div class="text-2xl font-bold text-primary-500">{{ user?.profile?.joinedDays || 0 }}</div>
            <div class="text-xs text-gray-500">加入天数</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-500">{{ user?.checkInStats?.totalCheckInDays || 0 }}</div>
            <div class="text-xs text-gray-500">打卡天数</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-orange-500">{{ user?.checkInStats?.consecutiveDays || 0 }}</div>
            <div class="text-xs text-gray-500">连续打卡</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页 -->
    <n-tabs type="line" animated>
      <!-- 基本信息 -->
      <n-tab-pane name="profile" tab="基本信息">
        <div class="card">
          <n-form :model="profileForm" label-placement="left" label-width="100">
            <n-form-item label="加入时间">
              <n-input :value="formatJoinedDate" readonly disabled />
            </n-form-item>
            <n-form-item label="昵称">
              <n-input v-model:value="profileForm.nickname" placeholder="请输入昵称" />
            </n-form-item>
            
            <n-form-item label="个人简介">
              <n-input v-model:value="profileForm.bio" type="textarea" placeholder="介绍一下自己吧" :rows="3" />
            </n-form-item>
            <n-form-item label="兴趣爱好">
              <n-dynamic-tags v-model:value="profileForm.interests" />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" :loading="saving" @click="saveProfile">保存修改</n-button>
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
              <div class="text-sm text-gray-500">允许他人查看你的个人资料</div>
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
          <div class="mt-4 p-4 bg-blue-50 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">账户活动情况检查</div>
                <div class="text-sm text-gray-500">查看账户登录过的设备和活动日志</div>
              </div>
              <n-button type="primary" @click="openLoginActivityModal">
                查看详情
              </n-button>
            </div>
          </div>
          <div class="mt-4 p-4 bg-purple-50 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">操作日志</div>
                <div class="text-sm text-gray-500">查看提交、修改、删除等操作记录</div>
              </div>
              <n-button type="primary" @click="openActivityLogModal">
                查看详情
              </n-button>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- 学校信息 -->
      <n-tab-pane v-if="user?.role === 'STUDENT'" name="school" tab="学校信息">
        <div class="space-y-6">
          <div class="card">
            <h3 class="font-medium mb-4">当前学校班级信息</h3>
            <div v-if="!schoolName && !className" class="text-gray-400 text-sm mb-6">
              尚未设置学校班级信息
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span class="text-gray-500">学校：</span>
                <span class="font-medium">{{ schoolName || '未分配' }}</span>
              </div>
              <div>
                <span class="text-gray-500">班级：</span>
                <span class="font-medium">{{ className || '未分配' }}</span>
              </div>
              <div>
                <span class="text-gray-500">年级：</span>
                <span class="font-medium">{{ user?.class?.grade || profileForm.grade || '未设置' }}</span>
              </div>
              <div v-if="user?.schoolClassUpdatedAt">
                <span class="text-gray-500">上次修改：</span>
                <span class="font-medium">{{ formatDate(user.schoolClassUpdatedAt) }}</span>
              </div>
            </div>

            <n-alert v-if="!schoolName" type="info" class="mb-4">
              您的学校和班级信息尚未分配，请联系管理员。
            </n-alert>

            <n-divider>修改学校班级</n-divider>
            <p class="text-sm text-gray-500 mb-4">
              学校班级信息每月只能修改一次，请谨慎选择。
            </p>
            <n-alert v-if="schoolClassRemainingDays > 0" type="warning" class="mb-4">
              还需等待 {{ schoolClassRemainingDays }} 天才能再次修改
            </n-alert>
            <n-form :model="schoolClassForm" label-placement="left" label-width="80" :disabled="schoolClassRemainingDays > 0">
              <n-form-item label="选择学校">
                <n-select
                  v-model:value="schoolClassForm.schoolId"
                  :options="schoolClassOptions.schools"
                  placeholder="选择学校"
                  clearable
                  @update:value="handleSchoolClassSchoolChange"
                />
              </n-form-item>
              <n-form-item label="选择班级">
                <n-select
                  v-model:value="schoolClassForm.classId"
                  :options="schoolClassOptions.classes"
                  placeholder="选择班级"
                  clearable
                  :disabled="!schoolClassForm.schoolId"
                />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" :loading="savingSchoolClass" :disabled="!schoolClassForm.classId || schoolClassRemainingDays > 0" @click="saveSchoolClass">
                  确认修改
                </n-button>
              </n-form-item>
            </n-form>
          </div>
        </div>
      </n-tab-pane>

      <!-- 安全设置 -->
      <n-tab-pane name="security" tab="安全设置">
        <div class="space-y-6">
          <!-- 修改登录密码 -->
          <div class="card">
            <h3 class="font-medium mb-4">修改登录密码</h3>
            <n-form :model="passwordForm" label-placement="left" label-width="80">
              <n-form-item label="旧密码">
                <n-input v-model:value="passwordForm.oldPassword" type="password" show-password-on="click" placeholder="请输入旧密码" />
              </n-form-item>
              <n-form-item label="新密码">
                <n-input v-model:value="passwordForm.newPassword" type="password" show-password-on="click" placeholder="请输入新密码" />
              </n-form-item>
              <n-form-item label="确认密码">
                <n-input v-model:value="passwordForm.confirmPassword" type="password" show-password-on="click" placeholder="请再次输入新密码" />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" :loading="changingPassword" @click="changePassword">修改密码</n-button>
              </n-form-item>
            </n-form>
          </div>

          <!-- 支付密码设置 -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium">支付密码</h3>
              <n-tag :type="paymentPasswordSet ? 'success' : 'warning'" size="small">
                {{ paymentPasswordSet ? '已设置' : '未设置（默认123456）' }}
              </n-tag>
            </div>
            <p class="text-sm text-gray-500 mb-4">支付密码用于学习币消费时的安全验证</p>
            <n-form :model="paymentPasswordForm" label-placement="left" label-width="100">
              <n-form-item label="原支付密码">
                <n-input
                  v-model:value="paymentPasswordForm.oldPassword"
                  type="password"
                  show-password-on="click"
                  :placeholder="paymentPasswordSet ? '请输入原支付密码' : '默认密码为 123456'"
                />
              </n-form-item>
              <n-form-item label="新支付密码">
                <n-input v-model:value="paymentPasswordForm.newPassword" type="password" show-password-on="click" placeholder="请输入新支付密码（至少6位）" />
              </n-form-item>
              <n-form-item label="确认密码">
                <n-input v-model:value="paymentPasswordForm.confirmPassword" type="password" show-password-on="click" placeholder="请再次输入新支付密码" />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" :loading="changingPaymentPassword" @click="resetPaymentPassword">
                  {{ paymentPasswordSet ? '修改支付密码' : '设置支付密码' }}
                </n-button>
              </n-form-item>
            </n-form>
          </div>

          <!-- 家长共享设置（仅学生角色可见） -->
          <div v-if="user?.role === 'STUDENT'" class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium">家长共享设置</h3>
              <n-tag :type="privacyForm.hideFromParents ? 'error' : 'success'" size="small">
                {{ privacyForm.hideFromParents ? '已停止共享' : '共享中' }}
              </n-tag>
            </div>
            <p class="text-sm text-gray-500 mb-4">
              关闭共享后，绑定的家长将无法查看你的学习数据、作品和活动记录。同学之间的互动不受影响。
            </p>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div class="font-medium">停止对家长共享</div>
                <div class="text-sm text-gray-500">家长将无法查看你的任何数据</div>
              </div>
              <n-switch
                v-model:value="privacyForm.hideFromParents"
                @update:value="saveParentPrivacy"
              />
            </div>
          </div>

          <!-- 两步验证 (2FA) 设置 -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium">两步验证 (2FA)</h3>
              <n-tag :type="twoFactorEnabled ? 'success' : 'default'" size="small">
                {{ twoFactorEnabled ? '已启用' : '未启用' }}
              </n-tag>
            </div>
            <p class="text-sm text-gray-500 mb-4">
              两步验证为您的账户增加额外的安全保护层。启用后，登录时除密码外还需输入身份验证器生成的验证码。
            </p>

            <template v-if="twoFactorEnabled">
              <div class="p-3 bg-green-50 text-green-700 rounded-lg mb-4 text-sm">
                <div class="flex items-center gap-2">
                  <n-icon :component="ShieldCheckmarkOutline" />
                  <span>两步验证已启用，您的账户更安全了</span>
                </div>
                <div v-if="twoFactorEnabledAt" class="mt-1 text-xs text-green-600">
                  启用时间：{{ formatDate(twoFactorEnabledAt) }}
                </div>
              </div>
              <div class="flex gap-2">
                <n-button @click="showRegenerateBackupModal = true">
                  重新生成恢复码
                </n-button>
                <n-button type="error" ghost @click="showDisable2FAModal = true">
                  关闭两步验证
                </n-button>
              </div>
            </template>
            <template v-else>
              <n-button type="primary" @click="startSetup2FA">
                启用两步验证
              </n-button>
            </template>
          </div>

          <!-- 删除账户 -->
        <div class="card">
          <h3 class="font-medium text-red-600 mb-4">危险操作</h3>
          <p class="text-sm text-gray-500 mb-4">
            删除账户将永久移除您的所有数据，包括日记、作品、积分等。此操作不可撤销。
          </p>
          <n-button type="error" ghost @click="showDeleteAccountModal = true">
            删除账户
          </n-button>
        </div>
      </div>
    </n-tab-pane>

    <!-- 邀请（学生角色显示） -->
      <n-tab-pane v-if="user?.role === 'STUDENT'" name="invite" tab="邀请">
        <div class="space-y-6">
          <!-- 生成邀请码 -->
          <div class="card">
            <h3 class="font-medium mb-4">生成邀请码</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 邀请家长 -->
              <div class="p-4 bg-blue-50 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-blue-700">邀请家长</h4>
                  <n-tag :type="parentInviteRemaining > 0 ? 'success' : 'error'" size="small">
                    剩余 {{ parentInviteRemaining }}/3 次
                  </n-tag>
                </div>
                <p class="text-sm text-gray-600 mb-3">每人最多邀请3位家长注册</p>
                <n-button
                  type="primary"
                  :disabled="parentInviteRemaining <= 0"
                  :loading="generatingParent"
                  @click="generateParentCode"
                  block
                >
                  生成家长邀请码
                </n-button>
                <div v-if="lastParentCode" class="mt-3 p-2 bg-white rounded border border-blue-200">
                  <div class="text-xs text-gray-500 mb-1">最新邀请码</div>
                  <div class="flex items-center gap-2">
                    <code class="text-sm font-mono font-bold text-blue-700">{{ lastParentCode }}</code>
                    <n-button text size="small" type="primary" @click="copyCode(lastParentCode)">
                      复制
                    </n-button>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">有效期24小时，仅可使用1次</div>
                </div>
              </div>

              <!-- 邀请同学 -->
              <div class="p-4 bg-green-50 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-green-700">邀请同学</h4>
                  <n-tag type="info" size="small">不限次数</n-tag>
                </div>
                <p class="text-sm text-gray-600 mb-3">邀请同学一起学习进步</p>
                <n-button
                  type="success"
                  :loading="generatingClassmate"
                  @click="generateClassmateCode"
                  block
                >
                  生成同学邀请码
                </n-button>
                <div v-if="lastClassmateCode" class="mt-3 p-2 bg-white rounded border border-green-200">
                  <div class="text-xs text-gray-500 mb-1">最新邀请码</div>
                  <div class="flex items-center gap-2">
                    <code class="text-sm font-mono font-bold text-green-700">{{ lastClassmateCode }}</code>
                    <n-button text size="small" type="success" @click="copyCode(lastClassmateCode)">
                      复制
                    </n-button>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">有效期24小时，仅可使用1次</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 邀请记录 -->
          <div class="card">
            <h3 class="font-medium mb-4">邀请记录</h3>
            <div v-if="inviteRecords.length === 0" class="text-gray-400 text-sm text-center py-8">
              暂无邀请记录
            </div>
            <div v-else class="space-y-3">
              <div v-for="record in inviteRecords" :key="record.id" class="p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <n-tag :type="record.inviteType === 'PARENT' ? 'warning' : 'info'" size="small">
                      {{ record.inviteType === 'PARENT' ? '家长' : '同学' }}
                    </n-tag>
                    <code class="text-sm font-mono">{{ record.code }}</code>
                  </div>
                  <n-tag :type="getInviteStatusType(record)" size="small">
                    {{ getInviteStatusText(record) }}
                  </n-tag>
                </div>
                <div class="text-xs text-gray-500">
                  生成时间：{{ formatDate(record.createdAt) }}
                  <span v-if="record.users && record.users.length > 0" class="ml-2">
                    | 使用者：{{ record.users[0].profile?.nickname || record.users[0].username }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- 系统设置 -->
      <n-tab-pane name="system" tab="系统设置">
        <div class="space-y-6">
          <!-- 版本信息 -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-bold text-gray-800">苹湖少儿空间</h3>
                <p class="text-sm text-gray-500 mt-1">Children Growth Platform</p>
              </div>
              <div class="text-right">
                <n-tag type="primary" size="large">v{{ currentVersion }}</n-tag>
                <p class="text-xs text-gray-400 mt-1">{{ buildDate }}</p>
              </div>
            </div>

            <n-divider />

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">前端框架：</span>
                <span class="font-medium">Vue 3 + Vite</span>
              </div>
              <div>
                <span class="text-gray-500">UI组件：</span>
                <span class="font-medium">Naive UI</span>
              </div>
              <div>
                <span class="text-gray-500">后端框架：</span>
                <span class="font-medium">Node.js + Express</span>
              </div>
              <div>
                <span class="text-gray-500">数据库：</span>
                <span class="font-medium">PostgreSQL</span>
              </div>
            </div>
          </div>

          <!-- 主题切换 -->
          <div class="card">
            <h3 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
              <n-icon size="20"><ColorPaletteOutline /></n-icon>
              <span>主题设置</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                v-for="theme in themeStore.availableThemes"
                :key="theme.key"
                class="theme-card"
                :class="{ 'active': themeStore.currentTheme === theme.key }"
                @click="themeStore.setTheme(theme.key)"
              >
                <div class="theme-preview" :class="`theme-preview-${theme.key}`"></div>
                <div class="theme-info">
                  <div class="font-medium text-gray-800">{{ theme.name }}</div>
                  <div class="text-xs text-gray-500">{{ theme.description }}</div>
                </div>
                <n-icon v-if="themeStore.currentTheme === theme.key" class="theme-check" size="18" color="#10b981">
                  <CheckmarkCircleOutline />
                </n-icon>
              </div>
            </div>
          </div>

          <!-- 关于 -->
          <div class="card">
            <h3 class="font-medium text-gray-800 mb-3">关于我们</h3>
            <p class="text-sm text-gray-600 leading-relaxed">
              苹湖少儿空间是一个面向青少年的综合性学习成长平台。我们致力于为孩子们提供一个安全、有趣、富有创造力的学习环境，
              帮助他们在编程、艺术、社交等多个领域全面发展。
            </p>
            <div class="mt-4 flex flex-wrap gap-3">
              <n-button type="primary" @click="router.push('/about')">
                <template #icon><n-icon><InformationCircleOutline /></n-icon></template>
                了解更多
              </n-button>
              <n-button text type="primary">使用帮助</n-button>
              <n-button text type="primary">隐私政策</n-button>
              <n-button text type="primary">用户协议</n-button>
            </div>
          </div>

          <!-- 更新日志（折叠） -->
          <div class="card">
            <n-collapse>
              <n-collapse-item name="changelog">
                <template #header>
                  <div class="flex items-center gap-2">
                    <n-icon size="20"><DocumentTextOutline /></n-icon>
                    <span class="font-medium text-gray-800">更新日志</span>
                    <n-tag size="small" type="info">v{{ currentVersion }}</n-tag>
                  </div>
                </template>
                <n-timeline>
                  <n-timeline-item
                    v-for="log in changelog"
                    :key="log.version"
                    :type="log.version === currentVersion ? 'success' : 'default'"
                    :title="`v${log.version}`"
                    :time="log.date"
                  >
                    <template #icon>
                      <n-icon v-if="log.version === currentVersion" size="18"><CheckmarkCircleOutline /></n-icon>
                    </template>

                    <div class="space-y-3 text-sm">
                      <!-- 新增功能 -->
                      <div v-if="log.changes.added" class="space-y-1">
                        <div class="font-medium text-green-600">新增功能</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.added" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <!-- 修复 -->
                      <div v-if="log.changes.fixed" class="space-y-1">
                        <div class="font-medium text-orange-600">问题修复</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.fixed" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <!-- 改进 -->
                      <div v-if="log.changes.improved" class="space-y-1">
                        <div class="font-medium text-blue-600">功能改进</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.improved" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <!-- 后端 -->
                      <div v-if="log.changes.backend" class="space-y-1">
                        <div class="font-medium text-purple-600">后端更新</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.backend" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <!-- 前端 -->
                      <div v-if="log.changes.frontend" class="space-y-1">
                        <div class="font-medium text-cyan-600">前端更新</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.frontend" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <!-- 数据库 -->
                      <div v-if="log.changes.database" class="space-y-1">
                        <div class="font-medium text-indigo-600">数据库</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.database" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <!-- 技术栈 -->
                      <div v-if="log.changes.tech" class="space-y-1">
                        <div class="font-medium text-gray-700">技术栈</div>
                        <ul class="list-none space-y-1 pl-0">
                          <li v-for="(item, idx) in log.changes.tech" :key="idx" class="text-gray-600 leading-relaxed">
                            {{ item }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </n-timeline-item>
                </n-timeline>
              </n-collapse-item>
            </n-collapse>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- 头像选择模态框 -->
    <n-modal v-model:show="showAvatarModal">
      <n-card style="width: 600px" title="更换头像" :bordered="false">
        <n-tabs type="line">
          <!-- 预设表情包 -->
          <n-tab-pane name="emoji" tab="预设表情包">
            <div class="grid grid-cols-4 gap-4">
              <div v-for="(emoji, index) in presetEmojis" :key="index"
                class="cursor-pointer hover:opacity-80 transition-opacity"
                @click="selectPresetEmoji(emoji)">
                <AvatarText :username="authStore.user?.username" size="md" />
              </div>
            </div>
          </n-tab-pane>
          <!-- 上传图片 -->
          <n-tab-pane name="upload" tab="上传图片">
            <div class="space-y-4">
              <n-upload
                :max="1"
                accept="image/*"
                :show-file-list="false"
                @change="handleFileSelect">
                <n-button>选择图片</n-button>
              </n-upload>
              <div v-if="cropperImage" class="mt-4">
                <div class="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <img :src="cropperImage" ref="cropperImageRef" alt="Preview" class="w-full h-full object-contain" />
                </div>
                <div class="mt-4 flex justify-end gap-2">
                  <n-button @click="cancelCrop">取消</n-button>
                  <n-button type="primary" :loading="uploading" @click="uploadCroppedImage">上传</n-button>
                </div>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </n-modal>

    <!-- 2FA 启用模态框 -->
    <n-modal v-model:show="showSetup2FAModal" :mask-closable="false">
      <n-card style="width: 500px" title="启用两步验证" :bordered="false" closable @close="showSetup2FAModal = false">
        <!-- 步骤 1: 扫描二维码 -->
        <template v-if="setup2FAStep === 1">
          <div class="text-center space-y-4">
            <p class="text-gray-600">
              使用身份验证器应用（如 iOS 密码、Google Authenticator）扫描下方二维码
            </p>
            <div v-if="qrCodeDataURL" class="flex justify-center">
              <img :src="qrCodeDataURL" alt="2FA QR Code" class="w-48 h-48" />
            </div>
            <div v-else class="flex justify-center py-8">
              <n-spin size="large" />
            </div>
            <n-collapse>
              <n-collapse-item title="无法扫描二维码？手动输入" name="manual">
                <div class="text-left space-y-2 text-sm">
                  <div><span class="text-gray-500">应用名称：</span>{{ manualEntry.issuer }}</div>
                  <div><span class="text-gray-500">账户：</span>{{ manualEntry.account }}</div>
                  <div class="flex items-center gap-2">
                    <span class="text-gray-500">密钥：</span>
                    <code class="bg-gray-100 px-2 py-1 rounded text-xs break-all">{{ manualEntry.secret }}</code>
                    <n-button size="tiny" @click="copySecret">复制</n-button>
                  </div>
                </div>
              </n-collapse-item>
            </n-collapse>
            <n-button type="primary" block @click="setup2FAStep = 2">
              下一步：验证
            </n-button>
          </div>
        </template>

        <!-- 步骤 2: 输入验证码 -->
        <template v-if="setup2FAStep === 2">
          <div class="space-y-4">
            <p class="text-gray-600 text-center">
              请输入身份验证器显示的 6 位验证码
            </p>
            <n-input
              v-model:value="setup2FACode"
              placeholder="000000"
              size="large"
              maxlength="6"
              :input-props="{ inputmode: 'numeric', style: 'text-align: center; letter-spacing: 8px; font-size: 24px;' }"
            />
            <div class="flex gap-2">
              <n-button block @click="setup2FAStep = 1">返回</n-button>
              <n-button type="primary" block :loading="verifying2FA" @click="verifySetup2FA">
                验证并启用
              </n-button>
            </div>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 恢复码显示模态框 -->
    <n-modal v-model:show="showBackupCodesModal" :mask-closable="false">
      <n-card style="width: 500px" title="保存您的恢复码" :bordered="false">
        <div class="space-y-4">
          <n-alert type="warning" :show-icon="true">
            请妥善保存这些恢复码！它们只会显示一次。如果您丢失了手机或无法使用身份验证器，可以使用恢复码登录。
          </n-alert>
          <div class="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
            <div v-for="(code, index) in backupCodes" :key="index" class="py-1">
              {{ code }}
            </div>
          </div>
          <div class="flex gap-3">
            <n-button class="flex-1" @click="copyBackupCodes">
              复制恢复码
            </n-button>
            <n-button type="primary" class="flex-1" @click="confirmBackupCodesSaved">
              我已保存
            </n-button>
          </div>
        </div>
      </n-card>
    </n-modal>

    <!-- 关闭 2FA 模态框 -->
    <n-modal v-model:show="showDisable2FAModal">
      <n-card style="width: 400px" title="关闭两步验证" :bordered="false" closable @close="showDisable2FAModal = false">
        <div class="space-y-4">
          <n-alert type="warning">
            关闭两步验证会降低您账户的安全性
          </n-alert>
          <n-form-item label="登录密码">
            <n-input
              v-model:value="disable2FAForm.password"
              type="password"
              show-password-on="click"
              placeholder="请输入您的登录密码"
            />
          </n-form-item>
          <n-form-item label="验证码">
            <n-input
              v-model:value="disable2FAForm.code"
              placeholder="请输入 6 位验证码"
              maxlength="6"
              :input-props="{ inputmode: 'numeric' }"
            />
          </n-form-item>
          <n-button type="error" block :loading="disabling2FA" @click="disable2FA">
            确认关闭
          </n-button>
        </div>
      </n-card>
    </n-modal>

    <!-- 重新生成恢复码模态框 -->
    <n-modal v-model:show="showRegenerateBackupModal">
      <n-card style="width: 400px" title="重新生成恢复码" :bordered="false" closable @close="showRegenerateBackupModal = false">
        <div class="space-y-4">
          <n-alert type="info">
            重新生成恢复码后，之前的恢复码将全部失效
          </n-alert>
          <n-form-item label="验证码">
            <n-input
              v-model:value="regenerateCode"
              placeholder="请输入 6 位验证码"
              maxlength="6"
              :input-props="{ inputmode: 'numeric' }"
            />
          </n-form-item>
          <n-button type="primary" block :loading="regenerating" @click="regenerateBackupCodes">
            确认重新生成
          </n-button>
        </div>
      </n-card>
    </n-modal>

    <!-- 删除账户模态框 -->
    <n-modal v-model:show="showDeleteAccountModal">
      <n-card style="width: 400px" title="删除账户" :bordered="false" closable @close="showDeleteAccountModal = false">
        <div class="space-y-4">
          <n-alert type="error">
            此操作不可撤销！您的所有数据将被永久删除。
          </n-alert>
          <p class="text-sm text-gray-600">
            删除账户将移除以下数据：
          </p>
          <ul class="text-sm text-gray-500 list-disc pl-5 space-y-1">
            <li>个人资料和设置</li>
            <li>所有日记和作品</li>
            <li>积分和学习记录</li>
            <li>聊天消息和评论</li>
          </ul>
          <n-form-item label="请输入密码确认">
            <n-input
              v-model:value="deleteAccountPassword"
              type="password"
              show-password-on="click"
              placeholder="请输入您的登录密码"
            />
          </n-form-item>
          <n-button type="error" block :loading="deletingAccount" @click="confirmDeleteAccount">
            确认删除账户
          </n-button>
        </div>
      </n-card>
    </n-modal>

    <!-- 登录活动详情模态框 -->
    <n-modal v-model:show="showLoginActivityModal" :mask-closable="false">
      <n-card style="width: 800px; max-height: 80vh;" title="账户活动情况" :bordered="false" closable @close="showLoginActivityModal = false">
        <template #header-extra>
          <n-tag :type="loginActivityStats.suspiciousActivities?.length > 0 ? 'warning' : 'success'" size="small">
            {{ loginActivityStats.suspiciousActivities?.length > 0 ? '有可疑活动' : '活动正常' }}
          </n-tag>
        </template>
        <div class="space-y-4">
          <!-- 统计概览 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-primary-500">{{ loginActivitiesTotal }}</div>
              <div class="text-xs text-gray-500">总登录次数</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-green-500">{{ loginActivityStats.deviceStats?.length || 0 }}</div>
              <div class="text-xs text-gray-500">使用设备数</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-500">{{ loginActivityStats.locationStats?.length || 0 }}</div>
              <div class="text-xs text-gray-500">登录地点数</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-orange-500">{{ loginActivityStats.suspiciousActivities?.length || 0 }}</div>
              <div class="text-xs text-gray-500">可疑活动</div>
            </div>
          </div>

          <!-- 可疑活动警告 -->
          <n-alert v-if="loginActivityStats.suspiciousActivities?.length > 0" type="warning" :show-icon="true">
            检测到 {{ loginActivityStats.suspiciousActivities.length }} 条可疑活动，可能是账户被盗用。建议检查以下登录记录。
          </n-alert>

          <!-- 筛选 -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">筛选：</span>
            <n-radio-group v-model:value="loginActivityFilter" @update:value="handleActivityFilterChange">
              <n-radio-button value="all">全部</n-radio-button>
              <n-radio-button value="success">成功登录</n-radio-button>
              <n-radio-button value="failed">登录失败</n-radio-button>
            </n-radio-group>
          </div>

          <!-- 活动列表 -->
          <div v-if="loginActivitiesLoading" class="text-center py-8">
            <n-spin size="large" />
          </div>
          <div v-else-if="loginActivities.length === 0" class="text-center py-8 text-gray-400">
            暂无活动记录
          </div>
          <div v-else class="space-y-3 max-h-96 overflow-y-auto pr-2">
            <div
              v-for="activity in loginActivities"
              :key="activity.id"
              class="p-3 rounded-lg border"
              :class="activity.isSuccess ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <n-icon
                    :component="activity.isSuccess ? 'CheckmarkCircle' : 'CloseCircle'"
                    :class="activity.isSuccess ? 'text-green-500' : 'text-red-500'"
                    size="24"
                  />
                  <div>
                    <div class="font-medium flex items-center gap-2">
                      {{ activity.isSuccess ? '登录成功' : '登录失败' }}
                      <n-tag v-if="activity.loginType === 'two_factor'" type="success" size="tiny">两步验证</n-tag>
                      <n-tag v-if="isSuspiciousActivity(activity)" type="warning" size="tiny">可疑</n-tag>
                    </div>
                    <div class="text-sm text-gray-500 mt-1">
                      {{ activity.deviceName || 'Unknown' }} · {{ activity.browser || 'Unknown' }} on {{ activity.os || 'Unknown' }}
                    </div>
                    <div class="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{{ activity.city || 'Unknown' }}</span>
                      <span v-if="activity.ipAddress">· IP: {{ activity.ipAddress }}</span>
                    </div>
                  </div>
                </div>
                <div class="text-xs text-gray-400">{{ formatLoginTime(activity.createdAt) }}</div>
              </div>
              <div v-if="!activity.isSuccess && activity.failReason" class="mt-2 text-xs text-red-500">
                失败原因：{{ getFailReasonText(activity.failReason) }}
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="loginActivitiesTotal > loginActivitiesPageSize" class="flex justify-center">
            <n-pagination
              v-model:page="loginActivitiesPage"
              :page-count="Math.ceil(loginActivitiesTotal / loginActivitiesPageSize)"
              @update:page="handleActivityPageChange"
            />
          </div>
        </div>
      </n-card>
    </n-modal>

    <!-- 操作日志详情模态框 -->
    <n-modal v-model:show="showActivityLogModal" :mask-closable="false">
      <n-card style="width: 900px; max-height: 80vh;" title="操作日志" :bordered="false" closable @close="showActivityLogModal = false">
        <div class="space-y-4">
          <!-- 统计概览 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-primary-500">{{ activityLogsTotal }}</div>
              <div class="text-xs text-gray-500">总操作次数</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-green-500">{{ activityLogsStats.todayCount }}</div>
              <div class="text-xs text-gray-500">今日操作</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-500">{{ activityLogsStats.actionStats?.length || 0 }}</div>
              <div class="text-xs text-gray-500">操作类型</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg col-span-2">
              <div class="text-xs text-gray-500 mb-2">操作类型分布</div>
              <div class="flex flex-wrap gap-2">
                <n-tag v-for="stat in activityLogsStats.actionStats?.slice(0, 6)" :key="stat.action" size="small" type="info">
                  {{ getActionLabel(stat.action) }}: {{ stat.count }}
                </n-tag>
              </div>
            </div>
          </div>

          <!-- 筛选 -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm text-gray-500">筛选操作：</span>
            <n-select
              v-model:value="activityLogFilter"
              :options="activityFilterOptions"
              placeholder="全部操作"
              clearable
              style="width: 200px"
              @update:value="handleActivityLogFilterChange"
            />
          </div>

          <!-- 操作列表 -->
          <div v-if="activityLogsLoading" class="text-center py-8">
            <n-spin size="large" />
          </div>
          <div v-else-if="activityLogs.length === 0" class="text-center py-8 text-gray-400">
            <n-empty description="暂无操作记录">
              <template #extra>
                <p class="text-sm">系统会记录您的各种操作，如提交作业、修改日记等</p>
              </template>
            </n-empty>
          </div>
          <div v-else class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div
              v-for="log in activityLogs"
              :key="log.id"
              class="p-3 rounded-lg border border-gray-200 bg-white hover:border-primary-300 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <n-icon :component="getActionIcon(log.action)" class="text-primary-500" size="20" />
                  <div>
                    <div class="font-medium">{{ getActionLabel(log.action) }}</div>
                    <div v-if="log.description" class="text-sm text-gray-500 mt-1">{{ log.description }}</div>
                    <div v-if="log.targetType" class="text-xs text-gray-400 mt-1">
                      对象: {{ log.targetType }}{{ log.targetId ? ` (${log.targetId.substring(0, 8)}...)` : '' }}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-gray-400 text-right">
                  <div>{{ formatLoginTime(log.createdAt) }}</div>
                  <div v-if="log.ipAddress" class="text-xs">IP: {{ log.ipAddress }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="activityLogsTotal > activityLogsPageSize" class="flex justify-center">
            <n-pagination
              v-model:page="activityLogsPage"
              :page-count="Math.ceil(activityLogsTotal / activityLogsPageSize)"
              @update:page="handleActivityLogPageChange"
            />
          </div>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { userAPI, twoFactorAPI, authAPI, campusAPI, classAPI } from '@/api';
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import CloseCircle from '@vicons/ionicons5/es/CloseCircle'
import LogOutOutline from '@vicons/ionicons5/es/LogOutOutline'
import ShieldCheckmarkOutline from '@vicons/ionicons5/es/ShieldCheckmarkOutline'
import ColorPaletteOutline from '@vicons/ionicons5/es/ColorPaletteOutline'
import InformationCircleOutline from '@vicons/ionicons5/es/InformationCircleOutline'
import { useRouter } from 'vue-router';
import { VERSION, CHANGELOG } from '@/config/changelog';
import { useThemeStore } from '@/stores/theme';

const message = useMessage();
const themeStore = useThemeStore();
const dialog = useDialog();
const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const saving = ref(false);
const changingPassword = ref(false);
const changingPaymentPassword = ref(false);
const paymentPasswordSet = ref(false);
const uploading = ref(false);
const showAvatarModal = ref(false);
const cropperImage = ref(null);
const cropperImageRef = ref(null);
const selectedFile = ref(null);

const profileForm = ref({ nickname: '', grade: '', bio: '', interests: [] });
const privacyForm = ref({ profilePublic: true, showStats: true, hideFromParents: false });
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });
const paymentPasswordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });

// 2FA 相关状态
const twoFactorEnabled = ref(false);
const twoFactorEnabledAt = ref(null);
const showSetup2FAModal = ref(false);
const showBackupCodesModal = ref(false);
const showDisable2FAModal = ref(false);
const showRegenerateBackupModal = ref(false);
const setup2FAStep = ref(1);
const setup2FACode = ref('');
const qrCodeDataURL = ref('');
const manualEntry = ref({ secret: '', account: '', issuer: '' });
const tempSecret = ref('');
const backupCodes = ref([]);
const verifying2FA = ref(false);
const disabling2FA = ref(false);
const regenerating = ref(false);
const disable2FAForm = ref({ password: '', code: '' });
const regenerateCode = ref('');

// 删除账户相关状态
const showDeleteAccountModal = ref(false);
const deleteAccountPassword = ref('');
const deletingAccount = ref(false);

// 登录活动相关状态
const showLoginActivityModal = ref(false);
const loginActivities = ref([]);
const loginActivitiesTotal = ref(0);
const loginActivitiesPage = ref(1);
const loginActivitiesPageSize = ref(20);
const loginActivitiesLoading = ref(false);
const loginActivityStats = ref({ deviceStats: [], locationStats: [], suspiciousActivities: [] });
const loginActivityFilter = ref('all');

// 操作日志相关状态
const showActivityLogModal = ref(false);
const activityLogs = ref([]);
const activityLogsTotal = ref(0);
const activityLogsPage = ref(1);
const activityLogsPageSize = ref(50);
const activityLogsLoading = ref(false);
const activityLogsStats = ref({ todayCount: 0, actionStats: [] });
const activityLogFilter = ref('all');

// 系统设置相关
const currentVersion = ref(VERSION);
const changelog = ref(CHANGELOG);
const buildDate = computed(() => {
  const today = new Date();
  return today.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
});

// 学校班级相关
const schoolClassForm = ref({ schoolId: null, classId: null });
const schoolClassOptions = ref({ schools: [], classes: [] });
const savingSchoolClass = ref(false);
const schoolClassRemainingDays = ref(0);

// 邀请相关
const generatingParent = ref(false);
const generatingClassmate = ref(false);
const inviteRecords = ref([]);
const parentInviteRemaining = ref(3);
const lastParentCode = ref('');
const lastClassmateCode = ref('');

// 预设表情包 - 使用开源 emoji 图标
const presetEmojis = [
  'https://em-content.zobj.net/source/apple/391/grinning-face_1f600.png',
  'https://em-content.zobj.net/source/apple/391/smiling-face-with-smiling-eyes_1f60a.png',
  'https://em-content.zobj.net/source/apple/391/face-with-tears-of-joy_1f602.png',
  'https://em-content.zobj.net/source/apple/391/smiling-face-with-heart-eyes_1f60d.png',
  'https://em-content.zobj.net/source/apple/391/thinking-face_1f914.png',
  'https://em-content.zobj.net/source/apple/391/nerd-face_1f913.png',
  'https://em-content.zobj.net/source/apple/391/partying-face_1f973.png',
  'https://em-content.zobj.net/source/apple/391/star-struck_1f929.png',
  'https://em-content.zobj.net/source/apple/391/cool_1f60e.png',
  'https://em-content.zobj.net/source/apple/391/winking-face_1f609.png',
  'https://em-content.zobj.net/source/apple/391/relieved-face_1f60c.png',
  'https://em-content.zobj.net/source/apple/391/sleeping-face_1f634.png',
];

const roleLabel = computed(() => {
  const labels = { STUDENT: '学生', PARENT: '家长', TEACHER: '老师', ADMIN: '管理员' };
  return labels[user.value?.role] || '用户';
});

const roleTagType = computed(() => {
  const types = { STUDENT: 'success', PARENT: 'info', TEACHER: 'warning', ADMIN: 'error' };
  return types[user.value?.role] || 'default';
});

// 学校和班级名称
const schoolName = computed(() => {
  return user.value?.class?.school?.name || user.value?.student?.class?.school?.name || user.value?.classInfo?.school?.name || '';
});

const className = computed(() => {
  return user.value?.class?.name || user.value?.student?.class?.name || user.value?.classInfo?.name || '';
});

const formatJoinedDate = computed(() => {
  if (!user.value?.createdAt) return '未知';
  return new Date(user.value.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

const loadUser = async () => {
  try {
    const data = await userAPI.getCurrentUser();
    authStore.setUser(data);
    profileForm.value = {
      nickname: data.profile?.nickname || '',
      grade: data.profile?.grade || '',
      bio: data.profile?.bio || '',
      interests: data.profile?.interests || [],
    };
    privacyForm.value = {
      profilePublic: data.profile?.profilePublic ?? true,
      showStats: data.profile?.showStats ?? true,
      hideFromParents: data.profile?.hideFromParents ?? false,
    };
  } catch (error) {
    message.error('加载用户信息失败');
  }
};

// 选择预设表情包
const selectPresetEmoji = async (emojiUrl) => {
  try {
    uploading.value = true;
    // 下载 emoji 图片并转换为 Blob
    const response = await fetch(emojiUrl);
    const blob = await response.blob();
    const file = new File([blob], 'emoji.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('avatar', file);

    const data = await userAPI.uploadAvatar(formData);
    authStore.setUser({ ...authStore.user, avatar: data.avatar });
    message.success('头像更新成功');
    showAvatarModal.value = false;
  } catch (error) {
    message.error(error.error || '设置失败');
  } finally {
    uploading.value = false;
  }
};

// 处理文件选择
const handleFileSelect = (options) => {
  const { file } = options;
  if (!file.file) return;

  selectedFile.value = file.file;
  const reader = new FileReader();
  reader.onload = (e) => {
    cropperImage.value = e.target.result;
  };
  reader.readAsDataURL(file.file);
};

// 取消裁剪
const cancelCrop = () => {
  cropperImage.value = null;
  selectedFile.value = null;
};

// 上传裁剪后的图片
const uploadCroppedImage = async () => {
  if (!selectedFile.value) return;

  try {
    uploading.value = true;

    // 创建 canvas 来裁剪和压缩图片
    const img = new Image();
    img.src = cropperImage.value;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const maxSize = 200; // 最大尺寸 200x200
    const size = Math.min(img.width, img.height, maxSize);

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

    // 计算裁剪区域（居中裁剪）
    const sourceSize = Math.min(img.width, img.height);
    const sourceX = (img.width - sourceSize) / 2;
    const sourceY = (img.height - sourceSize) / 2;

    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

    // 转换为 Blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });

    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('avatar', file);

    const data = await userAPI.uploadAvatar(formData);
    authStore.setUser({ ...authStore.user, avatar: data.avatar });
    message.success('头像更新成功');
    showAvatarModal.value = false;
    cancelCrop();
  } catch (error) {
    message.error(error.error || '上传失败');
  } finally {
    uploading.value = false;
  }
};

const saveProfile = async () => {
  saving.value = true;
  try {
    await userAPI.updateProfile(profileForm.value);
    message.success('保存成功');
    loadUser();
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    saving.value = false;
  }
};

const savePrivacy = async () => {
  try {
    await userAPI.updateProfile(privacyForm.value);
    message.success('设置已更新');
  } catch (error) {
    message.error(error.error || '更新失败');
  }
};

const saveParentPrivacy = async () => {
  try {
    await userAPI.updateProfile({ hideFromParents: privacyForm.value.hideFromParents });
    if (privacyForm.value.hideFromParents) {
      message.success('已停止对家长共享');
    } else {
      message.success('已开启对家长共享');
    }
  } catch (error) {
    message.error(error.error || '更新失败');
  }
};

const changePassword = async () => {
  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword) {
    message.warning('请填写完整');
    return;
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    message.warning('两次密码不一致');
    return;
  }
  changingPassword.value = true;
  try {
    await userAPI.updatePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword,
    });
    message.success('密码修改成功');
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
  } catch (error) {
    message.error(error.error || '修改失败');
  } finally {
    changingPassword.value = false;
  }
};

// 检查支付密码设置状态
const checkPaymentPasswordStatus = async () => {
  try {
    const result = await userAPI.checkPaymentPasswordSet();
    paymentPasswordSet.value = result.isSet;
  } catch (error) {
    console.error('检查支付密码状态失败:', error);
  }
};

// 重置/设置支付密码
const resetPaymentPassword = async () => {
  if (!paymentPasswordForm.value.oldPassword) {
    message.warning('请输入原支付密码');
    return;
  }
  if (!paymentPasswordForm.value.newPassword) {
    message.warning('请输入新支付密码');
    return;
  }
  if (paymentPasswordForm.value.newPassword.length < 6) {
    message.warning('支付密码至少6位');
    return;
  }
  if (paymentPasswordForm.value.newPassword !== paymentPasswordForm.value.confirmPassword) {
    message.warning('两次密码不一致');
    return;
  }
  changingPaymentPassword.value = true;
  try {
    await userAPI.resetPaymentPassword({
      oldPassword: paymentPasswordForm.value.oldPassword,
      newPassword: paymentPasswordForm.value.newPassword,
    });
    message.success('支付密码设置成功');
    paymentPasswordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    paymentPasswordSet.value = true;
  } catch (error) {
    message.error(error.error || '设置失败');
  } finally {
    changingPaymentPassword.value = false;
  }
};

const linkParent = async () => {
  if (!parentEmail.value) {
    message.warning('请输入家长邮箱');
    return;
  }
  linking.value = true;
  try {
    await userAPI.linkParent(parentEmail.value);
    message.success('关联成功');
    parentEmail.value = '';
    loadUser();
  } catch (error) {
    message.error(error.error || '关联失败');
  } finally {
    linking.value = false;
  }
};

const generateParentCode = async () => {
  if (parentInviteRemaining.value <= 0) {
    message.warning('家长邀请次数已用完');
    return;
  }
  generatingParent.value = true;
  try {
    const res = await userAPI.generateInviteCode('PARENT');
    lastParentCode.value = res.data.code;
    message.success('家长邀请码生成成功');
    loadInviteRecords();
  } catch (error) {
    message.error(error.error || '生成失败');
  } finally {
    generatingParent.value = false;
  }
};

const generateClassmateCode = async () => {
  generatingClassmate.value = true;
  try {
    const res = await userAPI.generateInviteCode('CLASSMATE');
    lastClassmateCode.value = res.data.code;
    message.success('同学邀请码生成成功');
    loadInviteRecords();
  } catch (error) {
    message.error(error.error || '生成失败');
  } finally {
    generatingClassmate.value = false;
  }
};

const loadInviteRecords = async () => {
  try {
    const res = await userAPI.getInviteRecords();
    inviteRecords.value = res.data.codes || [];
    parentInviteRemaining.value = res.data.parentRemaining ?? 3;
  } catch (error) {
    console.error('加载邀请记录失败:', error);
  }
};

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败');
  }
};

const getInviteStatusType = (record) => {
  const exhausted = record.usedCount >= record.maxUses;
  const expired = new Date(record.expiresAt) < new Date();
  if (exhausted) return 'success';
  if (expired) return 'error';
  return 'warning';
};

const getInviteStatusText = (record) => {
  const exhausted = record.usedCount >= record.maxUses;
  const expired = new Date(record.expiresAt) < new Date();
  if (exhausted) return '已完成';
  if (expired) return '已过期';
  if (record.usedCount > 0) return '邀请中';
  return '待使用';
};

// 退出登录
const handleLogout = () => {
  dialog.warning({
    title: '确认退出',
    content: '确定要退出登录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      authStore.logout();
      message.success('已退出登录');
      router.push('/login');
    },
  });
};

// ========== 2FA 相关方法 ==========

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 加载 2FA 状态
const load2FAStatus = async () => {
  try {
    const result = await twoFactorAPI.getStatus();
    if (result.success) {
      twoFactorEnabled.value = result.data.enabled;
      twoFactorEnabledAt.value = result.data.enabledAt;
    }
  } catch (error) {
    console.error('加载 2FA 状态失败:', error);
  }
};

// 开始启用 2FA
const startSetup2FA = async () => {
  showSetup2FAModal.value = true;
  setup2FAStep.value = 1;
  setup2FACode.value = '';
  qrCodeDataURL.value = '';

  try {
    const result = await twoFactorAPI.setup();
    if (result.success) {
      qrCodeDataURL.value = result.data.qrCodeDataURL;
      tempSecret.value = result.data.secret;
      manualEntry.value = result.data.manualEntry;
    }
  } catch (error) {
    message.error(error.error || '获取二维码失败');
    showSetup2FAModal.value = false;
  }
};

// 复制密钥
const copySecret = () => {
  navigator.clipboard.writeText(tempSecret.value);
  message.success('密钥已复制');
};

// 验证并启用 2FA
const verifySetup2FA = async () => {
  if (!/^\d{6}$/.test(setup2FACode.value)) {
    message.warning('请输入 6 位验证码');
    return;
  }

  verifying2FA.value = true;
  try {
    const result = await twoFactorAPI.verifySetup({
      secret: tempSecret.value,
      code: setup2FACode.value,
    });

    if (result.success) {
      backupCodes.value = result.data.backupCodes;
      showSetup2FAModal.value = false;
      showBackupCodesModal.value = true;
      twoFactorEnabled.value = true;
      twoFactorEnabledAt.value = new Date().toISOString();
      message.success('两步验证已启用');
    }
  } catch (error) {
    message.error(error.error || '验证失败');
  } finally {
    verifying2FA.value = false;
  }
};

// 复制恢复码
const copyBackupCodes = () => {
  const codesText = backupCodes.value.join('\n');
  navigator.clipboard.writeText(codesText);
  message.success('恢复码已复制到剪贴板');
};

// 确认已保存恢复码
const confirmBackupCodesSaved = () => {
  showBackupCodesModal.value = false;
  backupCodes.value = [];
};

// 关闭 2FA
const disable2FA = async () => {
  if (!disable2FAForm.value.password) {
    message.warning('请输入登录密码');
    return;
  }
  if (!/^\d{6}$/.test(disable2FAForm.value.code)) {
    message.warning('请输入 6 位验证码');
    return;
  }

  disabling2FA.value = true;
  try {
    const result = await twoFactorAPI.disable(disable2FAForm.value);
    if (result.success) {
      twoFactorEnabled.value = false;
      twoFactorEnabledAt.value = null;
      showDisable2FAModal.value = false;
      disable2FAForm.value = { password: '', code: '' };
      message.success('两步验证已关闭');
    }
  } catch (error) {
    message.error(error.error || '关闭失败');
  } finally {
    disabling2FA.value = false;
  }
};

// 重新生成恢复码
const regenerateBackupCodes = async () => {
  if (!/^\d{6}$/.test(regenerateCode.value)) {
    message.warning('请输入 6 位验证码');
    return;
  }

  regenerating.value = true;
  try {
    const result = await twoFactorAPI.regenerateBackupCodes({ code: regenerateCode.value });
    if (result.success) {
      backupCodes.value = result.data.backupCodes;
      showRegenerateBackupModal.value = false;
      showBackupCodesModal.value = true;
      regenerateCode.value = '';
      message.success('恢复码已重新生成');
    }
  } catch (error) {
    message.error(error.error || '重新生成失败');
  } finally {
    regenerating.value = false;
  }
};

// 删除账户
const confirmDeleteAccount = async () => {
  if (!deleteAccountPassword.value) {
    message.warning('请输入密码');
    return;
  }

  deletingAccount.value = true;
  try {
    const result = await authAPI.deleteAccount(deleteAccountPassword.value);
    if (result.success) {
      message.success('账户已删除');
      authStore.logout();
      router.push('/login');
    }
  } catch (error) {
    message.error(error.error || '删除失败，请检查密码是否正确');
  } finally {
    deletingAccount.value = false;
  }
};

// 登录活动相关方法
const loadLoginActivities = async () => {
  loginActivitiesLoading.value = true;
  try {
    const params = {
      page: loginActivitiesPage.value,
      pageSize: loginActivitiesPageSize.value,
    };
    if (loginActivityFilter.value !== 'all') {
      params.type = loginActivityFilter.value;
    }
    const result = await userAPI.getLoginActivities(params);
    if (result.success) {
      loginActivities.value = result.data.activities || [];
      loginActivitiesTotal.value = result.data.total || 0;
      loginActivityStats.value = {
        deviceStats: result.data.deviceStats || [],
        locationStats: result.data.locationStats || [],
        suspiciousActivities: result.data.suspiciousActivities || [],
      };
    }
  } catch (error) {
    message.error(error.error || '加载登录活动失败');
  } finally {
    loginActivitiesLoading.value = false;
  }
};

const handleActivityFilterChange = () => {
  loginActivitiesPage.value = 1;
  loadLoginActivities();
};

const handleActivityPageChange = (page) => {
  loginActivitiesPage.value = page;
  loadLoginActivities();
};

const formatLoginTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isSuspiciousActivity = (activity) => {
  return loginActivityStats.value.suspiciousActivities?.some(s => s.id === activity.id);
};

const getFailReasonText = (reason) => {
  const reasons = {
    invalid_password: '密码错误',
    invalid_code: '验证码错误',
    account_disabled: '账户已被禁用',
    account_pending: '账户正在审核中',
  };
  return reasons[reason] || reason;
};

// 操作日志相关方法
const openActivityLogModal = async () => {
  activityLogsPage.value = 1;
  activityLogFilter.value = 'all';
  showActivityLogModal.value = true;
  await loadActivityLogs();
};

const loadActivityLogs = async () => {
  activityLogsLoading.value = true;
  try {
    const params = {
      page: activityLogsPage.value,
      pageSize: activityLogsPageSize.value,
    };
    if (activityLogFilter.value) {
      params.action = activityLogFilter.value;
    }
    const result = await userAPI.getActivityLogs(params);
    if (result.success) {
      activityLogs.value = result.data.logs || [];
      activityLogsTotal.value = result.data.total || 0;
      activityLogsStats.value = {
        todayCount: result.data.todayCount || 0,
        actionStats: result.data.actionStats || [],
      };
    }
  } catch (error) {
    message.error(error.error || '加载操作日志失败');
  } finally {
    activityLogsLoading.value = false;
  }
};

const handleActivityLogFilterChange = () => {
  activityLogsPage.value = 1;
  loadActivityLogs();
};

const handleActivityLogPageChange = (page) => {
  activityLogsPage.value = page;
  loadActivityLogs();
};

const activityFilterOptions = [
  { label: '全部操作', value: 'all' },
  { label: '登录', value: 'login' },
  { label: '创建日记', value: 'create_diary' },
  { label: '更新日记', value: 'update_diary' },
  { label: '删除日记', value: 'delete_diary' },
  { label: '提交作业', value: 'submit_homework' },
  { label: '创建收款码', value: 'create_paycode' },
  { label: '修改密码', value: 'change_password' },
  { label: '修改学校班级', value: 'update_school_class' },
];

const getActionLabel = (action) => {
  const labels = {
    login: '登录',
    create_diary: '创建日记',
    update_diary: '更新日记',
    delete_diary: '删除日记',
    submit_homework: '提交作业',
    create_paycode: '创建收款码',
    change_password: '修改密码',
    update_school_class: '修改学校班级',
    create_pay_order: '创建订单',
    complete_pay_order: '完成支付',
    refund: '退款',
  };
  return labels[action] || action;
};

const getActionIcon = (action) => {
  if (action === 'login') return CheckmarkCircle;
  if (action.includes('create')) return DocumentTextOutline;
  if (action.includes('update')) return InformationCircleOutline;
  if (action.includes('delete')) return LogOutOutline;
  return CheckmarkCircleOutline;
};

// 学校班级相关方法
const loadSchoolClassOptions = async () => {
  try {
    const campusRes = await campusAPI.getCampuses();
    schoolClassOptions.value.schools = (campusRes.campuses || []).map(s => ({
      label: s.name, value: s.id,
    }));
  } catch (e) { console.error('加载学校列表失败:', e); }
};

const handleSchoolClassSchoolChange = async (schoolId) => {
  schoolClassForm.value.classId = null;
  if (!schoolId) { schoolClassOptions.value.classes = []; return; }
  try {
    const classRes = await classAPI.getClasses({ schoolId });
    schoolClassOptions.value.classes = (classRes.classes || []).map(c => ({
      label: `${c.grade || ''} ${c.name}`.trim(), value: c.id,
    }));
  } catch (e) { console.error('加载班级列表失败:', e); }
};

const saveSchoolClass = async () => {
  if (!schoolClassForm.value.classId) { message.warning('请选择班级'); return; }
  savingSchoolClass.value = true;
  try {
    const result = await userAPI.updateMySchoolClass({ classId: schoolClassForm.value.classId });
    message.success('学校班级修改成功');
    schoolClassRemainingDays.value = 30;
    await loadUser();
  } catch (error) {
    if (error.remainingDays !== undefined) {
      schoolClassRemainingDays.value = error.remainingDays;
      message.warning(error.error || '还需等待');
    } else {
      message.error(error.error || '修改失败');
    }
  } finally { savingSchoolClass.value = false; }
};

const openLoginActivityModal = async () => {
  loginActivitiesPage.value = 1;
  loginActivityFilter.value = 'all';
  showLoginActivityModal.value = true;
  await loadLoginActivities();
};

onMounted(() => {
  loadUser();
  checkPaymentPasswordStatus();
  load2FAStatus();
  if (user.value?.role === 'STUDENT') {
    loadSchoolClassOptions();
    loadInviteRecords();
    if (user.value?.schoolClassUpdatedAt) {
      const lastUpdate = new Date(user.value.schoolClassUpdatedAt);
      const now = new Date();
      const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
      if (diffDays < 30) {
        schoolClassRemainingDays.value = Math.ceil(30 - diffDays);
      }
    }
  }
});
</script>

<style scoped>
.theme-card {
  @apply relative p-3 border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-200;
  @apply hover:border-primary-300 hover:shadow-md;
}
.theme-card.active {
  @apply border-primary-500 bg-primary-50;
}
.theme-preview {
  @apply h-16 rounded-lg mb-2;
}
.theme-preview-classic {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%);
}
.theme-preview-tech {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%);
}
.theme-preview-dark {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}
.theme-info {
  @apply text-center;
}
.theme-check {
  @apply absolute top-2 right-2;
}
</style>
