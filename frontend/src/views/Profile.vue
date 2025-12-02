<template>
  <div class="space-y-6">
    <!-- 用户信息头部 -->
    <div class="card">
      <div class="flex items-center space-x-4">
        <div class="relative">
          <n-avatar :src="user?.avatar" :size="80" round>
            {{ user?.profile?.nickname?.[0] || user?.username?.[0] }}
          </n-avatar>
          <n-button circle size="small" type="primary"
            class="absolute bottom-0 right-0"
            @click="showAvatarModal = true">
            <template #icon><n-icon><CameraOutline /></n-icon></template>
          </n-button>
        </div>
        <div class="flex-1">
          <h2 class="text-xl font-bold text-gray-800">
            {{ user?.profile?.nickname || user?.username }}
          </h2>
          <p class="text-gray-500">{{ user?.email }}</p>
          <n-tag :type="roleTagType" size="small" class="mt-1">{{ roleLabel }}</n-tag>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center">
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
            <n-form-item label="年级">
              <n-input v-model:value="profileForm.grade" placeholder="如：三年级" />
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
        </div>
      </n-tab-pane>

      <!-- 安全设置 -->
      <n-tab-pane name="security" tab="安全设置">
        <div class="card">
          <h3 class="font-medium mb-4">修改密码</h3>
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
      </n-tab-pane>

      <!-- 关联账号（学生角色显示） -->
      <n-tab-pane v-if="user?.role === 'STUDENT'" name="link" tab="关联家长">
        <div class="card space-y-4">
          <div v-if="parents.length">
            <h3 class="font-medium mb-3">已关联家长</h3>
            <div class="space-y-2">
              <div v-for="parent in parents" :key="parent.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                  <AvatarText :username="authStore.user?.username" size="md" />
                  <div>
                    <div class="font-medium">{{ parent.username }}</div>
                    <div class="text-sm text-gray-500">{{ parent.email }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 class="font-medium mb-3">关联新家长</h3>
            <n-space>
              <n-input v-model:value="parentEmail" placeholder="输入家长邮箱" style="width: 250px" />
              <n-button type="primary" :loading="linking" @click="linkParent">发送关联</n-button>
            </n-space>
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
                <h3 class="text-lg font-bold text-gray-800">平湖少儿空间</h3>
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

          <!-- 更新日志 -->
          <div class="card">
            <h3 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
              <n-icon size="20"><DocumentTextOutline /></n-icon>
              <span>更新日志</span>
            </h3>

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
          </div>

          <!-- 关于 -->
          <div class="card">
            <h3 class="font-medium text-gray-800 mb-3">关于我们</h3>
            <p class="text-sm text-gray-600 leading-relaxed">
              平湖少儿空间是一个面向青少年的综合性学习成长平台。我们致力于为孩子们提供一个安全、有趣、富有创造力的学习环境，
              帮助他们在编程、艺术、社交等多个领域全面发展。
            </p>
            <div class="mt-4 flex gap-3">
              <n-button text type="primary">使用帮助</n-button>
              <n-button text type="primary">隐私政策</n-button>
              <n-button text type="primary">用户协议</n-button>
            </div>
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
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { userAPI } from '@/api';
import { CameraOutline, DocumentTextOutline, CheckmarkCircleOutline } from '@vicons/ionicons5';
import { VERSION, CHANGELOG } from '@/config/changelog';

const message = useMessage();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const saving = ref(false);
const changingPassword = ref(false);
const linking = ref(false);
const uploading = ref(false);
const parents = ref([]);
const parentEmail = ref('');
const showAvatarModal = ref(false);
const cropperImage = ref(null);
const cropperImageRef = ref(null);
const selectedFile = ref(null);

const profileForm = ref({ nickname: '', grade: '', bio: '', interests: [] });
const privacyForm = ref({ profilePublic: true, showStats: true });
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });

// 系统设置相关
const currentVersion = ref(VERSION);
const changelog = ref(CHANGELOG);
const buildDate = computed(() => {
  const today = new Date();
  return today.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
});

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
    };
    if (data.parents) {
      parents.value = data.parents.map(p => p.parent);
    }
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

onMounted(() => {
  loadUser();
});
</script>
