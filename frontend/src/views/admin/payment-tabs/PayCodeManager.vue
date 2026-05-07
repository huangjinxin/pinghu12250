<template>
  <div class="paycode-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <n-space>
        <n-select
          v-model:value="filters.category"
          :options="categoryOptions"
          placeholder="选择分类"
          style="width: 140px"
          clearable
          @update:value="handleSearch"
        />
        <n-select
          v-model:value="filters.isActive"
          :options="statusOptions"
          placeholder="状态"
          style="width: 90px"
          clearable
          @update:value="handleSearch"
        />
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索名称/描述"
          style="width: 150px"
          clearable
          @update:value="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #suffix>
            <n-icon :component="SearchOutline" style="cursor: pointer" @click="handleSearch" />
          </template>
        </n-input>
        <n-button @click="handleReset">重置</n-button>
      </n-space>
      <n-space>
        <n-button v-if="selectedRowKeys.length > 0" @click="handleBatchToggle">
          批量{{ selectedAllActive ? '禁用' : '启用' }} ({{ selectedRowKeys.length }})
        </n-button>
        <n-button v-if="selectedRowKeys.length > 0" type="error" @click="handleBatchDelete">
          批量删除 ({{ selectedRowKeys.length }})
        </n-button>
        <n-button type="primary" @click="handleCreate">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          创建收款码
        </n-button>
      </n-space>
    </div>

    <!-- 左右分栏布局 -->
    <div class="content-layout">
      <!-- 左侧：收款码列表 -->
      <div class="list-section">
        <n-data-table
          v-model:checked-row-keys="selectedRowKeys"
          :columns="columns"
          :data="payCodes"
          :loading="loading"
          :pagination="paginationConfig"
          :row-key="row => row.id"
          :row-class-name="getRowClass"
          :row-props="rowProps"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>

      <!-- 右侧：详情面板 -->
      <div class="detail-section" v-if="currentPayCode">
        <div class="detail-header">
          <h3>收款码详情</h3>
          <n-button quaternary size="small" @click="currentPayCode = null">
            <template #icon><n-icon><CloseOutline /></n-icon></template>
          </n-button>
        </div>
        
        <div class="detail-content">
          <!-- 二维码 -->
          <div class="qrcode-display">
            <img v-if="currentQrcode" :src="currentQrcode" alt="二维码" class="qrcode-img" />
            <n-spin v-else size="large" />
          </div>

          <!-- 基本信息 -->
          <div class="info-grid">
            <div class="info-item">
              <span class="label">商品名称</span>
              <span class="value">{{ currentPayCode.title }}</span>
            </div>
            <div class="info-item">
              <span class="label">金额</span>
              <span class="value text-green">{{ parseFloat(currentPayCode.amount).toFixed(2) }} 学习币</span>
            </div>
            <div class="info-item" v-if="currentPayCode.pointPrice">
              <span class="label">积分价格</span>
              <span class="value text-orange">{{ currentPayCode.pointPrice }} 积分</span>
            </div>
            <div class="info-item">
              <span class="label">分类</span>
              <span class="value">{{ currentPayCode.category || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">收款码</span>
              <span class="value code">
                {{ currentPayCode.code }}
                <n-button size="tiny" quaternary @click="copyCode(currentPayCode.code)">
                  <template #icon><n-icon><CopyOutline /></n-icon></template>
                </n-button>
              </span>
            </div>
            <div class="info-item">
              <span class="label">状态</span>
              <n-switch 
                :value="currentPayCode.isActive" 
                @update:value="() => handleToggle(currentPayCode)"
              >
                <template #checked>启用</template>
                <template #unchecked>禁用</template>
              </n-switch>
            </div>
            <div class="info-item">
              <span class="label">支付次数</span>
              <span class="value">{{ currentPayCode._count?.orders || 0 }} 次</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDate(currentPayCode.createdAt) }}</span>
            </div>
          </div>

          <!-- 描述 -->
          <div class="description" v-if="currentPayCode.description">
            <span class="label">描述</span>
            <p>{{ currentPayCode.description }}</p>
          </div>

          <!-- 分期信息 -->
          <div class="installment-info" v-if="currentPayCode.allowInstallment">
            <span class="label">支持分期</span>
            <n-tag type="info" size="small">
              {{ currentPayCode.installmentOptions || '3,6,12' }} 期
            </n-tag>
          </div>

          <!-- 操作按钮 -->
          <div class="detail-actions">
            <n-button type="primary" @click="handleEdit">
              <template #icon><n-icon><CreateOutline /></n-icon></template>
              编辑
            </n-button>
            <n-button @click="handlePrint">
              <template #icon><n-icon><PrintOutline /></n-icon></template>
              打印
            </n-button>
            <n-button @click="handleDownloadQrcode">
              <template #icon><n-icon><DownloadOutline /></n-icon></template>
              下载二维码
            </n-button>
          </div>
        </div>
      </div>

      <!-- 右侧：无选中状态 -->
      <div class="detail-section empty" v-else>
        <n-empty description="点击列表项查看详情">
          <template #icon>
            <n-icon><QrCodeOutline /></n-icon>
          </template>
        </n-empty>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <n-modal v-model:show="showFormModal" preset="dialog" :title="isEditing ? '编辑收款码' : '创建收款码'" style="width: 500px">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="商品名称" path="title">
          <n-input v-model:value="form.title" placeholder="请输入商品或服务名称" />
        </n-form-item>
        <n-form-item label="金额（学习币）" path="amount">
          <n-space vertical>
            <n-space>
              <n-switch v-model:value="form.isCustomAmount">
                <template #checked>自定义金额</template>
                <template #unchecked>固定金额</template>
              </n-switch>
            </n-space>
            <n-input-number 
              v-if="!form.isCustomAmount" 
              v-model:value="form.amount" 
              :min="0.01" 
              :step="0.01" 
              :precision="2" 
              placeholder="最小0.01" 
              style="width: 100%" 
              :show-button="false" 
            />
            <span v-else style="color: #999; font-size: 12px">用户支付时可自行输入金额</span>
          </n-space>
        </n-form-item>
        <n-form-item label="分类">
          <n-input v-model:value="form.category" placeholder="如：文具、零食、活动等" />
        </n-form-item>
        <n-form-item label="描述（可选）">
          <n-input v-model:value="form.description" type="textarea" placeholder="描述信息" :rows="2" />
        </n-form-item>
        <n-form-item label="积分价格（可选）">
          <n-input-number v-model:value="form.pointPrice" :min="1" :precision="0" placeholder="留空表示不支持" style="width: 100%" :show-button="false" clearable />
          <template #feedback><span style="color: #999; font-size: 12px">设置后用户可用积分购买</span></template>
        </n-form-item>
        <n-form-item label="分期付款">
          <n-space vertical>
            <n-switch v-model:value="form.allowInstallment">
              <template #checked>允许分期</template>
              <template #unchecked>不允许</template>
            </n-switch>
            <n-checkbox-group v-if="form.allowInstallment" v-model:value="form.installmentOptionsArray">
              <n-space>
                <n-checkbox :value="3" label="3期" />
                <n-checkbox :value="6" label="6期" />
                <n-checkbox :value="12" label="12期" />
              </n-space>
            </n-checkbox-group>
          </n-space>
        </n-form-item>
        <n-form-item v-if="isEditing" label="状态">
          <n-switch v-model:value="form.isActive">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="space-between" style="width: 100%">
          <n-button v-if="isEditing && currentPayCode?._count?.orders === 0" type="error" @click="handleDelete">
            删除
          </n-button>
          <n-space justify="end">
            <n-button @click="showFormModal = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">
              {{ isEditing ? '保存' : '创建' }}
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <!-- 打印预览弹窗 -->
    <n-modal v-model:show="showPrintModal" preset="card" title="打印预览" style="width: 600px">
      <div class="print-preview" ref="printRef">
        <div class="print-card">
          <img :src="currentQrcode" alt="二维码" class="print-qrcode" />
          <div class="print-title">{{ currentPayCode?.title }}</div>
          <div class="print-amount">{{ parseFloat(currentPayCode?.amount || 0).toFixed(2) }} 学习币</div>
          <div class="print-code">{{ currentPayCode?.code }}</div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPrintModal = false">取消</n-button>
          <n-button type="primary" @click="executePrint">
            <template #icon><n-icon><PrintOutline /></n-icon></template>
            打印
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useMessage, NButton, NIcon, NSwitch, NEmpty, useDialog } from 'naive-ui';
import { payAPI } from '@/api';
import { format } from 'date-fns';
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import PrintOutline from '@vicons/ionicons5/es/PrintOutline'
import DownloadOutline from '@vicons/ionicons5/es/DownloadOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import QrCodeOutline from '@vicons/ionicons5/es/QrCodeOutline'

