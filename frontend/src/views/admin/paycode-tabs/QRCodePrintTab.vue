<template>
  <div class="qrcode-print-tab">
    <!-- 操作栏 -->
    <div class="toolbar">
      <n-space>
        <n-checkbox v-model:checked="selectAll" @update:checked="handleSelectAll">
          全选
        </n-checkbox>
        <n-button :disabled="selectedCodes.length === 0" @click="handleBatchPrint">
          <template #icon>
            <n-icon><PrintOutline /></n-icon>
          </template>
          批量打印 ({{ selectedCodes.length }})
        </n-button>
        <n-button :disabled="selectedCodes.length === 0" @click="handleBatchDownload">
          <template #icon>
            <n-icon><DownloadOutline /></n-icon>
          </template>
          批量下载
        </n-button>
      </n-space>
      <n-select
        v-model:value="filterStatus"
        :options="statusOptions"
        placeholder="筛选状态"
        style="width: 120px"
        clearable
      />
    </div>

    <!-- 二维码卡片网格 -->
    <n-spin :show="loading">
      <div class="qrcode-grid">
        <div
          v-for="payCode in filteredPayCodes"
          :key="payCode.id"
          class="qrcode-card"
          :class="{ selected: selectedCodes.includes(payCode.id), disabled: !payCode.isActive }"
          @click="toggleSelect(payCode.id)"
        >
          <div class="card-checkbox">
            <n-checkbox :checked="selectedCodes.includes(payCode.id)" />
          </div>
          <div class="qrcode-image">
            <img v-if="qrcodeMap[payCode.id]" :src="qrcodeMap[payCode.id]" :alt="payCode.title" />
            <n-spin v-else size="small" />
          </div>
          <div class="card-info">
            <div class="title">{{ payCode.title }}</div>
            <div class="amount">{{ parseFloat(payCode.amount).toFixed(2) }} 学习币</div>
            <div class="code">{{ payCode.code }}</div>
            <n-tag :type="payCode.isActive ? 'success' : 'default'" size="small">
              {{ payCode.isActive ? '启用' : '禁用' }}
            </n-tag>
          </div>
          <div class="card-actions">
            <n-button size="small" @click.stop="handleSinglePrint(payCode)">
              <template #icon>
                <n-icon><PrintOutline /></n-icon>
              </template>
              打印
            </n-button>
            <n-button size="small" @click.stop="handleSingleDownload(payCode)">
              <template #icon>
                <n-icon><DownloadOutline /></n-icon>
              </template>
              下载
            </n-button>
          </div>
        </div>
      </div>

      <n-empty v-if="filteredPayCodes.length === 0" description="暂无收款码" />
    </n-spin>

    <!-- 打印预览对话框 -->
    <n-modal v-model:show="showPrintModal" preset="card" title="打印预览" style="width: 800px">
      <div class="print-preview" ref="printRef">
        <div class="print-grid">
          <div v-for="payCode in printPayCodes" :key="payCode.id" class="print-item">
            <img :src="qrcodeMap[payCode.id]" :alt="payCode.title" class="print-qrcode" />
            <div class="print-title">{{ payCode.title }}</div>
            <div class="print-amount">{{ parseFloat(payCode.amount).toFixed(2) }} 学习币</div>
            <div class="print-code">{{ payCode.code }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPrintModal = false">取消</n-button>
          <n-button type="primary" @click="executePrint">
            <template #icon>
              <n-icon><PrintOutline /></n-icon>
            </template>
            确认打印
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { payAPI } from '@/api';
import { PrintOutline, DownloadOutline } from '@vicons/ionicons5';

const message = useMessage();

const loading = ref(false);
const payCodes = ref([]);
const qrcodeMap = ref({});
const selectedCodes = ref([]);
const selectAll = ref(false);
const filterStatus = ref(null);
const showPrintModal = ref(false);
const printPayCodes = ref([]);
const printRef = ref(null);

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' },
];

const filteredPayCodes = computed(() => {
  if (!filterStatus.value) return payCodes.value;
  return payCodes.value.filter(p =>
    filterStatus.value === 'active' ? p.isActive : !p.isActive
  );
});

