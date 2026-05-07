<template>
  <div class="login-form">
    <!-- 登录表单 -->
    <n-form v-if="!showTwoFactor" ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
      <n-form-item label="用户名/邮箱" path="username">
        <n-input
          v-model:value="form.username"
          placeholder="请输入用户名或邮箱"
          size="large"
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
      >
        {{ isLoading ? '登录中...' : '登录' }}
      </n-button>
    </n-form>

    <!-- 两步验证表单 -->
    <div v-else class="two-factor-form">
      <div class="text-center text-gray-600 text-sm mb-4">
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

    <div v-if="!showTwoFactor" class="form-footer">
      <span class="text-gray-500">还没有账号？</span>
      <a href="javascript:void(0)" @click="$emit('register')" class="text-primary-500">立即注册</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMessage } from 'naive-ui';
import PersonOutline from '@vicons/ionicons5/es/PersonOutline';
import LockClosedOutline from '@vicons/ionicons5/es/LockClosedOutline';
import ShieldCheckmarkOutline from '@vicons/ionicons5/es/ShieldCheckmarkOutline';
import KeyOutline from '@vicons/ionicons5/es/KeyOutline';

const emit = defineEmits(['success', 'register']);
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
    trigger: 'blur',
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur',
  },
};

const twoFactorRules = {
  code: {
    required: true,
    message: useBackupCode.value ? '请输入恢复码' : '请输入验证码',
    trigger: 'blur',
  },
};

const handleLogin = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  isLoading.value = true;
  try {
    await authStore.login(form.value);
    if (!showTwoFactor.value) {
      message.success('登录成功');
      emit('success');
    }
  } catch (error) {
    message.error(error.error || '登录失败');
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
    await authStore.verifyTwoFactor(twoFactorForm.value);
    message.success('登录成功');
    emit('success');
  } catch (error) {
    message.error(error.error || '验证失败');
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

<style scoped>
.login-form {
  padding: 8px 0;
}

.two-factor-form {
  padding: 8px 0;
}

.form-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
}

.text-gray-500 {
  color: #6b7280;
}

.text-primary-500 {
  color: #6366f1;
  margin-left: 4px;
  text-decoration: none;
}

.text-primary-500:hover {
  text-decoration: underline;
}
</style>
