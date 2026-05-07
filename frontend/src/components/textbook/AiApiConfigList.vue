<template>
  <div class="ai-config-list">
    <div class="config-header">
      <h3>AI API 配置</h3>
      <n-space>
        <n-button size="small" @click="loadEmbeddingStats" :loading="loadingStats">
          <template #icon><n-icon><StatsChartOutline /></n-icon></template>
          队列状态
        </n-button>
        <n-button type="primary" size="small" @click="openAddModal">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          添加配置
        </n-button>
      </n-space>
    </div>

    <!-- Embedding 队列统计 -->
    <n-collapse-transition :show="showEmbeddingStats">
      <div class="embedding-stats-card">
        <div class="stats-title">Embedding 队列状态</div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ embeddingStats.pending || 0 }}</span>
            <span class="stat-label">待处理</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ embeddingStats.processing || 0 }}</span>
            <span class="stat-label">处理中</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ embeddingStats.completed || 0 }}</span>
            <span class="stat-label">已完成</span>
          </div>
          <div class="stat-item error">
            <span class="stat-value">{{ embeddingStats.failed || 0 }}</span>
            <span class="stat-label">失败</span>
          </div>
        </div>
        <n-space v-if="embeddingStats.failed > 0" style="margin-top: 8px;">
          <n-button size="tiny" @click="retryFailed">重试失败任务</n-button>
          <n-button size="tiny" @click="cleanupTasks">清理已完成</n-button>
        </n-space>
      </div>
    </n-collapse-transition>

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
              <n-tag :type="getConfigTypeTag(config.configType)" size="small">{{ getConfigTypeLabel(config.configType) }}</n-tag>
              <n-tag v-if="config.isDefault" type="success" size="small">默认</n-tag>
              <n-tag v-if="!config.isEnabled" type="warning" size="small">已停用</n-tag>
              <n-tag v-if="config.configType === 'embedding' && config.enablePsychologyRAG" type="info" size="small">RAG</n-tag>
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
            <div v-if="config.configType === 'llm' || config.llmModel" class="info-row">
              <span class="label">LLM模型:</span>
              <span class="value">{{ config.llmModel || config.model || '-' }}</span>
            </div>
            <div v-if="config.configType === 'embedding' || config.embeddingModel" class="info-row">
              <span class="label">Emb模型:</span>
              <span class="value">{{ config.embeddingModel || config.model || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">API Key:</span>
              <span class="value">{{ config.hasApiKey ? '已设置' : '未设置' }}</span>
            </div>
            <div v-if="config.configType === 'embedding' && config.embeddingDimension" class="info-row">
              <span class="label">向量维度:</span>
              <span class="value">{{ config.embeddingDimension }}</span>
            </div>
          </div>
        </div>
      </div>
    </n-spin>

    <!-- 添加/编辑弹窗 -->
    <n-modal v-model:show="showAddModal" preset="dialog" :title="editingConfig ? '编辑配置' : '添加配置'" style="width: 520px;">
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="100">
        <n-form-item label="配置类型" path="configType">
          <n-radio-group v-model:value="formData.configType">
            <n-radio-button value="llm">LLM 对话</n-radio-button>
            <n-radio-button value="embedding">Embedding</n-radio-button>
            <n-radio-button value="reranker" disabled>Reranker</n-radio-button>
          </n-radio-group>
        </n-form-item>
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
        <n-form-item label="模型名称">
          <n-select
            v-model:value="formData.models[formData.configType]"
            :options="currentModelOptions"
            placeholder="请先刷新模型列表"
            filterable
            tag
            :loading="fetchingModels"
          />
          <template #feedback>
            <span v-if="currentModelOptions.length > 0" class="input-hint success">
              已发现 {{ currentModelOptions.length }} 个可用模型
            </span>
            <span v-else-if="currentModelError" class="input-hint error">
              {{ currentModelError }}
            </span>
          </template>
        </n-form-item>
        <n-form-item v-if="formData.configType === 'llm'" label="温度参数">
          <n-slider v-model:value="formData.temperature" :min="0" :max="2" :step="0.1" style="flex: 1;" />
          <span class="slider-value">{{ formData.temperature }}</span>
        </n-form-item>
        <n-form-item v-if="formData.configType === 'llm'" label="最大 Token">
          <n-input-number v-model:value="formData.maxTokens" :min="100" :max="512000" :step="100" style="width: 100%;" />
        </n-form-item>
        <n-form-item v-if="formData.configType === 'embedding'" label="启用心理RAG">
          <n-switch v-model:value="formData.enablePsychologyRAG" />
          <span class="switch-hint">启用后，日记将自动生成向量用于心理分析检索</span>
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
import Add from '@vicons/ionicons5/es/Add'
import EllipsisVertical from '@vicons/ionicons5/es/EllipsisVertical'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import BanOutline from '@vicons/ionicons5/es/BanOutline'
import StatsChartOutline from '@vicons/ionicons5/es/StatsChartOutline'
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

// Embedding 队列统计相关
const loadingStats = ref(false);
const showEmbeddingStats = ref(false);
const embeddingStats = ref({ pending: 0, processing: 0, completed: 0, failed: 0 });

// 模型列表 - 按 configType 隔离存储
const fetchingModels = ref(false);
const availableModelsMap = ref({
  llm: [],
  embedding: []
});
const modelFetchErrorMap = ref({
  llm: '',
  embedding: ''
});

const formData = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
  // model 按 configType 隔离
  models: {
    llm: '',
    embedding: ''
  },
  temperature: 0.7,
  maxTokens: 2000,
  isDefault: false,
  configType: 'llm',
  enablePsychologyRAG: false
});