const loadPayCodes = async () => {
  loading.value = true;
  try {
    const data = await payAPI.getPayCodes({ limit: 100 });
    payCodes.value = data.codes;
    // 加载所有二维码
    await loadQRCodes(data.codes);
  } catch (error) {
    message.error('加载收款码列表失败');
  } finally {
    loading.value = false;
  }
};

const loadQRCodes = async (codes) => {
  const promises = codes.map(async (payCode) => {
    try {
      const data = await payAPI.getPayCode(payCode.id);
      qrcodeMap.value[payCode.id] = data.qrcode;
    } catch (error) {
      console.error('加载二维码失败:', payCode.id);
    }
  });
  await Promise.all(promises);
};

const toggleSelect = (id) => {
  const index = selectedCodes.value.indexOf(id);
  if (index === -1) {
    selectedCodes.value.push(id);
  } else {
    selectedCodes.value.splice(index, 1);
  }
};

const handleSelectAll = (checked) => {
  if (checked) {
    selectedCodes.value = filteredPayCodes.value.map(p => p.id);
  } else {
    selectedCodes.value = [];
  }
};

const handleBatchPrint = () => {
  printPayCodes.value = payCodes.value.filter(p => selectedCodes.value.includes(p.id));
  showPrintModal.value = true;
};

const handleSinglePrint = (payCode) => {
  printPayCodes.value = [payCode];
  showPrintModal.value = true;
};

const executePrint = () => {
  const printContent = printRef.value.innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>收款码打印</title>
        <style>
          body { margin: 0; padding: 20px; font-family: sans-serif; }
          .print-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .print-item { text-align: center; padding: 20px; border: 1px solid #ddd; page-break-inside: avoid; }
          .print-qrcode { width: 150px; height: 150px; }
          .print-title { font-weight: bold; margin-top: 10px; font-size: 14px; }
          .print-amount { color: #18a058; font-size: 16px; font-weight: bold; margin: 5px 0; }
          .print-code { font-size: 10px; color: #999; word-break: break-all; }
          @media print { .print-item { border: 1px solid #000; } }
        </style>
      </head>
      <body>${printContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
  showPrintModal.value = false;
};

const handleBatchDownload = async () => {
  const selected = payCodes.value.filter(p => selectedCodes.value.includes(p.id));
  for (const payCode of selected) {
    await downloadQRCode(payCode);
  }
  message.success(`已下载 ${selected.length} 个二维码`);
};

const handleSingleDownload = async (payCode) => {
  await downloadQRCode(payCode);
  message.success('下载成功');
};

const downloadQRCode = async (payCode) => {
  const qrcode = qrcodeMap.value[payCode.id];
  if (!qrcode) return;

  const link = document.createElement('a');
  link.href = qrcode;
  link.download = `收款码_${payCode.title}_${payCode.code}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

watch(filteredPayCodes, () => {
  // 重置全选状态
  selectAll.value = false;
  selectedCodes.value = [];
});

onMounted(() => {
  loadPayCodes();
});

defineExpose({ loadPayCodes });
</script>

<style scoped>
.qrcode-print-tab {
  padding: 16px 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.qrcode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.qrcode-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.qrcode-card:hover {
  border-color: #18a058;
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.2);
}

.qrcode-card.selected {
  border-color: #18a058;
  background-color: #f0fdf4;
}

.qrcode-card.disabled {
  opacity: 0.6;
}

.card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
}

.qrcode-image {
  width: 120px;
  height: 120px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-image img {
  width: 100%;
  height: 100%;
}

.card-info .title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-info .amount {
  color: #18a058;
  font-weight: bold;
  margin-bottom: 4px;
}

.card-info .code {
  font-size: 10px;
  color: #999;
  margin-bottom: 8px;
  word-break: break-all;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

/* 打印预览样式 */
.print-preview {
  padding: 20px;
  background: white;
}

.print-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.print-item {
  text-align: center;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.print-qrcode {
  width: 150px;
  height: 150px;
}

.print-title {
  font-weight: bold;
  margin-top: 10px;
  font-size: 14px;
}

.print-amount {
  color: #18a058;
  font-size: 16px;
  font-weight: bold;
  margin: 5px 0;
}

.print-code {
  font-size: 10px;
  color: #999;
  word-break: break-all;
}
</style>