const emit = defineEmits(['created']);
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const payCodes = ref([]);
const categories = ref([]);
const selectedRowKeys = ref([]);
const currentPayCode = ref(null);
const currentQrcode = ref('');
const showFormModal = ref(false);
const showPrintModal = ref(false);
const isEditing = ref(false);
const formRef = ref(null);
const printRef = ref(null);

const filters = reactive({ category: null, isActive: null, keyword: '' });

const form = ref({
  title: '', amount: null, description: '', category: '', isActive: true,
  pointPrice: null, allowInstallment: false, installmentOptionsArray: [3, 6, 12],
  isCustomAmount: false,
});

const pagination = reactive({ page: 1, pageSize: 10, pageCount: 1, itemCount: 0 });

const paginationConfig = computed(() => ({
  page: pagination.page, pageSize: pagination.pageSize, pageCount: pagination.pageCount,
  itemCount: pagination.itemCount, showSizePicker: true, pageSizes: [10, 20, 50],
  prefix: ({ itemCount }) => `共 ${itemCount} 条`,
}));

const categoryOptions = computed(() => categories.value.map(c => ({ label: c, value: c })));
const statusOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
];
const selectedAllActive = computed(() => {
  if (!selectedRowKeys.value.length) return false;
  return payCodes.value.filter(p => selectedRowKeys.value.includes(p.id)).every(p => p.isActive);
});

