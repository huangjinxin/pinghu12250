<template>
  <div class="my-growth">
    <n-card title="心路历程">
      <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
        <n-tab-pane name="favorites" tab="我擅长的">
          <n-spin :show="favoritesLoading">
            <n-empty
              v-if="favoriteTemplates.length === 0"
              description="暂无收藏项目，可以在「可填写项目」中点击星标收藏"
            />
            <div v-else>
              <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                <n-gi
                  v-for="template in paginatedFavorites"
                  :key="template.id"
                >
                  <n-card
                    hoverable
                    class="template-card"
                  >
                    <template #header>
                      <div class="template-header">
                        <span class="template-name" @click="handleFillTemplate(template)">{{ template.name }}</span>
                        <n-space align="center" :size="8">
                          <n-tag
                            :type="template.points > 0 ? 'success' : 'error'"
                            size="medium"
                            round
                          >
                            {{ template.points > 0 ? '+' : '' }}{{ template.points }}
                          </n-tag>
                          <n-button
                            text
                            @click.stop="handleToggleFavorite(template)"
                          >
                            <n-icon size="20" color="#f0a020">
                              <StarFilled />
                            </n-icon>
                          </n-button>
                        </n-space>
                      </div>
                    </template>
                    <div @click="handleFillTemplate(template)" style="cursor: pointer">
                      <n-space vertical size="small">
                        <n-space>
                          <n-tag type="info" size="small" round>
                            <template #icon>
                              <n-icon :component="CodeSlashOutline" />
                            </template>
                            {{ template.type.name }}
                          </n-tag>
                          <n-tag size="small" round>
                            <template #icon>
                              <n-icon :component="TrophyOutline" />
                            </template>
                            {{ template.standard.name }}
                          </n-tag>
                        </n-space>
                        <div class="template-requirements">
                          <n-space size="small">
                            <n-tag v-if="template.requireText" size="tiny" type="default">
                              需要文字
                            </n-tag>
                            <n-tag v-if="template.requireImage" size="tiny" type="default">
                              需要图片
                            </n-tag>
                            <n-tag v-if="template.requireLink" size="tiny" type="default">
                              需要链接
                            </n-tag>
                          </n-space>
                        </div>
                      </n-space>
                    </div>
                  </n-card>
                </n-gi>
              </n-grid>

              <n-pagination
                v-if="favoritePagination.totalPages > 1"
                v-model:page="favoritePagination.page"
                :page-count="favoritePagination.totalPages"
                style="margin-top: 20px; justify-content: center"
                show-size-picker
                :page-sizes="[6, 12, 18, 24]"
                :page-size="favoritePagination.pageSize"
                @update:page-size="handleFavoriteSizeChange"
              />
            </div>
          </n-spin>
        </n-tab-pane>

        <n-tab-pane name="available" tab="可填写项目">
          <n-spin :show="loading">
            <n-empty
              v-if="availableTemplates.length === 0"
              description="暂无可填写的项目"
            />
            <div v-else>
              <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                <n-gi
                  v-for="template in paginatedTemplates"
                  :key="template.id"
                >
                  <n-card
                    hoverable
                    class="template-card"
                  >
                    <template #header>
                      <div class="template-header">
                        <span class="template-name" @click="handleFillTemplate(template)">{{ template.name }}</span>
                        <n-space align="center" :size="8">
                          <n-tag
                            :type="template.points > 0 ? 'success' : 'error'"
                            size="medium"
                            round
                          >
                            {{ template.points > 0 ? '+' : '' }}{{ template.points }}
                          </n-tag>
                          <n-button
                            text
                            @click.stop="handleToggleFavorite(template)"
                          >
                            <n-icon size="20" :color="favoriteMap[template.id] ? '#f0a020' : '#ccc'">
                              <StarFilled v-if="favoriteMap[template.id]" />
                              <StarOutline v-else />
                            </n-icon>
                          </n-button>
                        </n-space>
                      </div>
                    </template>
                    <div @click="handleFillTemplate(template)" style="cursor: pointer">
                      <n-space vertical size="small">
                        <n-space>
                          <n-tag type="info" size="small" round>
                            <template #icon>
                              <n-icon :component="CodeSlashOutline" />
                            </template>
                            {{ template.type.name }}
                          </n-tag>
                          <n-tag size="small" round>
                            <template #icon>
                              <n-icon :component="TrophyOutline" />
                            </template>
                            {{ template.standard.name }}
                          </n-tag>
                        </n-space>
                        <div class="template-requirements">
                          <n-space size="small">
                            <n-tag v-if="template.requireText" size="tiny" type="default">
                              需要文字
                            </n-tag>
                            <n-tag v-if="template.requireImage" size="tiny" type="default">
                              需要图片
                            </n-tag>
                            <n-tag v-if="template.requireLink" size="tiny" type="default">
                              需要链接
                            </n-tag>
                          </n-space>
                        </div>
                      </n-space>
                    </div>
                  </n-card>
                </n-gi>
              </n-grid>

              <n-pagination
                v-if="templatePagination.totalPages > 1"
                v-model:page="templatePagination.page"
                :page-count="templatePagination.totalPages"
                style="margin-top: 20px; justify-content: center"
                show-size-picker
                :page-sizes="[6, 12, 18, 24]"
                :page-size="templatePagination.pageSize"
                @update:page-size="handleTemplateSizeChange"
              />
            </div>
          </n-spin>
        </n-tab-pane>

        <n-tab-pane name="my" tab="我的提交">
          <n-spin :show="submissionStore.myLoading">
            <n-data-table
              :columns="mySubmissionsColumns"
              :data="submissionStore.mySubmissions"
              :pagination="false"
              :bordered="false"
              :single-line="false"
            />

            <n-empty
              v-if="submissionStore.mySubmissions.length === 0 && !submissionStore.myLoading"
              description="暂无提交记录"
              style="margin: 40px 0"
            />

            <div v-if="submissionStore.myPagination.totalPages > 1" style="margin-top: 16px; display: flex; justify-content: flex-end">
              <n-pagination
                v-model:page="submissionStore.myPagination.page"
                :page-count="submissionStore.myPagination.totalPages"
                :page-size="submissionStore.myPagination.pageSize"
                show-size-picker
                :page-sizes="[10, 20, 30, 50]"
                @update:page="handleMyPageChange"
                @update:page-size="handleMyPageSizeChange"
              />
            </div>
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 查看详情对话框 -->
    <n-modal
      v-model:show="showDetailDialog"
      preset="card"
      title="提交详情"
      style="width: 600px"
    >
      <n-descriptions v-if="viewingSubmission" label-placement="left" :column="1">
        <n-descriptions-item label="规则名称">
          {{ viewingSubmission.template.name }}
        </n-descriptions-item>
        <n-descriptions-item label="技术类型">
          <n-tag type="info" size="small">{{ viewingSubmission.template.type.name }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="展示标准">
          <n-tag size="small">{{ viewingSubmission.template.standard.name }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="积分">
          <n-tag
            :type="viewingSubmission.template.points > 0 ? 'success' : 'error'"
            size="small"
          >
            {{ viewingSubmission.template.points > 0 ? '+' : '' }}{{ viewingSubmission.template.points }} 积分
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="状态">
          <n-tag :type="getStatusType(viewingSubmission.status)" size="small">
            {{ getStatusText(viewingSubmission.status) }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="提交时间">
          {{ formatDate(viewingSubmission.createdAt) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.content" label="说明内容">
          {{ viewingSubmission.content }}
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.images?.length" label="图片">
          <n-space>
            <n-image
              v-for="(img, index) in viewingSubmission.images"
              :key="index"
              :src="img"
              width="100"
              style="border-radius: 4px"
            />
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.audios?.length" label="音频">
          <n-space vertical>
            <audio
              v-for="(audio, index) in viewingSubmission.audios"
              :key="index"
              :src="audio"
              controls
              style="width: 100%; max-width: 400px"
            />
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.link" label="链接">
          <a :href="viewingSubmission.link" target="_blank">{{ viewingSubmission.link }}</a>
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.quantity && viewingSubmission.quantity > 1" label="数量">
          <n-tag size="small">
            × {{ viewingSubmission.quantity }}（单个{{ viewingSubmission.template.points }}分）
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.reviewNote" label="审核备注">
          <div class="review-note">
            {{ viewingSubmission.reviewNote }}
          </div>
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.reviewedAt" label="审核时间">
          {{ formatDate(viewingSubmission.reviewedAt) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="viewingSubmission.pointsAwarded !== null" label="实际获得积分">
          <n-tag
            :type="viewingSubmission.pointsAwarded > 0 ? 'success' : 'error'"
            size="small"
          >
            {{ viewingSubmission.pointsAwarded > 0 ? '+' : '' }}{{ viewingSubmission.pointsAwarded }} 积分
          </n-tag>
        </n-descriptions-item>
      </n-descriptions>
    </n-modal>

    <!-- 填写/编辑表单对话框 -->
    <n-modal
      v-model:show="showFormDialog"
      preset="card"
      :title="editingSubmission ? '编辑提交' : '填写表单'"
      style="width: 600px"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="top"
      >
        <n-form-item
          v-if="selectedTemplate?.requireText"
          label="描述说明"
          path="content"
          :required="selectedTemplate.requireText"
        >
          <n-input
            v-model:value="formData.content"
            type="textarea"
            :placeholder="`最多${selectedTemplate.textMaxLength}字`"
            :maxlength="selectedTemplate.textMaxLength"
            show-count
            :rows="5"
          />
        </n-form-item>

        <n-form-item
          v-if="selectedTemplate?.requireImage"
          label="上传图片"
          path="images"
          :required="selectedTemplate.requireImage"
        >
          <n-upload
            v-model:file-list="imageFileList"
            :max="2"
            list-type="image-card"
            accept="image/*"
            :custom-request="handleCustomUpload"
            @change="handleImageChange"
          >
            点击上传（最多2张）
          </n-upload>
        </n-form-item>

        <n-form-item
          v-if="selectedTemplate?.requireAudio"
          label="上传音频"
          path="audios"
          :required="selectedTemplate.requireAudio"
        >
          <n-upload
            v-model:file-list="audioFileList"
            :max="3"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,audio/flac"
            :custom-request="handleAudioUpload"
            @change="handleAudioChange"
          >
            <n-button>点击上传音频（最多3个）</n-button>
          </n-upload>
        </n-form-item>

        <n-form-item
          v-if="selectedTemplate?.requireLink"
          label="链接"
          path="link"
          :required="selectedTemplate.requireLink"
        >
          <n-input
            v-model:value="formData.link"
            placeholder="请输入链接地址"
          />
        </n-form-item>

        <n-form-item
          v-if="selectedTemplate?.allowQuantity"
          label="数量"
          path="quantity"
        >
          <n-input-number
            v-model:value="formData.quantity"
            :min="1"
            :max="100"
            placeholder="选择数量"
            style="width: 100%"
          >
            <template #suffix>
              <span class="text-gray-500">× 积分 = {{ (formData.quantity || 1) * (selectedTemplate?.points || 0) }}</span>
            </template>
          </n-input-number>
          <div style="margin-top: 8px; font-size: 12px; color: #999">
            每个数量获得{{ selectedTemplate?.points }}积分，总共获得{{ (formData.quantity || 1) * (selectedTemplate?.points || 0) }}积分
          </div>
        </n-form-item>

        <!-- 显示规则音频说明（如果有） -->
        <n-alert
          v-if="selectedTemplate?.audioUrl"
          type="info"
          title="规则说明音频"
          style="margin-bottom: 16px"
        >
          <audio :src="selectedTemplate.audioUrl" controls style="width: 100%" />
        </n-alert>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showFormDialog = false">取消</n-button>
          <n-button type="primary" @click="handleSubmitForm">提交</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useMessage, useDialog, NButton, NTag, NSpace, NImage, NIcon } from 'naive-ui';
import { LinkOutline, CodeSlashOutline, TrophyOutline, EyeOutline, VolumeHighOutline, StarOutline } from '@vicons/ionicons5';
import { Star as StarFilled } from '@vicons/ionicons5';
import { useSubmissionStore } from '@/stores/submission';
import api from '@/api';

const message = useMessage();
const dialog = useDialog();
const submissionStore = useSubmissionStore();

// 用于跟踪历史记录展开状态
const historyExpandStates = ref({});

// 收藏相关
const favoriteTemplates = ref([]);
const favoritesLoading = ref(false);
const favoriteMap = ref({});
const favoritePagination = ref({
  page: 1,
  pageSize: 6,
  totalPages: 0
});

// 分页后的收藏模板
const paginatedFavorites = computed(() => {
  const start = (favoritePagination.value.page - 1) * favoritePagination.value.pageSize;
  const end = start + favoritePagination.value.pageSize;
  favoritePagination.value.totalPages = Math.ceil(favoriteTemplates.value.length / favoritePagination.value.pageSize);
  return favoriteTemplates.value.slice(start, end);
});

// 我的提交表格列定义
const mySubmissionsColumns = [
  {
    title: '规则名称',
    key: 'template.name',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
    render: (row) => h(NTag, { type: 'info', size: 'small' }, { default: () => row.template.type.name })
  },
  {
    title: '缩略图',
    key: 'images',
    width: 80,
    render: (row) => {
      if (!row.images || row.images.length === 0) {
        return h('span', { style: 'color: #999; font-size: 12px' }, '无图片');
      }
      return h('div', {
        style: 'width: 60px; height: 60px; overflow: hidden; border-radius: 4px; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5;'
      }, [
        h(NImage, {
          src: row.images[0],
          width: 60,
          height: 60,
          objectFit: 'cover',
          imgProps: {
            style: {
              width: '60px',
              height: '60px',
              objectFit: 'cover'
            }
          }
        })
      ]);
    }
  },
  {
    title: '音频',
    key: 'audios',
    width: 120,
    render: (row) => {
      if (!row.audios || row.audios.length === 0) {
        return h('span', { style: 'color: #999; font-size: 12px' }, '无音频');
      }
      return h('div', {
        style: 'display: flex; flex-direction: column; gap: 4px;'
      }, row.audios.map((audioUrl, index) =>
        h('audio', {
          src: audioUrl,
          controls: true,
          style: 'width: 100px; height: 30px;',
          key: index
        })
      ));
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, {
      type: getStatusType(row.status),
      size: 'small'
    }, {
      default: () => getStatusText(row.status)
    })
  },
  {
    title: '积分',
    key: 'points',
    width: 80,
    render: (row) => {
      const points = row.template.points;
      return h(NTag, {
        type: points > 0 ? 'success' : 'error',
        size: 'small'
      }, {
        default: () => (points > 0 ? '+' : '') + points
      });
    }
  },
  {
    title: '提交时间',
    key: 'createdAt',
    width: 160,
    render: (row) => formatDate(row.createdAt)
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render: (row) => {
      return h(NSpace, {}, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => handleViewDetail(row)
          }, { default: () => '查看', icon: () => h(NIcon, {}, { default: () => h(EyeOutline) }) }),
          row.status === 'PENDING' && h(NButton, {
            size: 'small',
            onClick: () => handleEditSubmission(row)
          }, { default: () => '编辑' }),
          row.status === 'REJECTED' && h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleResubmit(row)
          }, { default: () => '重新提交' }),
          row.status === 'PENDING' && h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => handleDeleteSubmission(row.id)
          }, { default: () => '删除' })
        ].filter(Boolean)
      });
    }
  }
];

