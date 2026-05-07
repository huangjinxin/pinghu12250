<template>
  <div class="category-manage">
    <!-- 操作按钮 -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">栏目管理</h3>
      <n-button type="primary" @click="handleAdd">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        新增栏目
      </n-button>
    </div>

    <!-- 栏目列表 -->
    <n-spin :show="loading">
      <n-table :bordered="false" :single-line="false">
        <thead>
          <tr>
            <th style="width: 60px">排序</th>
            <th style="width: 60px">图标</th>
            <th style="width: 120px">名称</th>
            <th style="width: 100px">标识</th>
            <th>描述</th>
            <th style="width: 80px">积分</th>
            <th style="width: 80px">作品数</th>
            <th style="width: 80px">状态</th>
            <th style="width: 150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat.id">
            <td>{{ cat.sortOrder }}</td>
            <td>{{ cat.icon || '-' }}</td>
            <td>{{ cat.name }}</td>
            <td><n-tag size="small">{{ cat.slug }}</n-tag></td>
            <td>{{ cat.description || '-' }}</td>
            <td>{{ cat.points }}</td>
            <td>{{ cat.worksCount || 0 }}</td>
            <td>
              <n-tag :type="cat.isActive ? 'success' : 'default'" size="small">
                {{ cat.isActive ? '启用' : '禁用' }}
              </n-tag>
            </td>
            <td>
              <n-space>
                <n-button size="small" @click="handleEdit(cat)">编辑</n-button>
                <n-button
                  size="small"
                  :type="cat.isActive ? 'warning' : 'success'"
                  @click="handleToggle(cat)"
                >
                  {{ cat.isActive ? '禁用' : '启用' }}
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  :disabled="cat.worksCount > 0"
                  @click="handleDelete(cat)"
                >
                  删除
                </n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>

      <n-empty v-if="categories.length === 0 && !loading" description="暂无栏目" />
    </n-spin>

    <!-- 新增/编辑对话框 -->
    <n-modal
      v-model:show="showDialog"
      preset="card"
      :title="editingId ? '编辑栏目' : '新增栏目'"
      style="width: 500px"
    >
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="80px">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="form.name" placeholder="栏目显示名称" />
        </n-form-item>

        <n-form-item label="标识" path="slug">
          <n-input
            v-model:value="form.slug"
            placeholder="英文标识（如 poetry）"
            :disabled="!!editingId"
          />
        </n-form-item>

        <n-form-item label="图标" path="icon">
          <n-input v-model:value="form.icon" placeholder="Emoji或图片URL" />
        </n-form-item>

        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" placeholder="栏目描述" />
        </n-form-item>

        <n-form-item label="积分" path="points">
          <n-input-number v-model:value="form.points" :min="0" style="width: 100%" />
        </n-form-item>

        <n-form-item label="排序" path="sortOrder">
          <n-input-number v-model:value="form.sortOrder" :min="0" style="width: 100%" />
        </n-form-item>

        <n-form-item label="状态" path="isActive">
          <n-switch v-model:value="form.isActive" />
          <span class="ml-2 text-sm text-gray-500">{{ form.isActive ? '启用' : '禁用' }}</span>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showDialog = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import api from '@/api';

const message = useMessage();
const dialog = useDialog();

// 状态
const loading = ref(false);
const categories = ref([]);

// 对话框
const showDialog = ref(false);
const editingId = ref(null);
const submitting = ref(false);
const formRef = ref(null);
const form = ref({
  name: '',
  slug: '',
  icon: '',
  description: '',
  points: 5,
  sortOrder: 0,
  isActive: true
});

const formRules = {
  name: { required: true, message: '请输入名称', trigger: 'blur' },
  slug: { required: true, message: '请输入标识', trigger: 'blur' }
};

// 加载栏目列表
const loadCategories = async () => {
  loading.value = true;
  try {
    const response = await api.get('/categories/admin/all');
    categories.value = response.data || [];
  } catch (error) {
    message.error(error.error || '加载失败');
  } finally {
    loading.value = false;
  }
};

// 新增
const handleAdd = () => {
  editingId.value = null;
  form.value = {
    name: '',
    slug: '',
    icon: '',
    description: '',
    points: 5,
    sortOrder: categories.value.length,
    isActive: true
  };
  showDialog.value = true;
};

// 编辑
const handleEdit = (cat) => {
  editingId.value = cat.id;
  form.value = {
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon || '',
    description: cat.description || '',
    points: cat.points,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive
  };
  showDialog.value = true;
};

// 提交
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      await api.put(`/categories/${editingId.value}`, form.value);
      message.success('更新成功');
    } else {
      await api.post('/categories', form.value);
      message.success('创建成功');
    }
    showDialog.value = false;
    loadCategories();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    submitting.value = false;
  }
};

// 启用/禁用
const handleToggle = async (cat) => {
  try {
    await api.put(`/categories/${cat.id}`, { isActive: !cat.isActive });
    message.success(cat.isActive ? '已禁用' : '已启用');
    loadCategories();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

// 删除
const handleDelete = (cat) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除栏目"${cat.name}"吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/categories/${cat.id}`);
        message.success('删除成功');
        loadCategories();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.ml-2 {
  margin-left: 8px;
}
</style>
