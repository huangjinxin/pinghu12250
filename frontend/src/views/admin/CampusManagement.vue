<template>
  <div class="space-y-6">
    <div v-if="!embedded" class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学校管理</h1>
        <p class="text-gray-500 mt-1">管理系统中的所有学校</p>
      </div>
      <n-button type="primary" @click="showModal = true">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        新增学校
      </n-button>
    </div>
    <div v-if="embedded" class="flex justify-end">
      <n-button type="primary" size="small" @click="showModal = true">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        新增学校
      </n-button>
    </div>

    <div class="card">
      <n-data-table
        :columns="columns"
        :data="campuses"
        :loading="loading"
        :pagination="false"
      />
    </div>

    <n-modal v-model:show="showModal" preset="dialog" :title="editingCampus ? '编辑学校' : '新增学校'">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="学校名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入学校名称" />
        </n-form-item>
        <n-form-item label="地址" path="address">
          <n-input v-model:value="form.address" placeholder="请输入学校地址" />
        </n-form-item>
        <n-form-item label="联系电话" path="phone">
          <n-input v-model:value="form.phone" placeholder="请输入联系电话" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingCampus ? '保存' : '创建' }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { useMessage, useDialog, NButton, NSpace } from 'naive-ui';
import { campusAPI } from '@/api';
import AddOutline from '@vicons/ionicons5/es/AddOutline'

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const campuses = ref([]);
const editingCampus = ref(null);
const formRef = ref(null);

const form = ref({
  name: '',
  address: '',
  phone: '',
});

const rules = {
  name: { required: true, message: '请输入学校名称', trigger: 'blur' },
};

const columns = [
  { title: '学校名称', key: 'name' },
  { title: '地址', key: 'address', ellipsis: { tooltip: true } },
  { title: '联系电话', key: 'phone' },
  {
    title: '班级数',
    key: '_count',
    render: (row) => row._count?.classes || 0,
  },
  {
    title: '用户数',
    key: 'users',
    render: (row) => row._count?.users || 0,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => h(NSpace, null, {
      default: () => [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: () => handleEdit(row),
          },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => '删除' }
        ),
      ],
    }),
  },
];

const loadCampuses = async () => {
  loading.value = true;
  try {
    const data = await campusAPI.getCampuses();
    campuses.value = data.campuses;
  } catch (error) {
    message.error('加载学校列表失败');
  } finally {
    loading.value = false;
  }
};

const handleEdit = (campus) => {
  editingCampus.value = campus;
  form.value = {
    name: campus.name,
    address: campus.address || '',
    phone: campus.phone || '',
  };
  showModal.value = true;
};

const handleDelete = (campus) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除学校"${campus.name}"吗？删除后将无法恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await campusAPI.deleteCampus(campus.id);
        message.success('删除成功');
        loadCampuses();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (editingCampus.value) {
      await campusAPI.updateCampus(editingCampus.value.id, form.value);
      message.success('更新成功');
    } else {
      await campusAPI.createCampus(form.value);
      message.success('创建成功');
    }
    showModal.value = false;
    editingCampus.value = null;
    form.value = { name: '', address: '', phone: '' };
    loadCampuses();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadCampuses();
});
</script>
