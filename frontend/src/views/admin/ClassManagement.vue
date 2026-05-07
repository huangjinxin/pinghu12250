<template>
  <div :class="{ 'space-y-6': !embedded }">
    <div v-if="!embedded" class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">班级管理</h1>
        <p class="text-gray-500 mt-1">管理系统中的所有班级</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        新增班级
      </n-button>
    </div>

    <!-- 筛选工具栏 -->
    <div class="bg-gray-50 p-4 rounded-lg mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索班级名称"
          clearable
          style="width: 180px"
        >
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-select
          v-model:value="filters.schoolId"
          :options="schoolOptions"
          placeholder="学校"
          clearable
          style="width: 150px"
        />
        <n-select
          v-model:value="filters.grade"
          :options="gradeFilterOptions"
          placeholder="年级"
          clearable
          filterable
          style="width: 130px"
        />
        <n-select
          v-model:value="filters.teacherId"
          :options="teacherFilterOptions"
          placeholder="带班老师"
          clearable
          filterable
          style="width: 150px"
        />
        <n-select
          v-model:value="filters.studentRange"
          :options="studentRangeOptions"
          placeholder="学生数"
          clearable
          style="width: 130px"
        />
        <n-button quaternary @click="resetFilters">
          <template #icon><n-icon :component="CloseCircleOutline" /></template>
          重置
        </n-button>
        <span class="text-sm text-gray-500 ml-auto">共 {{ filteredClasses.length }} 个班级</span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <n-spin size="medium" />
    </div>

    <div v-else-if="filteredClasses.length === 0" class="text-center text-gray-400 py-8">
      暂无班级数据
    </div>

    <n-data-table
      v-else
      :columns="classColumns"
      :data="filteredClasses"
      :pagination="pagination"
      :row-key="row => row.id"
    />

    <n-button v-if="embedded" type="primary" size="small" class="mt-4" @click="openCreateModal">
      <template #icon><n-icon><AddOutline /></n-icon></template>
      新增班级
    </n-button>

    <n-modal v-model:show="showModal" preset="dialog" :title="editingClass ? '编辑班级' : '新增班级'">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="所属学校" path="schoolId">
          <n-select v-model:value="form.schoolId" placeholder="请选择学校" :options="schoolOptions" />
        </n-form-item>
        <n-form-item label="年级" path="grade">
          <n-select
            v-model:value="form.grade"
            placeholder="请选择或输入年级"
            :options="gradeSelectOptions"
            filterable tag allow-create
          />
        </n-form-item>
        <n-form-item label="班级名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入班级名称（如：1班、2班）" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingClass ? '保存' : '创建' }}
        </n-button>
      </template>
    </n-modal>

    <n-modal v-model:show="showTeacherModal" preset="dialog" title="分配老师">
      <div class="space-y-4">
        <div v-if="currentClass">
          <p class="text-sm text-gray-500 mb-2">当前班级：{{ currentClass.school?.name }} - {{ currentClass.grade || '' }} {{ currentClass.name }}</p>
          <div v-if="currentClass.teachers?.length" class="mb-4">
            <p class="text-sm font-medium mb-2">已分配老师：</p>
            <div class="space-y-2">
              <div v-for="tc in currentClass.teachers" :key="tc.id" class="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div class="flex items-center space-x-2">
                  <AvatarText :username="tc.teacher.username" size="md" />
                  <span>{{ tc.teacher.profile?.nickname || tc.teacher.username }}</span>
                  <n-tag v-if="tc.role" size="small">{{ tc.role }}</n-tag>
                </div>
                <n-button size="small" type="error" quaternary @click="removeTeacher(tc.teacher.id)">移除</n-button>
              </div>
            </div>
          </div>
          <n-form-item label="添加老师">
            <n-space>
              <n-select v-model:value="newTeacherId" placeholder="选择老师" :options="teacherOptions" filterable style="width: 240px" />
              <n-input v-model:value="newTeacherRole" placeholder="职责（可选）" style="width: 120px" />
              <n-button type="primary" :disabled="!newTeacherId" @click="assignTeacher">添加</n-button>
            </n-space>
          </n-form-item>
        </div>
      </div>
      <template #action>
        <n-button @click="showTeacherModal = false">关闭</n-button>
      </template>
    </n-modal>

    <n-modal v-model:show="showStudentModal" preset="card" title="分配学生" style="width: 600px">
      <div v-if="currentClassForStudents">
        <p class="text-sm text-gray-500 mb-3">
          班级：{{ currentClassForStudents.school?.name }} - {{ currentClassForStudents.grade }} {{ currentClassForStudents.name }}
        </p>
        <div v-if="currentClassStudents.length" class="mb-4">
          <p class="text-sm font-medium mb-2">已分配学生（{{ currentClassStudents.length }}人）：</p>
          <div class="max-h-48 overflow-y-auto space-y-1">
            <div v-for="student in currentClassStudents" :key="student.id" class="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div class="flex items-center space-x-2">
                <AvatarText :username="student.username" size="sm" />
                <span>{{ student.profile?.nickname || student.username }}</span>
              </div>
              <n-button size="small" type="error" quaternary @click="removeStudentFromCurrentClass(student.id)">移除</n-button>
            </div>
          </div>
        </div>
        <n-divider>批量添加学生</n-divider>
        <n-space vertical>
          <n-input v-model:value="studentSearchKeyword" placeholder="搜索学生（用户名/昵称）" clearable @update:value="handleStudentSearch" />
          <n-space>
            <n-checkbox v-model:checked="selectAllStudents" :indeterminate="isIndeterminate" @update:checked="handleSelectAll">
              全选（{{ availableStudents.length }}人）
            </n-checkbox>
            <n-tag type="info" size="small">仅显示未分配学生</n-tag>
          </n-space>
          <div class="max-h-64 overflow-y-auto space-y-1">
            <div v-for="student in availableStudents" :key="student.id" class="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div class="flex items-center space-x-2">
                <n-checkbox :checked="selectedStudentIds.has(student.id)" @update:checked="toggleStudentSelection(student.id)" />
                <AvatarText :username="student.username" size="sm" />
                <span>{{ student.profile?.nickname || student.username }}</span>
                <n-tag v-if="student.classInfo?.school" type="warning" size="tiny">{{ student.classInfo.school.name }}</n-tag>
              </div>
            </div>
            <div v-if="availableStudents.length === 0" class="text-center text-gray-400 py-4">暂无可分配的学生</div>
          </div>
          <n-button type="primary" :disabled="selectedStudentIds.size === 0" :loading="assigningStudent" @click="batchAddStudents">
            批量添加（已选 {{ selectedStudentIds.size }} 人）
          </n-button>
        </n-space>
      </div>
      <template #action>
        <n-button @click="showStudentModal = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted, h, computed } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { useMessage, useDialog, NButton, NSpace, NTag, NCheckbox, NIcon } from 'naive-ui';
