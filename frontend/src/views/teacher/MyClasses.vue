<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">我的班级</h1>
      <p class="text-gray-500 mt-1">管理您负责的班级和学生</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <n-skeleton v-for="i in 3" :key="i" height="200px" :sharp="false" />
    </div>

    <!-- 空状态 -->
    <n-empty v-else-if="!classes.length" description="暂无分配的班级">
      <template #extra>
        <p class="text-gray-500 text-sm">请联系管理员为您分配班级</p>
      </template>
    </n-empty>

    <!-- 班级卡片列表 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="tc in classes"
        :key="tc.id"
        class="card hover:shadow-lg transition-shadow cursor-pointer"
        @click="goToClass(tc.class)"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">{{ tc.class.name }}</h3>
            <p class="text-sm text-gray-500">{{ tc.class.campus?.name || '未知校区' }}</p>
          </div>
          <n-tag v-if="tc.role" size="small" type="info">{{ tc.role }}</n-tag>
        </div>

        <div class="space-y-3">
          <div class="flex items-center text-gray-600">
            <n-icon size="18" class="mr-2"><SchoolOutline /></n-icon>
            <span>{{ tc.class.grade || '未设置年级' }}</span>
          </div>
          <div class="flex items-center text-gray-600">
            <n-icon size="18" class="mr-2"><PeopleOutline /></n-icon>
            <span>{{ tc.class._count?.students || 0 }} 名学生</span>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <n-button type="primary" block>
            进入班级
            <template #icon>
              <n-icon><ArrowForwardOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { classAPI } from '@/api';
import { SchoolOutline, PeopleOutline, ArrowForwardOutline } from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const classes = ref([]);

const loadClasses = async () => {
  loading.value = true;
  try {
    const data = await classAPI.getMyClasses();
    classes.value = data.classes;
  } catch (error) {
    message.error('加载班级列表失败');
  } finally {
    loading.value = false;
  }
};

const goToClass = (classItem) => {
  router.push(`/teacher/class/${classItem.id}`);
};

onMounted(() => {
  loadClasses();
});
</script>
