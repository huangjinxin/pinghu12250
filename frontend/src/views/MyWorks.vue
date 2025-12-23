<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的创作</h1>
        <p class="text-gray-500 mt-1">管理你创建的所有作品</p>
      </div>
      <n-button type="primary" @click="handleCreate">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        {{ workType === 'poetry' ? '创建诗词' : '创建作品' }}
      </n-button>
    </div>

    <!-- 作品类型选择 -->
    <n-card>
      <n-tabs v-model:value="workType" type="segment" @update:value="handleWorkTypeChange">
        <n-tab-pane name="html" tab="HTML作品">
          <!-- HTML作品状态筛选 -->
          <div class="mt-4">
            <n-tabs v-model:value="htmlStatus" type="line" @update:value="loadHtmlWorks">
              <n-tab-pane name="all" tab="全部" />
              <n-tab-pane name="public" tab="公开" />
              <n-tab-pane name="private" tab="私有" />
            </n-tabs>
          </div>
        </n-tab-pane>

        <n-tab-pane name="poetry" tab="唐诗宋词">
          <!-- 诗词作品状态筛选 -->
          <div class="mt-4">
            <n-tabs v-model:value="poetryStatus" type="line" @update:value="loadPoetryWorks">
              <n-tab-pane name="all" tab="全部" />
              <n-tab-pane name="pending" tab="待审核" />
              <n-tab-pane name="approved" tab="已发布" />
              <n-tab-pane name="rejected" tab="已拒绝" />
            </n-tabs>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 搜索栏 -->
    <div class="flex items-center gap-3">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索作品..."
        clearable
        style="max-width: 300px"
        @input="handleSearch"
      >
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>
    </div>

    <!-- 作品列表 -->
    <n-spin :show="loading">
      <!-- HTML作品列表 -->
      <div v-if="workType === 'html'">
        <div v-if="htmlWorks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <n-card
            v-for="work in htmlWorks"
            :key="work.id"
            class="work-card"
            hoverable
          >
            <div class="work-preview h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
              <iframe
                v-if="work.htmlContent || work.htmlCode"
                :srcdoc="work.htmlContent || work.htmlCode"
                class="w-full h-full pointer-events-none"
                sandbox="allow-scripts"
              ></iframe>
            </div>

            <div class="space-y-3">
              <div>
                <h3 class="font-bold truncate">{{ work.title }}</h3>
                <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ work.description || '暂无描述' }}</p>
              </div>

              <div class="flex items-center gap-2 text-xs text-gray-500">
                <n-tag v-if="work.visibility === 'PUBLIC'" type="success" size="small">公开</n-tag>
                <n-tag v-else-if="work.visibility === 'PRIVATE'" type="warning" size="small">私有</n-tag>
                <n-tag v-else type="default" size="small">草稿</n-tag>
                <span>{{ formatDate(work.createdAt) }}</span>
              </div>

              <div class="flex items-center justify-between text-sm text-gray-600">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1">
                    <n-icon><HeartOutline /></n-icon>
                    {{ work._count?.likes || 0 }}
                  </span>
                  <span class="flex items-center gap-1">
                    <n-icon><ChatbubbleOutline /></n-icon>
                    {{ work._count?.comments || 0 }}
                  </span>
                </div>
              </div>

              <div class="flex gap-2">
                <n-button size="small" @click="$router.push(`/works/${work.id}`)">查看</n-button>
                <n-button size="small" @click="$router.push(`/works/${work.id}/edit`)">编辑</n-button>
                <n-button size="small" type="error" @click="handleDeleteHtml(work.id)">删除</n-button>
              </div>
            </div>
          </n-card>
        </div>
        <n-empty v-else description="还没有创建任何HTML作品" class="py-12">
          <template #extra>
            <n-button type="primary" @click="$router.push('/works/create')">立即创建</n-button>
          </template>
        </n-empty>
      </div>

      <!-- 诗词作品列表 -->
      <div v-else-if="workType === 'poetry'">
        <div v-if="poetryWorks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <n-card
            v-for="work in poetryWorks"
            :key="work.id"
            class="work-card"
            hoverable
            @click="handleViewPoetry(work)"
          >
            <div class="work-preview h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden">
              <iframe
                :srcdoc="work.htmlCode"
                class="poetry-preview-frame"
                sandbox="allow-scripts"
              ></iframe>
            </div>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <h3 class="font-bold truncate flex-1">{{ work.title }}</h3>
                <n-tag v-if="work.status === 'PENDING'" type="warning" size="small">待审核</n-tag>
                <n-tag v-else-if="work.status === 'APPROVED'" type="success" size="small">已发布</n-tag>
                <n-tag v-else-if="work.status === 'REJECTED'" type="error" size="small">已拒绝</n-tag>
              </div>

              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span>{{ formatDate(work.createdAt) }}</span>
                <span class="flex items-center gap-1">
                  <n-icon><HeartOutline /></n-icon>
                  {{ work._count?.likes || 0 }}
                </span>
              </div>

              <!-- 拒绝原因 -->
              <div v-if="work.status === 'REJECTED' && work.reviewReason" class="text-xs text-red-500">
                拒绝原因：{{ work.reviewReason }}
              </div>

              <div class="flex gap-2 flex-wrap" @click.stop>
                <n-button size="small" @click="handlePreviewPoetry(work)">预览</n-button>
                <n-button size="small" type="info" @click="handleEditPoetry(work)">编辑</n-button>
                <n-button v-if="work.status === 'APPROVED'" size="small" @click="handleSharePoetry(work)">分享</n-button>
                <n-button size="small" type="error" @click="handleDeletePoetry(work)">删除</n-button>
              </div>
            </div>
          </n-card>
        </div>
        <n-empty v-else description="还没有创建任何诗词作品" class="py-12">
          <template #extra>
            <n-button type="primary" @click="showPoetryDialog = true">立即创建</n-button>
          </template>
        </n-empty>
      </div>
    </n-spin>

    <!-- 预览诗词对话框 -->
    <n-modal
      v-model:show="showPreviewDialog"
      preset="card"
      :title="previewWork?.title || '作品预览'"
      style="width: 90vw; max-width: 1200px; height: 80vh;"
    >
      <div class="preview-modal-content">
        <iframe
          v-if="previewWork"
          :srcdoc="previewWork.htmlCode"
          class="fullscreen-preview"
          sandbox="allow-scripts"
        ></iframe>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPreviewDialog = false">关闭</n-button>
          <n-button type="info" @click="showPreviewDialog = false; handleEditPoetry(previewWork)">编辑</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 创建/编辑诗词对话框 -->
    <n-modal
      v-model:show="showPoetryDialog"
      preset="card"
      :title="editingPoetryId ? '编辑唐诗宋词作品' : '创建唐诗宋词作品'"
      style="width: 800px; max-width: 95vw;"
    >
      <n-form ref="poetryFormRef" :model="poetryForm" :rules="poetryRules" label-placement="top">
        <n-form-item label="作品标题" path="title">
          <n-input v-model:value="poetryForm.title" placeholder="例如：静夜思、登鹳雀楼" />
        </n-form-item>

        <n-form-item label="HTML代码" path="htmlCode">
          <n-input
            v-model:value="poetryForm.htmlCode"
            type="textarea"
            placeholder="输入完整的HTML代码，包含CSS样式..."
            :rows="15"
            style="font-family: monospace;"
          />
        </n-form-item>

        <n-collapse>
          <n-collapse-item title="HTML模板示例" name="template">
            <pre class="code-preview">{{ poetryTemplate }}</pre>
            <n-button size="small" @click="poetryForm.htmlCode = poetryTemplate" style="margin-top: 10px;">
              使用此模板
            </n-button>
          </n-collapse-item>
        </n-collapse>

        <n-alert type="info" style="margin-top: 16px;">
          提交后作品将进入审核流程，审核通过后会自动发布到唐诗宋词页面，并获得5积分奖励。
        </n-alert>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCancelPoetryDialog">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmitPoetry">
            {{ editingPoetryId ? '保存修改' : '提交审核' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { htmlWorkAPI } from '@/api';
import api from '@/api';
import {
  AddOutline,
  SearchOutline,
  HeartOutline,
  ChatbubbleOutline,
} from '@vicons/ionicons5';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const currentUserId = computed(() => authStore.user?.id);

// 通用状态
const loading = ref(false);
const workType = ref('poetry'); // 默认显示诗词作品
const searchQuery = ref('');

// HTML作品相关
const htmlWorks = ref([]);
const htmlStatus = ref('all');

// 诗词作品相关
const poetryWorks = ref([]);
const poetryStatus = ref('all');
const showPoetryDialog = ref(false);
const submitting = ref(false);
const poetryFormRef = ref(null);
const poetryForm = ref({
  title: '',
  htmlCode: ''
});
const editingPoetryId = ref(null); // 编辑模式的作品ID

// 预览相关
const showPreviewDialog = ref(false);
const previewWork = ref(null);

const poetryRules = {
  title: { required: true, message: '请输入作品标题', trigger: 'blur' },
  htmlCode: { required: true, message: '请输入HTML代码', trigger: 'blur' }
};

// HTML模板
const poetryTemplate = `<!DOCTYPE html>
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
    <h1 class="poem-title">诗词标题</h1>
    <p class="poem-author">【朝代】作者</p>
    <div class="poem-content">
      第一句，<br>
      第二句。<br>
      第三句，<br>
      第四句。
    </div>
  </div>
</body>
</html>`;

// 加载HTML作品
const loadHtmlWorks = async () => {
  loading.value = true;
  try {
    const params = {
      myOnly: true,
    };

    if (htmlStatus.value !== 'all') {
      params.visibility = htmlStatus.value.toUpperCase();
    }

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    const response = await htmlWorkAPI.getWorks(params);
    const allWorks = response.works || [];

    // 前端二次验证：确保只显示当前用户的作品
    if (currentUserId.value) {
      htmlWorks.value = allWorks.filter(work => work.authorId === currentUserId.value);
    } else {
      htmlWorks.value = [];
    }
  } catch (error) {
    message.error(error.error || '加载作品失败');
  } finally {
    loading.value = false;
  }
};

// 加载诗词作品
const loadPoetryWorks = async () => {
  loading.value = true;
  try {
    const params = { myOnly: true };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    const response = await api.get('/poetry-works', { params });
    let works = response.works || [];

    // 根据状态筛选
    if (poetryStatus.value !== 'all') {
      works = works.filter(w => w.status === poetryStatus.value.toUpperCase());
    }

    poetryWorks.value = works;
  } catch (error) {
    message.error(error.error || '加载诗词作品失败');
  } finally {
    loading.value = false;
  }
};

// 切换作品类型
const handleWorkTypeChange = (type) => {
  if (type === 'html') {
    loadHtmlWorks();
  } else {
    loadPoetryWorks();
  }
};

// 搜索
const handleSearch = () => {
  if (workType.value === 'html') {
    loadHtmlWorks();
  } else {
    loadPoetryWorks();
  }
};

// 创建按钮
const handleCreate = () => {
  if (workType.value === 'poetry') {
    showPoetryDialog.value = true;
  } else {
    router.push('/works/create');
  }
};

// 提交诗词作品（创建或更新）
const handleSubmitPoetry = async () => {
  try {
    await poetryFormRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (editingPoetryId.value) {
      // 编辑模式
      await api.put(`/poetry-works/${editingPoetryId.value}`, poetryForm.value);
      message.success('保存成功，作品已重新提交审核');
    } else {
      // 创建模式
      await api.post('/poetry-works', poetryForm.value);
      message.success('提交成功，作品已进入审核流程');
    }
    showPoetryDialog.value = false;
    poetryForm.value = { title: '', htmlCode: '' };
    editingPoetryId.value = null;
    loadPoetryWorks();
  } catch (error) {
    message.error(error.error || '提交失败');
  } finally {
    submitting.value = false;
  }
};

// 取消对话框
const handleCancelPoetryDialog = () => {
  showPoetryDialog.value = false;
  poetryForm.value = { title: '', htmlCode: '' };
  editingPoetryId.value = null;
};

// 预览诗词
const handlePreviewPoetry = (work) => {
  previewWork.value = work;
  showPreviewDialog.value = true;
};

// 编辑诗词
const handleEditPoetry = (work) => {
  editingPoetryId.value = work.id;
  poetryForm.value = {
    title: work.title,
    htmlCode: work.htmlCode
  };
  showPoetryDialog.value = true;
};

// 分享诗词
const handleSharePoetry = async (work) => {
  const shareUrl = `${window.location.origin}/poetry/${work.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    message.success('分享链接已复制');
  } catch {
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('分享链接已复制');
  }
};

// 删除诗词
const handleDeletePoetry = (work) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除作品《${work.title}》吗？此操作不可恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/poetry-works/${work.id}`);
        message.success('删除成功');
        loadPoetryWorks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

// 删除HTML作品
const handleDeleteHtml = (id) => {
  const workToDelete = htmlWorks.value.find(w => w.id === id);

  if (!workToDelete || workToDelete.authorId !== currentUserId.value) {
    message.error('无权删除此作品');
    return;
  }

  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个作品吗？此操作不可恢复。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await htmlWorkAPI.deleteWork(id);
        message.success('删除成功');
        loadHtmlWorks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN,
  });
};

onMounted(() => {
  // 默认加载诗词作品
  loadPoetryWorks();
});
</script>

<style scoped>
.work-card {
  transition: all 0.3s;
  cursor: pointer;
}

.work-card:hover {
  transform: translateY(-4px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poetry-preview-frame {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
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

.preview-modal-content {
  height: calc(80vh - 140px);
  display: flex;
  flex-direction: column;
}

.fullscreen-preview {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 8px;
}
</style>
