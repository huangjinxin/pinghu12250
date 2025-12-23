<template>
  <div class="reward-management">
    <n-card class="header-card">
      <div class="header">
        <h2>奖罚管理</h2>
        <div class="actions">
          <n-button
            v-if="activeTab === 'rules'"
            @click="showTechTypeDialog = true"
          >
            <template #icon>
              <n-icon><SettingsOutline /></n-icon>
            </template>
            管理技术类型
          </n-button>
          <n-button
            v-if="activeTab === 'rules'"
            @click="showStandardDialog = true"
          >
            <template #icon>
              <n-icon><SettingsOutline /></n-icon>
            </template>
            管理展示标准
          </n-button>
        </div>
      </div>
    </n-card>

    <!-- Tab 导航 -->
    <n-card class="tabs-card">
      <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
        <n-tab-pane name="rules" tab="规则管理">
          <RulesTab />
        </n-tab-pane>

        <n-tab-pane name="submissions">
          <template #tab>
            提交记录
            <n-badge
              v-if="submissionStore.stats.total > 0"
              :value="submissionStore.stats.total"
              :max="999"
              class="ml-2"
            />
          </template>
          <SubmissionsTab />
        </n-tab-pane>

        <n-tab-pane name="review">
          <template #tab>
            审核中心
            <n-badge
              v-if="submissionStore.stats.pending > 0"
              :value="submissionStore.stats.pending"
              :max="999"
              type="error"
              class="ml-2"
            />
          </template>
          <ReviewTab />
        </n-tab-pane>

        <n-tab-pane name="poetry-review">
          <template #tab>
            作品审核
            <n-badge
              v-if="poetryPendingCount > 0"
              :value="poetryPendingCount"
              :max="999"
              type="warning"
              class="ml-2"
            />
          </template>
          <PoetryReviewTab ref="poetryReviewTabRef" />
        </n-tab-pane>

        <n-tab-pane name="poetry-history" tab="作品记录">
          <PoetryHistoryTab />
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 技术类型管理对话框 -->
    <n-modal
      v-model:show="showTechTypeDialog"
      preset="card"
      title="技术类型管理"
      style="width: 500px"
    >
      <div class="tech-type-manager">
        <div class="add-form">
          <n-input
            v-model:value="newTechTypeName"
            placeholder="输入新的技术类型名称"
            @keyup.enter="handleAddTechType"
          />
          <n-button type="primary" @click="handleAddTechType" style="margin-left: 10px">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            添加
          </n-button>
        </div>

        <n-divider />

        <n-spin :show="rewardRuleStore.typesLoading">
          <div class="tech-type-list">
            <div
              v-for="type in rewardRuleStore.types"
              :key="type.id"
              class="tech-type-item"
            >
              <n-tag type="info">{{ type.name }}</n-tag>
              <n-button
                text
                type="error"
                @click="handleDeleteTechType(type.id)"
              >
                <template #icon>
                  <n-icon><TrashOutline /></n-icon>
                </template>
              </n-button>
            </div>

            <n-empty
              v-if="rewardRuleStore.types.length === 0"
              description="暂无技术类型"
              size="small"
            />
          </div>
        </n-spin>
      </div>
    </n-modal>

    <!-- 展示标准管理对话框 -->
    <n-modal
      v-model:show="showStandardDialog"
      preset="card"
      title="展示标准管理"
      style="width: 500px"
    >
      <div class="tech-type-manager">
        <div class="add-form">
          <n-input
            v-model:value="newStandardName"
            placeholder="输入新的展示标准名称"
            @keyup.enter="handleAddStandard"
          />
          <n-button type="primary" @click="handleAddStandard" style="margin-left: 10px">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            添加
          </n-button>
        </div>

        <n-divider />

        <n-spin :show="rewardRuleStore.standardsLoading">
          <div class="tech-type-list">
            <div
              v-for="standard in rewardRuleStore.standards"
              :key="standard.id"
              class="tech-type-item"
            >
              <n-tag type="success">{{ standard.name }}</n-tag>
              <n-button
                text
                type="error"
                @click="handleDeleteStandard(standard.id)"
              >
                <template #icon>
                  <n-icon><TrashOutline /></n-icon>
                </template>
              </n-button>
            </div>

            <n-empty
              v-if="rewardRuleStore.standards.length === 0"
              description="暂无展示标准"
              size="small"
            />
          </div>
        </n-spin>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { Add, SettingsOutline, TrashOutline } from '@vicons/ionicons5';