// 将提交记录按模板分组
const groupedSubmissions = computed(() => {
  const groups = {};

  // 按模板ID分组
  submissionStore.mySubmissions.forEach(submission => {
    const templateId = submission.template.id;
    if (!groups[templateId]) {
      groups[templateId] = {
        templateId,
        templateName: submission.template.name,
        typeName: submission.template.type.name,
        standardName: submission.template.standard.name,
        submissions: []
      };
    }
    groups[templateId].submissions.push(submission);
  });

  // 对每组内的提交按时间排序，最新的在前
  const result = Object.values(groups).map(group => {
    group.submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      ...group,
      latest: group.submissions[0], // 最新的提交
      history: group.submissions.slice(1), // 历史提交
      showHistory: historyExpandStates.value[group.templateId] || false
    };
  });

  // 按最新提交时间排序整个列表
  result.sort((a, b) => new Date(b.latest.createdAt) - new Date(a.latest.createdAt));

  return result;
});

const activeTab = ref('favorites');
const loading = ref(false);
const availableTemplates = ref([]);

// 模板分页
const templatePagination = ref({
  page: 1,
  pageSize: 6,
  totalPages: 0
});

// 分页后的模板
const paginatedTemplates = computed(() => {
  const start = (templatePagination.value.page - 1) * templatePagination.value.pageSize;
  const end = start + templatePagination.value.pageSize;
  templatePagination.value.totalPages = Math.ceil(availableTemplates.value.length / templatePagination.value.pageSize);
  return availableTemplates.value.slice(start, end);
});

