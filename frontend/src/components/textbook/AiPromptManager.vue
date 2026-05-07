<template>
  <div class="ai-prompt-manager">
    <div class="prompt-header">
      <h3>提示词模板</h3>
      <n-space>
        <n-select
          v-model:value="filterSubject"
          placeholder="筛选学科"
          clearable
          size="small"
          style="width: 120px;"
          :options="subjectOptions"
          @update:value="loadPrompts"
        />
        <n-button type="primary" size="small" @click="showAddModal = true">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          添加模板
        </n-button>
      </n-space>
    </div>

    <n-spin :show="loading">
      <div v-if="prompts.length === 0" class="empty-state">
        <n-empty description="暂无提示词模板">
          <template #extra>
            <n-button type="primary" @click="showAddModal = true">添加第一个模板</n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="prompt-list">
        <div
          v-for="prompt in prompts"
          :key="prompt.id"
          class="prompt-item"
          :class="{ disabled: !prompt.isEnabled, default: prompt.isDefault }"
        >
          <div class="prompt-info">
            <div class="prompt-title">
              <span class="name">{{ prompt.name }}</span>
              <n-tag v-if="prompt.subject" size="small" :type="getSubjectType(prompt.subject)">
                {{ getSubjectLabel(prompt.subject) }}
              </n-tag>
              <n-tag v-else size="small">通用</n-tag>
              <n-tag v-if="prompt.isDefault" type="success" size="small">默认</n-tag>
            </div>
            <div class="prompt-desc">{{ prompt.description || '暂无描述' }}</div>
          </div>
          <n-space>
            <n-button size="tiny" @click="editPrompt(prompt)">编辑</n-button>
            <n-button size="tiny" @click="previewPrompt(prompt)">预览</n-button>
            <n-dropdown
              trigger="click"
              :options="getMoreOptions(prompt)"
              @select="(key) => handleMoreAction(key, prompt)"
            >
              <n-button size="tiny">
                <n-icon><EllipsisVertical /></n-icon>
              </n-button>
            </n-dropdown>
          </n-space>
        </div>
      </div>
    </n-spin>

    <!-- 添加/编辑弹窗 -->
    <n-modal v-model:show="showAddModal" preset="dialog" :title="editingPrompt ? '编辑模板' : '添加模板'" style="width: 700px;">
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="top">
        <n-form-item label="模板名称" path="name">
          <n-input v-model:value="formData.name" placeholder="如：语文课文分析" />
        </n-form-item>
        <n-form-item label="适用学科">
          <n-select
            v-model:value="formData.subject"
            placeholder="选择学科（留空为通用）"
            clearable
            :options="subjectOptions"
          />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="formData.description" placeholder="模板描述" />
        </n-form-item>
        <n-form-item label="提示词内容" path="promptText">
          <n-input
            v-model:value="formData.promptText"
            type="textarea"
            placeholder="输入提示词，支持变量：{{content}} {{subject}} {{page}} {{page_range}}"
            :rows="12"
          />
        </n-form-item>
        <div class="variable-hint">
          <strong>可用变量：</strong>
          <code>{{content}}</code> - PDF 文本内容 |
          <code>{{subject}}</code> - 学科名称 |
          <code>{{page}}</code> - 当前页码 |
          <code>{{page_range}}</code> - 页码范围
        </div>
        <n-form-item label="设为默认">
          <n-switch v-model:value="formData.isDefault" />
          <span class="hint">（同一学科只能有一个默认模板）</span>
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showAddModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="savePrompt">保存</n-button>
      </template>
    </n-modal>

    <!-- 预览弹窗 -->
    <n-modal v-model:show="showPreviewModal" preset="dialog" title="提示词预览" style="width: 600px;">
      <pre class="prompt-preview">{{ previewContent }}</pre>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import Add from '@vicons/ionicons5/es/Add'
import EllipsisVertical from '@vicons/ionicons5/es/EllipsisVertical'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import BanOutline from '@vicons/ionicons5/es/BanOutline'
import { NIcon } from 'naive-ui';
import { aiPromptAPI } from '@/api/index';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const saving = ref(false);
const prompts = ref([]);
const filterSubject = ref(null);
const showAddModal = ref(false);
const showPreviewModal = ref(false);
const previewContent = ref('');
const editingPrompt = ref(null);
const formRef = ref(null);

