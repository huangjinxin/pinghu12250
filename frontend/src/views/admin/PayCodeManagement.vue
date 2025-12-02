<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">收款码管理</h1>
        <p class="text-gray-500 mt-1">创建和管理扫码支付收款码</p>
      </div>
      <n-button type="primary" @click="showCreateModal = true">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        创建收款码
      </n-button>
    </div>

    <!-- 收款码列表 -->
    <div class="card">
      <n-data-table
        :columns="columns"
        :data="payCodes"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 创建收款码对话框 -->
    <n-modal v-model:show="showCreateModal" preset="dialog" title="创建收款码">
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
          />
        </n-form-item>
        <n-form-item label="描述（可选）">
          <n-input
            v-model:value="form.description"
            type="textarea"
            placeholder="请输入描述信息"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showCreateModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleCreate">
          创建
        </n-button>
      </template>
    </n-modal>

    <!-- 二维码预览对话框 -->
    <n-modal v-model:show="showQRCodeModal" preset="dialog" title="收款码二维码">
      <div v-if="currentPayCode" class="flex flex-col items-center space-y-4">
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-2">{{ currentPayCode.title }}</h3>
          <p class="text-gray-600">金额: {{ Number(currentPayCode.amount).toFixed(2) }} 学习币</p>
          <p v-if="currentPayCode.description" class="text-sm text-gray-500 mt-1">
            {{ currentPayCode.description }}
          </p>
        </div>
        <div v-if="qrcodeDataURL" class="border-4 border-gray-200 rounded-lg p-2">
          <img :src="qrcodeDataURL" alt="收款码" class="w-64 h-64" />
        </div>
        <div class="text-sm text-gray-500">
          收款码: {{ currentPayCode.code }}
        </div>
        <n-button @click="copyCode(currentPayCode.code)">
          <template #icon>
            <n-icon><CopyOutline /></n-icon>
          </template>
          复制收款码
        </n-button>
      </div>
      <template #action>
        <n-button @click="showQRCodeModal = false">关闭</n-button>
      </template>
    </n-modal>

    <!-- 支付记录对话框 -->
    <n-modal
      v-model:show="showOrdersModal"
      preset="dialog"
      title="支付记录"
      style="width: 800px"
    >
      <n-data-table
        :columns="orderColumns"
        :data="orders"
        :loading="ordersLoading"
        :pagination="false"
        size="small"
      />
      <template #action>
        <n-button @click="showOrdersModal = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, reactive } from 'vue';
import { useMessage, NButton, NSpace, NTag, NPopconfirm } from 'naive-ui';
import { payAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline, QrCodeOutline, CopyOutline, TrashOutline, ListOutline } from '@vicons/ionicons5';

const message = useMessage();

const loading = ref(false);
const submitting = ref(false);
const payCodes = ref([]);
const showCreateModal = ref(false);
const showQRCodeModal = ref(false);
const showOrdersModal = ref(false);
const currentPayCode = ref(null);
const qrcodeDataURL = ref('');
const orders = ref([]);
const ordersLoading = ref(false);
const formRef = ref(null);

const form = ref({
  title: '',
  amount: null,
  description: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  pageCount: 1,
  itemCount: 0,
});

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
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    render: (row) => `${Number(row.amount).toFixed(2)} 币`,
  },
  {
    title: '收款码',
    key: 'code',
    width: 180,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '状态',
    key: 'isActive',
    width: 80,
    render: (row) =>
      h(
        NTag,
        {
          type: row.isActive ? 'success' : 'default',
          size: 'small',
        },
        () => (row.isActive ? '启用' : '禁用')
      ),
  },
  {
    title: '支付次数',
    key: '_count',
    width: 100,
    render: (row) => row._count?.orders || 0,
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 160,
    render: (row) => format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    render: (row) => {
      return h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => showQRCode(row),
          },
          { default: () => '查看二维码', icon: () => h(QrCodeOutline) }
        ),
        h(
          NButton,
          {
            size: 'small',
            onClick: () => viewOrders(row),
          },
          { default: () => '支付记录', icon: () => h(ListOutline) }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: row.isActive ? 'warning' : 'success',
            onClick: () => toggleStatus(row),
          },
          () => (row.isActive ? '禁用' : '启用')
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  type: 'error',
                  disabled: row._count?.orders > 0,
                },
                { default: () => '删除', icon: () => h(TrashOutline) }
              ),
            default: () => '确定要删除这个收款码吗？',
          }
        ),
      ]);
    },
  },
];

const orderColumns = [
  {
    title: '订单号',
    key: 'orderNo',
    width: 180,
  },
  {
    title: '用户ID',
    key: 'userId',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: '金额',
    key: 'amount',
    width: 100,
    render: (row) => `${Number(row.amount).toFixed(2)} 币`,
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) =>
      h(NTag, { type: 'success', size: 'small' }, () => '已完成'),
  },
  {
    title: '支付时间',
    key: 'createdAt',
    width: 160,
    render: (row) => format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
  },
];

const loadPayCodes = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    };
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

const handleCreate = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const result = await payAPI.createPayCode(form.value);
    message.success('收款码创建成功');
    showCreateModal.value = false;
    form.value = { title: '', amount: null, description: '' };
    loadPayCodes();

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

const viewOrders = async (payCode) => {
  ordersLoading.value = true;
  showOrdersModal.value = true;
  try {
    const data = await payAPI.getAllOrders({ payCodeId: payCode.id });
    orders.value = data.orders;
  } catch (error) {
    message.error('加载支付记录失败');
  } finally {
    ordersLoading.value = false;
  }
};

const toggleStatus = async (payCode) => {
  try {
    await payAPI.togglePayCode(payCode.id);
    message.success(payCode.isActive ? '收款码已禁用' : '收款码已启用');
    loadPayCodes();
  } catch (error) {
    message.error('操作失败');
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

const copyCode = (code) => {
  navigator.clipboard.writeText(code);
  message.success('收款码已复制');
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadPayCodes();
};

onMounted(() => {
  loadPayCodes();
});
</script>
