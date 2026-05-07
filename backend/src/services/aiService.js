/**
 * AI 服务层
 * 处理 OpenAI 兼容 API 调用、提示词构建、日志记录等
 * 支持三层提示词架构：系统级 + 科目级 + 教材级
 */

const prisma = require('../lib/prisma');

class AiService {
  /**
   * 获取系统级提示词
   */
  async getSystemPrompt() {
    const systemPrompt = await prisma.systemPrompt.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    return systemPrompt?.promptText || this.getDefaultSystemPrompt();
  }

  /**
   * 默认系统提示词
   */
  getDefaultSystemPrompt() {
    return `你是一位经验丰富的小学教师，正在辅导学生阅读和理解课本内容。

请遵循以下原则：
1. 使用简单易懂的语言，适合小学生理解
2. 鼓励学生思考，而不是直接给出答案
3. 关注知识的趣味性和实用性
4. 如果涉及生僻字词，需要注音和解释
5. 适当引入相关的课外知识拓展视野`;
  }

  /**
   * 获取教材激活的提示词
   * @param {string} textbookId - 教材 ID
   */
  async getTextbookActivePrompt(textbookId) {
    return await prisma.textbookPrompt.findFirst({
      where: {
        textbookId,
        isActive: true
      }
    });
  }
  /**
   * 规范化 API 地址
   * 用户输入：192.168.88.244:11234 或 http://192.168.88.244:11234
   * 输出：http://192.168.88.244:11234/v1
   */
  normalizeBaseUrl(inputUrl) {
    let url = inputUrl.trim();

    // 如果没有协议，添加 http://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }

    // 移除末尾斜杠
    url = url.replace(/\/+$/, '');

    // 如果没有 /v1，添加它
    if (!url.endsWith('/v1')) {
      url = url + '/v1';
    }

    return url;
  }

