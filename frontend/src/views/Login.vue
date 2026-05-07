<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-2xl">苹</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">苹湖少儿空间</h1>
        <p class="text-gray-500 mt-2">
          {{ showTwoFactor ? '请输入两步验证码' : '欢迎回来！请登录您的账户' }}
        </p>
      </div>

      <!-- 登录表单 -->
      <n-form v-if="!showTwoFactor" ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <n-form-item label="用户名/邮箱" path="username">
          <n-input
            v-model:value="form.username"
            placeholder="请输入用户名或邮箱"
            size="large"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon :component="PersonOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password-on="click"
            :input-props="{ autocomplete: 'current-password' }"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          attr-type="submit"
          :loading="isLoading"
          class="mt-2"
        >
          {{ isLoading ? '登录中...' : '登录' }}
        </n-button>
      </n-form>

      <!-- 两步验证表单 -->
      <div v-else class="space-y-6">
        <div class="text-center text-gray-600 text-sm">
          <n-icon :component="ShieldCheckmarkOutline" size="48" class="text-primary-500 mb-2" />
          <p>请打开您的身份验证器应用</p>
          <p>输入 6 位验证码</p>
        </div>

        <n-form ref="twoFactorFormRef" :model="twoFactorForm" :rules="twoFactorRules" @submit.prevent="handleVerifyTwoFactor">
          <n-form-item :label="useBackupCode ? '恢复码' : '验证码'" path="code">
            <n-input
              v-model:value="twoFactorForm.code"
              :placeholder="useBackupCode ? '请输入恢复码（XXXX-XXXX-XXXX）' : '请输入 6 位验证码'"
              size="large"
              :maxlength="useBackupCode ? 14 : 6"
              :input-props="{ autocomplete: 'one-time-code', inputmode: useBackupCode ? 'text' : 'numeric' }"
            >
              <template #prefix>
                <n-icon :component="KeyOutline" />
              </template>
            </n-input>
          </n-form-item>

          <div class="flex justify-center mb-4">
            <n-checkbox v-model:checked="useBackupCode" size="small">
              使用恢复码
            </n-checkbox>
          </div>

          <n-button
            type="primary"
            block
            size="large"
            attr-type="submit"
            :loading="isLoading"
          >
            {{ isLoading ? '验证中...' : '验证' }}
          </n-button>

          <n-button
            block
            size="large"
            quaternary
            class="mt-2"
            @click="cancelTwoFactor"
          >
            返回登录
          </n-button>
        </n-form>
      </div>

      <template v-if="!showTwoFactor">
        <div class="mt-6 text-center">
          <span class="text-gray-500 text-sm">还没有账号？</span>
          <router-link to="/register" class="text-primary-500 hover:text-primary-600 text-sm font-medium ml-1">
            立即注册
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMessage } from 'naive-ui';
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import LockClosedOutline from '@vicons/ionicons5/es/LockClosedOutline'
import ShieldCheckmarkOutline from '@vicons/ionicons5/es/ShieldCheckmarkOutline'
import KeyOutline from '@vicons/ionicons5/es/KeyOutline'

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();

const formRef = ref(null);
const twoFactorFormRef = ref(null);
const form = ref({
  username: '',
  password: '',
});
const twoFactorForm = ref({
  code: '',
});
const useBackupCode = ref(false);

const isLoading = ref(false);
const showTwoFactor = computed(() => authStore.pendingTwoFactor);

const rules = {
  username: {
    required: true,
    message: '请输入用户名或邮箱',
    trigger: ['input', 'blur'],
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['input', 'blur'],
  },
};

const twoFactorRules = computed(() => ({
  code: {
    required: true,
    message: useBackupCode.value ? '请输入恢复码' : '请输入 6 位验证码',
    trigger: ['input', 'blur'],
    validator: (rule, value) => {
      if (!value) return false;
      if (useBackupCode.value) {
        // 恢复码格式: XXXX-XXXX-XXXX 或不带横杠
        return value.replace(/-/g, '').length === 12;
      } else {
        // TOTP 验证码: 6 位数字
        return /^\d{6}$/.test(value);
      }
    },
  },
}));

const handleLogin = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  isLoading.value = true;

  try {
    const result = await authStore.login(form.value);
    if (result.requiresTwoFactor) {
      // 需要两步验证，界面会自动切换
      message.info('请输入两步验证码');
    } else {
      message.success('登录成功');
      router.push('/');
    }
  } catch (err) {
    message.error(err.error || '登录失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

const handleVerifyTwoFactor = async () => {
  try {
    await twoFactorFormRef.value?.validate();
  } catch {
    return;
  }

  isLoading.value = true;

  try {
    const result = await authStore.verifyTwoFactor(twoFactorForm.value.code);

    // 检查是否使用了恢复码
    if (result.usedBackupCode) {
      message.warning(`登录成功！您使用了恢复码，剩余 ${result.remainingBackupCodes} 个`);
    } else {
      message.success('登录成功');
    }

    router.push('/');
  } catch (err) {
    message.error(err.error || '验证失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

const cancelTwoFactor = () => {
  authStore.cancelTwoFactor();
  twoFactorForm.value.code = '';
  useBackupCode.value = false;
};
</script>
