<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="modalTitle"
    :style="{ width: '680px', maxWidth: '95vw' }"
    :mask-closable="false"
  >
    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 教材提示词 -->
      <n-tab-pane name="textbook" tab="教材提示词">
        <div class="prompt-section">
          <div class="section-header">
            <span class="section-title">当前教材专用提示词</span>
            <n-space>
              <n-button size="small" @click="copyDefaultTemplate" :loading="copying">
                从模板复制
              </n-button>
              <n-button size="small" type="primary" @click="openCreateForm('textbook')">
                新建提示词
              </n-button>
            </n-space>
          </div>

          <n-spin :show="loading">
            <div v-if="textbookPrompts.length === 0" class="empty-hint">
              暂无专用提示词，可从模板复制或新建
            </div>
            <div v-else class="prompt-list">
              <div
                v-for="prompt in textbookPrompts"
                :key="prompt.id"
                class="prompt-item"
                :class="{ active: prompt.isActive }"
              >
                <div class="prompt-header">
                  <span class="prompt-name">{{ prompt.name }}</span>
                  <n-tag v-if="prompt.isActive" type="success" size="small">使用中</n-tag>
                </div>
                <div class="prompt-desc">{{ prompt.description || '无描述' }}</div>
                <div class="prompt-actions">
                  <n-button
                    v-if="!prompt.isActive"
                    text
                    size="small"
                    type="primary"
                    @click="activatePrompt(prompt.id)"
                  >
                    使用此模板
                  </n-button>
                  <n-button text size="small" @click="editPrompt(prompt, 'textbook')">
                    编辑
                  </n-button>
                  <n-button text size="small" type="error" @click="deletePrompt(prompt.id, 'textbook')">
                    删除
                  </n-button>
                </div>
              </div>
            </div>
          </n-spin>
        </div>
      </n-tab-pane>

      <!-- 科目默认模板 -->
      <n-tab-pane name="templates" tab="科目模板库">
        <div class="prompt-section">
          <div class="section-header">
            <span class="section-title">科目默认模板</span>
            <n-button size="small" type="primary" @click="openCreateForm('template')">
              新建模板
            </n-button>
          </div>

          <n-spin :show="loadingTemplates">
            <div v-if="subjectTemplates.length === 0" class="empty-hint">
              暂无科目模板
            </div>
            <div v-else class="prompt-list">
              <div
                v-for="template in subjectTemplates"
                :key="template.id"
                class="prompt-item"
                :class="{ default: template.isDefault }"
              >
                <div class="prompt-header">
                  <span class="prompt-name">{{ template.name }}</span>
                  <n-tag v-if="template.subject" size="small">{{ getSubjectLabel(template.subject) }}</n-tag>
                  <n-tag v-if="template.isDefault" type="info" size="small">默认</n-tag>
                </div>
                <div class="prompt-desc">{{ template.description || '无描述' }}</div>
                <div class="prompt-actions">
                  <n-button
                    v-if="!template.isDefault"
                    text
                    size="small"
                    type="primary"
                    @click="setAsDefault(template.id)"
                  >
                    设为默认
                  </n-button>
                  <n-button text size="small" @click="editPrompt(template, 'template')">
                    编辑
                  </n-button>
                  <n-button text size="small" type="error" @click="deletePrompt(template.id, 'template')">
                    删除
                  </n-button>
                </div>
              </div>
            </div>
          </n-spin>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- 编辑/创建表单弹窗 -->
    <n-modal
      v-model:show="showForm"
      preset="card"
      :title="formTitle"
      :style="{ width: '560px', maxWidth: '95vw' }"
    >
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="top">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="输入提示词名称" />
        </n-form-item>

        <n-form-item v-if="formType === 'template'" label="适用科目" path="subject">
          <n-select
            v-model:value="formData.subject"
            :options="subjectOptions"
            placeholder="选择科目（留空为通用）"
            clearable
          />
        </n-form-item>

        <n-form-item label="提示词内容" path="promptText">
          <n-input
            v-model:value="formData.promptText"
            type="textarea"
            :rows="10"
            placeholder="输入提示词内容，可使用变量：{{content}} 课本内容、{{page_range}} 页码范围"
          />
        </n-form-item>

        <n-form-item label="描述" path="description">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            :rows="2"
            placeholder="简要描述这个提示词的用途"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showForm = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? '保存修改' : '创建' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { aiPromptAPI } from '@/api/index';

const message = useMessage();
const dialog = useDialog();

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  textbookId: {
    type: String,
    default: ''
  },
  textbookName: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:show', 'prompt-changed']);

// 状态
const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
});

const activeTab = ref('textbook');
const loading = ref(false);
const loadingTemplates = ref(false);
const copying = ref(false);
const saving = ref(false);

const textbookPrompts = ref([]);
const subjectTemplates = ref([]);

// 表单状态
const showForm = ref(false);
const formRef = ref(null);
const formType = ref('textbook'); // 'textbook' | 'template'
const isEditing = ref(false);
const editingId = ref(null);
const formData = ref({
  name: '',
  subject: null,
  promptText: '',
  description: ''
});

