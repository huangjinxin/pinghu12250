<template>
  <div class="student-management">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <n-space>
        <n-select
          v-model:value="filterSchool"
          :options="schoolOptions"
          placeholder="选择学校"
          clearable
          style="width: 200px"
          @update:value="loadStudents"
        />
        <n-select
          v-model:value="filterClass"
          :options="classOptions"
          placeholder="选择班级"
          clearable
          style="width: 200px"
          :disabled="!filterSchool"
          @update:value="loadStudents"
        />
        <n-input
          v-model:value="searchText"
          placeholder="搜索学生用户名/昵称"
          clearable
          style="width: 200px"
          @update:value="handleSearch"
        />
        <n-button @click="loadStudents">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <n-card size="small">
        <div class="stat-item">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">学生总数</div>
        </div>
      </n-card>
      <n-card size="small">
        <div class="stat-item">
          <div class="stat-value text-green-600">{{ stats.assigned }}</div>
          <div class="stat-label">已分配</div>
        </div>
      </n-card>
      <n-card size="small">
        <div class="stat-item">
          <div class="stat-value text-orange-500">{{ stats.unassigned }}</div>
          <div class="stat-label">未分配</div>
        </div>
      </n-card>
    </div>

    <!-- 学生列表 -->
    <n-data-table
      :columns="columns"
      :data="students"
      :loading="loading"
      :pagination="pagination"
      :row-key="row => row.id"
      @update:page="handlePageChange"
    />

    <!-- 分配班级弹窗 -->
    <n-modal v-model:show="showAssignModal" preset="card" title="分配班级" style="width: 500px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="学生">
          <n-input :value="selectedStudent?.username" readonly />
        </n-form-item>
        <n-form-item label="学校">
          <n-select
            v-model:value="assignForm.schoolId"
            :options="schoolOptions"
            placeholder="选择学校"
            @update:value="handleAssignSchoolChange"
          />
        </n-form-item>
        <n-form-item label="年级">
          <n-select
            v-model:value="assignForm.grade"
            :options="assignGradeOptions"
            placeholder="选择年级"
            :disabled="!assignForm.schoolId"
            @update:value="handleAssignGradeChange"
          />
        </n-form-item>
        <n-form-item label="班级">
          <n-select
            v-model:value="assignForm.classId"
            :options="assignClassOptions"
            placeholder="选择班级"
            :disabled="!assignForm.schoolId || !assignForm.grade"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAssignModal = false">取消</n-button>
          <n-button type="primary" :loading="assigning" @click="handleAssign">确认分配</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { NButton, NTag, NIcon, useMessage } from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import { userAPI, classAPI, campusAPI, adminAPI } from '@/api'

const message = useMessage()

const loading = ref(false)
const students = ref([])
const schools = ref([])
const classes = ref([])
const searchText = ref('')
const filterSchool = ref(null)
const filterClass = ref(null)

const showAssignModal = ref(false)
const selectedStudent = ref(null)
const assignForm = ref({ schoolId: null, grade: null, classId: null })
const assigning = ref(false)

const pagination = ref({
  page: 1,
  pageSize: 20,
  pageCount: 1,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
})

// 统计数据
const stats = computed(() => {
  const total = students.value.length
  const assigned = students.value.filter(s => s.classId).length
  return { total, assigned, unassigned: total - assigned }
})

// 学校选项
const schoolOptions = computed(() => {
  return schools.value.map(s => ({ label: s.name, value: s.id }))
})

// 班级选项（根据筛选学校，按年级分组）
const classOptions = computed(() => {
  if (!filterSchool.value) return []
  const filtered = classes.value.filter(c => c.schoolId === filterSchool.value)
  const groups = {}
  for (const c of filtered) {
    const grade = c.grade || '未分年级'
    if (!groups[grade]) groups[grade] = { type: 'group', label: grade, key: grade, children: [] }
    groups[grade].children.push({ label: c.name, value: c.id })
  }
  return Object.values(groups)
})

// 分配弹窗中的年级选项
const assignGradeOptions = computed(() => {
  if (!assignForm.value.schoolId) return []
  const filtered = classes.value.filter(c => c.schoolId === assignForm.value.schoolId)
  const grades = [...new Set(
    filtered.map(c => c.grade || '未分年级')
  )]
  return grades.map(g => ({ label: g, value: g }))
})