const subjectOptions = [
  { label: '语文', value: 'CHINESE' },
  { label: '数学', value: 'MATH' },
  { label: '英语', value: 'ENGLISH' }
];

const formData = ref({
  name: '',
  subject: null,
  description: '',
  promptText: '',
  isDefault: false
});

const formRules = {
  name: { required: true, message: '请输入模板名称' },
  promptText: { required: true, message: '请输入提示词内容' }
};

const getSubjectLabel = (subject) => {
  const map = { CHINESE: '语文', MATH: '数学', ENGLISH: '英语' };
  return map[subject] || subject;
};

const getSubjectType = (subject) => {
  const map = { CHINESE: 'error', MATH: 'info', ENGLISH: 'warning' };
  return map[subject] || 'default';
};

const loadPrompts = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filterSubject.value) params.subject = filterSubject.value;
    const res = await aiPromptAPI.getList(params);
    prompts.value = res.data || [];
  } catch (error) {
    message.error('加载模板失败');
  } finally {
    loading.value = false;
  }
};

const getMoreOptions = (prompt) => {
  const options = [];

  if (!prompt.isDefault) {
    options.push({
      label: '设为默认',
      key: 'default',
      icon: () => h(NIcon, null, { default: () => h(CheckmarkCircle) })
    });
  }

  options.push({
    label: prompt.isEnabled ? '停用' : '启用',
    key: 'toggle',
    icon: () => h(NIcon, null, { default: () => h(BanOutline) })
  });

  options.push({
    label: '删除',
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
  });

  return options;
};

const handleMoreAction = async (key, prompt) => {
  if (key === 'default') {
    try {
      await aiPromptAPI.setDefault(prompt.id);
      message.success('已设为默认');
      loadPrompts();
    } catch (error) {
      message.error('操作失败');
    }
  } else if (key === 'toggle') {
    try {
      await aiPromptAPI.update(prompt.id, { isEnabled: !prompt.isEnabled });
      message.success(prompt.isEnabled ? '已停用' : '已启用');
      loadPrompts();
    } catch (error) {
      message.error('操作失败');
    }
  } else if (key === 'delete') {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除模板"${prompt.name}"吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await aiPromptAPI.delete(prompt.id);
          message.success('删除成功');
          loadPrompts();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  }
};

const editPrompt = (prompt) => {
  editingPrompt.value = prompt;
  formData.value = {
    name: prompt.name,
    subject: prompt.subject,
    description: prompt.description || '',
    promptText: prompt.promptText,
    isDefault: prompt.isDefault
  };
  showAddModal.value = true;
};

const previewPrompt = (prompt) => {
  previewContent.value = prompt.promptText;
  showPreviewModal.value = true;
};

const savePrompt = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    if (editingPrompt.value) {
      await aiPromptAPI.update(editingPrompt.value.id, formData.value);
      message.success('更新成功');
    } else {
      await aiPromptAPI.create(formData.value);
      message.success('创建成功');
    }

    showAddModal.value = false;
    editingPrompt.value = null;
    formData.value = {
      name: '',
      subject: null,
      description: '',
      promptText: '',
      isDefault: false
    };
    loadPrompts();
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadPrompts();
});
</script>

<style scoped>
.ai-prompt-manager {
  padding: 16px;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.prompt-header h3 {
  margin: 0;
  font-size: 16px;
}

.empty-state {
  padding: 40px;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.prompt-item.disabled {
  opacity: 0.6;
  background: #f5f5f5;
}

.prompt-item.default {
  border-color: #18a058;
}

.prompt-info {
  flex: 1;
}

.prompt-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.prompt-title .name {
  font-weight: 600;
}

.prompt-desc {
  font-size: 13px;
  color: #666;
}

.variable-hint {
  font-size: 12px;
  color: #666;
  margin-bottom: 16px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.variable-hint code {
  background: #e0e0e0;
  padding: 2px 4px;
  border-radius: 2px;
  margin: 0 4px;
}

.hint {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}

.prompt-preview {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  font-size: 13px;
  max-height: 400px;
  overflow: auto;
}
</style>
