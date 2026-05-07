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
        创建作品
      </n-button>
    </div>

    <!-- 栏目选择 -->
    <n-card>
      <n-spin :show="loadingCategories">
        <n-tabs v-model:value="currentCategory" type="segment" @update:value="handleCategoryChange">
          <n-tab-pane
            v-for="cat in categories"
            :key="cat.slug"
            :name="cat.slug"
            :tab="cat.icon ? `${cat.icon} ${cat.name}` : cat.name"
          >
            <!-- 状态筛选 -->
            <div class="mt-4">
              <n-tabs v-model:value="currentStatus" type="line" @update:value="loadWorks">
                <n-tab-pane name="all" tab="全部" />
                <n-tab-pane name="PENDING" tab="待审核" />
                <n-tab-pane name="APPROVED" tab="已发布" />
                <n-tab-pane name="REJECTED" tab="已拒绝" />
              </n-tabs>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-spin>
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
      <div v-if="works.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card
          v-for="work in works"
          :key="work.id"
          class="work-card"
          hoverable
          @click="handlePreview(work)"
        >
          <div class="work-preview h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden">
            <iframe
              :srcdoc="work.htmlCode"
              class="preview-frame"
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
              <n-tag size="tiny" :bordered="false">{{ work.Category?.icon }} {{ work.Category?.name }}</n-tag>
              <span>{{ formatDate(work.createdAt) }}</span>
              <span class="flex items-center gap-1">
                <n-icon><HeartOutline /></n-icon>
                {{ work.likesCount || 0 }}
              </span>
            </div>

            <!-- 拒绝原因 -->
            <div v-if="work.status === 'REJECTED' && work.reviewReason" class="text-xs text-red-500">
              拒绝原因：{{ work.reviewReason }}
            </div>

            <div class="flex gap-2 flex-wrap" @click.stop>
              <n-button size="small" @click="handlePreview(work)">预览</n-button>
              <n-button size="small" type="info" @click="handleEdit(work)">编辑</n-button>
              <n-button v-if="work.status === 'APPROVED'" size="small" @click="handleShare(work)">分享</n-button>
              <n-button size="small" type="error" @click="handleDelete(work)">删除</n-button>
            </div>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="还没有创建任何作品" class="py-12">
        <template #extra>
          <n-button type="primary" @click="handleCreate">立即创建</n-button>
        </template>
      </n-empty>
    </n-spin>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center mt-6">
      <n-pagination
        v-model:page="pagination.page"
        :page-count="pagination.totalPages"
        @update:page="loadWorks"
      />
    </div>

    <!-- 预览对话框 -->
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
          <n-button type="info" @click="showPreviewDialog = false; handleEdit(previewWork)">编辑</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 创建/编辑对话框 -->
    <n-modal
      v-model:show="showEditDialog"
      preset="card"
      :title="editingWorkId ? '编辑作品' : '创建作品'"
      style="width: 800px; max-width: 95vw;"
    >
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top">
        <n-form-item label="选择栏目" path="categoryId">
          <n-select
            v-model:value="form.categoryId"
            :options="categoryOptions"
            placeholder="请选择栏目"
          />
        </n-form-item>

        <n-form-item v-if="isPoetryCategory" label="作品类型" path="type">
          <n-select
            v-model:value="form.type"
            :options="typeOptions"
            placeholder="请选择类型"
          />
        </n-form-item>

        <n-form-item label="作品标题" path="title">
          <n-input v-model:value="form.title" placeholder="输入作品标题" />
        </n-form-item>

        <n-form-item label="HTML代码" path="htmlCode">
          <n-input
            v-model:value="form.htmlCode"
            type="textarea"
            placeholder="输入完整的HTML代码..."
            :rows="15"
            style="font-family: monospace;"
          />
        </n-form-item>

        <n-form-item label="内容简介（用于复制）" path="plainText">
          <n-input
            v-model:value="form.plainText"
            type="textarea"
            placeholder="输入作品的纯文本内容，如诗词正文（不含拼音），方便他人复制..."
            :rows="6"
          />
          <template #feedback>
            <span class="text-xs text-gray-400">此内容将用于"复制"功能，建议填写诗词原文等纯文本内容</span>
          </template>
        </n-form-item>

        <n-collapse>
          <n-collapse-item title="HTML模板示例" name="template">
            <pre class="code-preview">{{ htmlTemplate }}</pre>
            <n-button size="small" @click="form.htmlCode = htmlTemplate" style="margin-top: 10px;">
              使用此模板
            </n-button>
          </n-collapse-item>
        </n-collapse>

        <n-alert type="info" style="margin-top: 16px;">
          提交后作品将进入审核流程，审核通过后会自动发布并获得积分奖励。
        </n-alert>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCancelDialog">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingWorkId ? '保存修改' : '提交审核' }}
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
import api from '@/api';
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();

// 状态
const loading = ref(false);
const loadingCategories = ref(false);
const categories = ref([]);
const currentCategory = ref('');
const currentStatus = ref('all');
const searchQuery = ref('');
const works = ref([]);
const pagination = ref({ page: 1, limit: 12, total: 0, totalPages: 0 });

