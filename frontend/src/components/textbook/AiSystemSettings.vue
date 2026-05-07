<template>
  <div class="ai-system-settings">
    <!-- 系统提示词 -->
    <div class="section">
      <div class="section-header">
        <h3>系统级提示词</h3>
        <n-tooltip>
          <template #trigger>
            <n-icon size="18" color="#999"><InformationCircleOutline /></n-icon>
          </template>
          系统提示词是所有 AI 调用的基础角色设定，会作为 system message 发送给 AI
        </n-tooltip>
      </div>
      <p class="section-desc">定义 AI 的基础角色和行为规范，适用于所有教材分析</p>

      <n-spin :show="loading">
        <n-input
          v-model:value="systemPrompt"
          type="textarea"
          placeholder="输入系统级提示词，例如：你是一位经验丰富的小学教师..."
          :rows="10"
        />
      </n-spin>

      <div class="section-actions">
        <n-button @click="resetSystemPrompt">恢复默认</n-button>
        <n-button type="primary" :loading="savingSystem" @click="saveSystemPrompt">保存</n-button>
      </div>
    </div>

    <!-- 初始化默认模板 -->
    <div v-if="props.showInitDefaults" class="section">
      <div class="section-header">
        <h3>初始化默认模板</h3>
      </div>
      <p class="section-desc">一键创建语文、数学、英语等学科的默认提示词模板</p>

      <n-button :loading="initializing" @click="initDefaults">
        <template #icon>
          <n-icon><RefreshOutline /></n-icon>
        </template>
        初始化默认模板
      </n-button>
    </div>

    <!-- 默认提示词预览 -->
    <div class="section">
      <div class="section-header">
        <h3>默认模板预览</h3>
      </div>
      <n-collapse>
        <n-collapse-item title="系统默认提示词" name="system">
          <pre class="preview-text">{{ defaultSystemPrompt }}</pre>
        </n-collapse-item>
        <n-collapse-item title="语文默认模板" name="chinese">
          <pre class="preview-text">{{ defaultChinesePrompt }}</pre>
        </n-collapse-item>
        <n-collapse-item title="数学默认模板" name="math">
          <pre class="preview-text">{{ defaultMathPrompt }}</pre>
        </n-collapse-item>
        <n-collapse-item title="英语默认模板" name="english">
          <pre class="preview-text">{{ defaultEnglishPrompt }}</pre>
        </n-collapse-item>
      </n-collapse>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import InformationCircleOutline from '@vicons/ionicons5/es/InformationCircleOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import { aiPromptAPI } from '@/api/index';

const props = defineProps({
  showInitDefaults: { type: Boolean, default: true }
});

const message = useMessage();

const loading = ref(false);
const savingSystem = ref(false);
const initializing = ref(false);
const systemPrompt = ref('');

// 默认提示词内容
const defaultSystemPrompt = `你是一位经验丰富的小学教师，正在辅导学生阅读和理解课本内容。

请遵循以下原则：
1. 使用简单易懂的语言，适合小学生理解
2. 鼓励学生思考，而不是直接给出答案
3. 关注知识的趣味性和实用性
4. 如果涉及生僻字词，需要注音和解释
5. 适当引入相关的课外知识拓展视野`;

const defaultChinesePrompt = `请分析以下语文课文内容（{{page_range}}）：

{{content}}

请从以下角度帮助学生理解：
1. 【生字词解析】找出本段生词，标注拼音并解释含义
2. 【段落大意】用一两句话概括主要内容
3. 【写作特点】分析作者使用的修辞手法或表达技巧
4. 【思考问题】提出 1-2 个启发思考的问题
5. 【好词好句】摘录值得学习的优美句子`;

const defaultMathPrompt = `请分析以下数学课本内容（{{page_range}}）：

{{content}}

请帮助学生理解：
1. 【知识点提炼】本页涉及哪些数学概念或公式
2. 【解题思路】例题的解题步骤和关键技巧
3. 【易错提醒】容易犯错的地方和注意事项
4. 【举一反三】给出一个类似的练习题
5. 【生活应用】这个知识点在生活中的实际应用`;

const defaultEnglishPrompt = `请分析以下英语课本内容（{{page_range}}）：

{{content}}

请帮助学生学习：
1. 【单词学习】列出重点单词，标注音标和中文释义
2. 【语法要点】本课涉及的语法知识
3. 【句型练习】重点句型及其变化形式
4. 【对话理解】如有对话，解释对话场景和用法
5. 【朗读建议】发音注意事项和语调提示`;

// 加载系统提示词
const loadSystemPrompt = async () => {
  loading.value = true;
  try {
    const res = await aiPromptAPI.getSystemPrompt();
    systemPrompt.value = res.data?.promptText || defaultSystemPrompt;
  } catch (error) {
    // 如果没有设置过，使用默认值
    systemPrompt.value = defaultSystemPrompt;
  } finally {
    loading.value = false;
  }
};

// 保存系统提示词
const saveSystemPrompt = async () => {
  if (!systemPrompt.value.trim()) {
    message.warning('提示词内容不能为空');
    return;
  }

  savingSystem.value = true;
  try {
    await aiPromptAPI.saveSystemPrompt({
      promptText: systemPrompt.value,
      description: '系统级提示词'
    });
    message.success('保存成功');
  } catch (error) {
    message.error('保存失败');
  } finally {
    savingSystem.value = false;
  }
};

// 恢复默认
const resetSystemPrompt = () => {
  systemPrompt.value = defaultSystemPrompt;
  message.info('已恢复默认内容，记得点击保存');
};

// 初始化默认模板
const initDefaults = async () => {
  initializing.value = true;
  try {
    const res = await aiPromptAPI.initDefaults();
    message.success(res.message || '初始化完成');
  } catch (error) {
    message.error(error.error || '初始化失败');
  } finally {
    initializing.value = false;
  }
};

onMounted(() => {
  loadSystemPrompt();
});
</script>

<style scoped>
.ai-system-settings {
  padding: 16px;
}

.section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.section-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.section-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.preview-text {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
</style>
