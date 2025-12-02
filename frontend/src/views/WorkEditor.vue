<template>
  <div class="h-[calc(100vh-120px)] flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between p-4 bg-white border-b">
      <div class="flex items-center space-x-4">
        <n-button quaternary @click="$router.back()">
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        </n-button>
        <n-input v-model:value="work.title" placeholder="作品标题" style="width: 300px" />
        <n-select
          v-model:value="work.category"
          placeholder="选择或输入分类"
          :options="categoryOptions"
          filterable
          tag
          clearable
          style="width: 200px"
        />
      </div>
      <div class="flex items-center space-x-2">
        <n-select v-model:value="work.visibility" :options="visibilityOptions" style="width: 120px" />
        <n-button @click="runCode">
          <template #icon><n-icon><PlayOutline /></n-icon></template>
          运行
        </n-button>
        <n-button type="primary" :loading="saving" @click="saveWork">
          <template #icon><n-icon><SaveOutline /></n-icon></template>
          保存
        </n-button>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="flex-1 flex">
      <!-- 代码编辑器 -->
      <div class="w-1/2 flex flex-col border-r">
        <n-tabs v-model:value="activeTab" type="card" size="small" class="px-2 pt-2">
          <n-tab-pane name="html" tab="HTML" />
          <n-tab-pane name="css" tab="CSS" />
          <n-tab-pane name="js" tab="JavaScript" />
        </n-tabs>
        <div class="flex-1 overflow-hidden">
          <codemirror
            v-model="currentCode"
            :style="{ height: '100%' }"
            :extensions="extensions"
            :tab-size="2"
            @change="handleCodeChange"
          />
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="w-1/2 flex flex-col">
        <div class="px-4 py-2 bg-gray-50 border-b text-sm font-medium text-gray-600">
          预览
        </div>
        <div class="flex-1 bg-white">
          <iframe
            ref="previewFrame"
            class="w-full h-full border-0"
            sandbox="allow-scripts"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { htmlWorkAPI } from '@/api';
import { Codemirror } from 'vue-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { ArrowBackOutline, PlayOutline, SaveOutline } from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const workId = route.params.id;
const forkFromId = route.query.fork; // Fork源作品ID
const isEdit = !!workId;
const isFork = !!forkFromId && !workId; // Fork模式：有fork参数但没有workId

const saving = ref(false);
const activeTab = ref('html');
const previewFrame = ref(null);
const categories = ref([]);

const work = ref({
  title: '未命名作品',
  html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Work</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
  css: 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n\nh1 {\n  color: #333;\n}',
  javascript: '// Your JavaScript code here\nconsole.log("Hello!");',
  visibility: 'PUBLIC',
  category: null,
});

const visibilityOptions = [
  { label: '公开', value: 'PUBLIC' },
  { label: '仅家长', value: 'PARENT_ONLY' },
  { label: '私密', value: 'PRIVATE' },
];

const categoryOptions = computed(() => {
  return categories.value.map(cat => ({
    label: cat,
    value: cat
  }));
});

const currentCode = computed({
  get: () => work.value[activeTab.value === 'js' ? 'javascript' : activeTab.value],
  set: (val) => {
    work.value[activeTab.value === 'js' ? 'javascript' : activeTab.value] = val;
  },
});

const extensions = computed(() => {
  const langMap = {
    html: html(),
    css: css(),
    js: javascript(),
  };
  return [langMap[activeTab.value], oneDark];
});

const handleCodeChange = () => {
  // Auto-run on change (debounced)
};

const runCode = () => {
  if (!previewFrame.value) return;

  const doc = `
<!DOCTYPE html>
<html>
<head>
  <style>${work.value.css}</style>
</head>
<body>
  ${work.value.html.replace(/<!DOCTYPE.*?>|<html.*?>|<\/html>|<head.*?>.*?<\/head>|<body.*?>|<\/body>/gis, '')}
  <script>${work.value.javascript}<\/script>
</body>
</html>`;

  previewFrame.value.srcdoc = doc;
};

const loadCategories = async () => {
  try {
    const data = await htmlWorkAPI.getCategories();
    categories.value = data.categories || [];
  } catch (error) {
    console.error('加载分类失败:', error);
  }
};

const loadWork = async () => {
  // Fork模式：加载源作品内容
  if (isFork && forkFromId) {
    try {
      const data = await htmlWorkAPI.getWorkById(forkFromId);
      work.value = {
        title: `${data.title} (Fork)`, // 添加Fork标识
        html: data.htmlCode || '',
        css: data.cssCode || '',
        javascript: data.jsCode || '',
        visibility: 'PRIVATE', // Fork的作品默认为私密
        category: data.category || null,
      };
      runCode();
      message.info('已加载源作品内容，点击保存创建新作品');
    } catch (error) {
      message.error('加载源作品失败');
    }
    return;
  }

  // 编辑模式：加载现有作品
  if (!workId) return;
  try {
    const data = await htmlWorkAPI.getWorkById(workId);
    work.value = {
      title: data.title,
      html: data.htmlCode || '',
      css: data.cssCode || '',
      javascript: data.jsCode || '',
      visibility: data.visibility,
      category: data.category || null,
    };
    runCode();
  } catch (error) {
    message.error('加载作品失败');
  }
};

const saveWork = async () => {
  if (!work.value.title.trim()) {
    message.warning('请输入作品标题');
    return;
  }
  saving.value = true;
  try {
    // Transform to backend field names
    const payload = {
      title: work.value.title,
      htmlCode: work.value.html,
      cssCode: work.value.css,
      jsCode: work.value.javascript,
      visibility: work.value.visibility,
      category: work.value.category || null,
    };

    if (isEdit) {
      await htmlWorkAPI.updateWork(workId, payload);
      message.success('保存成功');
    } else {
      const data = await htmlWorkAPI.createWork(payload);
      message.success('创建成功');
      router.replace(`/works/${data.id || data.work?.id}/edit`);
    }
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadCategories();
  loadWork();
  setTimeout(runCode, 100);
});

watch(activeTab, () => {
  // Tab changed
});
</script>

<style scoped>
:deep(.cm-editor) {
  height: 100%;
}
</style>