const formRules = {
  name: { required: true, message: '请输入名称' },
  baseUrl: { required: true, message: '请输入服务器地址' }
};

// 当前类型的模型选项
const currentModelOptions = computed(() => {
  const type = formData.value.configType;
  return availableModelsMap.value[type].map(m => ({
    label: m.name,
    value: m.id
  }));
});

// 当前类型的模型错误
const currentModelError = computed(() => {
  return modelFetchErrorMap.value[formData.value.configType];
});

// 配置类型标签
const getConfigTypeLabel = (type) => {
  const labels = { llm: 'LLM', embedding: 'Embedding', reranker: 'Reranker' };
  return labels[type] || 'LLM';
};

const getConfigTypeTag = (type) => {
  const tags = { llm: 'default', embedding: 'info', reranker: 'warning' };
  return tags[type] || 'default';
};

// 加载 Embedding 队列统计
const loadEmbeddingStats = async () => {
  loadingStats.value = true;
  try {
    const res = await aiConfigAPI.getEmbeddingQueueStats();
    if (res.success) {
      embeddingStats.value = res.data;
      showEmbeddingStats.value = true;
    }
  } catch (error) {
    message.error('获取队列状态失败');
  } finally {
    loadingStats.value = false;
  }
};

// 重试失败任务
const retryFailed = async () => {
  try {
    const res = await aiConfigAPI.retryFailedEmbedding();
    if (res.success) {
      message.success(`已重置 ${res.data.retriedCount} 个失败任务`);
      loadEmbeddingStats();
    }
  } catch (error) {
    message.error('重试失败');
  }
};

// 清理已完成任务
const cleanupTasks = async () => {
  try {
    const res = await aiConfigAPI.cleanupEmbedding();
    if (res.success) {
      message.success(`已清理 ${res.data.cleanedCount} 个任务`);
      loadEmbeddingStats();
    }
  } catch (error) {
    message.error('清理失败');
  }
};

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

// 刷新模型列表 - 按当前 configType 存储
const handleFetchModels = async () => {
  if (!formData.value.baseUrl) {
    message.warning('请先输入服务器地址');
    return;
  }

  const currentType = formData.value.configType;
  fetchingModels.value = true;
  modelFetchErrorMap.value[currentType] = '';

  try {
    const res = await aiConfigAPI.fetchModels({
      baseUrl: formData.value.baseUrl,
      apiKey: formData.value.apiKey || undefined
    });

    if (res.success) {
      const models = res.models || [];
      availableModelsMap.value[currentType] = models;
      if (models.length > 0) {
        // 如果当前类型没有选中模型，自动选择第一个
        if (!formData.value.models[currentType]) {
          formData.value.models[currentType] = models[0].id;
        }
        message.success(`发现 ${models.length} 个可用模型`);
      } else {
        message.warning('未发现可用模型');
      }
    } else {
      modelFetchErrorMap.value[currentType] = res.error || '获取模型失败';
      message.error(modelFetchErrorMap.value[currentType]);
    }
  } catch (error) {
    modelFetchErrorMap.value[formData.value.configType] = error.message || '网络错误';
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
    models: {
      llm: '',
      embedding: ''
    },
    temperature: 0.7,
    maxTokens: 2000,
    isDefault: false,
    configType: 'llm',
    enablePsychologyRAG: false
  };
  // 重置模型列表
  availableModelsMap.value = { llm: [], embedding: [] };
  modelFetchErrorMap.value = { llm: '', embedding: '' };
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
  const type = config.configType || 'llm';
  editingConfig.value = config;
  formData.value = {
    name: config.name,
    baseUrl: config.baseUrl,
    apiKey: '', // 不回显密码
    // 从双模型字段加载，优先使用新字段，兼容旧字段
    models: {
      llm: config.llmModel || (type === 'llm' ? config.model : ''),
      embedding: config.embeddingModel || (type === 'embedding' ? config.model : '')
    },
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    isDefault: config.isDefault,
    configType: type,
    enablePsychologyRAG: config.enablePsychologyRAG || false
  };
  // 重置模型列表
  availableModelsMap.value = { llm: [], embedding: [] };
  modelFetchErrorMap.value = { llm: '', embedding: '' };
  showAddModal.value = true;

  // 自动加载已有配置的模型列表（存入对应类型）
  if (config.baseUrl) {
    try {
      const res = await aiConfigAPI.getModels(config.id);
      if (res.success) {
        availableModelsMap.value[type] = res.models || [];
      }
    } catch (error) {
      console.warn('加载模型列表失败:', error);
    }
  }
};

const saveConfig = async () => {
  // 验证当前类型的模型是否已选择
  const currentType = formData.value.configType;
  const currentModel = formData.value.models[currentType];
  if (!currentModel) {
    message.warning('请选择模型');
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    // 构建提交数据，提交双模型字段
    const data = {
      name: formData.value.name,
      baseUrl: formData.value.baseUrl,
      apiKey: formData.value.apiKey || undefined,
      model: currentModel,  // 兼容旧字段
      temperature: formData.value.temperature,
      maxTokens: formData.value.maxTokens,
      isDefault: formData.value.isDefault,
      configType: currentType,
      enablePsychologyRAG: formData.value.enablePsychologyRAG,
      // 双模型字段：始终提交两个模型
      llmModel: formData.value.models.llm || null,
      embeddingModel: formData.value.models.embedding || null
    };
    if (!data.apiKey) delete data.apiKey;

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

/* Embedding 队列统计样式 */
.embedding-stats-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.stats-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background: white;
  border-radius: 6px;
}

.stat-item .stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #18a058;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #666;
}

.stat-item.error .stat-value {
  color: #d03050;
}

.switch-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #999;
}
</style>