const formRules = {
  name: { required: true, message: '请输入名称' },
  promptText: { required: true, message: '请输入提示词内容' }
};

const modalTitle = computed(() => {
  return props.textbookName ? `提示词管理 - ${props.textbookName}` : '提示词管理';
});

const formTitle = computed(() => {
  if (isEditing.value) {
    return formType.value === 'textbook' ? '编辑教材提示词' : '编辑科目模板';
  }
  return formType.value === 'textbook' ? '新建教材提示词' : '新建科目模板';
});

const subjectOptions = [
  { label: '语文', value: 'CHINESE' },
  { label: '数学', value: 'MATH' },
  { label: '英语', value: 'ENGLISH' },
  { label: '科学', value: 'SCIENCE' },
  { label: '道德与法治', value: 'MORAL' },
  { label: '其他', value: 'OTHER' }
];

const getSubjectLabel = (value) => {
  const option = subjectOptions.find(o => o.value === value);
  return option?.label || '通用';
};

// 加载教材提示词
const loadTextbookPrompts = async () => {
  if (!props.textbookId) return;

  loading.value = true;
  try {
    const res = await aiPromptAPI.getTextbookPrompts(props.textbookId);
    if (res.data?.success) {
      textbookPrompts.value = res.data.data || [];
    }
  } catch (error) {
    console.error('加载教材提示词失败:', error);
  } finally {
    loading.value = false;
  }
};

// 加载科目模板
const loadSubjectTemplates = async () => {
  loadingTemplates.value = true;
  try {
    const res = await aiPromptAPI.getList();
    if (res.data?.success) {
      subjectTemplates.value = res.data.data || [];
    }
  } catch (error) {
    console.error('加载科目模板失败:', error);
  } finally {
    loadingTemplates.value = false;
  }
};

// 从默认模板复制
const copyDefaultTemplate = async () => {
  if (!props.textbookId) return;

  copying.value = true;
  try {
    const res = await aiPromptAPI.copyDefaultToTextbook(props.textbookId);
    if (res.data?.success) {
      message.success('已复制默认模板');
      loadTextbookPrompts();
    } else {
      message.error(res.data?.error || '复制失败');
    }
  } catch (error) {
    message.error('复制失败');
  } finally {
    copying.value = false;
  }
};

// 激活提示词
const activatePrompt = async (id) => {
  try {
    const res = await aiPromptAPI.activateTextbookPrompt(id);
    if (res.data?.success) {
      message.success('已切换提示词');
      loadTextbookPrompts();
      emit('prompt-changed');
    }
  } catch (error) {
    message.error('操作失败');
  }
};

// 设为默认
const setAsDefault = async (id) => {
  try {
    const res = await aiPromptAPI.setDefault(id);
    if (res.data?.success) {
      message.success('已设为默认');
      loadSubjectTemplates();
    }
  } catch (error) {
    message.error('操作失败');
  }
};

// 打开创建表单
const openCreateForm = (type) => {
  formType.value = type;
  isEditing.value = false;
  editingId.value = null;
  formData.value = {
    name: '',
    subject: props.subject || null,
    promptText: '',
    description: ''
  };
  showForm.value = true;
};

// 编辑提示词
const editPrompt = (prompt, type) => {
  formType.value = type;
  isEditing.value = true;
  editingId.value = prompt.id;
  formData.value = {
    name: prompt.name,
    subject: prompt.subject || null,
    promptText: prompt.promptText,
    description: prompt.description || ''
  };
  showForm.value = true;
};

// 删除提示词
const deletePrompt = (id, type) => {
  dialog.warning({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (type === 'textbook') {
          await aiPromptAPI.deleteTextbookPrompt(id);
          loadTextbookPrompts();
        } else {
          await aiPromptAPI.delete(id);
          loadSubjectTemplates();
        }
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
};

// 保存
const handleSave = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    if (formType.value === 'textbook') {
      if (isEditing.value) {
        await aiPromptAPI.updateTextbookPrompt(editingId.value, formData.value);
      } else {
        await aiPromptAPI.createTextbookPrompt(props.textbookId, formData.value);
      }
      loadTextbookPrompts();
    } else {
      if (isEditing.value) {
        await aiPromptAPI.update(editingId.value, formData.value);
      } else {
        await aiPromptAPI.create(formData.value);
      }
      loadSubjectTemplates();
    }

    message.success(isEditing.value ? '保存成功' : '创建成功');
    showForm.value = false;
  } catch (error) {
    message.error('操作失败');
  } finally {
    saving.value = false;
  }
};

// 监听显示状态
watch(() => props.show, (val) => {
  if (val) {
    loadTextbookPrompts();
    loadSubjectTemplates();
  }
});
</script>

<style scoped>
.prompt-section {
  min-height: 200px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.empty-hint {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-item {
  padding: 14px 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.2s;
}

.prompt-item:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.prompt-item.active {
  background: #f0f9eb;
  border-color: #b7eb8f;
}

.prompt-item.default {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.prompt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.prompt-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.prompt-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 10px;
}

.prompt-actions {
  display: flex;
  gap: 12px;
}
</style>
