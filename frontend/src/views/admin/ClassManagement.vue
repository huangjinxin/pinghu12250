<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">班级管理</h1>
        <p class="text-gray-500 mt-1">管理系统中的所有班级</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        新增班级
      </n-button>
    </div>

    <!-- 筛选栏 -->
    <div class="card">
      <n-space>
        <n-select
          v-model:value="filters.campusId"
          placeholder="选择校区"
          :options="campusOptions"
          clearable
          style="width: 200px"
          @update:value="loadClasses"
        />
      </n-space>
    </div>

    <!-- 班级列表 -->
    <div class="card">
      <n-data-table
        :columns="columns"
        :data="classes"
        :loading="loading"
        :pagination="false"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <n-modal v-model:show="showModal" preset="dialog" :title="editingClass ? '编辑班级' : '新增班级'">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="所属校区" path="campusId">
          <n-select
            v-model:value="form.campusId"
            placeholder="请选择校区"
            :options="campusOptions"
          />
        </n-form-item>
        <n-form-item label="班级名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入班级名称" />
        </n-form-item>
        <n-form-item label="年级" path="grade">
          <n-input v-model:value="form.grade" placeholder="请输入年级（如：大班、中班）" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingClass ? '保存' : '创建' }}
        </n-button>
      </template>
    </n-modal>

    <!-- 分配老师弹窗 -->
    <n-modal v-model:show="showTeacherModal" preset="dialog" title="分配老师">
      <div class="space-y-4">
        <div v-if="currentClass">
          <p class="text-sm text-gray-500 mb-2">当前班级：{{ currentClass.name }}</p>

          <!-- 已分配老师列表 -->
          <div v-if="currentClass.teachers?.length" class="mb-4">
            <p class="text-sm font-medium mb-2">已分配老师：</p>
            <div class="space-y-2">
              <div
                v-for="tc in currentClass.teachers"
                :key="tc.id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div class="flex items-center space-x-2">
                  <AvatarText :username="student.username" size="md" />
                  <span>{{ tc.teacher.profile?.nickname || tc.teacher.username }}</span>
                  <n-tag v-if="tc.role" size="small">{{ tc.role }}</n-tag>
                </div>
                <n-button size="small" type="error" quaternary @click="removeTeacher(tc.teacher.id)">
                  移除
                </n-button>
              </div>
            </div>
          </div>

          <!-- 添加新老师 -->
          <n-form-item label="添加老师">
            <n-space>
              <n-select
                v-model:value="newTeacherId"
                placeholder="选择老师"
                :options="teacherOptions"
                filterable
                style="width: 200px"
              />
              <n-input v-model:value="newTeacherRole" placeholder="职责（可选）" style="width: 120px" />
              <n-button type="primary" :disabled="!newTeacherId" @click="assignTeacher">
                添加
              </n-button>
            </n-space>
          </n-form-item>
        </div>
      </div>
      <template #action>
        <n-button @click="showTeacherModal = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted, h, computed } from 'vue';
import { useMessage, useDialog, NButton, NSpace, NTag, NAvatar } from 'naive-ui';
import { campusAPI, classAPI, userAPI } from '@/api';
import { AddOutline } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const showTeacherModal = ref(false);
const classes = ref([]);
const campuses = ref([]);
const teachers = ref([]);
const editingClass = ref(null);
const currentClass = ref(null);
const formRef = ref(null);

const filters = ref({
  campusId: null,
});

const form = ref({
  name: '',
  grade: '',
  campusId: null,
});

const newTeacherId = ref(null);
const newTeacherRole = ref('');

const rules = {
  name: { required: true, message: '请输入班级名称', trigger: 'blur' },
  campusId: { required: true, message: '请选择校区', trigger: 'change' },
};

const campusOptions = computed(() =>
  campuses.value.map(c => ({ label: c.name, value: c.id }))
);

const teacherOptions = computed(() =>
  teachers.value.map(t => ({
    label: t.profile?.nickname || t.username,
    value: t.id,
  }))
);

const columns = [
  { title: '班级名称', key: 'name' },
  { title: '年级', key: 'grade' },
  {
    title: '所属校区',
    key: 'campus',
    render: (row) => row.campus?.name || '-',
  },
  {
    title: '学生数',
    key: 'students',
    render: (row) => row._count?.students || 0,
  },
  {
    title: '带班老师',
    key: 'teachers',
    render: (row) => {
      if (!row.teachers?.length) return '-';
      return h(NSpace, { size: 'small' }, {
        default: () => row.teachers.map(tc =>
          h(NTag, { size: 'small' }, {
            default: () => tc.teacher.profile?.nickname || tc.teacher.username,
          })
        ),
      });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => {
      return h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              quaternary: true,
              onClick: () => openTeacherModal(row),
            },
            { default: () => '分配老师' }
          ),
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
      });
    },
  },
];

const loadCampuses = async () => {
  try {
    const data = await campusAPI.getCampuses();
    campuses.value = data.campuses;
  } catch (error) {
    console.error('加载校区失败:', error);
  }
};

const loadClasses = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.value.campusId) {
      params.campusId = filters.value.campusId;
    }
    const data = await classAPI.getClasses(params);
    classes.value = data.classes;
  } catch (error) {
    message.error('加载班级列表失败');
  } finally {
    loading.value = false;
  }
};

const loadTeachers = async () => {
  // TODO: 需要后端提供获取老师列表的API
  // 暂时使用空数组
  teachers.value = [];
};

const openCreateModal = () => {
  editingClass.value = null;
  form.value = { name: '', grade: '', campusId: filters.value.campusId };
  showModal.value = true;
};

const handleEdit = (classItem) => {
  editingClass.value = classItem;
  form.value = {
    name: classItem.name,
    grade: classItem.grade || '',
    campusId: classItem.campusId,
  };
  showModal.value = true;
};

const handleDelete = (classItem) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除班级"${classItem.name}"吗？删除后将无法恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await classAPI.deleteClass(classItem.id);
        message.success('删除成功');
        loadClasses();
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
    if (editingClass.value) {
      await classAPI.updateClass(editingClass.value.id, form.value);
      message.success('更新成功');
    } else {
      await classAPI.createClass(form.value);
      message.success('创建成功');
    }
    showModal.value = false;
    loadClasses();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const openTeacherModal = async (classItem) => {
  currentClass.value = classItem;
  newTeacherId.value = null;
  newTeacherRole.value = '';
  showTeacherModal.value = true;
};

const assignTeacher = async () => {
  if (!newTeacherId.value || !currentClass.value) return;

  try {
    await classAPI.assignTeacher(currentClass.value.id, {
      teacherId: newTeacherId.value,
      role: newTeacherRole.value || undefined,
    });
    message.success('分配成功');
    loadClasses();
    // 重新加载当前班级数据
    const data = await classAPI.getClass(currentClass.value.id);
    currentClass.value = data;
    newTeacherId.value = null;
    newTeacherRole.value = '';
  } catch (error) {
    message.error(error.error || '分配失败');
  }
};

const removeTeacher = async (teacherId) => {
  if (!currentClass.value) return;

  try {
    await classAPI.removeTeacher(currentClass.value.id, teacherId);
    message.success('移除成功');
    loadClasses();
    // 重新加载当前班级数据
    const data = await classAPI.getClass(currentClass.value.id);
    currentClass.value = data;
  } catch (error) {
    message.error(error.error || '移除失败');
  }
};

onMounted(() => {
  loadCampuses();
  loadClasses();
  loadTeachers();
});
</script>
