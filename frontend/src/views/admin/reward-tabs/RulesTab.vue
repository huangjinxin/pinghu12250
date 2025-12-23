<template>
  <div class="rules-tab">
    <!-- 筛选和操作栏 -->
    <n-space vertical size="large">
      <n-card>
        <n-space justify="space-between" align="center">
          <n-space>
            <n-input
              v-model:value="ruleStore.filters.keyword"
              placeholder="搜索规则名称"
              clearable
              style="width: 200px"
              @keyup.enter="ruleStore.fetchTemplates(1)"
            />
            <n-select
              v-model:value="ruleStore.filters.typeId"
              :options="ruleStore.typeOptions"
              placeholder="技术类型"
              clearable
              style="width: 150px"
              @update:value="ruleStore.fetchTemplates(1)"
            />
            <n-select
              v-model:value="ruleStore.filters.standardId"
              :options="ruleStore.standardOptions"
              placeholder="展示标准"
              clearable
              style="width: 150px"
              @update:value="ruleStore.fetchTemplates(1)"
            />
            <n-select
              v-model:value="ruleStore.filters.status"
              :options="ruleStore.statusOptions"
              placeholder="状态"
              clearable
              style="width: 120px"
              @update:value="ruleStore.fetchTemplates(1)"
            />
            <n-button @click="ruleStore.resetFilters()">重置</n-button>
          </n-space>
          <n-button type="primary" @click="handleCreate">
            <template #icon><n-icon><Add /></n-icon></template>
            新建规则
          </n-button>
        </n-space>
      </n-card>

      <!-- 规则列表 -->
      <n-card title="规则模板列表">
        <n-spin :show="ruleStore.templatesLoading">
          <n-data-table
            :columns="columns"
            :data="ruleStore.templates"
            :pagination="false"
          />
          <n-pagination
            v-if="ruleStore.pagination.totalPages > 1"
            v-model:page="ruleStore.pagination.page"
            :page-count="ruleStore.pagination.totalPages"
            style="margin-top: 20px; justify-content: center"
            @update:page="ruleStore.fetchTemplates"
          />
        </n-spin>
      </n-card>
    </n-space>

    <!-- 创建/编辑对话框 -->
    <n-modal
      v-model:show="showDialog"
      preset="card"
      :title="editingTemplate ? '编辑规则模板' : '创建规则模板'"
      style="width: 600px"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="120"
      >
        <n-form-item label="规则名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入规则名称" />
        </n-form-item>

        <n-form-item label="规则描述" path="description">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            placeholder="请输入规则描述，如填写要求、注意事项等（选填）"
            :rows="4"
            :maxlength="1000"
            show-count
          />
        </n-form-item>

        <n-form-item label="技术类型" path="typeId">
          <n-select
            v-model:value="formData.typeId"
            :options="ruleStore.typeOptions"
            placeholder="选择技术类型"
          />
        </n-form-item>

        <n-form-item label="展示标准" path="standardId">
          <n-select
            v-model:value="formData.standardId"
            :options="ruleStore.standardOptions"
            placeholder="选择展示标准"
          />
        </n-form-item>

        <n-form-item label="积分" path="points">
          <n-input-number
            v-model:value="formData.points"
            placeholder="正数为奖励，负数为惩罚"
            style="width: 100%"
          />
        </n-form-item>

        <n-form-item label="文本最大字数" path="textMaxLength">
          <n-input-number
            v-model:value="formData.textMaxLength"
            :min="1"
            :max="1000"
            style="width: 100%"
          />
        </n-form-item>

        <n-form-item label="必填项">
          <n-space vertical>
            <n-checkbox v-model:checked="formData.requireText">
              需要文本说明
            </n-checkbox>
            <n-checkbox v-model:checked="formData.requireImage">
              需要上传图片
            </n-checkbox>
            <n-checkbox v-model:checked="formData.requireAudio">
              需要上传音频
            </n-checkbox>
            <n-checkbox v-model:checked="formData.requireLink">
              需要填写链接
            </n-checkbox>
          </n-space>
        </n-form-item>

        <n-form-item label="规则说明音频">
          <n-upload
            :max="1"
            accept="audio/*"
            :custom-request="handleAudioUpload"
            @remove="formData.audioUrl = ''"
          >
            <n-button>上传音频说明（选填）</n-button>
          </n-upload>
          <div v-if="formData.audioUrl" style="margin-top: 8px">
            <audio :src="formData.audioUrl" controls style="width: 100%; max-width: 400px" />
          </div>
        </n-form-item>

        <n-form-item label="允许数量选择">
          <n-checkbox v-model:checked="formData.allowQuantity">
            允许用户选择数量（积分 × 数量）
          </n-checkbox>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showDialog = false">取消</n-button>
          <n-button type="primary" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue';
import { NButton, NTag, NSpace, NPopconfirm, useMessage } from 'naive-ui';
import { Add } from '@vicons/ionicons5';
import { useRewardRuleStore } from '@/stores/rewardRule';

