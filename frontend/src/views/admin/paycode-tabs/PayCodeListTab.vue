<template>
  <div class="paycode-list-tab">
    <!-- 筛选栏和操作栏 -->
    <div class="toolbar">
      <n-space>
        <n-select
          v-model:value="filters.category"
          :options="categoryOptions"
          placeholder="选择分类"
          style="width: 150px"
          clearable
          @update:value="handleSearch"
        />
        <n-select
          v-model:value="filters.isActive"
          :options="statusOptions"
          placeholder="状态"
          style="width: 100px"
          clearable
          @update:value="handleSearch"
        />
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索名称/描述"
          style="width: 160px"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #suffix>
            <n-icon :component="SearchOutline" style="cursor: pointer" @click="handleSearch" />
          </template>
        </n-input>
        <n-button @click="handleReset">重置</n-button>
      </n-space>
      <n-button type="primary" @click="showCreateModal = true">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        创建收款码
      </n-button>
    </div>

    <!-- 收款码列表 -->
    <n-data-table
      :columns="columns"
      :data="payCodes"
      :loading="loading"
      :pagination="paginationConfig"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />

    <!-- 创建/编辑收款码对话框 -->
    <n-modal v-model:show="showCreateModal" preset="dialog" :title="isEditing ? '编辑收款码' : '创建收款码'" style="width: 500px">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="商品名称" path="title">
          <n-input v-model:value="form.title" placeholder="请输入商品或服务名称" />
        </n-form-item>
        <n-form-item label="金额（学习币）" path="amount">
          <n-input-number
            v-model:value="form.amount"
            :min="0.01"
            :step="0.01"
            :precision="2"
            placeholder="请输入金额（最小0.01）"
            style="width: 100%"
            :show-button="false"
          />
        </n-form-item>
        <n-form-item label="分类">
          <n-input v-model:value="form.category" placeholder="请输入分类，如：文具、零食、活动等" />
        </n-form-item>
        <n-form-item label="描述（可选）">
          <n-input
            v-model:value="form.description"
            type="textarea"
            placeholder="请输入描述信息"
            :rows="3"
          />
        </n-form-item>
        <n-form-item v-if="isEditing" label="状态">
          <n-switch v-model:value="form.isActive">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </n-form-item>
      </n-form>
      <template #action>
        <div class="modal-actions">
          <div class="left-actions">
            <n-popconfirm v-if="isEditing && currentEditPayCode?._count?.orders === 0" @positive-click="handleDeleteInEdit">
              <template #trigger>
                <n-button type="error">
                  <template #icon><n-icon><TrashOutline /></n-icon></template>
                  删除
                </n-button>
              </template>
              确定要删除这个收款码吗？此操作不可撤销。
            </n-popconfirm>
          </div>
          <div class="right-actions">
            <n-button @click="showCreateModal = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="isEditing ? handleUpdate() : handleCreate()">
              {{ isEditing ? '保存' : '创建' }}
            </n-button>
          </div>
        </div>
      </template>
    </n-modal>

    <!-- 查看收款码详情对话框 -->
    <n-modal v-model:show="showViewModal" preset="card" title="收款码详情" style="width: 450px">
      <div v-if="viewPayCode" class="view-detail">
        <div class="detail-row">
          <span class="label">商品名称</span>
          <span class="value">{{ viewPayCode.title }}</span>
        </div>
        <div class="detail-row">
          <span class="label">金额</span>
          <span class="value text-green-600 font-bold">{{ parseFloat(viewPayCode.amount).toFixed(2) }} 学习币</span>
        </div>
        <div class="detail-row">
          <span class="label">分类</span>
          <span class="value">{{ viewPayCode.category || '未分类' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">收款码</span>
          <span class="value code">{{ viewPayCode.code }}</span>
        </div>
        <div class="detail-row">
          <span class="label">描述</span>
          <span class="value">{{ viewPayCode.description || '无' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">状态</span>
          <n-tag :type="viewPayCode.isActive ? 'success' : 'default'" size="small">
            {{ viewPayCode.isActive ? '启用' : '禁用' }}
          </n-tag>
        </div>
        <div class="detail-row">
          <span class="label">支付次数</span>
          <span class="value">{{ viewPayCode._count?.orders || 0 }} 次</span>
        </div>
        <div class="detail-row">
          <span class="label">创建时间</span>
          <span class="value">{{ format(new Date(viewPayCode.createdAt), 'yyyy-MM-dd HH:mm:ss') }}</span>
        </div>
        <div class="qrcode-section" v-if="viewQrcodeURL">
          <div class="qrcode-label">二维码</div>
          <div class="qrcode-image">
            <img :src="viewQrcodeURL" alt="收款码二维码" />
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showViewModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 二维码预览对话框 -->
    <n-modal v-model:show="showQRCodeModal" preset="dialog" title="收款码二维码">
      <div v-if="currentPayCode" class="flex flex-col items-center space-y-4">
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-2">{{ currentPayCode.title }}</h3>
          <p class="text-gray-600">金额: {{ parseFloat(currentPayCode.amount).toFixed(2) }} 学习币</p>
        </div>
        <div v-if="qrcodeDataURL" class="border-4 border-gray-200 rounded-lg p-2">
          <img :src="qrcodeDataURL" alt="收款码" class="w-64 h-64" />
        </div>
        <div class="text-sm text-gray-500">
          收款码: {{ currentPayCode.code }}
        </div>
      </div>
      <template #action>
        <n-button @click="showQRCodeModal = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, reactive, watch, computed } from 'vue';
import { useMessage, NButton, NSpace, NTag, NPopconfirm } from 'naive-ui';
import { payAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline, QrCodeOutline, CreateOutline, BanOutline, CheckmarkCircleOutline, TrashOutline, EyeOutline, SearchOutline } from '@vicons/ionicons5';

const emit = defineEmits(['created', 'refresh']);

const message = useMessage();

const loading = ref(false);
const submitting = ref(false);
const payCodes = ref([]);
const categories = ref([]);
const showCreateModal = ref(false);
const showQRCodeModal = ref(false);
const showViewModal = ref(false);
const currentPayCode = ref(null);
const qrcodeDataURL = ref('');
const formRef = ref(null);
const isEditing = ref(false);
const currentEditPayCode = ref(null);
const viewPayCode = ref(null);
const viewQrcodeURL = ref('');

const filters = reactive({
  category: null,
  isActive: null,
  keyword: '',
});

const form = ref({
  title: '',
  amount: null,
  description: '',
  category: '',
  isActive: true,
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  pageCount: 1,
  itemCount: 0,
});

const paginationConfig = computed(() => ({
  page: pagination.page,
  pageSize: pagination.pageSize,
  pageCount: pagination.pageCount,
  itemCount: pagination.itemCount,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  prefix: ({ itemCount }) => `共 ${itemCount} 条`,
}));

const categoryOptions = computed(() => {
  return categories.value.map(c => ({ label: c, value: c }));
});

const statusOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
];

const rules = {
  title: { required: true, message: '请输入商品名称', trigger: 'blur' },
  amount: {
    required: true,
    type: 'number',
    message: '请输入金额',
    trigger: ['blur', 'change'],
  },
};

const columns = [
  {
    title: '商品名称',
    key: 'title',
    width: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: '金额',
    key: 'amount',
    width: 80,
    render: (row) => `${parseFloat(row.amount).toFixed(2)} 币`,
  },
  {
    title: '分类',
    key: 'category',
    width: 90,
    render: (row) => row.category || '-',
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: { tooltip: true },
    render: (row) => row.description || '-',
  },
  {
    title: '状态',
    key: 'isActive',
    width: 70,
    render: (row) =>
      h(NTag, { type: row.isActive ? 'success' : 'default', size: 'small' }, () => (row.isActive ? '启用' : '禁用')),
  },
  {
    title: '支付次数',
    key: '_count',
    width: 80,
    render: (row) => row._count?.orders || 0,
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 140,
    render: (row) => format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => {
      return h('div', { class: 'action-btns' }, [
        h(NButton, { size: 'small', quaternary: true, onClick: () => handleView(row) }, { default: () => '查看' }),
        h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => handleEdit(row) }, { default: () => '编辑' }),
      ]);
    },
  },
];

const loadCategories = async () => {
  try {
    const data = await payAPI.getCategories();
    categories.value = data.categories || [];
  } catch (error) {
    console.error('加载分类失败:', error);
  }
};

const loadPayCodes = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    };
    if (filters.category) params.category = filters.category;
    if (filters.isActive !== null) params.isActive = filters.isActive;
    if (filters.keyword) params.keyword = filters.keyword;

    const data = await payAPI.getPayCodes(params);
    payCodes.value = data.codes;
    pagination.itemCount = data.pagination.total;
    pagination.pageCount = data.pagination.totalPages;
  } catch (error) {
    message.error('加载收款码列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadPayCodes();
};

const handleReset = () => {
  filters.category = null;
  filters.isActive = null;
  filters.keyword = '';
  pagination.page = 1;
  loadPayCodes();
};

const handleCreate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const result = await payAPI.createPayCode({
      title: form.value.title,
      amount: Number(form.value.amount),
      description: form.value.description,
      category: form.value.category,
    });
    message.success('收款码创建成功');
    showCreateModal.value = false;
    resetForm();
    loadPayCodes();
    loadCategories(); // 刷新分类列表
    emit('created', result);

    // 显示二维码
    currentPayCode.value = result.payCode;
    qrcodeDataURL.value = result.qrcode;
    showQRCodeModal.value = true;
  } catch (error) {
    message.error(error.error || '创建失败');
  } finally {
    submitting.value = false;
  }
};

