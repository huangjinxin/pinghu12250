<template>
  <div class="rich-content" ref="contentRef">
    <!-- Thinking 折叠区域 -->
    <div v-if="thinkingContent" class="thinking-section">
      <div class="thinking-header" @click="thinkingExpanded = !thinkingExpanded">
        <n-icon size="14" class="thinking-icon">
          <component :is="thinkingExpanded ? ChevronDown : ChevronForward" />
        </n-icon>
        <span class="thinking-label">AI 思路 / 推理过程</span>
        <span class="thinking-hint">{{ thinkingExpanded ? '点击收起' : '点击展开' }}</span>
      </div>
      <Transition name="slide">
        <div v-show="thinkingExpanded" class="thinking-body">
          <div v-html="renderedThinking"></div>
        </div>
      </Transition>
    </div>

    <!-- 主要内容 -->
    <div class="main-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import ChevronDown from '@vicons/ionicons5/es/ChevronDown'
import ChevronForward from '@vicons/ionicons5/es/ChevronForward'
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  foldThinking: {
    type: Boolean,
    default: true
  },
  enableCodeHighlight: {
    type: Boolean,
    default: true
  },
  enableMath: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['rendered']);

const contentRef = ref(null);
const thinkingExpanded = ref(false);

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (props.enableCodeHighlight && lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs-code-block"><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang }).value}</code><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">复制</button></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs-code-block"><code class="hljs">${md.utils.escapeHtml(str)}</code><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">复制</button></pre>`;
  }
});

// 解析 thinking 标签
const parseThinking = (text) => {
  // 匹配 <think>...</think> 或 <thinking>...</thinking>
  const thinkRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
  let thinkingParts = [];
  let mainContent = text;

  let match;
  while ((match = thinkRegex.exec(text)) !== null) {
    thinkingParts.push(match[1].trim());
  }

  // 移除 thinking 标签
  mainContent = text.replace(thinkRegex, '').trim();

  return {
    thinking: thinkingParts.join('\n\n'),
    main: mainContent
  };
};

// 渲染数学公式
const renderMath = (html) => {
  if (!props.enableMath) return html;

  // 块级公式 $$...$$ (先处理块级，避免被行内匹配)
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return `<div class="math-block">${katex.renderToString(formula.trim(), { throwOnError: false, displayMode: true })}</div>`;
    } catch (e) {
      // 渲染失败时显示等宽可读文本
      return `<div class="math-block math-fallback"><code>${formula.trim()}</code></div>`;
    }
  });

  // 行内公式 $...$ (避免匹配到货币符号等)
  html = html.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    // 跳过明显不是公式的情况（如 $10 这样的价格）
    if (/^\d+$/.test(formula.trim())) {
      return match;
    }
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: false });
    } catch (e) {
      // 渲染失败时显示等宽可读文本
      return `<code class="math-inline-fallback">${formula}</code>`;
    }
  });

  return html;
};

// 解析内容
const parsedContent = computed(() => {
  if (!props.content) return { thinking: '', main: '' };
  return parseThinking(props.content);
});

// Thinking 内容
const thinkingContent = computed(() => {
  return props.foldThinking ? parsedContent.value.thinking : '';
});

// 渲染后的 Thinking
const renderedThinking = computed(() => {
  if (!thinkingContent.value) return '';
  let html = md.render(thinkingContent.value);
  html = renderMath(html);
  return html;
});

// 渲染后的主内容
const renderedContent = computed(() => {
  const content = props.foldThinking ? parsedContent.value.main : props.content;
  if (!content) return '';
  let html = md.render(content);
  html = renderMath(html);
  return html;
});

// 内容变化后通知
watch([renderedContent, renderedThinking], () => {
  nextTick(() => {
    emit('rendered');
  });
});

onMounted(() => {
  emit('rendered');
});
</script>

<style scoped>
.rich-content {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
  word-break: break-word;
}

/* Thinking 区域 */
.thinking-section {
  margin-bottom: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.thinking-header:hover {
  background: #f0f0f0;
}

.thinking-icon {
  color: #666;
  transition: transform 0.2s;
}

.thinking-label {
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.thinking-hint {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.thinking-body {
  padding: 0 14px 14px;
  font-size: 13px;
  color: #666;
  border-top: 1px solid #e9ecef;
  background: #fafafa;
}

/* 展开动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* 主内容样式 */
.main-content :deep(h1),
.main-content :deep(h2),
.main-content :deep(h3),
.main-content :deep(h4) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  color: #1a1a1a;
}

.main-content :deep(h1) { font-size: 1.4em; }
.main-content :deep(h2) { font-size: 1.25em; }
.main-content :deep(h3) { font-size: 1.1em; }

.main-content :deep(p) {
  margin: 0.8em 0;
}

.main-content :deep(ul),
.main-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 1.5em;
}

.main-content :deep(li) {
  margin: 0.3em 0;
}

.main-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #1890ff;
  background: #f0f7ff;
  color: #555;
}

.main-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.main-content :deep(th),
.main-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.main-content :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

/* 代码块样式 */
.main-content :deep(.hljs-code-block) {
  position: relative;
  margin: 1em 0;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f6f8fa;
  max-width: 100%;
}

.main-content :deep(.hljs-code-block code) {
  display: block;
  padding: 14px 16px;
  padding-right: 60px; /* 为复制按钮留空间 */
  overflow-x: auto;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}

.main-content :deep(.code-copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.main-content :deep(.hljs-code-block:hover .code-copy-btn) {
  opacity: 1;
}

.main-content :deep(.code-copy-btn:hover) {
  background: rgba(0, 0, 0, 0.1);
}

.main-content :deep(.code-copy-btn:active) {
  background: rgba(24, 144, 255, 0.2);
  color: #1890ff;
}

/* 行内代码 */
.main-content :deep(code:not(.hljs)) {
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 4px;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
  color: #d63384;
}

/* 数学公式 */
.main-content :deep(.math-block) {
  margin: 1em 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  overflow-x: auto;
  text-align: center;
}

/* 公式渲染失败回退样式 */
.main-content :deep(.math-block.math-fallback) {
  background: #f5f5f5;
  border: 1px dashed #ddd;
}

.main-content :deep(.math-block.math-fallback code) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  color: #666;
  white-space: pre-wrap;
  word-break: break-all;
}

.main-content :deep(.math-inline-fallback) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
  color: #666;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
}

/* 链接 */
.main-content :deep(a) {
  color: #1890ff;
  text-decoration: none;
}

.main-content :deep(a:hover) {
  text-decoration: underline;
}

/* 图片 */
.main-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 0.5em 0;
}

/* 分割线 */
.main-content :deep(hr) {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 1.5em 0;
}
</style>