import { campusAPI, classAPI, userAPI, adminAPI } from '@/api';
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import CloseCircleOutline from '@vicons/ionicons5/es/CloseCircleOutline'

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

const searchKeyword = ref('');
const filters = ref({ schoolId: null, grade: null, teacherId: null, studentRange: null });

const form = ref({ name: '', grade: '', schoolId: null });
const newTeacherId = ref(null);
const newTeacherRole = ref('');

const showStudentModal = ref(false);
const currentClassForStudents = ref(null);
const currentClassStudents = ref([]);
const availableStudents = ref([]);
const allAvailableStudents = ref([]);
const studentSearchKeyword = ref('');
const assigningStudent = ref(false);
const selectAllStudents = ref(false);
const isIndeterminate = ref(false);
const selectedStudentIds = ref(new Set());

const rules = {
  name: { required: true, message: '请输入班级名称', trigger: 'blur' },
  schoolId: { required: true, message: '请选择学校', trigger: 'change' },
};

const schoolOptions = computed(() => campuses.value.map(c => ({ label: c.name, value: c.id })));

const gradeSelectOptions = computed(() => {
  const grades = [...new Set(classes.value.map(c => c.grade).filter(Boolean))];
  return grades.map(g => ({ label: g, value: g }));
});

const gradeFilterOptions = computed(() => {
  const grades = [...new Set(classes.value.map(c => c.grade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  return grades.map(g => ({ label: g, value: g }));
});

const teacherFilterOptions = computed(() => {
  const teacherMap = new Map();
  classes.value.forEach(cls => {
    (cls.teachers || []).forEach(tc => {
      const id = tc.teacher?.id;
      if (id && !teacherMap.has(id)) {
        teacherMap.set(id, { label: tc.teacher.profile?.nickname || tc.teacher.username, value: id });
      }
    });
  });
  return [{ label: '全部', value: null }, ...teacherMap.values()];
});

const studentRangeOptions = [
  { label: '全部', value: null },
  { label: '0人', value: '0' },
  { label: '1-10人', value: '1-10' },
  { label: '11-30人', value: '11-30' },
  { label: '31-50人', value: '31-50' },
  { label: '50人以上', value: '50+' },
];

const teacherOptions = computed(() => teachers.value.map(t => ({ label: t.profile?.nickname || t.username, value: t.id })));

const filteredClasses = computed(() => {
  let result = classes.value;

  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(kw) || (c.grade || '').toLowerCase().includes(kw));
  }

  if (filters.value.schoolId) {
    result = result.filter(c => (c.schoolId || c.campusId) === filters.value.schoolId);
  }

  if (filters.value.grade) {
    result = result.filter(c => c.grade === filters.value.grade);
  }

  if (filters.value.teacherId) {
    result = result.filter(c => (c.teachers || []).some(tc => tc.teacher?.id === filters.value.teacherId));
  }

  if (filters.value.studentRange) {
    const count = c => c._count?.users ?? 0;
    const range = filters.value.studentRange;
    if (range === '0') result = result.filter(c => count(c) === 0);
    else if (range === '1-10') result = result.filter(c => count(c) >= 1 && count(c) <= 10);
    else if (range === '11-30') result = result.filter(c => count(c) >= 11 && count(c) <= 30);
    else if (range === '31-50') result = result.filter(c => count(c) >= 31 && count(c) <= 50);
    else if (range === '50+') result = result.filter(c => count(c) > 50);
  }

  return result;
});

const pagination = { pageSize: 20 };

const classColumns = [
  {
    title: '年级',
    key: 'grade',
    width: 100,
    render: (row) => row.grade || h('span', { class: 'text-gray-400' }, '未分年级'),
  },
  { title: '班级名称', key: 'name', width: 120 },
  {
    title: '所属学校',
    key: 'school',
    width: 160,
    render: (row) => row.school?.name || row.campus?.name || '-',
  },
  {
    title: '学生数',
    key: 'students',
    width: 80,
    render: (row) => h(NTag, { size: 'small', type: (row._count?.users ?? 0) > 0 ? 'success' : 'default' }, { default: () => row._count?.users ?? 0 }),
  },
  {
    title: '带班老师',
    key: 'teachers',
    width: 200,
    render: (row) => {
      if (!row.teachers?.length) return h('span', { class: 'text-gray-400 text-sm' }, '未分配');
      return h(NSpace, { size: 'small', wrap: true }, {
        default: () => row.teachers.map(tc =>
          h(NTag, { size: 'small' }, { default: () => tc.teacher.profile?.nickname || tc.teacher.username })
        ),
      });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right',
    render: (row) => h(NSpace, null, {
      default: () => [
        h(NButton, { size: 'small', quaternary: true, onClick: () => openStudentModal(row) }, { default: () => '分配学生' }),
        h(NButton, { size: 'small', quaternary: true, onClick: () => openTeacherModal(row) }, { default: () => '分配老师' }),
        h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => handleEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }),
      ],
    }),
  },
];

