<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">学校班级</h1>
      <p class="text-gray-500 mt-1">管理学校、班级与学生分配</p>
    </div>

    <n-tabs v-model:value="activeTab" type="line">
      <n-tab-pane name="campus" tab="学校管理">
        <CampusManagement :embedded="true" />
      </n-tab-pane>

      <n-tab-pane name="class" tab="班级管理">
        <ClassManagement :embedded="true" />
      </n-tab-pane>

      <n-tab-pane name="students" tab="学生管理">
        <StudentManagement />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CampusManagement from './CampusManagement.vue';
import ClassManagement from './ClassManagement.vue';
import StudentManagement from './StudentManagement.vue';

const activeTab = ref('campus');
</script>
