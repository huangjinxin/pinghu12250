<template>
  <div class="ai-config-list">
    <div class="config-header">
      <h3>AI API 配置</h3>
      <n-button type="primary" size="small" @click="openAddModal">
        <template #icon>
          <n-icon><Add /></n-icon>
        </template>
        添加配置
      </n-button>
    </div>

    <n-spin :show="loading">
      <div v-if="configs.length === 0" class="empty-state">
        <n-empty description="暂无 AI 配置">
          <template #extra>
            <n-button type="primary" @click="openAddModal">添加第一个配置</n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="config-cards">
        <div
          v-for="config in configs"
          :key="config.id"
          class="config-card"
          :class="{ disabled: !config.isEnabled, default: config.isDefault }"
        >
          <div class="card-header">
            <div class="card-title">
              <span class="name">{{ config.name }}</span>
              <n-tag v-if="config.isDefault" type="success" size="small">默认</n-tag>
              <n-tag v-if="!config.isEnabled" type="warning" size="small">已停用</n-tag>
            </div>
            <n-space>
              <n-button size="tiny" @click="testConfig(config)">测试</n-button>
              <n-button size="tiny" @click="editConfig(config)">编辑</n-button>
              <n-dropdown
                trigger="click"
                :options="getMoreOptions(config)"
                @select="(key) => handleMoreAction(key, config)"
              >
                <n-button size="tiny">
                  <n-icon><EllipsisVertical /></n-icon>
                </n-button>
              </n-dropdown>
            </n-space>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="label">服务器:</span>
              <span class="value">{{ config.baseUrl }}</span>
            </div>
            <div class="info-row">
              <span class="label">模型:</span>
              <span class="value">{{ config.model }}</span>
            </div>
            <div class="info-row">
              <span class="label">API Key:</span>
              <span class="value">{{ config.hasApiKey ? '已设置' : '未设置' }}</span>
            </div>
          </div>
        </div>
      </div>
    </n-spin>

    <!-- 添加/编辑弹窗 -->
    <n-modal v-model:show="showAddModal" preset="dialog" :title="editingConfig ? '编辑配置' : '添加配置'" style="width: 520px;">
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="100">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="如：本地 LM Studio" />
        </n-form-item>
        <n-form-item label="服务器地址" path="baseUrl">
          <n-input-group>
            <n-input
              v-model:value="formData.baseUrl"
              placeholder="如：192.168.88.244:11234"
              style="flex: 1;"
            />
            <n-button
              type="primary"
              :loading="fetchingModels"
              @click="handleFetchModels"
              :disabled="!formData.baseUrl"
            >
              刷新模型
            </n-button>
          </n-input-group>
          <template #feedback>
            <span class="input-hint">只需输入 IP:端口，系统自动补全 /v1 路径</span>
          </template>
        </n-form-item>
        <n-form-item label="API Key">
          <n-input v-model:value="formData.apiKey" type="password" placeholder="可选" show-password-on="click" />
        </n-form-item>
        <n-form-item label="模型名称" path="model">
          <n-select
            v-model:value="formData.model"
            :options="modelOptions"
            placeholder="请先刷新模型列表"
            filterable
            tag
            :loading="fetchingModels"
          />
          <template #feedback>
            <span v-if="modelOptions.length > 0" class="input-hint success">
              已发现 {{ modelOptions.length }} 个可用模型
            </span>
            <span v-else-if="modelFetchError" class="input-hint error">
              {{ modelFetchError }}
            </span>
          </template>
        </n-form-item>
        <n-form-item label="温度参数">
          <n-slider v-model:value="formData.temperature" :min="0" :max="2" :step="0.1" style="flex: 1;" />
          <span class="slider-value">{{ formData.temperature }}</span>
        </n-form-item>
        <n-form-item label="最大 Token">
          <n-input-number v-model:value="formData.maxTokens" :min="100" :max="32000" :step="100" style="width: 100%;" />
        </n-form-item>
        <n-form-item label="设为默认">
          <n-switch v-model:value="formData.isDefault" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showAddModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="saveConfig">保存</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, h, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { Add, EllipsisVertical, TrashOutline, CheckmarkCircle, BanOutline } from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';
import { aiConfigAPI } from '@/api/index';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const saving = ref(false);
const configs = ref([]);
const showAddModal = ref(false);
const editingConfig = ref(null);
const formRef = ref(null);

// 模型列表相关
const fetchingModels = ref(false);
const availableModels = ref([]);
const modelFetchError = ref('');

const formData = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: 2000,
  isDefault: false
});

const formRules = {
  name: { required: true, message: '请输入名称' },
  baseUrl: { required: true, message: '请输入服务器地址' },
  model: { required: true, message: '请选择或输入模型名称' }
};

// 模型选项
const modelOptions = computed(() => {
  return availableModels.value.map(m => ({
    label: m.name,
    value: m.id
  }));
});