const loadCampuses = async () => {
  try {
    const data = await campusAPI.getCampuses();
    campuses.value = data.campuses;
  } catch (error) {
    console.error('加载学校失败:', error);
  }
};

const loadClasses = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.value.schoolId) params.schoolId = filters.value.schoolId;
    const data = await classAPI.getClasses(params);
    classes.value = data.classes;
  } catch (error) {
    message.error('加载班级列表失败');
  } finally {
    loading.value = false;
  }
};

const loadTeachers = async () => {
  try {
    const data = await userAPI.getTeachers();
    teachers.value = data.teachers || [];
  } catch (error) {
    message.error('加载老师列表失败');
  }
};

const resetFilters = () => {
  searchKeyword.value = '';
  filters.value = { schoolId: null, grade: null, teacherId: null, studentRange: null };
};

const openCreateModal = () => {
  editingClass.value = null;
  form.value = { name: '', grade: '', schoolId: filters.value.schoolId };
  showModal.value = true;
};

const handleEdit = (classItem) => {
  editingClass.value = classItem;
  form.value = { name: classItem.name, grade: classItem.grade || '', schoolId: classItem.schoolId || classItem.campusId || null };
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
  } catch { return; }

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
  const data = await classAPI.getClass(classItem.id);
  currentClass.value = data;
};