const showFormDialog = ref(false);
const showDetailDialog = ref(false);
const selectedTemplate = ref(null);
const editingSubmission = ref(null);
const viewingSubmission = ref(null);
const formRef = ref(null);
const formData = ref({
  content: '',
  images: [],
  audios: [],
  link: '',
  quantity: 1
});
const imageFileList = ref([]);
const audioFileList = ref([]);

const formRules = {
  content: [
    {
      required: true,
      message: '请输入描述说明',
      trigger: 'blur'
    }
  ],
  images: [
    {
      required: true,
      validator: (rule, value) => {
        if (selectedTemplate.value?.requireImage && imageFileList.value.length === 0) {
          return new Error('请上传图片');
        }
        return true;
      },
      trigger: 'change'
    }
  ],
  link: [
    {
      required: true,
      message: '请输入链接',
      trigger: 'blur'
    },
    {
      type: 'url',
      message: '请输入有效的URL',
      trigger: 'blur'
    }
  ]
};

onMounted(async () => {
  await Promise.all([
    fetchFavorites(),
    fetchAvailableTemplates(),
    submissionStore.fetchMySubmissions()
  ]);
});

async function fetchAvailableTemplates() {
  loading.value = true;
  try {
    const { templates } = await api.get('/rules/templates/active');
    availableTemplates.value = templates || [];
    // 检查收藏状态
    await checkFavoriteStatus();
  } catch (error) {
    message.error('获取可填写项目失败');
  } finally {
    loading.value = false;
  }
}