const loadConfigs = async () => {
  loading.value = true;
  try {
    const res = await aiConfigAPI.getList();
    configs.value = res.data || [];
  } catch (error) {
    message.error('加载配置失败');
  } finally {
    loading.value = false;
  }
};

// 刷新模型列表
const handleFetchModels = async () => {
  if (!formData.value.baseUrl) {
    message.warning('请先输入服务器地址');
    return;
  }

  fetchingModels.value = true;
  modelFetchError.value = '';

  try {
    const res = await aiConfigAPI.fetchModels({
      baseUrl: formData.value.baseUrl,
      apiKey: formData.value.apiKey || undefined
    });

    if (res.success) {
      availableModels.value = res.models || [];
      if (availableModels.value.length > 0) {
        // 如果当前没有选中模型，自动选择第一个
        if (!formData.value.model) {
          formData.value.model = availableModels.value[0].id;
        }
        message.success(`发现 ${availableModels.value.length} 个可用模型`);
      } else {
        message.warning('未发现可用模型');
      }
    } else {
      modelFetchError.value = res.error || '获取模型失败';
      message.error(modelFetchError.value);
    }
  } catch (error) {
    modelFetchError.value = error.message || '网络错误';
    message.error('获取模型列表失败');
  } finally {
    fetchingModels.value = false;
  }
};

const openAddModal = () => {
  editingConfig.value = null;
  formData.value = {
    name: '',
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2000,
    isDefault: false
  };
  availableModels.value = [];
  modelFetchError.value = '';
  showAddModal.value = true;
};

const getMoreOptions = (config) => {
  const options = [];

  if (!config.isDefault) {
    options.push({
      label: '设为默认',
      key: 'default',
      icon: () => h(NIcon, null, { default: () => h(CheckmarkCircle) })
    });
  }

  options.push({
    label: config.isEnabled ? '停用' : '启用',
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

const handleMoreAction = async (key, config) => {
  if (key === 'default') {
    try {
      await aiConfigAPI.setDefault(config.id);
      message.success('已设为默认');
      loadConfigs();
    } catch (error) {
      message.error('操作失败');
    }
  } else if (key === 'toggle') {
    try {
      await aiConfigAPI.toggle(config.id);
      message.success(config.isEnabled ? '已停用' : '已启用');
      loadConfigs();
    } catch (error) {
      message.error('操作失败');
    }
  } else if (key === 'delete') {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除配置"${config.name}"吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await aiConfigAPI.delete(config.id);
          message.success('删除成功');
          loadConfigs();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  }
};

const testConfig = async (config) => {
  message.loading('测试连接中...');
  try {
    const res = await aiConfigAPI.test(config.id);
    if (res.success) {
      message.success(res.message || '连接成功');
    } else {
      message.error(res.message || '连接失败');
    }
  } catch (error) {
    message.error('测试失败');
  }
};

const editConfig = async (config) => {
  editingConfig.value = config;
  formData.value = {
    name: config.name,
    baseUrl: config.baseUrl,
    apiKey: '', // 不回显密码
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    isDefault: config.isDefault
  };
  availableModels.value = [];
  modelFetchError.value = '';
  showAddModal.value = true;

  // 自动加载已有配置的模型列表
  if (config.baseUrl) {
    try {
      const res = await aiConfigAPI.getModels(config.id);
      if (res.success) {
        availableModels.value = res.models || [];
      }
    } catch (error) {
      console.warn('加载模型列表失败:', error);
    }
  }
};

const saveConfig = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const data = { ...formData.value };
    if (!data.apiKey) delete data.apiKey; // 空密码不更新

    if (editingConfig.value) {
      await aiConfigAPI.update(editingConfig.value.id, data);
      message.success('更新成功');
    } else {
      await aiConfigAPI.create(data);
      message.success('创建成功');
    }

    showAddModal.value = false;
    editingConfig.value = null;
    loadConfigs();
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
.ai-config-list {
  padding: 16px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.config-header h3 {
  margin: 0;
  font-size: 16px;
}

.empty-state {
  padding: 40px;
}

.config-cards {
  display: grid;
  gap: 16px;
}

.config-card {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.config-card.disabled {
  opacity: 0.6;
  background: #f5f5f5;
}

.config-card.default {
  border-color: #18a058;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title .name {
  font-weight: 600;
}

.card-body {
  font-size: 13px;
}

.info-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.info-row .label {
  color: #666;
  min-width: 60px;
}

.info-row .value {
  color: #333;
  word-break: break-all;
}

.slider-value {
  margin-left: 12px;
  min-width: 40px;
}

.input-hint {
  font-size: 12px;
  color: #999;
}

.input-hint.success {
  color: #18a058;
}

.input-hint.error {
  color: #d03050;
}
</style>
