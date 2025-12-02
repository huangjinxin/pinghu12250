<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4 py-8">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-2xl">成</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">创建账号</h1>
        <p class="text-gray-500 mt-2">开始记录成长的每一步</p>
      </div>

      <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleRegister">
        <n-form-item label="用户名" path="username">
          <n-input
            v-model:value="form.username"
            placeholder="请输入用户名"
            size="large"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon :component="PersonOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="邮箱" path="email">
          <n-input
            v-model:value="form.email"
            placeholder="请输入邮箱"
            size="large"
            :input-props="{ autocomplete: 'email' }"
          >
            <template #prefix>
              <n-icon :component="MailOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            size="large"
            show-password-on="click"
            :input-props="{ autocomplete: 'new-password' }"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="角色" path="role">
          <n-select
            v-model:value="form.role"
            :options="roleOptions"
            size="large"
            placeholder="请选择角色"
          />
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          attr-type="submit"
          :loading="isLoading"
          class="mt-2"
        >
          {{ isLoading ? '注册中...' : '注册' }}
        </n-button>
      </n-form>

      <div class="mt-6 text-center">
        <span class="text-gray-500 text-sm">已有账号？</span>
        <router-link to="/login" class="text-primary-500 hover:text-primary-600 text-sm font-medium ml-1">
          立即登录
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMessage } from 'naive-ui';
import { PersonOutline, MailOutline, LockClosedOutline } from '@vicons/ionicons5';

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();

const formRef = ref(null);
const form = ref({
  username: '',
  email: '',
  password: '',
  role: 'STUDENT',
});

const isLoading = ref(false);

const roleOptions = [
  { label: '学生', value: 'STUDENT' },
  { label: '家长', value: 'PARENT' },
  { label: '老师', value: 'TEACHER' },
];

const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: ['input', 'blur'],
  },
  email: [
    { required: true, message: '请输入邮箱', trigger: ['input', 'blur'] },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['input', 'blur'] },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: ['input', 'blur'] },
    { min: 6, message: '密码至少需要6位', trigger: ['input', 'blur'] },
  ],
  role: {
    required: true,
    message: '请选择角色',
    trigger: ['change', 'blur'],
  },
};

const handleRegister = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  isLoading.value = true;

  try {
    await authStore.register(form.value);
    message.success('注册成功');
    router.push('/');
  } catch (err) {
    message.error(err.error || '注册失败，请重试');
  } finally {
    isLoading.value = false;
  }
};
</script>
