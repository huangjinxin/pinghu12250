<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-2xl">平</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">平湖少儿空间</h1>
        <p class="text-gray-500 mt-2">欢迎回来！请登录您的账户</p>
      </div>

      <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
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

      <div class="mt-6 text-center">
        <span class="text-gray-500 text-sm">还没有账号？</span>
        <router-link to="/register" class="text-primary-500 hover:text-primary-600 text-sm font-medium ml-1">
          立即注册
        </router-link>
      </div>

      <!-- 演示账户提示 -->
      <div class="mt-6 p-4 bg-gray-50 rounded-lg">
        <p class="text-xs text-gray-500 text-center mb-2">演示账户</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-white p-2 rounded border border-gray-100">
            <p class="font-medium text-gray-700">老师</p>
            <p class="text-gray-500">teacher_wang</p>
          </div>
          <div class="bg-white p-2 rounded border border-gray-100">
            <p class="font-medium text-gray-700">学生</p>
            <p class="text-gray-500">xiaoming</p>
          </div>
        </div>
        <p class="text-xs text-gray-400 text-center mt-2">密码: 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMessage } from 'naive-ui';
import { PersonOutline, LockClosedOutline } from '@vicons/ionicons5';

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();

const formRef = ref(null);
const form = ref({
  username: '',
  password: '',
});

const isLoading = ref(false);

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

const handleLogin = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  isLoading.value = true;

  try {
    await authStore.login(form.value);
    message.success('登录成功');
    router.push('/');
  } catch (err) {
    message.error(err.error || '登录失败，请重试');
  } finally {
    isLoading.value = false;
  }
};
</script>