const columns = [
  { type: 'selection', width: 50 },
  { title: '商品名称', key: 'title', ellipsis: { tooltip: true }, render: (row) => row.title },
  { title: '金额', key: 'amount', width: 100, render: (row) => `${parseFloat(row.amount).toFixed(2)} 币` },
  { title: '分类', key: 'category', width: 80, render: (row) => row.category || '-' },
  { title: '状态', key: 'isActive', width: 80, render: (row) => row.isActive ? '启用' : '禁用' },
  { title: '支付', key: 'orders', width: 60, render: (row) => row._count?.orders || 0 },
];

const rules = {
  title: { required: true, message: '请输入商品名称', trigger: 'blur' },
  amount: { 
    required: true, 
    type: 'number', 
    message: '请输入金额', 
    trigger: ['blur', 'change'],
    validator: (rule, value) => {
      if (form.value.isCustomAmount) return true;
      return !value || value < 0.01 ? new Error('固定金额时金额不能为空') : true;
    }
  },
};

const rowProps = (row) => ({ style: 'cursor: pointer;', onClick: () => selectPayCode(row) });

const getRowClass = (row) => currentPayCode.value?.id === row.id ? 'selected-row' : '';

const loadCategories = async () => {
  try { categories.value = (await payAPI.getCategories()).categories || []; }
  catch (e) { console.error(e); }
};

const loadPayCodes = async () => {
  loading.value = true;
  try {
    const params = { page: pagination.page, limit: pagination.pageSize };
    if (filters.category) params.category = filters.category;
    if (filters.isActive !== null) params.isActive = filters.isActive;
    if (filters.keyword) params.keyword = filters.keyword;
    const data = await payAPI.getPayCodes(params);
    payCodes.value = data.codes;
    pagination.itemCount = data.pagination.total;
    pagination.pageCount = data.pagination.totalPages;
  } catch { message.error('加载失败'); }
  finally { loading.value = false; }
};

const loadQrcode = async (payCode) => {
  try {
    const data = await payAPI.getPayCode(payCode.id);
    currentQrcode.value = data.qrcode;
  } catch { currentQrcode.value = ''; }
};

const handleSearch = () => { pagination.page = 1; loadPayCodes(); };
const handleReset = () => { filters.category = null; filters.isActive = null; filters.keyword = ''; pagination.page = 1; loadPayCodes(); };
const handlePageChange = (p) => { pagination.page = p; loadPayCodes(); };
const handlePageSizeChange = (s) => { pagination.pageSize = s; pagination.page = 1; loadPayCodes(); };