// 对话框相关
const showPreviewDialog = ref(false);
const previewWork = ref(null);
const showEditDialog = ref(false);
const editingWorkId = ref(null);
const submitting = ref(false);
const formRef = ref(null);
const form = ref({
  categoryId: '',
  type: null,
  title: '',
  htmlCode: '',
  plainText: ''
});

// 类型选项（诗词文章栏目用）
const typeOptions = [
  { label: '诗', value: '诗' },
  { label: '词', value: '词' },
  { label: '古文', value: '古文' },
  { label: '现代文', value: '现代文' },
  { label: '其他', value: '其他' },
];

// 判断当前选择的栏目是否为诗词文章
const isPoetryCategory = computed(() => {
  const cat = categories.value.find(c => c.id === form.value.categoryId);
  return cat?.slug === 'poetry';
});

const formRules = {
  categoryId: { required: true, message: '请选择栏目', trigger: 'change' },
  title: { required: true, message: '请输入作品标题', trigger: 'blur' },
  htmlCode: { required: true, message: '请输入HTML代码', trigger: 'blur' }
};

// 栏目选项
const categoryOptions = computed(() => {
  return categories.value.map(cat => ({
    label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name,
    value: cat.id
  }));
});

// HTML模板
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
    .container {
      background: rgba(255,255,255,0.95);
      padding: 40px 60px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 {
      font-size: 32px;
      color: #8B4513;
      margin-bottom: 20px;
    }
    .content {
      font-size: 20px;
      line-height: 1.8;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>作品标题</h1>
    <div class="content">
      在这里编写你的内容...
    </div>
  </div>
</body>
</html>`;

// 加载栏目列表
const loadCategories = async () => {
  loadingCategories.value = true;
  try {
    const response = await api.get('/categories');
    categories.value = response.data || [];
    if (categories.value.length > 0 && !currentCategory.value) {
      currentCategory.value = categories.value[0].slug;
      loadWorks();
    }
  } catch (error) {
    message.error(error.error || '加载栏目失败');
  } finally {
    loadingCategories.value = false;
  }
};

// 加载作品列表
const loadWorks = async () => {
  loading.value = true;
  try {
    const params = {
      category: currentCategory.value,
      page: pagination.value.page,
      limit: pagination.value.limit,
    };

    if (currentStatus.value !== 'all') {
      params.status = currentStatus.value;
    }

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    const response = await api.get('/creative-works/my', { params });
    works.value = response.data?.works || [];
    pagination.value = {
      ...pagination.value,
      ...response.data?.pagination
    };
  } catch (error) {
    message.error(error.error || '加载作品失败');
  } finally {
    loading.value = false;
  }
};

// 切换栏目
const handleCategoryChange = () => {
  pagination.value.page = 1;
  currentStatus.value = 'all';
  loadWorks();
};

// 搜索
const handleSearch = () => {
  pagination.value.page = 1;
  loadWorks();
};

// 创建作品
const handleCreate = () => {
  editingWorkId.value = null;
  form.value = {
    categoryId: categories.value.find(c => c.slug === currentCategory.value)?.id || '',
    type: null,
    title: '',
    htmlCode: '',
    plainText: ''
  };
  showEditDialog.value = true;
};

// 编辑作品
const handleEdit = (work) => {
  editingWorkId.value = work.id;
  form.value = {
    categoryId: work.categoryId,
    type: work.type || null,
    title: work.title,
    htmlCode: work.htmlCode,
    plainText: work.plainText || ''
  };
  showEditDialog.value = true;
};

// 预览作品
const handlePreview = (work) => {
  previewWork.value = work;
  showPreviewDialog.value = true;
};

// 分享作品
const handleShare = async (work) => {
  const shareUrl = `${window.location.origin}/creative/${work.id}`;
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

// 删除作品
const handleDelete = (work) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除作品《${work.title}》吗？此操作不可恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/creative-works/${work.id}`);
        message.success('删除成功');
        loadWorks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (editingWorkId.value) {
      await api.put(`/creative-works/${editingWorkId.value}`, {
        title: form.value.title,
        type: form.value.type,
        htmlCode: form.value.htmlCode,
        plainText: form.value.plainText,
        categoryId: form.value.categoryId
      });
      message.success('保存成功，作品已重新提交审核');
    } else {
      await api.post('/creative-works', form.value);
      message.success('提交成功，作品已进入审核流程');
    }
    showEditDialog.value = false;
    form.value = { categoryId: '', type: null, title: '', htmlCode: '', plainText: '' };
    editingWorkId.value = null;
    loadWorks();
  } catch (error) {
    message.error(error.error || '提交失败');
  } finally {
    submitting.value = false;
  }
};

// 取消对话框
const handleCancelDialog = () => {
  showEditDialog.value = false;
  form.value = { categoryId: '', type: null, title: '', htmlCode: '', plainText: '' };
  editingWorkId.value = null;
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN,
  });
};

onMounted(() => {
  loadCategories();
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

.preview-frame {
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