  /**
   * 获取 API 可用模型列表
   * @param {string} baseUrl - 用户输入的地址（如 192.168.88.244:11234）
   * @param {string} apiKey - API Key（可选）
   */
  async fetchModels(baseUrl, apiKey = null) {
    try {
      const normalizedUrl = this.normalizeBaseUrl(baseUrl);
      const url = `${normalizedUrl}/models`;

      const headers = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // OpenAI 格式的模型列表
      const models = data.data || data.models || [];

      return {
        success: true,
        models: models.map(m => ({
          id: m.id || m.name || m,
          name: m.id || m.name || m,
          owned_by: m.owned_by || 'unknown'
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        models: []
      };
    }
  }

  /**
   * 获取默认 API 配置
   * @param {string} configType - 配置类型，默认 'llm'，可选 'embedding', 'reranker'
   */
  async getDefaultConfig(configType = 'llm') {
    // 优先获取指定类型的默认配置
    const config = await prisma.aiApiConfig.findFirst({
      where: {
        isEnabled: true,
        isDefault: true,
        configType: configType
      }
    });

    if (!config) {
      // 尝试获取指定类型的任意启用配置
      return await prisma.aiApiConfig.findFirst({
        where: {
          isEnabled: true,
          configType: configType
        }
      });
    }

    return config;
  }

  /**
   * 获取默认提示词模板
   * @param {string} subject - 学科（可选）
   */
  async getDefaultPrompt(subject = null) {
    // 优先查找学科特定的默认模板
    if (subject) {
      const subjectPrompt = await prisma.aiPromptTemplate.findFirst({
        where: {
          isEnabled: true,
          isDefault: true,
          subject: subject
        }
      });
      if (subjectPrompt) return subjectPrompt;
    }

    // 查找通用默认模板
    const defaultPrompt = await prisma.aiPromptTemplate.findFirst({
      where: {
        isEnabled: true,
        isDefault: true,
        subject: null
      }
    });

    if (defaultPrompt) return defaultPrompt;

    // 返回系统内置默认模板
    return {
      id: 'system-default',
      name: '系统默认模板',
      promptText: this.getSystemDefaultPrompt(),
      isDefault: true
    };
  }

  /**
   * 系统内置默认提示词
   */
  getSystemDefaultPrompt() {
    return `你是一位专业的{{subject}}教师，正在帮助小学生学习课本知识。

请分析以下教材内容（第 {{page_range}} 页），帮助学生深入理解：

{{content}}

请从以下角度进行分析：
1. **核心知识点**：提炼本页/本段的重点内容
2. **难点解析**：解释可能难以理解的概念或表达
3. **知识关联**：与其他已学知识的联系
4. **学习建议**：给学生的学习方法建议

请用简洁易懂的语言回答，适合小学生阅读理解。`;
  }

  /**
   * 构建完整的分析提示词（三层架构）
   * @param {object} template - 提示词模板
   * @param {string} pdfContent - PDF 文本内容
   * @param {object} options - 选项（subject, page, pageRange）
   */
  buildAnalysisPrompt(template, pdfContent, options = {}) {
    const { subject = '语文', page = 1, pageRange = '1-1' } = options;

    // 学科映射
    const subjectMap = {
      CHINESE: '语文',
      MATH: '数学',
      ENGLISH: '英语'
    };

    const subjectName = subjectMap[subject] || subject || '语文';

    let prompt = template.promptText || this.getSystemDefaultPrompt();

    // 变量替换
    prompt = prompt.replace(/\{\{content\}\}/g, pdfContent);
    prompt = prompt.replace(/\{\{subject\}\}/g, subjectName);
    prompt = prompt.replace(/\{\{page\}\}/g, String(page));
    prompt = prompt.replace(/\{\{page_range\}\}/g, pageRange);

    return prompt;
  }

  /**
   * 构建用户消息内容（支持 Vision API 图片格式）
   * @param {string} textContent - 文本内容
   * @param {string} imageBase64 - 图片的 base64 字符串（可选）
   * @returns {string|Array} - 消息内容
   */
  buildUserContent(textContent, imageBase64 = null) {
    if (!imageBase64) {
      return textContent;
    }

    // Vision API 格式：多模态消息
    const content = [
      { type: 'text', text: textContent }
    ];

    // 添加图片（确保格式正确）
    let imageUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }
    content.push({
      type: 'image_url',
      image_url: { url: imageUrl }
    });

    return content;
  }

  /**
   * 调用 OpenAI 兼容 API（普通模式）
   * @param {object} apiConfig - API 配置
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @param {string} imageBase64 - 图片 base64（可选，用于 Vision API）
   * @param {number} timeout - 超时时间（毫秒），默认2分钟
   */
  async callApi(apiConfig, systemPrompt, userPrompt, imageBase64 = null, timeout = 120000) {
    const startTime = Date.now();

    try {
      const normalizedUrl = this.normalizeBaseUrl(apiConfig.baseUrl);
      const url = `${normalizedUrl}/chat/completions`;

      const headers = {
        'Content-Type': 'application/json'
      };

      if (apiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
      }

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      // 使用 buildUserContent 构建用户消息（支持图片）
      messages.push({
        role: 'user',
        content: this.buildUserContent(userPrompt, imageBase64)
      });

      const body = {
        model: apiConfig.model || 'default',
        messages,
        temperature: apiConfig.temperature || 0.7,
        max_tokens: apiConfig.maxTokens || 2000,
        stream: false
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // 提取回复内容
      const content = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || null;

      return {
        success: true,
        content,
        tokensUsed,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        responseTime
      };
    }
  }

  /**
   * 调用 OpenAI 兼容 API（流式模式）
   * @param {object} apiConfig - API 配置
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @param {function} onChunk - 收到数据块时的回调
   * @param {AbortSignal} signal - 中断信号
   * @param {string} imageBase64 - 图片 base64（可选，用于 Vision API）
   */
  async callApiStream(apiConfig, systemPrompt, userPrompt, onChunk, signal = null, imageBase64 = null) {
    const startTime = Date.now();

    try {
      const normalizedUrl = this.normalizeBaseUrl(apiConfig.baseUrl);
      const url = `${normalizedUrl}/chat/completions`;

      const headers = {
        'Content-Type': 'application/json'
      };

      if (apiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
      }

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      // 使用 buildUserContent 构建用户消息（支持图片）
      messages.push({
        role: 'user',
        content: this.buildUserContent(userPrompt, imageBase64)
      });

      const body = {
        model: apiConfig.model || 'default',
        messages,
        temperature: apiConfig.temperature || 0.7,
        max_tokens: apiConfig.maxTokens || 2000,
        stream: true
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        content: fullContent,
        tokensUsed: null,
        responseTime
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '用户中断',
          aborted: true
        };
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试 API 连接
   * @param {object} apiConfig - API 配置
   */
  async testConnection(apiConfig) {
    try {
      const normalizedUrl = this.normalizeBaseUrl(apiConfig.baseUrl);
      const url = `${normalizedUrl}/models`;

      const headers = {};
      if (apiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = (data.data || data.models || []).length;
        return { success: true, message: `连接成功，发现 ${modelCount} 个模型` };
      } else {
        return { success: false, message: `连接失败: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  /**
   * 执行 AI 分析并记录日志（支持三层提示词架构）
   * @param {string} userId - 用户 ID
   * @param {string} textbookId - 教材 ID
   * @param {string} sessionId - 会话 ID
   * @param {object} options - 分析选项
   */
  async analyze(userId, textbookId, sessionId, options = {}) {
    const {
      pdfTextContent,
      currentPage = 1,
      pageRange = 1,
      promptId = null,
      textbookPromptId = null,
      subject = 'CHINESE'
    } = options;

    // 获取 API 配置
    const apiConfig = await this.getDefaultConfig();
    if (!apiConfig) {
      return {
        success: false,
        message: '未配置 AI API，请先在工作台添加 API 配置'
      };
    }

    // 获取系统级提示词
    const systemPrompt = await this.getSystemPrompt();

    // 获取分析模板（优先级：教材自定义 > 科目默认 > 通用默认）
    let promptTemplate;

    // 1. 如果指定了教材提示词 ID
    if (textbookPromptId) {
      promptTemplate = await prisma.textbookPrompt.findUnique({
        where: { id: textbookPromptId }
      });
    }

    // 2. 如果没有，尝试获取教材激活的提示词
    if (!promptTemplate) {
      promptTemplate = await this.getTextbookActivePrompt(textbookId);
    }

    // 3. 如果指定了科目模板 ID
    if (!promptTemplate && promptId) {
      promptTemplate = await prisma.aiPromptTemplate.findUnique({
        where: { id: promptId }
      });
    }

    // 4. 获取科目默认模板
    if (!promptTemplate) {
      promptTemplate = await this.getDefaultPrompt(subject);
    }

    // 计算页码范围
    const startPage = Math.max(1, currentPage - pageRange);
    const endPage = currentPage + pageRange;
    const pageRangeStr = `${startPage}-${endPage}`;

    // 构建用户提示词（科目/教材级模板）
    const userPrompt = this.buildAnalysisPrompt(promptTemplate, pdfTextContent, {
      subject,
      page: currentPage,
      pageRange: pageRangeStr
    });

    // 记录完整的 prompt（用于日志）
    const fullPrompt = `[系统提示词]\n${systemPrompt}\n\n[分析模板]\n${userPrompt}`;

    // 创建日志记录（pending 状态）
    const log = await prisma.aiAnalysisLog.create({
      data: {
        userId,
        textbookId,
        sessionId,
        apiConfigId: apiConfig.id,
        promptId: promptTemplate.id !== 'system-default' ? promptTemplate.id : null,
        inputPages: pageRangeStr,
        inputText: pdfTextContent,
        fullPrompt,
        status: 'pending'
      }
    });

    // 调用 API（使用系统提示词 + 用户提示词）
    const result = await this.callApi(apiConfig, systemPrompt, userPrompt);

    // 更新日志记录
    await prisma.aiAnalysisLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'success' : 'error',
        outputText: result.content || null,
        tokensUsed: result.tokensUsed || null,
        responseTime: result.responseTime || null,
        errorMessage: result.error || null
      }
    });

    if (result.success) {
      return {
        success: true,
        data: {
          logId: log.id,
          content: result.content,
          tokensUsed: result.tokensUsed,
          responseTime: result.responseTime
        }
      };
    } else {
      return {
        success: false,
        message: result.error || 'AI 分析失败'
      };
    }
  }

  /**
   * 执行 AI 聊天（支持流式输出）
   * @param {string} userId - 用户 ID
   * @param {string} textbookId - 教材 ID
   * @param {string} sessionId - 会话 ID
   * @param {string} userMessage - 用户消息
   * @param {object} options - 选项
   * @param {function} onChunk - 流式回调
   * @param {AbortSignal} signal - 中断信号
   */
  async chat(userId, textbookId, sessionId, userMessage, options = {}, onChunk = null, signal = null) {
    const { subject = 'CHINESE', context = '', imageBase64 = null } = options;

    // 获取 API 配置
    const apiConfig = await this.getDefaultConfig();
    if (!apiConfig) {
      return {
        success: false,
        message: '未配置 AI API，请先在工作台添加 API 配置'
      };
    }

    // 获取系统提示词
    const systemPrompt = await this.getSystemPrompt();

    // 构建用户提示词（不再使用文本上下文，改用图片）
    let userPrompt = userMessage;
    // 注：如果有 imageBase64，context 将被忽略（因为图片已包含页面内容）

    // 根据是否有回调决定使用流式还是普通模式
    if (onChunk) {
      return await this.callApiStream(apiConfig, systemPrompt, userPrompt, onChunk, signal, imageBase64);
    } else {
      return await this.callApi(apiConfig, systemPrompt, userPrompt, imageBase64);
    }
  }
}

module.exports = new AiService();