const selectPayCode = (payCode) => {
  currentPayCode.value = payCode;
  loadQrcode(payCode);
};

const handleCreate = () => {
  isEditing.value = false;
  form.value = { title: '', amount: null, description: '', category: '', isActive: true, pointPrice: null, allowInstallment: false, installmentOptionsArray: [3, 6, 12], isCustomAmount: false };
  showFormModal.value = true;
};

const handleEdit = () => {
  if (!currentPayCode.value) return;
  isEditing.value = true;
  const amount = parseFloat(currentPayCode.value.amount);
  form.value = {
    title: currentPayCode.value.title,
    amount: amount === 0 ? null : amount,
    isCustomAmount: amount === 0,
    description: currentPayCode.value.description || '',
    category: currentPayCode.value.category || '',
    isActive: currentPayCode.value.isActive,
    pointPrice: currentPayCode.value.pointPrice || null,
    allowInstallment: currentPayCode.value.allowInstallment || false,
    installmentOptionsArray: currentPayCode.value.installmentOptions ? currentPayCode.value.installmentOptions.split(',').map(n => parseInt(n.trim())) : [3, 6, 12],
  };
  showFormModal.value = true;
};

const handleSubmit = async () => {
  try { await formRef.value?.validate(); } catch { return; }
  submitting.value = true;
  try {
    const data = {
      title: form.value.title, 
      amount: form.value.isCustomAmount ? 0 : Number(form.value.amount), 
      description: form.value.description,
      category: form.value.category, 
      pointPrice: form.value.pointPrice || null,
      allowInstallment: form.value.allowInstallment,
      installmentOptions: form.value.allowInstallment ? form.value.installmentOptionsArray.sort((a, b) => a - b).join(',') : null,
    };
    if (isEditing.value) {
      await payAPI.updatePayCode(currentPayCode.value.id, data);
      message.success('更新成功');
    } else {
      const result = await payAPI.createPayCode(data);
      message.success('创建成功');
      emit('created', result);
      currentPayCode.value = result.payCode;
      currentQrcode.value = result.qrcode;
    }
    showFormModal.value = false;
    loadPayCodes();
    loadCategories();
  } catch (e) { message.error(e.error || '操作失败'); }
  finally { submitting.value = false; }
};

const handleDelete = async () => {
  if (!currentPayCode.value) return;
  try {
    await payAPI.deletePayCode(currentPayCode.value.id);
    message.success('删除成功');
    showFormModal.value = false;
    currentPayCode.value = null;
    loadPayCodes();
  } catch (e) { message.error(e.error || '删除失败'); }
};

const handleToggle = async (payCode) => {
  try {
    await payAPI.togglePayCode(payCode.id);
    message.success(payCode.isActive ? '已禁用' : '已启用');
    loadPayCodes();
    if (currentPayCode.value?.id === payCode.id) {
      currentPayCode.value.isActive = !payCode.isActive;
    }
  } catch (e) { message.error(e.error || '操作失败'); }
};

const handleBatchToggle = async () => {
  if (!selectedRowKeys.value.length) return;
  const targetActive = !selectedAllActive.value;
  dialog.warning({
    title: `批量${targetActive ? '启用' : '禁用'}`,
    content: `确定要${targetActive ? '启用' : '禁用'}选中的 ${selectedRowKeys.value.length} 个收款码吗？`,
    positiveText: '确定', negativeText: '取消',
    async onPositiveClick() {
      try {
        for (const id of selectedRowKeys.value) {
          const code = payCodes.value.find(p => p.id === id);
          if (code && code.isActive !== targetActive) await payAPI.togglePayCode(id);
        }
        message.success('批量操作成功');
        selectedRowKeys.value = [];
        loadPayCodes();
      } catch { message.error('批量操作失败'); }
    },
  });
};

const handleBatchDelete = async () => {
  if (!selectedRowKeys.value.length) return;
  dialog.warning({
    title: '批量删除', content: `确定要删除选中的 ${selectedRowKeys.value.length} 个收款码吗？`,
    positiveText: '确定删除', negativeText: '取消',
    async onPositiveClick() {
      try {
        for (const id of selectedRowKeys.value) {
          try { await payAPI.deletePayCode(id); } catch {}
        }
        message.success('批量删除完成');
        selectedRowKeys.value = [];
        currentPayCode.value = null;
        loadPayCodes();
      } catch { message.error('批量删除失败'); }
    },
  });
};