import { useRewardRuleStore } from '@/stores/rewardRule';
import { useSubmissionStore } from '@/stores/submission';
import api from '@/api';
import RulesTab from './reward-tabs/RulesTab.vue';
import SubmissionsTab from './reward-tabs/SubmissionsTab.vue';
import ReviewTab from './reward-tabs/ReviewTab.vue';
import PoetryReviewTab from './reward-tabs/PoetryReviewTab.vue';
import PoetryHistoryTab from './reward-tabs/PoetryHistoryTab.vue';

const message = useMessage();
const dialog = useDialog();
const rewardRuleStore = useRewardRuleStore();
const submissionStore = useSubmissionStore();

// 当前激活的 Tab - 默认显示提交列表
const activeTab = ref('submissions');

// 诗词作品审核
const poetryPendingCount = ref(0);
const poetryReviewTabRef = ref(null);

// 技术类型管理
const showTechTypeDialog = ref(false);
const newTechTypeName = ref('');

// 展示标准管理
const showStandardDialog = ref(false);
const newStandardName = ref('');

// 加载诗词待审核数量
const loadPoetryPendingCount = async () => {
  try {
    const response = await api.get('/poetry-works/admin/stats');
    poetryPendingCount.value = response.stats?.pending || 0;
  } catch (error) {
    console.error('加载诗词待审核数量失败:', error);
  }
};

// 初始化
onMounted(async () => {
  await rewardRuleStore.fetchTypes();
  await rewardRuleStore.fetchStandards();
  await submissionStore.fetchStats();
  // 默认加载提交列表数据
  submissionStore.fetchAllSubmissions();
  // 加载诗词待审核数量
  loadPoetryPendingCount();
});

// Tab 切换
const handleTabChange = (tabName) => {
  if (tabName === 'submissions') {
    submissionStore.fetchAllSubmissions();
  } else if (tabName === 'review') {
    submissionStore.fetchPendingSubmissions();
  }
};

// 添加技术类型
const handleAddTechType = async () => {
  if (!newTechTypeName.value.trim()) {
    message.warning('请输入技术类型名称');
    return;
  }

  try {
    await rewardRuleStore.createType(newTechTypeName.value.trim());
    newTechTypeName.value = '';
    message.success('添加成功');
  } catch (error) {
    message.error(error.response?.data?.error || '添加失败');
  }
};

// 删除技术类型
const handleDeleteTechType = async (id) => {
  dialog.warning({
    title: '提示',
    content: '确定要删除这个技术类型吗？如果该类型下有规则，将无法删除。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await rewardRuleStore.deleteType(id);
        message.success('删除成功');
      } catch (error) {
        message.error(error.response?.data?.error || '删除失败');
      }
    }
  });
};

// 添加展示标准
const handleAddStandard = async () => {
  if (!newStandardName.value.trim()) {
    message.warning('请输入展示标准名称');
    return;
  }

  try {
    await rewardRuleStore.createStandard(newStandardName.value.trim());
    newStandardName.value = '';
    message.success('添加成功');
  } catch (error) {
    message.error(error.response?.data?.error || '添加失败');
  }
};

// 删除展示标准
const handleDeleteStandard = async (id) => {
  dialog.warning({
    title: '提示',
    content: '确定要删除这个展示标准吗？如果该标准下有规则，将无法删除。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await rewardRuleStore.deleteStandard(id);
        message.success('删除成功');
      } catch (error) {
        message.error(error.response?.data?.error || '删除失败');
      }
    }
  });
};
</script>

<style scoped>
.reward-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header .actions {
  display: flex;
  gap: 10px;
}

.tabs-card :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.tech-type-manager .add-form {
  display: flex;
  gap: 10px;
}

.tech-type-manager .tech-type-list {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.tech-type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
}

.tech-type-item:last-child {
  border-bottom: none;
}

.tech-type-item:hover {
  background-color: #f5f7fa;
}

.ml-2 {
  margin-left: 8px;
}
</style>