const assignTeacher = async () => {
  if (!newTeacherId.value || !currentClass.value) return;
  try {
    await classAPI.assignTeacher(currentClass.value.id, { teacherId: newTeacherId.value, role: newTeacherRole.value || undefined });
    message.success('分配成功');
    loadClasses();
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
    const data = await classAPI.getClass(currentClass.value.id);
    currentClass.value = data;
  } catch (error) {
    message.error(error.error || '移除失败');
  }
};

const openStudentModal = async (classItem) => {
  currentClassForStudents.value = classItem;
  studentSearchKeyword.value = '';
  showStudentModal.value = true;
  await loadClassStudents(classItem.id);
  await loadAvailableStudents();
};

const loadClassStudents = async (classId) => {
  try {
    const data = await classAPI.getClass(classId);
    currentClassStudents.value = data.students || [];
  } catch (error) {
    console.error('加载班级学生失败:', error);
  }
};

const loadAvailableStudents = async () => {
  try {
    const res = await adminAPI.getUsers({ role: 'STUDENT', limit: 500 });
    const allStudents = res.users || [];
    const assignedIds = new Set(currentClassStudents.value.map(s => s.id));
    allAvailableStudents.value = allStudents.filter(s => !s.classId && !assignedIds.has(s.id));
    availableStudents.value = [...allAvailableStudents.value];
  } catch (error) {
    console.error('加载可分配学生失败:', error);
  }
};

const handleStudentSearch = () => {
  if (!studentSearchKeyword.value) {
    availableStudents.value = [...allAvailableStudents.value];
    return;
  }
  const keyword = studentSearchKeyword.value.toLowerCase();
  availableStudents.value = allAvailableStudents.value.filter(s =>
    s.username.toLowerCase().includes(keyword) || (s.profile?.nickname || '').toLowerCase().includes(keyword)
  );
};

function toggleStudentSelection(studentId) {
  const next = new Set(selectedStudentIds.value);
  if (next.has(studentId)) next.delete(studentId);
  else next.add(studentId);
  selectedStudentIds.value = next;
  updateSelectAllState();
}

function handleSelectAll(checked) {
  if (checked) selectedStudentIds.value = new Set(availableStudents.value.map(s => s.id));
  else selectedStudentIds.value = new Set();
  updateSelectAllState();
}

function updateSelectAllState() {
  const total = availableStudents.value.length;
  const selected = selectedStudentIds.value.size;
  selectAllStudents.value = total > 0 && selected === total;
  isIndeterminate.value = selected > 0 && selected < total;
}

async function batchAddStudents() {
  if (selectedStudentIds.value.size === 0) return;
  assigningStudent.value = true;
  let successCount = 0;
  let failCount = 0;
  for (const studentId of selectedStudentIds.value) {
    try {
      await adminAPI.assignStudentClass(studentId, { classId: currentClassForStudents.value.id });
      successCount++;
    } catch (e) { failCount++; }
  }
  if (failCount === 0) message.success(`成功分配 ${successCount} 名学生`);
  else message.warning(`成功 ${successCount} 名，失败 ${failCount} 名`);
  selectedStudentIds.value = new Set();
  selectAllStudents.value = false;
  isIndeterminate.value = false;
  await loadClassStudents(currentClassForStudents.value.id);
  await loadAvailableStudents();
  loadClasses();
  assigningStudent.value = false;
}

const removeStudentFromCurrentClass = async (studentId) => {
  assigningStudent.value = true;
  try {
    await adminAPI.assignStudentClass(studentId, { classId: null });
    message.success('移除成功');
    await loadClassStudents(currentClassForStudents.value.id);
    await loadAvailableStudents();
    loadClasses();
  } catch (error) {
    message.error(error.error || '移除失败');
  } finally {
    assigningStudent.value = false;
  }
};

onMounted(() => {
  loadCampuses();
  loadClasses();
  loadTeachers();
});
</script>