async function fetchFavorites() {
  favoritesLoading.value = true;
  try {
    const { templates } = await api.get('/submissions/favorites');
    favoriteTemplates.value = templates || [];
  } catch (error) {
    console.error('获取收藏列表失败:', error);
  } finally {
    favoritesLoading.value = false;
  }
}

async function checkFavoriteStatus() {
  try {
    const templateIds = availableTemplates.value.map(t => t.id);
    if (templateIds.length === 0) return;

    const { favorites } = await api.post('/submissions/favorites/check', { templateIds });
    favoriteMap.value = favorites || {};
  } catch (error) {
    console.error('检查收藏状态失败:', error);
  }
}

async function handleToggleFavorite(template) {
  try {
    if (favoriteMap.value[template.id]) {
      // 取消收藏
      await api.delete(`/submissions/favorites/${template.id}`);
      favoriteMap.value[template.id] = false;
      // 从收藏列表中移除
      favoriteTemplates.value = favoriteTemplates.value.filter(t => t.id !== template.id);
      message.success('已取消收藏');
    } else {
      // 添加收藏
      await api.post('/submissions/favorites', { templateId: template.id });
      favoriteMap.value[template.id] = true;
      // 添加到收藏列表
      favoriteTemplates.value.unshift({ ...template, isFavorite: true });
      message.success('收藏成功');
    }
  } catch (error) {
    message.error(error.response?.data?.error || '操作失败');
  }
}