const copyCode = async (code) => {
  try { await navigator.clipboard.writeText(code); message.success('已复制'); }
  catch { message.error('复制失败'); }
};

const handlePrint = () => { if (currentPayCode.value) showPrintModal.value = true; };

const executePrint = () => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<html><head><title>收款码打印</title><style>
    body { margin: 0; padding: 40px; text-align: center; font-family: sans-serif; }
    .card { border: 2px solid #333; border-radius: 8px; padding: 30px; display: inline-block; }
    .qrcode { width: 200px; height: 200px; }
    .title { font-weight: bold; font-size: 18px; margin: 15px 0 5px; }
    .amount { color: #18a058; font-size: 24px; font-weight: bold; }
    .code { font-size: 12px; color: #666; margin-top: 10px; font-family: monospace; }
  </style></head><body><div class="card">
    <img src="${currentQrcode.value}" class="qrcode" />
    <div class="title">${currentPayCode.value.title}</div>
    <div class="amount">${parseFloat(currentPayCode.value.amount).toFixed(2)} 学习币</div>
    <div class="code">${currentPayCode.value.code}</div>
  </div></body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
  showPrintModal.value = false;
};

const handleDownloadQrcode = () => {
  if (!currentQrcode.value) return;
  const link = document.createElement('a');
  link.href = currentQrcode.value;
  link.download = `收款码_${currentPayCode.value.title}_${currentPayCode.value.code}.png`;
  link.click();
  message.success('下载成功');
};

const formatDate = (d) => format(new Date(d), 'yyyy-MM-dd HH:mm');

onMounted(() => { loadCategories(); loadPayCodes(); });

defineExpose({ loadPayCodes });
</script>

<style scoped>
.paycode-manager { padding: 16px 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.content-layout { display: flex; gap: 20px; height: calc(100vh - 260px); min-height: 400px; }
.list-section { flex: 1; overflow: auto; }
.detail-section { width: 320px; flex-shrink: 0; background: #fafafa; border-radius: 8px; padding: 16px; overflow: auto; }
.detail-section.empty { display: flex; align-items: center; justify-content: center; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.detail-header h3 { margin: 0; font-size: 16px; }
.qrcode-display { text-align: center; margin-bottom: 16px; }
.qrcode-img { width: 160px; height: 160px; border-radius: 8px; border: 1px solid #e0e0e0; }
.info-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.info-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.info-item .label { color: #999; font-size: 13px; }
.info-item .value { font-weight: 500; display: flex; align-items: center; gap: 4px; }
.info-item .value.code { font-family: monospace; font-size: 11px; }
.description, .installment-info { margin-top: 16px; }
.description .label, .installment-info .label { display: block; color: #999; font-size: 13px; margin-bottom: 8px; }
.description p { margin: 0; font-size: 13px; color: #666; }
.detail-actions { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
.detail-actions button { flex: 1; min-width: 80px; }
.text-green { color: #18a058; font-weight: bold; }
.text-orange { color: #f0a020; font-weight: bold; }
.print-preview { text-align: center; padding: 20px; }
.print-card { display: inline-block; border: 2px solid #333; border-radius: 8px; padding: 30px; }
.print-qrcode { width: 180px; height: 180px; }
.print-title { font-weight: bold; font-size: 16px; margin: 12px 0 5px; }
.print-amount { color: #18a058; font-size: 20px; font-weight: bold; }
.print-code { font-size: 11px; color: #666; margin-top: 8px; font-family: monospace; }
:deep(.n-data-table-tr.selected-row td) { 
  background-color: #f0fdf4 !important; 
}
:deep(.n-data-table-tr.selected-row td:first-child) { 
  border-left: 3px solid #18a058; 
}
:deep(.n-data-table-tr:hover:not(.selected-row) td) { 
  background-color: #fafafa !important; 
}
:deep(.n-data-table-td) { cursor: pointer; }
:deep(.n-data-table-td) { border-color: #f0f0f0 !important; }
:deep(.n-data-table-th) { border-color: #f0f0f0 !important; }
@media (max-width: 900px) {
  .content-layout { flex-direction: column; height: auto; }
  .detail-section { width: 100%; }
}
</style>
