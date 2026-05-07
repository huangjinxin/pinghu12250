<template>
  <n-modal v-if="mode === 'modal'" v-model:show="visible" preset="card" title="好友设置" style="width: 400px">
    <div class="settings-panel modal-mode">
      <div class="panel-header">
        <div class="panel-title">好友设置</div>
        <div class="panel-subtitle">管理好友申请的自动处理和默认留言</div>
      </div>
      <n-form>
        <n-form-item label="自动通过好友申请">
          <n-switch v-model:value="settings.autoAcceptFriend" />
        </n-form-item>
        <n-form-item label="默认申请留言">
          <n-input
            v-model:value="settings.friendRequestMessage"
            placeholder="可选"
            maxlength="50"
          />
        </n-form-item>
      </n-form>
    </div>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" @click="handleSave" :loading="saving">保存</n-button>
      </div>
    </template>
  </n-modal>

  <div v-else class="settings-panel panel-mode">
    <div class="panel-header">
      <div class="panel-title">好友设置</div>
      <div class="panel-subtitle">管理好友申请的自动处理和默认留言</div>
    </div>
    <n-form>
      <n-form-item label="自动通过好友申请">
        <n-switch v-model:value="settings.autoAcceptFriend" />
      </n-form-item>
      <n-form-item label="默认申请留言">
        <n-input
          v-model:value="settings.friendRequestMessage"
          placeholder="可选"
          maxlength="50"
        />
      </n-form-item>
    </n-form>
    <div class="panel-actions">
      <n-button type="primary" @click="handleSave" :loading="saving">保存</n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { userAPI } from '@/api'

const props = defineProps({
  mode: { type: String, default: 'modal' }
})

const visible = defineModel('show', { type: Boolean, default: false })
const settings = ref({
  autoAcceptFriend: false,
  friendRequestMessage: ''
})
const saving = ref(false)

const loadSettings = async () => {
  try {
    const res = await userAPI.getFriendSettings()
    settings.value = res.data
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await userAPI.updateFriendSettings(settings.value)
    window.$message?.success('保存成功')
    if (props.mode === 'modal') visible.value = false
  } catch (error) {
    window.$message?.error('保存失败')
  } finally {
    saving.value = false
  }
}

watch(visible, (val) => {
  if (props.mode === 'modal' && val) loadSettings()
})

onMounted(() => {
  if (props.mode === 'panel') loadSettings()
})
</script>

<style scoped>
.settings-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.panel-mode {
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.panel-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.panel-actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}
</style>
