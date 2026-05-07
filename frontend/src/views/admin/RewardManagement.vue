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
          <!-- 每日挑战奖励配置 -->
          <n-card size="small" class="mb-4">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium">每日挑战完成奖励配置</span>
                <n-button
                  size="small"
                  quaternary
                  @click="showChallengeConfig = !showChallengeConfig"
                >
                  {{ showChallengeConfig ? '收起' : '展开' }}
                </n-button>
              </div>
            </template>
            <n-collapse-transition :show="showChallengeConfig">
              <n-spin :show="challengeConfigLoading">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <n-form-item label="基础奖励积分" label-placement="left">
                      <n-input-number
                        v-model:value="challengeConfig.basePoints"
                        :min="0"
                        :max="10000"
                        placeholder="每日完成3项基础奖励"
                      />
                    </n-form-item>
                    <div class="text-xs text-gray-500">每日完成3项审核通过后的基础奖励</div>
                  </div>
                  <div>
                    <n-form-item label="连续天数单位奖励" label-placement="left">
                      <n-input-number
                        v-model:value="challengeConfig.streakBonus"
                        :min="0"
                        :max="1000"
                        placeholder="每连续1天额外奖励"
                      />
                    </n-form-item>
                    <div class="text-xs text-gray-500">每连续完成1天额外奖励的积分</div>
                  </div>
                  <div>
                    <n-form-item label="连续天数封顶" label-placement="left">
                      <n-input-number
                        v-model:value="challengeConfig.streakMaxDays"
                        :min="1"
                        :max="365"
                        placeholder="最多计算天数"
                      />
                    </n-form-item>
                    <div class="text-xs text-gray-500">连续天数奖励最多计算到此天数</div>
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between">
                  <div class="text-sm text-gray-600">
                    <span class="font-medium">公式：</span>
                    {{ challengeConfig.basePoints }} + {{ challengeConfig.streakBonus }} × min(连续天数, {{ challengeConfig.streakMaxDays }})
                    <span class="ml-2 text-blue-600">
                      (最高可得 {{ challengeConfig.basePoints + challengeConfig.streakBonus * challengeConfig.streakMaxDays }} 积分)
                    </span>
                  </div>
                  <n-button
                    type="primary"
                    :loading="challengeConfigSaving"
                    @click="saveChallengeConfig"
                  >
                    保存配置
                  </n-button>
                </div>
              </n-spin>
            </n-collapse-transition>
          </n-card>
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
              v-if="reviewTotalPending > 0"
              :value="reviewTotalPending"
              :max="999"
              type="error"
              class="ml-2"
            />
          </template>
          <ReviewCenter ref="reviewCenterRef" @update:total-pending="reviewTotalPending = $event" />
        </n-tab-pane>

        <n-tab-pane name="category-manage" tab="栏目管理">
          <CategoryManageTab />
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 技术类型管理对话框 -->
    <n-modal
      v-model:show="showTechTypeDialog"
      preset="card"
      title="技术类型管理"
      style="width: 500px; max-width: 90vw;"
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
      style="width: 500px; max-width: 90vw;"
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
import { ref, reactive, onMounted, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useRoute } from 'vue-router';
import Add from '@vicons/ionicons5/es/Add'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import { useRewardRuleStore } from '@/stores/rewardRule';
import { useSubmissionStore } from '@/stores/submission';
import { submissionAPI } from '@/api';
import RulesTab from './reward-tabs/RulesTab.vue';
import SubmissionsTab from './reward-tabs/SubmissionsTab.vue';
import ReviewCenter from './reward-tabs/ReviewCenter.vue';
import CategoryManageTab from './reward-tabs/CategoryManageTab.vue';

const message = useMessage();
const dialog = useDialog();
const route = useRoute();
const rewardRuleStore = useRewardRuleStore();
const submissionStore = useSubmissionStore();

// 当前激活的 Tab - 默认显示提交列表
const activeTab = ref('review');

watch(() => route.query.tab, (tab) => {
  if (tab && ['rules', 'submissions', 'review', 'category-manage'].includes(tab)) {
    activeTab.value = tab;
  }
}, { immediate: true });

// 审核中心
const reviewTotalPending = ref(0);
const reviewCenterRef = ref(null);

// 技术类型管理
const showTechTypeDialog = ref(false);
const newTechTypeName = ref('');

// 展示标准管理
const showStandardDialog = ref(false);
const newStandardName = ref('');

// 每日挑战奖励配置
const showChallengeConfig = ref(false);
const challengeConfigLoading = ref(false);
const challengeConfigSaving = ref(false);
const challengeConfig = reactive({
  basePoints: 300,
  streakBonus: 88,
  streakMaxDays: 100
});

// 加载挑战配置
const loadChallengeConfig = async () => {
  challengeConfigLoading.value = true;
  try {
    const res = await submissionAPI.getChallengeConfig();
    if (res.success && res.data) {
      challengeConfig.basePoints = res.data.basePoints ?? 300;
      challengeConfig.streakBonus = res.data.streakBonus ?? 88;
      challengeConfig.streakMaxDays = res.data.streakMaxDays ?? 100;
    }
  } catch (error) {
    console.error('加载挑战配置失败:', error);
  } finally {
    challengeConfigLoading.value = false;
  }
};

// 保存挑战配置
const saveChallengeConfig = async () => {
  challengeConfigSaving.value = true;
  try {
    await submissionAPI.updateChallengeConfig({
      basePoints: challengeConfig.basePoints,
      streakBonus: challengeConfig.streakBonus,
      streakMaxDays: challengeConfig.streakMaxDays
    });
    message.success('配置已保存');
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    challengeConfigSaving.value = false;
  }
};

// 初始化
onMounted(async () => {
  await rewardRuleStore.fetchTypes();
  await rewardRuleStore.fetchStandards();
  await submissionStore.fetchStats();
  await loadChallengeConfig();
  // 默认加载提交列表数据
  submissionStore.fetchAllSubmissions();
});

// Tab 切换
const handleTabChange = (tabName) => {
  if (tabName === 'submissions') {
    submissionStore.fetchAllSubmissions();
  } else if (tabName === 'review') {
    reviewCenterRef.value?.refresh();
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
  overflow: hidden;
  max-width: 100%;
  box-sizing: border-box;
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

@media (max-width: 768px) {
  .reward-management { padding: 10px; }
  .header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .header .actions { flex-wrap: wrap; }
}
</style>
