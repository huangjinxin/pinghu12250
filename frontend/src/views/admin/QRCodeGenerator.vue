<template>
  <div class="space-y-6">
    <div v-if="!embedded">
      <h1 class="text-2xl font-bold text-gray-800">学习二维码生成器</h1>
      <p class="text-gray-500 mt-1">生成可打印的二维码，扫码直达学习模块</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左侧：配置 -->
      <div class="card space-y-4">
        <h3 class="font-bold text-gray-700">配置二维码</h3>
        <n-form :model="form" label-placement="left" label-width="80">
          <n-form-item label="类型">
            <n-select v-model:value="form.scanType" :options="scanTypes" />
          </n-form-item>
          <n-form-item label="目标模块">
            <n-select v-model:value="form.target" :options="moduleOptions" filterable />
          </n-form-item>
          <n-form-item label="标题">
            <n-input v-model:value="form.title" placeholder="显示在二维码下方" />
          </n-form-item>
          <n-form-item label="描述">
            <n-input v-model:value="form.desc" placeholder="可选说明文字" />
          </n-form-item>
          <n-form-item label="附加参数">
            <n-input v-model:value="form.extraParams" placeholder='可选 JSON，如 {"id":"123"}' />
          </n-form-item>
        </n-form>
        <n-button type="primary" block @click="generate">生成二维码</n-button>
      </div>

      <!-- 右侧：预览和打印 -->
      <div class="card">
        <div v-if="qrUrl" class="text-center space-y-4">
          <div class="text-sm text-gray-500">扫码协议: {{ generatedUrl }}</div>
          <div ref="qrContainer" class="inline-block p-6 bg-white border rounded-lg print-area">
            <img :src="qrUrl" class="w-48 h-48 mx-auto" />
            <div class="mt-3 font-bold text-lg">{{ form.title || '扫码学习' }}</div>
            <div v-if="form.desc" class="text-sm text-gray-500">{{ form.desc }}</div>
          </div>
          <div class="flex gap-2 justify-center">
            <n-button @click="printQR">打印</n-button>
            <n-button @click="downloadQR">下载图片</n-button>
            <n-button @click="addToBatch">加入批量</n-button>
          </div>
        </div>
        <n-empty v-else description="配置后点击生成" />
      </div>
    </div>

    <!-- 批量打印区 -->
    <div v-if="batch.length" class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-gray-700">批量打印 ({{ batch.length }}个)</h3>
        <div class="flex gap-2">
          <n-button type="primary" @click="printBatch">批量打印</n-button>
          <n-button @click="batch = []">清空</n-button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="batch-print">
        <div v-for="(item, i) in batch" :key="i" class="text-center p-4 border rounded relative">
          <n-button size="tiny" class="absolute top-1 right-1" @click="batch.splice(i,1)">×</n-button>
          <img :src="item.qrUrl" class="w-24 h-24 mx-auto" />
          <div class="mt-1 text-sm font-bold">{{ item.title }}</div>
          <div class="text-xs text-gray-400">{{ item.target }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { useMessage } from 'naive-ui';
import QRCode from 'qrcode';

const message = useMessage();

const scanTypes = [
  { label: '学习模块', value: 'module' },
  { label: '签到打卡', value: 'checkin' },
  { label: '学习任务', value: 'task' },
];

const moduleOptions = [
  { label: '教材阅读 /books', value: 'books' },
  { label: '书法练习 /writing', value: 'writing' },
  { label: '写日记 /diaries', value: 'diaries' },
  { label: '拍照记录 /photos', value: 'photos' },
  { label: '古诗朗诵 /poetry', value: 'poetry' },
  { label: '读书笔记 /my-notes', value: 'my-notes' },
  { label: '学习任务 /submit', value: 'submit' },
  { label: '积分中心 /points', value: 'points' },
  { label: '成就中心 /achievements', value: 'achievements' },
  { label: '益智乐园 /games', value: 'games' },
  { label: '学习追踪 /learning-tracker', value: 'learning-tracker' },
  { label: '电子教材 /textbook/workspace', value: 'textbook-workspace' },
];

const form = ref({ scanType: 'module', target: 'books', title: '', desc: '', extraParams: '' });
const qrUrl = ref('');
const generatedUrl = ref('');
const batch = ref([]);

async function generate() {
  let params = {};
  if (form.value.extraParams) {
    try { params = JSON.parse(form.value.extraParams); }
    catch { return message.error('附加参数JSON格式错误'); }
  }
  const url = `pinghu://scan?type=${form.value.scanType}&target=${form.value.target}${Object.entries(params).map(([k,v]) => `&${k}=${v}`).join('')}`;
  generatedUrl.value = url;
  qrUrl.value = await QRCode.toDataURL(url, { width: 300, margin: 2 });
}

function addToBatch() {
  batch.value.push({ qrUrl: qrUrl.value, title: form.value.title || form.value.target, target: form.value.target });
  message.success('已加入批量');
}

function printQR() {
  const w = window.open('', '_blank');
  w.document.write(`<div style="text-align:center;padding:40px"><img src="${qrUrl.value}" style="width:200px"/><h2>${form.value.title || '扫码学习'}</h2><p>${form.value.desc || ''}</p></div>`);
  w.document.close();
  w.print();
}

function downloadQR() {
  const a = document.createElement('a');
  a.href = qrUrl.value;
  a.download = `qr-${form.value.target}.png`;
  a.click();
}

function printBatch() {
  const w = window.open('', '_blank');
  const items = batch.value.map(b => `<div style="display:inline-block;text-align:center;padding:20px;width:200px"><img src="${b.qrUrl}" style="width:150px"/><div style="font-weight:bold;margin-top:8px">${b.title}</div></div>`).join('');
  w.document.write(`<div style="display:flex;flex-wrap:wrap;justify-content:center">${items}</div>`);
  w.document.close();
  w.print();
}
</script>
