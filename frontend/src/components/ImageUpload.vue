<template>
  <div class="image-upload">
    <n-upload
      :file-list="fileList"
      :max="max"
      list-type="image-card"
      accept="image/*"
      :custom-request="customUpload"
      @remove="handleRemove"
      @preview="handlePreview"
    >
      <div class="upload-trigger">
        <n-icon size="24"><AddOutline /></n-icon>
      </div>
    </n-upload>

    <n-modal v-model:show="showPreview" preset="card" style="width: 600px" title="图片预览">
      <img :src="previewUrl" style="width: 100%" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import api from '@/api';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  max: {
    type: Number,
    default: 9,
  },
  uploadUrl: {
    type: String,
    default: '/upload',
  },
});

const emit = defineEmits(['update:modelValue']);
const message = useMessage();

const fileList = ref([]);
const showPreview = ref(false);
const previewUrl = ref('');

// 初始化已有图片
watch(
  () => props.modelValue,
  (val) => {
    if (val && val.length) {
      fileList.value = val.map((url, index) => ({
        id: `existing-${index}`,
        name: `image-${index}`,
        status: 'finished',
        url,
      }));
    }
  },
  { immediate: true }
);

const customUpload = async ({ file, onFinish, onError }) => {
  const formData = new FormData();
  formData.append('file', file.file);

  try {
    const response = await api.post(props.uploadUrl, formData);
    const url = response.url || response.data?.url;

    file.url = url;
    file.status = 'finished';

    const urls = fileList.value
      .filter(f => f.status === 'finished' && f.url)
      .map(f => f.url);
    urls.push(url);
    emit('update:modelValue', urls);

    onFinish();
  } catch (error) {
    message.error('上传失败');
    onError();
  }
};

const handleRemove = ({ file }) => {
  const urls = fileList.value
    .filter(f => f.id !== file.id && f.status === 'finished' && f.url)
    .map(f => f.url);
  emit('update:modelValue', urls);
  return true;
};

const handlePreview = (file) => {
  previewUrl.value = file.url;
  showPreview.value = true;
};
</script>

<style scoped>
.upload-trigger {
  @apply w-full h-full flex items-center justify-center text-gray-400;
}
</style>