// 分配弹窗中的班级选项（根据学校+年级过滤）
const assignClassOptions = computed(() => {
  if (!assignForm.value.schoolId || !assignForm.value.grade) return []
  return classes.value
    .filter(c => c.schoolId === assignForm.value.schoolId && (c.grade || '未分年级') === assignForm.value.grade)
    .map(c => ({ label: c.name, value: c.id }))
})

// 表格列定义
const columns = [
  {
    title: '用户名',
    key: 'username',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: '昵称',
    key: 'nickname',
    width: 120,
    render: (row) => row.profile?.nickname || '-',
  },
  {
    title: '学校',
    key: 'school',
    width: 180,
    render: (row) => {
      const schoolName = row.student?.class?.school?.name || row.classInfo?.school?.name
      return schoolName || h(NTag, { type: 'warning', size: 'small' }, { default: () => '未分配' })
    },
  },
  {
    title: '年级',
    key: 'grade',
    width: 120,
    render: (row) => {
      const grade = row.student?.class?.grade || row.classInfo?.grade
      return grade || h(NTag, { type: 'warning', size: 'small' }, { default: () => '未分配' })
    },
  },
  {
    title: '班级',
    key: 'class',
    width: 120,
    render: (row) => {
      const className = row.student?.class?.name || row.classInfo?.name
      return className || h(NTag, { type: 'warning', size: 'small' }, { default: () => '未分配' })
    },
  },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 150,
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => h(
      NButton,
      {
        size: 'small',
        type: 'primary',
        text: true,
        onClick: () => openAssignModal(row),
      },
      { default: () => '分配班级' }
    ),
  },
]

let searchTimeout = null

function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadStudents()
  }, 300)
}

async function loadStudents() {
  loading.value = true
  try {
    const params = {
      role: 'STUDENT',
      page: pagination.value.page,
      limit: pagination.value.pageSize,
    }
    if (searchText.value) params.search = searchText.value
    if (filterSchool.value) params.schoolId = filterSchool.value
    if (filterClass.value) params.classId = filterClass.value

    const res = await adminAPI.getUsers(params)
    if (res.success !== false) {
      students.value = res.users || []
      pagination.value.pageCount = res.pagination?.totalPages || 1
    }
  } catch (e) {
    message.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
}

async function loadSchools() {
  try {
    const res = await campusAPI.getCampuses()
    if (res) schools.value = res.campuses || res.data || []
  } catch (e) {
    console.error('加载学校列表失败:', e)
  }
}

async function loadClasses() {
  try {
    const res = await classAPI.getClasses()
    if (res) classes.value = res.classes || res.data || []
  } catch (e) {
    console.error('加载班级列表失败:', e)
  }
}

function handlePageChange(page) {
  pagination.value.page = page
  loadStudents()
}

function handleAssignSchoolChange() {
  assignForm.value.grade = null
  assignForm.value.classId = null
}

function handleAssignGradeChange() {
  assignForm.value.classId = null
}

function openAssignModal(student) {
  selectedStudent.value = student
  const classGrade = student.student?.class?.grade || student.classInfo?.grade || null
  const schoolId = student.student?.class?.schoolId || student.classInfo?.schoolId || null
  assignForm.value = {
    schoolId: schoolId,
    grade: classGrade,
    classId: student.classId || null,
  }
  showAssignModal.value = true
}

async function handleAssign() {
  if (!assignForm.value.classId) {
    message.warning('请选择班级')
    return
  }

  assigning.value = true
  try {
    const res = await adminAPI.assignStudentClass(selectedStudent.value.id, {
      classId: assignForm.value.classId,
    })
    if (res.success) {
      message.success('分配成功')
      showAssignModal.value = false
      loadStudents()
    }
  } catch (e) {
    message.error(e.error || '分配失败')
  } finally {
    assigning.value = false
  }
}

onMounted(() => {
  loadStudents()
  loadSchools()
  loadClasses()
})
</script>

<style scoped>
.student-management {
  padding: 16px 0;
}

.filter-bar {
  margin-bottom: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #6366f1;
}

.stat-label {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
