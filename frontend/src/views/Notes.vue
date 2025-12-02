<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的笔记</h1>
        <p class="text-gray-500 mt-1">课堂笔记和读书笔记</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        写笔记
      </n-button>
    </div>

    <!-- 标签页 -->
    <n-tabs v-model:value="activeTab" type="line" @update:value="loadNotes">
      <n-tab-pane name="class" tab="课堂笔记" />
      <n-tab-pane name="reading" tab="读书笔记" />
    </n-tabs>

    <!-- 笔记列表 -->
    <div v-if="loading" class="space-y-4">
      <n-skeleton v-for="i in 3" :key="i" height="100px" :sharp="false" />
    </div>

    <n-empty v-else-if="!notes.length" description="还没有笔记" />

    <div v-else class="space-y-4">
      <div v-for="note in notes" :key="note.id" class="card">
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="font-medium text-gray-800">
              {{ activeTab === 'class' ? note.subject : note.bookTitle }}
            </h3>
            <div class="text-sm text-gray-500">
              {{ formatDate(note.createdAt) }}
              <span v-if="activeTab === 'reading' && note.author"> · {{ note.author }}</span>
            </div>
          </div>
          <n-rate v-if="activeTab === 'reading'" :value="note.rating" readonly size="small" />
        </div>
        <p class="text-gray-700 whitespace-pre-wrap">{{ note.content }}</p>
      </div>
    </div>

    <!-- 课堂笔记弹窗 -->
    <n-modal v-model:show="showClassModal" preset="card" title="课堂笔记" style="width: 500px">
      <n-form :model="classForm" label-placement="top">
        <n-form-item label="科目" required>
          <n-select v-model:value="classForm.subject" :options="subjectOptions" placeholder="选择科目" />
        </n-form-item>
        <n-form-item label="笔记内容" required>
          <n-input v-model:value="classForm.content" type="textarea" placeholder="记录课堂重点..." :rows="6" />
        </n-form-item>
        <n-form-item label="标签">
          <TagSelector v-model="classForm.tagIds" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showClassModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="saveClassNote">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 读书笔记弹窗 -->
    <n-modal v-model:show="showReadingModal" preset="card" title="读书笔记" style="width: 500px">
      <n-form :model="readingForm" label-placement="top">
        <n-form-item label="书名" required>
          <n-input v-model:value="readingForm.bookTitle" placeholder="书名" />
        </n-form-item>
        <n-form-item label="作者">
          <n-input v-model:value="readingForm.author" placeholder="作者" />
        </n-form-item>
        <n-form-item label="读后感" required>
          <n-input v-model:value="readingForm.content" type="textarea" placeholder="分享你的阅读感悟..." :rows="6" />
        </n-form-item>
        <n-form-item label="评分">
          <n-rate v-model:value="readingForm.rating" allow-half />
        </n-form-item>
        <n-form-item label="标签">
          <TagSelector v-model="readingForm.tagIds" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showReadingModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="saveReadingNote">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { noteAPI, readingNoteAPI } from '@/api';
import { format } from 'date-fns';
import { AddOutline } from '@vicons/ionicons5';
import TagSelector from '@/components/TagSelector.vue';

const message = useMessage();

const loading = ref(false);
const submitting = ref(false);
const showClassModal = ref(false);
const showReadingModal = ref(false);
const notes = ref([]);
const activeTab = ref('class');

const classForm = ref({ subject: '', content: '', tagIds: [] });
const readingForm = ref({ bookTitle: '', author: '', content: '', rating: 4, tagIds: [] });

const subjectOptions = [
  { label: '语文', value: '语文' },
  { label: '数学', value: '数学' },
  { label: '英语', value: '英语' },
  { label: '科学', value: '科学' },
  { label: '其他', value: '其他' },
];

const formatDate = (date) => format(new Date(date), 'M月d日 HH:mm');

const loadNotes = async () => {
  loading.value = true;
  try {
    if (activeTab.value === 'class') {
      const data = await noteAPI.getNotes();
      notes.value = data.notes || data;
    } else {
      const data = await readingNoteAPI.getReadingNotes();
      notes.value = data.notes || data;
    }
  } catch (error) {
    message.error('加载笔记失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  if (activeTab.value === 'class') {
    classForm.value = { subject: '', content: '', tagIds: [] };
    showClassModal.value = true;
  } else {
    readingForm.value = { bookTitle: '', author: '', content: '', rating: 4, tagIds: [] };
    showReadingModal.value = true;
  }
};

const saveClassNote = async () => {
  if (!classForm.value.subject || !classForm.value.content.trim()) {
    message.warning('请填写科目和内容');
    return;
  }
  submitting.value = true;
  try {
    await noteAPI.createNote(classForm.value);
    message.success('保存成功');
    showClassModal.value = false;
    loadNotes();
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    submitting.value = false;
  }
};

const saveReadingNote = async () => {
  if (!readingForm.value.bookTitle || !readingForm.value.content.trim()) {
    message.warning('请填写书名和内容');
    return;
  }
  submitting.value = true;
  try {
    await readingNoteAPI.createReadingNote(readingForm.value);
    message.success('保存成功');
    showReadingModal.value = false;
    loadNotes();
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadNotes();
});
</script>
