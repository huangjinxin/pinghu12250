<template>
  <div class="space-y-6">
    <div v-if="!embedded" class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学习Bot管理</h1>
        <p class="text-gray-500 mt-1">管理学习助手Bot及关键词回复</p>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon><n-icon><AddCircleOutline /></n-icon></template>
        新建Bot
      </n-button>
    </div>
    <div v-if="embedded" class="flex justify-end">
      <n-button type="primary" size="small" @click="openCreate">
        <template #icon><n-icon><AddCircleOutline /></n-icon></template>
        新建Bot
      </n-button>
    </div>

    <n-spin :show="loading">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="bot in bots" :key="bot.id" class="card">
          <div class="flex items-center gap-3 mb-3">
            <n-avatar :src="bot.avatar" :size="48" round />
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-800">{{ bot.name }}</div>
              <div class="text-sm text-gray-500">{{ bot.type }}</div>
            </div>
            <n-switch v-model:value="bot.isActive" @update:value="v => toggleActive(bot, v)" size="small" />
          </div>
          <p class="text-sm text-gray-600 mb-3">{{ bot.description }}</p>
          <div class="text-xs text-gray-400 mb-3">
            关键词: {{ (bot.keywords || []).length }} 条 · 模块: {{ (bot.modules || []).length }} 个
          </div>
          <div class="flex gap-2">
            <n-button size="small" @click="openEdit(bot)">编辑</n-button>
            <n-button size="small" @click="openKeywords(bot)">关键词</n-button>
            <n-button size="small" type="error" @click="handleDelete(bot)">删除</n-button>
          </div>
        </div>
      </div>
    </n-spin>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showModal" preset="card" :title="editingBot ? '编辑Bot' : '新建Bot'" style="max-width:500px">
      <n-form :model="form" label-placement="left" label-width="80">
        <n-form-item label="名称"><n-input v-model:value="form.name" /></n-form-item>
        <n-form-item label="类型"><n-input v-model:value="form.type" placeholder="如 chinese/calligraphy" /></n-form-item>
        <n-form-item label="头像URL"><n-input v-model:value="form.avatar" /></n-form-item>
        <n-form-item label="简介"><n-input v-model:value="form.description" type="textarea" :rows="2" /></n-form-item>
        <n-form-item label="欢迎语"><n-input v-model:value="form.welcome" type="textarea" :rows="2" /></n-form-item>
        <n-form-item label="排序"><n-input-number v-model:value="form.sortOrder" :min="0" /></n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 关键词编辑弹窗 -->
    <n-modal v-model:show="showKeywords" preset="card" :title="`${keywordBot?.name} - 关键词管理`" style="max-width:650px">
      <div class="space-y-3">
        <div v-for="(kw, i) in keywordList" :key="i" class="flex gap-2 items-start p-3 bg-gray-50 rounded">
          <div class="flex-1 space-y-2">
            <n-input v-model:value="kw.keyword" placeholder="关键词" size="small" />
            <n-input v-model:value="kw.reply" placeholder="回复文本" size="small" />
            <n-input v-model:value="kw.cardData.target" placeholder="跳转路径 如 /books" size="small" />
            <n-input v-model:value="kw.cardData.title" placeholder="卡片标题" size="small" />
          </div>
          <n-button size="small" type="error" @click="keywordList.splice(i, 1)">删</n-button>
        </div>
        <n-button dashed block @click="addKeyword">+ 添加关键词</n-button>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showKeywords = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveKeywords">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { useMessage } from 'naive-ui';
import { botAPI } from '@/api/index.js';
import AddCircleOutline from '@vicons/ionicons5/es/AddCircleOutline';

const message = useMessage();
const loading = ref(false);
const saving = ref(false);
const bots = ref([]);
const showModal = ref(false);
const editingBot = ref(null);
const form = ref({});
const showKeywords = ref(false);
const keywordBot = ref(null);
const keywordList = ref([]);

async function loadBots() {
  loading.value = true;
  try {
    const { data } = await botAPI.adminList();
    bots.value = data;
  } finally { loading.value = false; }
}

function openCreate() {
  editingBot.value = null;
  form.value = { name: '', type: '', avatar: '', description: '', welcome: '', sortOrder: 0 };
  showModal.value = true;
}

function openEdit(bot) {
  editingBot.value = bot;
  form.value = { ...bot };
  showModal.value = true;
}

async function handleSave() {
  saving.value = true;
  try {
    if (editingBot.value) {
      await botAPI.update(editingBot.value.id, form.value);
    } else {
      await botAPI.create(form.value);
    }
    message.success('保存成功');
    showModal.value = false;
    loadBots();
  } catch (e) { message.error(e.response?.data?.error || '保存失败'); }
  finally { saving.value = false; }
}

async function toggleActive(bot, val) {
  try { await botAPI.update(bot.id, { isActive: val }); }
  catch { bot.isActive = !val; }
}

async function handleDelete(bot) {
  if (!confirm(`确定删除 ${bot.name}？`)) return;
  try {
    await botAPI.delete(bot.id);
    message.success('已删除');
    loadBots();
  } catch (e) { message.error('删除失败'); }
}

function openKeywords(bot) {
  keywordBot.value = bot;
  keywordList.value = (bot.keywords || []).map(k => ({
    ...k,
    cardData: k.cardData || { cardType: 'navigate', title: '', target: '' },
  }));
  showKeywords.value = true;
}

function addKeyword() {
  keywordList.value.push({ keyword: '', reply: '', cardType: 'card', cardData: { cardType: 'navigate', title: '', target: '' } });
}

async function saveKeywords() {
  saving.value = true;
  try {
    await botAPI.update(keywordBot.value.id, { keywords: keywordList.value });
    message.success('关键词已保存');
    showKeywords.value = false;
    loadBots();
  } finally { saving.value = false; }
}

onMounted(loadBots);
</script>
