<template>
  <div class="poetry-works-tab">
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 9" :key="i" height="200px" :sharp="false" />
    </div>

    <n-empty v-else-if="!works.length" description="暂无唐诗宋词作品">
      <template #extra>
        <n-button type="primary" @click="showCreateDialog = true">创建第一个诗词作品</n-button>
      </template>
    </n-empty>

    <!-- 诗词作品列表 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="work in works"
        :key="work.id"
        class="poetry-card"
        @click="handleViewWork(work)"
      >
        <!-- 作品预览 -->
        <div class="preview-container">
          <iframe
            :srcdoc="getPreviewHtml(work)"
            class="preview-frame"
            sandbox="allow-scripts"
          ></iframe>
        </div>

        <!-- 作品信息 -->
        <div class="info-section">
          <div class="title-row">
            <h3 class="work-title">{{ work.title }}</h3>
            <n-tag v-if="work.status === 'PENDING'" size="small" type="warning">待审核</n-tag>
            <n-tag v-else-if="work.status === 'REJECTED'" size="small" type="error">已拒绝</n-tag>
          </div>
          <div class="author-row">
            <div class="flex items-center space-x-2">
              <AvatarText :username="work.author?.username" size="sm" />
              <span class="author-name">{{ work.author?.profile?.nickname || work.author?.username }}</span>
            </div>
            <span class="create-time">{{ formatDate(work.createdAt) }}</span>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <n-button size="tiny" quaternary type="primary" @click.stop="handleShare(work)">
              <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
              分享
            </n-button>
            <n-button
              v-if="canDelete(work)"
              size="tiny"
              quaternary
              type="error"
              @click.stop="handleDelete(work)"
            >
              <template #icon><n-icon><TrashOutline /></n-icon></template>
              删除
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建诗词对话框 -->
    <n-modal
      v-model:show="showCreateDialog"
      preset="card"
      title="创建唐诗宋词作品"
      style="width: 800px; max-width: 95vw;"
    >
      <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
        <n-form-item label="作品标题" path="title">
          <n-input v-model:value="formData.title" placeholder="例如：静夜思" />
        </n-form-item>

        <n-form-item label="HTML代码" path="htmlCode">
          <n-input
            v-model:value="formData.htmlCode"
            type="textarea"
            placeholder="输入完整的HTML代码，包含CSS样式..."
            :rows="15"
            style="font-family: monospace;"
          />
        </n-form-item>

        <n-collapse>
          <n-collapse-item title="HTML模板示例" name="template">
            <pre class="code-preview">{{ htmlTemplate }}</pre>
            <n-button size="small" @click="formData.htmlCode = htmlTemplate" style="margin-top: 10px;">
              使用此模板
            </n-button>
          </n-collapse-item>
        </n-collapse>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateDialog = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            提交审核
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { ShareSocialOutline, TrashOutline } from '@vicons/ionicons5';
import AvatarText from '@/components/AvatarText.vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const currentUser = computed(() => authStore.user);
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN');

const loading = ref(false);
const works = ref([]);
const showCreateDialog = ref(false);
const submitting = ref(false);
const formRef = ref(null);

const formData = ref({
  title: '',
  htmlCode: ''
});

const rules = {
  title: { required: true, message: '请输入作品标题', trigger: 'blur' },
  htmlCode: { required: true, message: '请输入HTML代码', trigger: 'blur' }
};

// HTML模板示例
const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: "楷体", "STKaiti", serif;
    }
    .poem-container {
      background: rgba(255,255,255,0.95);
      padding: 40px 60px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .poem-title {
      font-size: 32px;
      color: #8B4513;
      margin-bottom: 10px;
    }
    .poem-author {
      font-size: 18px;
      color: #666;
      margin-bottom: 30px;
    }
    .poem-content {
      font-size: 24px;
      line-height: 2;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="poem-container">
    <h1 class="poem-title">静夜思</h1>
    <p class="poem-author">【唐】李白</p>
    <div class="poem-content">
      床前明月光，<br>
      疑是地上霜。<br>
      举头望明月，<br>
      低头思故乡。
    </div>
  </div>
</body>
</html>`;

const loadWorks = async () => {
  loading.value = true;
  try {
    const response = await api.get('/poetry-works');
    // 作品广场只显示已审核通过的作品
    const allWorks = response.works || [];
    works.value = allWorks.filter(w => w.status === 'APPROVED');
  } catch (error) {
    console.error('加载诗词作品失败:', error);
  } finally {
    loading.value = false;
  }
};

const getPreviewHtml = (work) => {
  return work.htmlCode || '';
};

const handleViewWork = (work) => {
  router.push(`/poetry/${work.id}`);
};

const handleShare = async (work) => {
  const shareUrl = `${window.location.origin}/poetry/${work.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    message.success('分享链接已复制');
  } catch (err) {
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('分享链接已复制');
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    await api.post('/poetry-works', formData.value);
    message.success('提交成功，等待审核');
    showCreateDialog.value = false;
    formData.value = { title: '', htmlCode: '' };
    loadWorks();
  } catch (error) {
    message.error(error.response?.data?.error || '提交失败');
  } finally {
    submitting.value = false;
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 检查是否可以删除（提交人或管理员）
const canDelete = (work) => {
  return work.authorId === currentUser.value?.id || isAdmin.value;
};

// 删除作品
const handleDelete = (work) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除作品《${work.title}》吗？此操作不可恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/poetry-works/${work.id}`);
        message.success('删除成功');
        loadWorks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

onMounted(() => {
  loadWorks();
});

// 暴露方法给父组件
defineExpose({
  openCreateDialog: () => {
    showCreateDialog.value = true;
  }
});
</script>

<style scoped>
.poetry-works-tab {
  padding: 0;
}

.poetry-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.poetry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.preview-container {
  height: 180px;
  background: #f5f5f5;
  overflow: hidden;
}

.preview-frame {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
}

.info-section {
  padding: 12px 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.work-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.author-name {
  font-size: 13px;
  color: #666;
}

.create-time {
  font-size: 12px;
  color: #999;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.code-preview {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}
</style>