const handleEdit = (payCode) => {
  isEditing.value = true;
  currentEditPayCode.value = payCode;
  form.value = {
    title: payCode.title,
    amount: parseFloat(payCode.amount),
    description: payCode.description || '',
    category: payCode.category || '',
    isActive: payCode.isActive,
  };
  showCreateModal.value = true;
};

const handleView = async (payCode) => {
  try {
    const data = await payAPI.getPayCode(payCode.id);
    viewPayCode.value = data.payCode;
    viewQrcodeURL.value = data.qrcode;
    showViewModal.value = true;
  } catch (error) {
    message.error('获取详情失败');
  }
};

const handleUpdate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    await payAPI.updatePayCode(currentEditPayCode.value.id, {
      title: form.value.title,
      amount: Number(form.value.amount),
      description: form.value.description,
      category: form.value.category,
      isActive: form.value.isActive,
    });
    message.success('收款码更新成功');
    showCreateModal.value = false;
    resetForm();
    loadPayCodes();
    loadCategories(); // 刷新分类列表
  } catch (error) {
    message.error(error.error || '更新失败');
  } finally {
    submitting.value = false;
  }
};

const handleToggle = async (payCode) => {
  try {
    const result = await payAPI.togglePayCode(payCode.id);
    message.success(result.message || (payCode.isActive ? '已停用' : '已启用'));
    loadPayCodes();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

const handleDelete = async (payCode) => {
  try {
    await payAPI.deletePayCode(payCode.id);
    message.success('删除成功');
    loadPayCodes();
  } catch (error) {
    message.error(error.error || '删除失败');
  }
};

const handleDeleteInEdit = async () => {
  if (!currentEditPayCode.value) return;
  try {
    await payAPI.deletePayCode(currentEditPayCode.value.id);
    message.success('删除成功');
    showCreateModal.value = false;
    resetForm();
    loadPayCodes();
  } catch (error) {
    message.error(error.error || '删除失败');
  }
};

const resetForm = () => {
  form.value = { title: '', amount: null, description: '', category: '', isActive: true };
  isEditing.value = false;
  currentEditPayCode.value = null;
};

const showQRCode = async (payCode) => {
  try {
    const data = await payAPI.getPayCode(payCode.id);
    currentPayCode.value = data.payCode;
    qrcodeDataURL.value = data.qrcode;
    showQRCodeModal.value = true;
  } catch (error) {
    message.error('获取二维码失败');
  }
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadPayCodes();
};

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  loadPayCodes();
};

watch(showCreateModal, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});

onMounted(() => {
  loadCategories();
  loadPayCodes();
});

// 暴露方法供父组件调用
defineExpose({ loadPayCodes });
</script>

<style scoped>
.paycode-list-tab {
  padding: 16px 0;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.action-btns) {
  display: flex;
  gap: 4px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.left-actions {
  display: flex;
  gap: 8px;
}

.right-actions {
  display: flex;
  gap: 8px;
}

.view-detail {
  padding: 8px 0;
}

.detail-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-of-type {
  border-bottom: none;
}

.detail-row .label {
  width: 80px;
  color: #999;
  flex-shrink: 0;
}

.detail-row .value {
  flex: 1;
}

.detail-row .value.code {
  font-family: monospace;
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.qrcode-section {
  margin-top: 16px;
  text-align: center;
}

.qrcode-label {
  color: #999;
  margin-bottom: 12px;
}

.qrcode-image {
  display: inline-block;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.qrcode-image img {
  width: 180px;
  height: 180px;
}
</style>