const message = useMessage();
const ruleStore = useRewardRuleStore();

const showDialog = ref(false);
const editingTemplate = ref(null);
const formRef = ref(null);
const formData = ref({
  name: '',
  description: '',
  typeId: '',
  standardId: '',
  points: 0,
  textMaxLength: 500,
  requireText: true,
  requireImage: false,
  requireAudio: false,
  requireLink: false,
  audioUrl: '',
  allowQuantity: false
});

const formRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  typeId: [{ required: true, message: '请选择技术类型', trigger: 'change' }],
  standardId: [{ required: true, message: '请选择展示标准', trigger: 'change' }],
  points: [{ required: true, type: 'number', message: '请输入积分', trigger: 'blur' }],
  textMaxLength: [{ required: true, type: 'number', message: '请输入文本最大字数', trigger: 'blur' }]
};

const columns = [
  { title: '规则名称', key: 'name', width: 150 },
  {
    title: '规则描述',
    key: 'description',
    width: 200,
    ellipsis: {
      tooltip: true
    },
    render: (row) => row.description || '-'
  },
  {
    title: '技术类型',
    key: 'type.name',
    width: 100,
    render: (row) => h(NTag, { type: 'info', size: 'small' }, { default: () => row.type.name })
  },
  {
    title: '展示标准',
    key: 'standard.name',
    width: 120,
    render: (row) => h(NTag, { size: 'small' }, { default: () => row.standard.name })
  },
  {
    title: '积分',
    key: 'points',
    width: 100,
    render: (row) => h(
      NTag,
      { type: row.points > 0 ? 'success' : 'error', size: 'small' },
      { default: () => (row.points > 0 ? '+' : '') + row.points }
    )
  },
  {
    title: '必填项',
    key: 'require',
    width: 150,
    render: (row) => {
      const items = [];
      if (row.requireText) items.push('文本');
      if (row.requireImage) items.push('图片');
      if (row.requireAudio) items.push('音频');
      if (row.requireLink) items.push('链接');
      return items.join(' / ') || '无';
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(
      NTag,
      { type: row.status === 'ENABLED' ? 'success' : 'default', size: 'small' },
      { default: () => row.status === 'ENABLED' ? '已启用' : '已禁用' }
    )
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => h(
      NSpace,
      {},
      {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => handleEdit(row)
            },
            { default: () => '编辑' }
          ),
          h(
            NButton,
            {
              size: 'small',
              onClick: () => ruleStore.toggleTemplateStatus(row.id)
            },
            { default: () => row.status === 'ENABLED' ? '禁用' : '启用' }
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row.id)
            },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
              default: () => '确定删除这个规则模板吗？'
            }
          )
        ]
      }
    )
  }
];

onMounted(async () => {
  await Promise.all([
    ruleStore.fetchTypes(),
    ruleStore.fetchStandards(),
    ruleStore.fetchTemplates()
  ]);
});

function handleCreate() {
  editingTemplate.value = null;
  formData.value = {
    name: '',
    description: '',
    typeId: '',
    standardId: '',
    points: 0,
    textMaxLength: 500,
    requireText: true,
    requireImage: false,
    requireAudio: false,
    requireLink: false,
    audioUrl: '',
    allowQuantity: false
  };
  showDialog.value = true;
}

function handleEdit(template) {
  editingTemplate.value = template;
  formData.value = {
    name: template.name,
    description: template.description || '',
    typeId: template.typeId,
    standardId: template.standardId,
    points: template.points,
    textMaxLength: template.textMaxLength,
    requireText: template.requireText,
    requireImage: template.requireImage,
    requireAudio: template.requireAudio,
    requireLink: template.requireLink,
    audioUrl: template.audioUrl || '',
    allowQuantity: template.allowQuantity
  };
  showDialog.value = true;
}

// 处理音频上传
async function handleAudioUpload({ file, onFinish, onError }) {
  try {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file.file);
    uploadFormData.append('type', 'audio');

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: uploadFormData
    });

    if (!response.ok) {
      throw new Error('上传失败');
    }

    const data = await response.json();
    formData.value.audioUrl = data.url;
    message.success('音频上传成功');
    onFinish();
  } catch (error) {
    console.error('上传音频失败:', error);
    message.error('上传音频失败：' + error.message);
    onError();
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();

    if (editingTemplate.value) {
      await ruleStore.updateTemplate(editingTemplate.value.id, formData.value);
      message.success('更新成功');
    } else {
      await ruleStore.createTemplate(formData.value);
      message.success('创建成功');
    }

    showDialog.value = false;
  } catch (error) {
    if (error?.message) {
      message.error(error.message);
    }
  }
}

async function handleDelete(id) {
  try {
    await ruleStore.deleteTemplate(id);
    message.success('删除成功');
  } catch (error) {
    message.error(error.response?.data?.error || '删除失败');
  }
}
</script>

<style scoped>
.rules-tab {
  padding: 20px 0;
}
</style>