function handleTabChange(tabName) {
  if (tabName === 'favorites' && favoriteTemplates.value.length === 0) {
    fetchFavorites();
  }
}

function handleFavoriteSizeChange(pageSize) {
  favoritePagination.value.pageSize = pageSize;
  favoritePagination.value.page = 1;
}

function handleFillTemplate(template) {
  selectedTemplate.value = template;
  editingSubmission.value = null;
  formData.value = {
    content: '',
    images: [],
    audios: [],
    link: '',
    quantity: 1
  };
  imageFileList.value = [];
  audioFileList.value = [];
  showFormDialog.value = true;
}

function handleEditSubmission(submission) {
  selectedTemplate.value = submission.template;
  editingSubmission.value = submission;
  formData.value = {
    content: submission.content || '',
    images: submission.images || [],
    audios: submission.audios || [],
    link: submission.link || '',
    quantity: submission.quantity || 1
  };
  imageFileList.value = submission.images.map((url, index) => ({
    id: index,
    name: `image-${index}`,
    status: 'finished',
    url
  }));
  audioFileList.value = (submission.audios || []).map((url, index) => ({
    id: index,
    name: `audio-${index}`,
    status: 'finished',
    url
  }));
  showFormDialog.value = true;
}

function handleResubmit(submission) {
  // 被拒绝的提交，创建新提交而不是编辑
  selectedTemplate.value = submission.template;
  editingSubmission.value = null; // 设置为 null 表示创建新提交
  formData.value = {
    content: submission.content || '',
    images: submission.images || [],
    audios: submission.audios || [],
    link: submission.link || '',
    quantity: submission.quantity || 1
  };
  imageFileList.value = submission.images.map((url, index) => ({
    id: index,
    name: `image-${index}`,
    status: 'finished',
    url
  }));
  audioFileList.value = (submission.audios || []).map((url, index) => ({
    id: index,
    name: `audio-${index}`,
    status: 'finished',
    url
  }));
  showFormDialog.value = true;
}

