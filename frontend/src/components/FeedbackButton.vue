<template>
  <div class="feedback-wrapper">
    <!-- 悬浮按钮 -->
    <n-button
      class="feedback-button"
      type="primary"
      circle
      size="large"
      @click="showModal = true"
    >
      <template #icon>
        <n-icon><ChatbubbleEllipsesOutline /></n-icon>
      </template>
    </n-button>

    <!-- 反馈弹窗 -->
    <n-modal v-model:show="showModal" preset="card" title="意见反馈" style="width: 90%; max-width: 500px;">
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item label="反馈类型" path="type">
          <n-radio-group v-model:value="form.type">
            <n-space>
              <n-radio value="bug">问题反馈</n-radio>
              <n-radio value="suggestion">功能建议</n-radio>
              <n-radio value="other">其他</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="反馈内容" path="content">
          <n-input
            v-model:value="form.content"
            type="textarea"
            placeholder="请详细描述您的问题或建议..."
            :rows="5"
            maxlength="1000"
            show-count
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            提交反馈
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import ChatbubbleEllipsesOutline from '@vicons/ionicons5/es/ChatbubbleEllipsesOutline'
import { feedbackAPI } from '@/api';

const route = useRoute();
const message = useMessage();

const showModal = ref(false);
const submitting = ref(false);
const formRef = ref(null);

const form = reactive({
  type: 'suggestion',
  content: '',
});

const rules = {
  type: { required: true, message: '请选择反馈类型' },
  content: { required: true, message: '请输入反馈内容', trigger: 'blur' },
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch (e) {
    return;
  }

  submitting.value = true;
  try {
    await feedbackAPI.submit({
      type: form.type,
      content: form.content,
      page: route.path,
    });

    message.success('感谢您的反馈！');
    showModal.value = false;
    form.type = 'suggestion';
    form.content = '';
  } catch (error) {
    message.error(error.error || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.feedback-wrapper {
  position: fixed;
  right: 20px;
  bottom: 80px;
  z-index: 1000;
}

.feedback-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 640px) {
  .feedback-wrapper {
    right: 16px;
    bottom: 70px;
  }
}
</style>