function handleViewHistory(submission) {
  viewingSubmission.value = submission;
  showDetailDialog.value = true;
}

function handleViewDetail(submission) {
  viewingSubmission.value = submission;
  showDetailDialog.value = true;
}

function toggleHistory(group) {
  historyExpandStates.value[group.templateId] = !historyExpandStates.value[group.templateId];
}

function handleImageChange({ fileList }) {
  imageFileList.value = fileList;
}

function handleAudioChange({ fileList }) {
  audioFileList.value = fileList;
}

async function handleCustomUpload({ file, onFinish, onError }) {
  const uploadFormData = new FormData();
  uploadFormData.append('file', file.file);

  try {
    const response = await api.post('/upload', uploadFormData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const url = response.url || response.data?.url;
    file.url = url;
    file.status = 'finished';

    onFinish();
  } catch (error) {
    console.error('图片上传失败:', error);
    message.error('图片上传失败');
    onError();
  }
}

async function handleAudioUpload({ file, onFinish, onError }) {
  const uploadFormData = new FormData();
  uploadFormData.append('file', file.file);
  uploadFormData.append('type', 'audio');

  try {
    const response = await api.post('/upload', uploadFormData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const url = response.url || response.data?.url;
    file.url = url;
    file.status = 'finished';

    onFinish();
  } catch (error) {
    console.error('音频上传失败:', error);
    message.error('音频上传失败');
    onError();
  }
}

async function handleSubmitForm() {
  try {
    await formRef.value?.validate();

    const data = {
      templateId: selectedTemplate.value.id,
      content: formData.value.content,
      images: imageFileList.value.map(f => f.url || f.response?.url).filter(Boolean),
      audios: audioFileList.value.map(f => f.url || f.response?.url).filter(Boolean),
      link: formData.value.link,
      quantity: formData.value.quantity || 1
    };

    if (editingSubmission.value) {
      await submissionStore.updateMySubmission(editingSubmission.value.id, data);
      message.success('更新成功');
    } else {
      await submissionStore.createSubmission(data);
      message.success('提交成功，等待审核');
    }

    showFormDialog.value = false;
  } catch (error) {
    if (error?.message) {
      message.error(error.message);
    }
  }
}

async function handleDeleteSubmission(id) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条提交记录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await submissionStore.deleteMySubmission(id);
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
}

function handlePageChange(page) {
  submissionStore.fetchMySubmissions(page);
}

function handleMyPageChange(page) {
  submissionStore.fetchMySubmissions(page);
}

function handleMyPageSizeChange(pageSize) {
  submissionStore.myPagination.pageSize = pageSize;
  submissionStore.fetchMySubmissions(1);
}

function handleTemplateSizeChange(pageSize) {
  templatePagination.value.pageSize = pageSize;
  templatePagination.value.page = 1;
}

function getStatusType(status) {
  const types = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error'
  };
  return types[status] || 'default';
}

function getStatusText(status) {
  const texts = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝'
  };
  return texts[status] || status;
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN');
}
</script>

<style scoped>
.my-growth {
  padding: 20px;
}

/* 模板卡片样式 */
.template-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.template-name {
  font-weight: 600;
  font-size: 15px;
  flex: 1;
}

.template-requirements {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

/* 提交列表样式 */
.submission-prefix {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.submission-main {
  flex: 1;
  min-width: 0;
}

.submission-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.submission-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.submission-latest {
  margin-top: 8px;
}

.submission-time {
  color: #999;
  font-size: 12px;
}

.submission-content {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.submission-content.archived {
  color: #999;
  font-size: 13px;
  opacity: 0.85;
}

.submission-images {
  margin-top: 8px;
}

.submission-link {
  color: #666;
  font-size: 13px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.submission-link a {
  color: #18a058;
  text-decoration: none;
}

.submission-link a:hover {
  text-decoration: underline;
}

.review-note {
  color: #666;
  font-size: 13px;
  padding: 10px;
  background: #fff7e6;
  border-left: 3px solid #faad14;
  border-radius: 4px;
  margin-top: 8px;
}

.review-note.archived {
  background: #f5f5f5;
  border-left-color: #d9d9d9;
}

.review-note strong {
  color: #faad14;
  margin-right: 4px;
}

.review-note.archived strong {
  color: #999;
}

.points-awarded {
  margin-top: 8px;
}

.history-section {
  margin-top: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.history-item {
  padding: 10px;
  margin-bottom: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.history-item:last-child {
  margin-bottom: 0;
}
</style>
