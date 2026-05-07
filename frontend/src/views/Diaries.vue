<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的日记</h1>
        <p class="text-gray-500 mt-1">记录每一天的成长</p>
      </div>
      <n-space>
        <!-- AI 任务指示器 -->
        <DiaryTasksIndicator @view-result="handleViewTaskResult" />
        <n-badge :value="drafts.length" :show="drafts.length > 0">
          <n-button @click="showDraftsModal = true">
            <template #icon><n-icon><FolderOpenOutline /></n-icon></template>
            草稿箱
          </n-button>
        </n-badge>
        <n-button type="primary" @click="openCreateModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          写日记
        </n-button>
      </n-space>
    </div>

    <!-- 游戏化统计面板 -->
    <DiaryGameStatsPanel
      ref="gameStatsPanelRef"
      @view-achievements="activeTab = 'achievements'"
    />

    <!-- Tab 切换 -->
    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 我的日记 Tab -->
      <n-tab-pane name="diaries" tab="我的日记">
        <!-- 筛选 + AI 分析按钮 -->
        <div class="card mb-4">
          <n-space justify="space-between" style="width: 100%">
            <n-space>
              <n-date-picker v-model:value="filters.dateRange" type="daterange" clearable />
              <n-select v-model:value="filters.mood" placeholder="心情" :options="moodOptions" clearable style="width: 120px" />
            </n-space>
            <n-space>
              <n-button @click="showAiSettings = true" quaternary>
                <template #icon><n-icon><SettingsOutline /></n-icon></template>
                AI 设置
              </n-button>
              <n-button type="info" @click="analyzeBatch('this_week')">
                <template #icon><n-icon><SparklesOutline /></n-icon></template>
                分析本周
              </n-button>
              <n-button type="info" @click="analyzeBatch('last_week')">
                <template #icon><n-icon><SparklesOutline /></n-icon></template>
                分析上周
              </n-button>
            </n-space>
          </n-space>
        </div>

        <!-- 日记列表 -->
        <div class="card">
          <n-data-table
            :columns="columns"
            :data="diaries"
            :loading="loading"
            :pagination="false"
            :row-props="(row) => ({
              style: 'cursor: pointer;',
              onClick: () => viewDiary(row)
            })"
          />
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > 0" class="flex justify-center mt-4">
          <n-pagination
            v-model:page="pagination.page"
            :page-count="pagination.pageCount"
            :page-size="pagination.pageSize"
            show-size-picker
            :page-sizes="[10, 20, 50]"
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>
      </n-tab-pane>

      <!-- AI 分析记录 Tab -->
      <n-tab-pane name="history" tab="AI 分析记录">
        <div class="card mb-4">
          <n-space justify="space-between" style="width: 100%">
            <n-space>
              <n-select
                v-model:value="historyFilter.type"
                placeholder="类型"
                :options="[
                  { label: '全部', value: '' },
                  { label: '单条分析', value: 'single' },
                  { label: '批量分析', value: 'batch' }
                ]"
                clearable
                style="width: 140px"
                @update:value="loadAnalysisHistory"
              />
            </n-space>
            <n-button @click="loadAnalysisHistory" :loading="historyLoading">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新
            </n-button>
          </n-space>
        </div>

        <!-- 分析记录列表 - Grid卡片布局 -->
        <div v-if="historyLoading" class="text-center py-12">
          <n-spin size="large" />
        </div>
        <div v-else-if="analysisHistory.length === 0" class="text-center py-12 text-gray-500">
          暂无分析记录
        </div>
        <div v-else class="analysis-grid">
          <div
            v-for="record in analysisHistory"
            :key="record.id"
            class="analysis-card"
            @click="viewHistoryDetail(record)"
          >
            <!-- 评分徽章 -->
            <div class="card-header">
              <span v-if="record.grade" class="grade-badge" :class="getGradeClass(record.grade)">
                {{ record.grade }}
                <span v-if="record.totalScore" class="grade-score">{{ record.totalScore }}</span>
              </span>
              <n-tag :type="record.isBatch ? 'info' : 'success'" size="tiny">
                {{ record.isBatch ? record.period : '单条' }}
              </n-tag>
            </div>
            <!-- 标题 -->
            <div class="card-title">{{ getSnapshotTitle(record.diarySnapshot) }}</div>
            <!-- 底部信息 -->
            <div class="card-footer">
              <span>{{ formatDateTime(record.createdAt) }}</span>
              <div class="card-actions" @click.stop>
                <n-button size="tiny" quaternary @click="shareAnalysis(record)">
                  <template #icon><n-icon size="14"><ShareSocialOutline /></n-icon></template>
                </n-button>
                <n-button size="tiny" quaternary @click="reAnalyze(record)">
                  <template #icon><n-icon size="14"><RefreshOutline /></n-icon></template>
                </n-button>
                <n-button size="tiny" quaternary type="error" @click="deleteHistory(record)">
                  <template #icon><n-icon size="14"><TrashOutline /></n-icon></template>
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="historyPagination.total > 0" class="flex justify-center mt-4">
          <n-pagination
            v-model:page="historyPagination.page"
            :page-count="historyPagination.pageCount"
            :page-size="historyPagination.pageSize"
            show-size-picker
            :page-sizes="[10, 20, 50]"
            @update:page="handleHistoryPageChange"
            @update:page-size="handleHistoryPageSizeChange"
          />
        </div>
      </n-tab-pane>

      <!-- 成就 Tab -->
      <n-tab-pane name="achievements" tab="成就">
        <DiaryAchievementsTab />
      </n-tab-pane>
    </n-tabs>

    <!-- 创建/编辑弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="editingDiary ? '编辑日记' : '写日记'"
      :style="isFullscreen ? 'width: 100vw; height: 100vh; max-width: 100vw; margin: 0;' : 'width: 600px'"
      :closable="false"
      :mask-closable="false"
    >
      <template #header-extra>
        <n-space>
          <n-button quaternary circle @click="toggleFullscreen">
            <template #icon>
              <n-icon><component :is="isFullscreen ? ContractOutline : ExpandOutline" /></n-icon>
            </template>
          </n-button>
        </n-space>
      </template>
      <n-form :model="form" label-placement="top" :style="isFullscreen ? 'max-height: calc(100vh - 140px); overflow-y: auto;' : ''">
        <n-form-item label="日期">
          <n-date-picker
            v-model:value="form.diaryDate"
            type="date"
            style="width: 100%"
            :is-date-disabled="(timestamp) => timestamp > Date.now()"
          />
        </n-form-item>
        <n-form-item label="标题">
          <n-input v-model:value="form.title" placeholder="给日记起个标题..." />
        </n-form-item>
        <div class="grid grid-cols-2 gap-4">
          <n-form-item label="心情">
            <n-select v-model:value="form.mood" :options="moodOptions" />
          </n-form-item>
          <n-form-item label="天气">
            <n-select v-model:value="form.weather" :options="weatherOptions" />
          </n-form-item>
        </div>
        <n-form-item label="内容">
          <div class="w-full">
            <div class="flex justify-end mb-2">
              <n-button size="small" quaternary type="info" @click="handleApplyTemplate">
                <template #icon><n-icon><DocumentTextOutline /></n-icon></template>
                参考模版
              </n-button>
            </div>
            <n-input
              v-model:value="form.content"
              type="textarea"
              placeholder="今天发生了什么..."
              :rows="isFullscreen ? 20 : 8"
            />
          </div>
        </n-form-item>
        <!-- 字数统计 -->
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">字数统计</span>
            <n-button size="tiny" quaternary @click="copyStatistics">
              <template #icon><n-icon><CopyOutline /></n-icon></template>
              复制统计
            </n-button>
          </div>
          <div class="grid grid-cols-4 gap-2 mb-3">
            <div class="text-center">
              <div class="text-xs text-gray-500">总字符</div>
              <div class="text-lg font-bold text-gray-800">{{ contentStats.total }}</div>
            </div>
            <div class="text-center">
              <div class="text-xs text-gray-500">文字</div>
              <div class="text-lg font-bold text-primary-600">{{ contentStats.chars }}</div>
            </div>
            <div class="text-center">
              <div class="text-xs text-gray-500">标点</div>
              <div class="text-lg font-bold text-gray-600">{{ contentStats.punctuation }}</div>
            </div>
            <div class="text-center">
              <div class="text-xs text-gray-500">空格</div>
              <div class="text-lg font-bold text-gray-600">{{ contentStats.spaces }}</div>
            </div>
          </div>
          <!-- 等级进度 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span :class="contentStats.level >= 1 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                {{ contentStats.level >= 1 ? '✓' : '○' }} 入门 (800字)
              </span>
              <span :class="contentStats.level >= 2 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                {{ contentStats.level >= 2 ? '✓' : '○' }} 良好 (1000字)
              </span>
              <span :class="contentStats.level >= 3 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                {{ contentStats.level >= 3 ? '✓' : '○' }} 优秀 (1200字)
              </span>
              <span :class="contentStats.level >= 4 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                {{ contentStats.level >= 4 ? '✓' : '○' }} 卓越 (1500字)
              </span>
              <span :class="contentStats.level >= 5 ? 'text-primary-600 font-medium' : 'text-gray-400'">
                {{ contentStats.level >= 5 ? '✓' : '○' }} 大师 (2000字)
              </span>
            </div>
            <n-progress
              type="line"
              :percentage="contentStats.progress"
              :color="contentStats.levelColor"
              :height="8"
              :border-radius="4"
            />
            <div class="text-xs text-center text-gray-500">
              {{ contentStats.levelText }}
            </div>
          </div>
        </div>
        <n-form-item label="隐私设置">
          <n-checkbox v-model:checked="form.isPrivate">
            不公开到个人主页（仅自己可见）
          </n-checkbox>
        </n-form-item>
        <n-form-item label="付费设置">
          <n-input-number
            v-model:value="form.price"
            :min="0"
            :max="100"
            placeholder="0表示免费"
            style="width: 100%"
          >
            <template #suffix>金币</template>
          </n-input-number>
          <div class="text-xs text-gray-500 mt-1">
            设置价格后，其他用户需要购买才能查看完整内容（0表示免费）
          </div>
        </n-form-item>
        <n-form-item label="标签">
          <TagSelector v-model="form.tagIds" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="space-between" style="width: 100%">
          <n-button @click="handleBack">
            <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
            返回
          </n-button>
          <n-space>
            <n-button @click="handleSaveDraft">
              <template #icon><n-icon><SaveOutline /></n-icon></template>
              暂存
            </n-button>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">
              <template #icon><n-icon><SendOutline /></n-icon></template>
              提交
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <!-- 草稿箱弹窗 -->
    <n-modal v-model:show="showDraftsModal" preset="card" title="草稿箱" style="width: 500px">
      <div v-if="drafts.length === 0" class="text-center text-gray-500 py-8">
        暂无草稿
      </div>
      <n-list v-else>
        <n-list-item v-for="draft in drafts" :key="draft.id">
          <n-thing>
            <template #header>
              {{ draft.title || '无标题' }}
            </template>
            <template #description>
              <div class="text-xs text-gray-500">
                {{ formatDraftDate(draft.savedAt) }} · {{ draft.content?.length || 0 }}字
              </div>
            </template>
            <template #header-extra>
              <n-space>
                <n-button size="small" type="primary" @click="openDraft(draft)">
                  继续编辑
                </n-button>
                <n-button size="small" quaternary type="error" @click="deleteDraft(draft.id)">
                  删除
                </n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-modal>

    <!-- AI 分析结果弹窗 -->
    <n-modal
      v-model:show="showAnalysisModal"
      preset="card"
      :title="getAnalysisModalTitle()"
      style="width: 850px; max-width: 90vw"
      :body-style="{ maxHeight: 'calc(80vh - 100px)', overflowY: 'auto', padding: '24px' }"
      :closable="!analyzing"
      :mask-closable="!analyzing"
    >
      <template #header-extra>
        <n-button v-if="!analyzing" quaternary circle @click="handlePrintAnalysis">
          <template #icon><n-icon><PrintOutline /></n-icon></template>
        </n-button>
      </template>
      <div v-if="analyzing" class="text-center py-16">
        <n-spin size="large" />
        <p class="mt-6 text-gray-500 text-lg">{{ loadingText }}</p>
        <p class="mt-2 text-gray-400 text-sm">分析预计需要2分钟，请勿离开页面</p>
        <div class="mt-8">
          <n-button type="error" @click="handleAnalysisStop">
            <template #icon><n-icon><StopCircleOutline /></n-icon></template>
            停止分析
          </n-button>
        </div>
      </div>
      <template v-else>
        <!-- 版本切换（单条分析且有多个版本时显示） -->
        <div v-if="!analysisResult.isBatch && analysisResult.diaryId && analysisVersions.length > 1" class="mb-4">
          <n-space align="center">
            <span class="text-sm text-gray-500">分析版本：</span>
            <n-select
              v-model:value="currentVersionId"
              :options="versionOptions"
              size="small"
              style="width: 200px"
              @update:value="handleVersionChange"
            />
          </n-space>
        </div>

        <!-- 评分卡片（有评分数据时显示） -->
        <DiaryScoreCard
          v-if="analysisResult.totalScore !== undefined && analysisResult.totalScore !== null"
          :total-score="analysisResult.totalScore"
          :grade="analysisResult.grade"
          :score-details="analysisResult.scoreDetails"
          :highlights="analysisResult.highlights"
          :improvements="analysisResult.improvements"
          :encouragement="analysisResult.encouragement"
          :next-goal="analysisResult.nextGoal"
          :previous-score="analysisResult.previousScore"
          :previous-grade="analysisResult.previousGrade"
          :author-profile="analysisResult.authorProfile"
          :characters-profile="analysisResult.charactersProfile"
          :social-style="analysisResult.socialStyle"
          :fun-summary="analysisResult.funSummary"
          class="mb-6"
        />

        <!-- 周心理摘要（批量分析时显示） -->
        <div v-if="analysisResult.isBatch && analysisResult.psychologySummary" class="psychology-summary-card mb-6">
          <div class="card-header">
            <span class="card-icon">🧠</span>
            <span class="card-title">周心理摘要</span>
            <n-tag v-if="analysisResult.psychologySummary.riskLevel === 'medium'" type="warning" size="small">需关注</n-tag>
            <n-tag v-else-if="analysisResult.psychologySummary.riskLevel === 'high'" type="error" size="small">建议咨询</n-tag>
          </div>

          <!-- 情绪状态 -->
          <div class="summary-section">
            <div class="section-label">情绪状态</div>
            <div class="emotion-status">
              <div class="status-item">
                <span class="status-label">主导情绪</span>
                <span class="status-value">{{ analysisResult.psychologySummary.dominantEmotion || '-' }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">稳定性</span>
                <span class="status-value">{{ analysisResult.psychologySummary.emotionStability || '-' }}</span>
              </div>
            </div>
            <div v-if="analysisResult.psychologySummary.emotionTriggers?.length" class="triggers">
              <span class="triggers-label">情绪触发：</span>
              <n-tag v-for="t in analysisResult.psychologySummary.emotionTriggers" :key="t" size="tiny" class="mr-1">{{ t }}</n-tag>
            </div>
          </div>

          <!-- 心理需求 -->
          <div v-if="analysisResult.psychologySummary.psychNeeds" class="summary-section">
            <div class="section-label">心理需求识别</div>
            <div class="needs-grid">
              <div v-if="analysisResult.psychologySummary.psychNeeds.satisfied?.length" class="need-group">
                <span class="need-type satisfied">✓ 已满足</span>
                <div class="need-tags">
                  <n-tag v-for="n in analysisResult.psychologySummary.psychNeeds.satisfied" :key="n" size="tiny" type="success">{{ n }}</n-tag>
                </div>
              </div>
              <div v-if="analysisResult.psychologySummary.psychNeeds.needAttention?.length" class="need-group">
                <span class="need-type attention">○ 需关注</span>
                <div class="need-tags">
                  <n-tag v-for="n in analysisResult.psychologySummary.psychNeeds.needAttention" :key="n" size="tiny" type="warning">{{ n }}</n-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- 成长信号 -->
          <div v-if="analysisResult.psychologySummary.growthSignals?.length || analysisResult.psychologySummary.positiveTraits?.length" class="summary-section">
            <div class="section-label">成长信号</div>
            <div class="growth-tags">
              <n-tag v-for="s in analysisResult.psychologySummary.growthSignals" :key="s" size="small" type="info" class="mr-1 mb-1">{{ s }}</n-tag>
              <n-tag v-for="t in analysisResult.psychologySummary.positiveTraits" :key="t" size="small" type="success" class="mr-1 mb-1">{{ t }}</n-tag>
            </div>
          </div>

          <!-- 家长引导建议 -->
          <div v-if="analysisResult.psychologySummary.parentGuidance?.length" class="summary-section guidance">
            <div class="section-label">💡 家长引导建议</div>
            <ul class="guidance-list">
              <li v-for="(g, idx) in analysisResult.psychologySummary.parentGuidance" :key="idx">{{ g }}</li>
            </ul>
          </div>

          <!-- 周总结 -->
          <div v-if="analysisResult.psychologySummary.weekSummary" class="week-summary">
            {{ analysisResult.psychologySummary.weekSummary }}
          </div>
        </div>

        <!-- 朗读播放器 -->
        <div class="mb-4">
          <SpeechPlayer :text="analysisResult.analysis" />
        </div>

        <!-- 原日记内容（单条分析时显示） -->
        <div v-if="!analysisResult.isBatch && analysisResult.diary" class="mb-6">
          <n-collapse>
            <n-collapse-item title="查看原日记内容" name="original">
              <!-- 原日记朗读播放器 -->
              <div class="mb-4">
                <SpeechPlayer :text="analysisResult.diary.content" />
              </div>
              <div class="bg-gray-50 p-5 rounded-lg">
                <div class="flex items-center gap-4 mb-3 text-sm text-gray-500">
                  <span>{{ getMoodEmoji(analysisResult.diary.mood) }} {{ analysisResult.diary.weather }}</span>
                  <span>{{ formatDate(analysisResult.diary.createdAt) }}</span>
                </div>
                <h4 class="font-bold text-lg mb-3">{{ analysisResult.diary.title || '无标题' }}</h4>
                <div class="whitespace-pre-wrap text-gray-700 leading-relaxed">{{ analysisResult.diary.content }}</div>
              </div>
            </n-collapse-item>
          </n-collapse>
        </div>
        <!-- AI 分析结果（仅当有内容时显示） -->
        <div v-if="renderedAnalysis" class="analysis-content" v-html="renderedAnalysis"></div>
        <div v-if="analysisResult.responseTime" class="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-right">
          分析耗时：{{ (analysisResult.responseTime / 1000).toFixed(1) }}秒
        </div>
      </template>
    </n-modal>

    <!-- AI 设置弹窗 -->
    <n-modal
      v-model:show="showAiSettings"
      preset="card"
      title="日记 AI 设置"
      style="width: 700px"
    >
      <DiaryAiSettingsPanel />
    </n-modal>

    <!-- 日记详情弹窗 -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      :title="viewingDiary?.title || '日记详情'"
      style="width: 750px; max-width: 90vw"
      :body-style="{ maxHeight: 'calc(80vh - 100px)', overflowY: 'auto', padding: '24px' }"
    >
      <template v-if="viewingDiary">
        <!-- 朗读播放器 -->
        <div class="mb-4">
          <SpeechPlayer :text="viewingDiary.content" />
        </div>

        <!-- 日记头部信息 -->
        <div class="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div class="text-4xl">{{ getMoodEmoji(viewingDiary.mood) }}</div>
          <div class="flex-1">
            <h2 class="text-xl font-bold text-gray-800 mb-1">{{ viewingDiary.title || '无标题' }}</h2>
            <div class="flex items-center gap-3 text-sm text-gray-500">
              <span>{{ formatDate(viewingDiary.createdAt) }}</span>
              <span>{{ viewingDiary.weather }}</span>
              <n-tag size="small" :type="getWordLevelType(viewingDiary.content)">
                {{ getDiaryStats(viewingDiary.content) }}
              </n-tag>
            </div>
          </div>
        </div>

        <!-- 日记正文 -->
        <div class="diary-content bg-amber-50 rounded-xl p-6 mb-6">
          <div class="whitespace-pre-wrap text-gray-700 leading-relaxed text-base">{{ viewingDiary.content }}</div>
        </div>

        <!-- 写作统计 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 class="text-sm font-medium text-gray-600 mb-3">写作统计</h4>
          <div class="grid grid-cols-4 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-primary-600">{{ getDetailStats(viewingDiary.content).chars }}</div>
              <div class="text-xs text-gray-500">文字</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-gray-600">{{ getDetailStats(viewingDiary.content).total }}</div>
              <div class="text-xs text-gray-500">总字符</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-gray-600">{{ getDetailStats(viewingDiary.content).punctuation }}</div>
              <div class="text-xs text-gray-500">标点</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-gray-600">{{ getDetailStats(viewingDiary.content).spaces }}</div>
              <div class="text-xs text-gray-500">空格</div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <n-space justify="space-between" style="width: 100%">
          <n-button @click="showDetailModal = false">关闭</n-button>
          <n-space>
            <n-button @click="checkDuplicateFromDetail">
              <template #icon><n-icon><SearchOutline /></n-icon></template>
              写作报告
            </n-button>
            <n-button type="info" @click="analyzeFromDetail">
              <template #icon><n-icon><SparklesOutline /></n-icon></template>
              AI 分析
            </n-button>
            <n-button type="primary" @click="editFromDetail">
              <template #icon><n-icon><CreateOutline /></n-icon></template>
              编辑
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <!-- 查重检测弹窗（展示提交时快照） -->
    <n-modal
      v-model:show="showDuplicateModal"
      preset="card"
      title="写作质量报告"
      style="width: 520px; max-width: 90vw"
    >
      <template v-if="duplicateSnapshot">
        <div class="snapshot-report">
          <!-- 标题栏 -->
          <div class="report-header">
            <div class="report-title">{{ duplicateSnapshot.diaryTitle }}</div>
            <div class="report-date">{{ duplicateSnapshot.diaryDate }}</div>
          </div>

          <!-- 字数统计卡片 -->
          <div class="stats-card" v-if="duplicateSnapshot.wordStats">
            <div class="stats-card-title">字数统计</div>
            <div class="stats-grid">
              <div class="stat-item stat-primary">
                <div class="stat-value">{{ duplicateSnapshot.wordStats.words }}</div>
                <div class="stat-label">文字</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ duplicateSnapshot.wordStats.total }}</div>
                <div class="stat-label">总字符</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ duplicateSnapshot.wordStats.punctuation }}</div>
                <div class="stat-label">标点</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ duplicateSnapshot.wordStats.spaces }}</div>
                <div class="stat-label">空格</div>
              </div>
            </div>
          </div>

          <!-- 查重结果卡片 -->
          <div class="stats-card" v-if="duplicateSnapshot.duplicateStats">
            <div class="stats-card-title">查重检测</div>
            <div class="rate-row">
              <div class="rate-block" :class="getDuplicateRateClass(duplicateSnapshot.duplicateStats.overallRate)">
                <div class="rate-value">{{ duplicateSnapshot.duplicateStats.overallRate }}%</div>
                <div class="rate-desc">历史重复率</div>
              </div>
              <div class="rate-block" :class="getDuplicateRateClass(duplicateSnapshot.duplicateStats.selfRepeatRate)">
                <div class="rate-value">{{ duplicateSnapshot.duplicateStats.selfRepeatRate }}%</div>
                <div class="rate-desc">自身重复率</div>
              </div>
            </div>
            <div class="rate-detail-row">
              <span>检查 {{ duplicateSnapshot.duplicateStats.checkedDiaries }} 篇历史日记</span>
              <span>历史重复 {{ duplicateSnapshot.duplicateStats.duplicateChars }} 字</span>
              <span>自身重复 {{ duplicateSnapshot.duplicateStats.selfRepeatChars }} 字</span>
            </div>

            <!-- 历史重复详情 -->
            <div v-if="duplicateSnapshot.duplicateStats.duplicates?.length > 0" class="duplicate-list">
              <div class="duplicate-list-title">与历史日记重复内容：</div>
              <div
                v-for="(dup, index) in duplicateSnapshot.duplicateStats.duplicates"
                :key="index"
                class="duplicate-item"
              >
                <div class="duplicate-text">"{{ dup.text }}"</div>
                <div class="duplicate-source">
                  来自《{{ dup.foundIn[0]?.diaryTitle }}》({{ formatDuplicateDate(dup.foundIn[0]?.diaryDate) }})
                </div>
              </div>
            </div>

            <!-- 自身重复详情 -->
            <div v-if="duplicateSnapshot.duplicateStats.selfRepeats?.length > 0" class="duplicate-list" style="margin-top: 12px;">
              <div class="duplicate-list-title">文章内重复词句：</div>
              <div
                v-for="(rep, index) in duplicateSnapshot.duplicateStats.selfRepeats"
                :key="index"
                class="self-repeat-item"
              >
                <span class="repeat-text">"{{ rep.text }}"</span>
                <span class="repeat-count">重复 {{ rep.count }} 次</span>
              </div>
            </div>

            <div v-if="!duplicateSnapshot.duplicateStats.duplicates?.length && !duplicateSnapshot.duplicateStats.selfRepeats?.length" class="duplicate-empty">
              未发现重复内容，原创度很高！
            </div>
          </div>

          <!-- 无查重数据 -->
          <div v-if="!duplicateSnapshot.duplicateStats" class="no-data-card">
            <div class="no-data-text">提交时未进行查重检测</div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="no-data-card">
          <div class="no-data-text">该日记提交时未保存统计数据</div>
        </div>
      </template>
    </n-modal>

    <!-- 编辑标题弹窗 -->
    <n-modal
      v-model:show="showEditTitleModal"
      preset="card"
      title="编辑标题"
      style="width: 400px"
    >
      <n-form-item label="标题">
        <n-input v-model:value="editingTitle" placeholder="请输入新标题" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditTitleModal = false">取消</n-button>
          <n-button type="primary" @click="saveEditTitle">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 编辑日期弹窗 -->
    <n-modal
      v-model:show="showEditDateModal"
      preset="card"
      title="修改日期"
      style="width: 400px"
    >
      <n-form-item label="日期">
        <n-date-picker
          v-model:value="editingDiaryDate"
          type="date"
          style="width: 100%"
        />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditDateModal = false">取消</n-button>
          <n-button type="primary" @click="saveEditDate">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h, reactive, watch } from 'vue';
import { useMessage, useDialog, NButton, NSpace, NTag, NDropdown } from 'naive-ui';
import { diaryAPI, aiAnalysisAPI } from '@/api';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { marked } from 'marked';
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import ShareSocialOutline from '@vicons/ionicons5/es/ShareSocialOutline'
import FolderOpenOutline from '@vicons/ionicons5/es/FolderOpenOutline'
import ArrowBackOutline from '@vicons/ionicons5/es/ArrowBackOutline'
import SaveOutline from '@vicons/ionicons5/es/SaveOutline'
import SendOutline from '@vicons/ionicons5/es/SendOutline'
import ExpandOutline from '@vicons/ionicons5/es/ExpandOutline'
import ContractOutline from '@vicons/ionicons5/es/ContractOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import SparklesOutline from '@vicons/ionicons5/es/SparklesOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import StopCircleOutline from '@vicons/ionicons5/es/StopCircleOutline'
import PrintOutline from '@vicons/ionicons5/es/PrintOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import TagSelector from '@/components/TagSelector.vue';
import DiaryTasksIndicator from '@/components/DiaryTasksIndicator.vue';
import DiaryAiSettingsPanel from '@/components/DiaryAiSettingsPanel.vue';
import SpeechPlayer from '@/components/SpeechPlayer.vue';
import DiaryGameStatsPanel from '@/components/diary/DiaryGameStatsPanel.vue';
import DiaryAchievementsTab from '@/components/diary/DiaryAchievementsTab.vue';
import DiaryScoreCard from '@/components/diary/DiaryScoreCard.vue';
import { useLoadingText } from '@/composables/useLoadingText';
import { useDiaryAnalysisTasks } from '@/composables/useDiaryAnalysisTasks';

// 日记分析加载提示
const diaryAnalysisTexts = [
  'GPU 正在预热...',
  'AI 正在起床...',
  '模型正在加载...',
  '正在查看日记...',
  '正在猜测错别字的意思...',
  '正在分析小朋友的心情...',
  '正在数字数...',
  '正在理解童言童语...',
  '正在思考如何夸奖...',
  '正在寻找闪光点...',
  '正在分析写作风格...',
  '正在回忆自己小时候...',
  '正在组织温暖的语言...',
  '正在计算情感指数...',
  '神经网络运算中...',
  '正在翻阅育儿手册...',
  '正在生成鼓励的话...'
];
const { loadingText, start: startLoading, stop: stopLoading } = useLoadingText(diaryAnalysisTexts, 2000);

const message = useMessage();
const dialog = useDialog();

// 后台任务管理
const { analyzeSingleDiary, analyzeBatchDiaries, cancelTask } = useDiaryAnalysisTasks();

// Tab 切换
const activeTab = ref('diaries');

// 游戏化统计面板 ref
const gameStatsPanelRef = ref(null);

const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const showDraftsModal = ref(false);
const showDetailModal = ref(false);  // 日记详情弹窗
const isFullscreen = ref(false);
const diaries = ref([]);
const editingDiary = ref(null);
const viewingDiary = ref(null);  // 当前查看的日记
const currentDraftId = ref(null); // 当前编辑的草稿ID
const drafts = ref([]);

// AI 分析相关
const showAnalysisModal = ref(false);
const showAiSettings = ref(false);
const analyzing = ref(false);
const batchAnalyzing = ref(null); // 'this_week' | 'last_week' | null

// 查重相关
const showDuplicateModal = ref(false);
const duplicateSnapshot = ref(null);

// 编辑标题/日期相关
const showEditTitleModal = ref(false);
const showEditDateModal = ref(false);
const editingTitle = ref('');
const editingDiaryDate = ref(null);
const currentDiaryForEdit = ref(null);

const analysisResult = ref({
  isBatch: false,
  diary: null,
  diaryId: null,
  analysis: '',
  period: '',
  diaryCount: 0,
  responseTime: 0,
  // 评分数据
  totalScore: null,
  grade: null,
  scoreDetails: null,
  highlights: [],
  improvements: [],
  encouragement: null,
  nextGoal: null,
  previousScore: null,
  previousGrade: null,
  // 人物画像
  authorProfile: null,
  charactersProfile: null,
  socialStyle: null,
  funSummary: null,
  // 周心理摘要
  psychologySummary: null
});

// 版本切换相关
const analysisVersions = ref([]);
const currentVersionId = ref(null);

// 版本选项
const versionOptions = computed(() => {
  return analysisVersions.value.map(v => ({
    label: `V${v.versionNumber} - ${v.grade || '-'} (${formatDateTime(v.createdAt)})`,
    value: v.id
  }));
});

// 版本切换处理
const handleVersionChange = async (versionId) => {
  try {
    const res = await aiAnalysisAPI.getDiaryAnalysisDetail(versionId);
    if (res.success) {
      updateAnalysisResultFromRecord(res.data);
    }
  } catch (error) {
    message.error('加载版本失败');
  }
};

// 从记录更新分析结果
const updateAnalysisResultFromRecord = (record) => {
  analysisResult.value = {
    isBatch: record.isBatch,
    diary: record.isBatch ? null : record.diarySnapshot,
    diaryId: record.diaryId,
    analysis: record.analysis,
    period: record.period || '',
    diaryCount: record.diaryCount,
    responseTime: record.responseTime,
    // 评分数据
    totalScore: record.totalScore,
    grade: record.grade,
    scoreDetails: record.scoreDetails,
    highlights: record.highlights || [],
    improvements: record.improvements || [],
    encouragement: null,
    nextGoal: record.nextGoal,
    previousScore: null,
    previousGrade: null,
    // 人物画像
    authorProfile: record.authorProfile,
    charactersProfile: record.charactersProfile,
    socialStyle: record.socialStyle,
    funSummary: record.funSummary,
    // 周心理摘要
    psychologySummary: record.psychologySummary
  };
};

// 加载日记的分析版本列表
const loadDiaryAnalysisVersions = async (diaryId) => {
  try {
    const res = await aiAnalysisAPI.getDiaryAnalysisVersions(diaryId);
    if (res.success) {
      analysisVersions.value = res.data;
    }
  } catch (error) {
    console.error('加载版本列表失败:', error);
    analysisVersions.value = [];
  }
};

// 渲染 AI 分析结果（markdown -> html，提取分析报告部分）
const renderedAnalysis = computed(() => {
  if (!analysisResult.value.analysis) return '';

  let content = analysisResult.value.analysis;

  // 移除 JSON 代码块（评分数据部分）
  // 匹配 ```json ... ``` 或 ## 📊 评分数据 之后的内容
  content = content.replace(/##\s*📊\s*评分数据[\s\S]*$/i, '');
  content = content.replace(/```json[\s\S]*?```/g, '');

  // 移除末尾的分隔线
  content = content.replace(/---\s*$/g, '');

  // 清理多余的空行
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  // 如果清理后没有内容，返回空
  if (!content.trim()) return '';

  return marked(content);
});

// 分析历史相关
const historyLoading = ref(false);
const analysisHistory = ref([]);
const historyFilter = ref({ type: '' });
const historyPagination = reactive({
  page: 1,
  pageSize: 10,
  pageCount: 1,
  total: 0
});

// 日记模版
const DIARY_TEMPLATE = `【清晨】

【起床】

【洗漱穿衣】

【早饭】

【上午】

【中午】

【午饭】

【午休】

【下午】

【傍晚】

【晚饭】

【天黑】

【晚上】

【回家】

【睡觉】
`;

const filters = ref({ dateRange: null, mood: null });

const pagination = reactive({
  page: 1,
  pageSize: 20,
  pageCount: 1,
  total: 0,
});

const form = ref({
  title: '',
  content: '',
  mood: 'happy',
  weather: 'sunny',
  tagIds: [],
  price: null,
  diaryDate: Date.now(),
  isPrivate: false
});

const moodOptions = [
  { label: '😊 开心', value: 'happy' },
  { label: '😐 平静', value: 'neutral' },
  { label: '😢 难过', value: 'sad' },
  { label: '😠 生气', value: 'angry' },
  { label: '😴 疲惫', value: 'tired' },
];

const weatherOptions = [
  { label: '☀️ 晴天', value: 'sunny' },
  { label: '☁️ 多云', value: 'cloudy' },
  { label: '🌧️ 雨天', value: 'rainy' },
  { label: '❄️ 雪天', value: 'snowy' },
];

const getMoodEmoji = (mood) => {
  const emojis = { happy: '😊', neutral: '😐', sad: '😢', angry: '😠', tired: '😴' };
  return emojis[mood] || '😊';
};

const formatDate = (date) => format(new Date(date), 'yyyy年M月d日 HH:mm');

// 表格列定义
const columns = [
  {
    title: '日期',
    key: 'createdAt',
    width: 180,
    render: (row) => format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
  },
  {
    title: '心情',
    key: 'mood',
    width: 80,
    align: 'center',
    render: (row) => getMoodEmoji(row.mood),
  },
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
  },
  {
    title: '天气',
    key: 'weather',
    width: 100,
  },
  {
    title: '字数',
    key: 'content',
    width: 100,
    render: (row) => getDiaryStats(row.content),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => {
      return h(
        'div',
        {
          onClick: (e) => e.stopPropagation(),
        },
        h(
          NDropdown,
          {
            trigger: 'click',
            options: [
              { label: '查看详情', key: 'view' },
              { label: 'AI 分析', key: 'analyze' },
              { label: '写作报告', key: 'duplicate' },
              { label: '编辑标题', key: 'editTitle' },
              { label: '修改日期', key: 'editDate' },
              { type: 'divider', key: 'd0' },
              { label: '分享', key: 'share' },
              { label: '复制', key: 'copy' },
            ],
            onSelect: (key) => handleAction(key, row),
          },
          () => h(NButton, { size: 'small', quaternary: true }, { default: () => '操作' })
        )
      );
    },
  },
];

// 字数统计
const contentStats = computed(() => {
  const content = form.value.content || '';

  // 统计不同类型字符
  const total = content.length;
  const spaces = (content.match(/\s/g) || []).length;
  const punctuation = (content.match(/[，。！？；：、""''《》【】（）,\.!?;:'"<>(){}\[\]]/g) || []).length;
  const chars = total - spaces - punctuation;

  // 计算等级（基于文字数量，不包括空格和标点）
  let level = 0;
  let nextTarget = 800;
  let levelText = `还需 ${800 - chars} 字达到入门等级`;
  let levelColor = '#18a058';

  if (chars >= 2000) {
    level = 5;
    levelText = `已达大师等级！超出 ${chars - 2000} 字`;
    levelColor = '#d03050';
  } else if (chars >= 1500) {
    level = 4;
    nextTarget = 2000;
    levelText = `卓越等级，还需 ${2000 - chars} 字达到大师`;
    levelColor = '#f0a020';
  } else if (chars >= 1200) {
    level = 3;
    nextTarget = 1500;
    levelText = `优秀等级，还需 ${1500 - chars} 字达到卓越`;
    levelColor = '#2080f0';
  } else if (chars >= 1000) {
    level = 2;
    nextTarget = 1200;
    levelText = `良好等级，还需 ${1200 - chars} 字达到优秀`;
    levelColor = '#18a058';
  } else if (chars >= 800) {
    level = 1;
    nextTarget = 1000;
    levelText = `入门等级，还需 ${1000 - chars} 字达到良好`;
    levelColor = '#18a058';
  }

  // 计算进度百分比
  let progress = 0;
  if (level === 5) {
    progress = 100;
  } else {
    const ranges = [
      { min: 0, max: 800 },
      { min: 800, max: 1000 },
      { min: 1000, max: 1200 },
      { min: 1200, max: 1500 },
      { min: 1500, max: 2000 },
    ];
    const range = ranges[level];
    const rangeProgress = ((chars - range.min) / (range.max - range.min)) * 100;
    progress = (level * 20) + (rangeProgress * 0.2);
  }

  return {
    total,
    chars,
    punctuation,
    spaces,
    level,
    progress: Math.min(progress, 100),
    levelText,
    levelColor,
  };
});

// 复制统计数据
const copyStatistics = async () => {
  const stats = contentStats.value;
  const text = `字数统计
总字符：${stats.total}
文字：${stats.chars}
标点：${stats.punctuation}
空格：${stats.spaces}
等级：${stats.levelText}`;

  try {
    await navigator.clipboard.writeText(text);
    message.success('统计数据已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

// 获取日记统计信息
const getDiaryStats = (content) => {
  if (!content) return '0字';
  const chars = content.length - (content.match(/\s/g) || []).length - (content.match(/[，。！？；：、""''《》【】（）,\.!?;:'"<>(){}\[\]]/g) || []).length;
  return `${chars}字`;
};

// 获取详细字数统计
const getDetailStats = (content) => {
  if (!content) return { total: 0, chars: 0, punctuation: 0, spaces: 0 };
  const total = content.length;
  const spaces = (content.match(/\s/g) || []).length;
  const punctuation = (content.match(/[，。！？；：、""''《》【】（）,\.!?;:'"<>(){}\[\]]/g) || []).length;
  const chars = total - spaces - punctuation;
  return { total, chars, punctuation, spaces };
};

// 获取字数等级类型（用于标签颜色）
const getWordLevelType = (content) => {
  const { chars } = getDetailStats(content);
  if (chars >= 2000) return 'error';      // 大师
  if (chars >= 1500) return 'warning';    // 卓越
  if (chars >= 1200) return 'info';       // 优秀
  if (chars >= 1000) return 'success';    // 良好
  if (chars >= 800) return 'success';     // 入门
  return 'default';
};

// 复制日记内容
const copyDiaryContent = async (diary) => {
  const text = `${diary.title}

${diary.content}

${formatDate(diary.createdAt)} · ${getMoodEmoji(diary.mood)} ${diary.weather}`;

  try {
    await navigator.clipboard.writeText(text);
    message.success('日记内容已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

// 分享日记（复制链接，自动设为公开）
const shareDiary = async (diary) => {
  try {
    // 如果日记不是公开的，先设为公开
    if (!diary.isPublic) {
      await diaryAPI.updateDiary(diary.id, { isPublic: true });
      diary.isPublic = true;
    }
    const url = `${window.location.origin}/diary/${diary.id}`;
    await navigator.clipboard.writeText(url);
    message.success('分享链接已复制');
  } catch (error) {
    message.error('分享失败');
  }
};

const loadDiaries = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    };
    if (filters.value.mood) params.mood = filters.value.mood;
    const data = await diaryAPI.getDiaries(params);
    diaries.value = data.diaries || data;
    if (data.pagination) {
      pagination.total = data.pagination.total;
      pagination.pageCount = Math.ceil(data.pagination.total / pagination.pageSize);
    }
  } catch (error) {
    message.error('加载日记失败');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadDiaries();
};

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  loadDiaries();
};

const openCreateModal = () => {
  editingDiary.value = null;
  currentDraftId.value = null;
  form.value = {
    title: '',
    content: '',
    mood: 'happy',
    weather: 'sunny',
    tagIds: [],
    price: null,
    diaryDate: Date.now(),
    isPrivate: false
  };
  isFullscreen.value = false;
  showModal.value = true;
};

const handleEdit = (diary) => {
  editingDiary.value = diary;
  currentDraftId.value = null;
  form.value = {
    title: diary.title || '',
    content: diary.content,
    mood: diary.mood,
    weather: diary.weather,
    tagIds: diary.tags?.map(t => t.tag.id) || [],
    diaryDate: new Date(diary.createdAt).getTime(),
    isPrivate: !diary.isPublic
  };
  isFullscreen.value = false;
  showModal.value = true;
};

const handleDelete = (diary) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这篇日记吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await diaryAPI.deleteDiary(diary.id);
        message.success('删除成功');
        loadDiaries();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning('请输入日记标题');
    return;
  }
  if (!form.value.content.trim()) {
    message.warning('请输入日记内容');
    return;
  }
  submitting.value = true;
  try {
    if (editingDiary.value) {
      const updateData = {
        ...form.value,
        isPublic: !form.value.isPrivate
      };
      delete updateData.isPrivate;
      await diaryAPI.updateDiary(editingDiary.value.id, updateData);
      message.success('保存成功');
    } else {
      // 转换时间戳为Date对象，创建时传递给后端
      const submitData = {
        ...form.value,
        diaryDate: form.value.diaryDate ? new Date(form.value.diaryDate) : new Date(),
        isPublic: !form.value.isPrivate
      };
      delete submitData.isPrivate;
      await diaryAPI.createDiary(submitData);
      message.success('发布成功');
    }
    // 提交成功后删除对应草稿
    if (currentDraftId.value) {
      deleteDraft(currentDraftId.value);
      currentDraftId.value = null;
    }
    showModal.value = false;
    isFullscreen.value = false;
    loadDiaries();
    // 刷新游戏化统计面板
    gameStatsPanelRef.value?.refresh();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    submitting.value = false;
  }
};

// 切换全屏
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 草稿箱存储key
const DRAFTS_KEY = 'diary_drafts';

// 加载草稿列表
const loadDrafts = () => {
  try {
    const saved = localStorage.getItem(DRAFTS_KEY);
    drafts.value = saved ? JSON.parse(saved) : [];
  } catch {
    drafts.value = [];
  }
};

// 保存草稿列表到本地
const saveDraftsToStorage = () => {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.value));
};

// 格式化草稿日期
const formatDraftDate = (timestamp) => {
  return format(new Date(timestamp), 'MM-dd HH:mm');
};

// 手动暂存
const handleSaveDraft = () => {
  if (!form.value.title.trim() && !form.value.content.trim()) {
    message.warning('请输入内容后再暂存');
    return;
  }
  saveDraft();
  message.success('已暂存到草稿箱');
};

// 保存草稿
const saveDraft = () => {
  const draft = {
    id: currentDraftId.value || Date.now().toString(),
    ...form.value,
    savedAt: Date.now()
  };

  // 如果是编辑已有草稿，则更新
  const existingIndex = drafts.value.findIndex(d => d.id === draft.id);
  if (existingIndex >= 0) {
    drafts.value[existingIndex] = draft;
  } else {
    drafts.value.unshift(draft);
  }

  currentDraftId.value = draft.id;
  saveDraftsToStorage();
};

// 返回按钮：自动保存草稿并关闭
const handleBack = () => {
  // 如果有内容则自动保存草稿
  if (form.value.title.trim() || form.value.content.trim()) {
    saveDraft();
    message.info('已自动保存到草稿箱');
  }
  showModal.value = false;
  isFullscreen.value = false;
  currentDraftId.value = null;
};

// 打开草稿继续编辑
const openDraft = (draft) => {
  editingDiary.value = null;
  currentDraftId.value = draft.id;
  form.value = {
    title: draft.title || '',
    content: draft.content || '',
    mood: draft.mood || 'happy',
    weather: draft.weather || 'sunny',
    tagIds: draft.tagIds || [],
    price: draft.price || null,
    diaryDate: draft.diaryDate || Date.now(),
    isPrivate: draft.isPrivate || false
  };
  showDraftsModal.value = false;
  showModal.value = true;
};

// 删除草稿
const deleteDraft = (id) => {
  drafts.value = drafts.value.filter(d => d.id !== id);
  saveDraftsToStorage();
};

// 应用模版
const handleApplyTemplate = () => {
  if (form.value.content.trim()) {
    dialog.warning({
      title: '使用参考模版',
      content: '将会删除当前日记内容，替换成模版内容，确定吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        form.value.content = DIARY_TEMPLATE;
        message.success('已应用时间线模版');
      }
    });
  } else {
    form.value.content = DIARY_TEMPLATE;
    message.success('已应用时间线模版');
  }
};

// 操作菜单处理
const handleAction = (key, row) => {
  switch (key) {
    case 'view':
      viewDiary(row);
      break;
    case 'analyze':
      analyzeDiary(row);
      break;
    case 'duplicate':
      checkDuplicate(row);
      break;
    case 'editTitle':
      openEditTitleModal(row);
      break;
    case 'editDate':
      openEditDateModal(row);
      break;
    case 'share':
      shareDiary(row);
      break;
    case 'copy':
      copyDiaryContent(row);
      break;
    case 'edit':
      handleEdit(row);
      break;
    case 'delete':
      handleDelete(row);
      break;
  }
};

// 查看日记详情
const viewDiary = (diary) => {
  viewingDiary.value = diary;
  showDetailModal.value = true;
};

// 查看查重快照
const checkDuplicate = (diary) => {
  if (!diary.wordStats && !diary.duplicateStats) {
    message.info('该日记提交时未保存统计数据');
    return;
  }
  duplicateSnapshot.value = {
    diaryTitle: diary.title,
    diaryDate: formatDate(diary.createdAt),
    wordStats: diary.wordStats || null,
    duplicateStats: diary.duplicateStats || null,
  };
  showDuplicateModal.value = true;
};

// 编辑标题
const openEditTitleModal = (diary) => {
  editingTitle.value = diary.title || '';
  currentDiaryForEdit.value = diary;
  showEditTitleModal.value = true;
};

const saveEditTitle = async () => {
  if (!editingTitle.value.trim()) {
    message.warning('标题不能为空');
    return;
  }
  try {
    await diaryAPI.updateDiary(currentDiaryForEdit.value.id, { title: editingTitle.value.trim() });
    message.success('标题已更新');
    showEditTitleModal.value = false;
    loadDiaries();
  } catch (error) {
    message.error(error.error || '更新失败');
  }
};

// 编辑日期
const openEditDateModal = (diary) => {
  editingDiaryDate.value = new Date(diary.createdAt).getTime();
  currentDiaryForEdit.value = diary;
  showEditDateModal.value = true;
};

const saveEditDate = async () => {
  if (!editingDiaryDate.value) {
    message.warning('请选择日期');
    return;
  }
  try {
    await diaryAPI.updateDiary(currentDiaryForEdit.value.id, { diaryDate: new Date(editingDiaryDate.value) });
    message.success('日期已更新');
    showEditDateModal.value = false;
    loadDiaries();
  } catch (error) {
    message.error(error.error || '更新失败');
  }
};

// 获取重复率等级样式
const getDuplicateRateClass = (rate) => {
  if (rate <= 10) return 'rate-low';
  if (rate <= 30) return 'rate-medium';
  return 'rate-high';
};

// 格式化查重日期
const formatDuplicateDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return format(date, 'M月d日');
};

// 从详情页编辑
const editFromDetail = () => {
  showDetailModal.value = false;
  handleEdit(viewingDiary.value);
};

// 从详情页分析
const analyzeFromDetail = () => {
  showDetailModal.value = false;
  analyzeDiary(viewingDiary.value);
};

// 从详情页查看查重快照
const checkDuplicateFromDetail = () => {
  showDetailModal.value = false;
  checkDuplicate(viewingDiary.value);
};

// 当前分析的任务 ID
const currentAnalysisTaskId = ref(null);
const currentAnalysisDiary = ref(null);

// 单条日记 AI 分析
const analyzeDiary = async (diary) => {
  // 检查是否有最近的分析记录（24小时内）
  try {
    const versionsRes = await aiAnalysisAPI.getDiaryAnalysisVersions(diary.id);
    if (versionsRes.success && versionsRes.data.length > 0) {
      const lastAnalysis = versionsRes.data[0];
      const hoursSinceLastAnalysis = (Date.now() - new Date(lastAnalysis.createdAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastAnalysis < 24) {
        // 最近分析过，询问用户
        dialog.info({
          title: '已有分析记录',
          content: `这篇日记在 ${Math.round(hoursSinceLastAnalysis)} 小时前已分析过，得分 ${lastAnalysis.grade || '-'} (${lastAnalysis.totalScore || '-'}分)。`,
          positiveText: '查看上次结果',
          negativeText: '重新分析',
          onPositiveClick: async () => {
            // 查看上次结果
            const detailRes = await aiAnalysisAPI.getDiaryAnalysisDetail(lastAnalysis.id);
            if (detailRes.success) {
              updateAnalysisResultFromRecord(detailRes.data);
              analysisVersions.value = versionsRes.data;
              currentVersionId.value = lastAnalysis.id;
              showAnalysisModal.value = true;
            }
          },
          onNegativeClick: () => {
            // 重新分析，显示确认弹窗
            showAnalysisConfirmDialog(diary);
          }
        });
        return;
      }
    }
  } catch (e) {
    // 忽略错误，继续正常流程
  }

  // 没有最近分析记录，显示确认弹窗
  showAnalysisConfirmDialog(diary);
};

// 显示分析确认弹窗
const showAnalysisConfirmDialog = (diary) => {
  dialog.warning({
    title: '开始 AI 分析',
    content: '分析预计需要 2 分钟左右，期间请勿离开页面。是否继续？',
    positiveText: '继续分析',
    negativeText: '取消',
    onPositiveClick: () => {
      startAnalyzeDiary(diary);
    }
  });
};

// 执行单条日记分析
const startAnalyzeDiary = (diary) => {
  // 先显示分析弹窗
  currentAnalysisDiary.value = diary;
  analysisResult.value = {
    isBatch: false,
    diary: diary,
    diaryId: diary.id,
    analysis: '',
    period: '',
    diaryCount: 1,
    responseTime: 0
  };
  analyzing.value = true;
  showAnalysisModal.value = true;
  startLoading();

  // 启动后台任务（立即返回 taskId）
  const taskId = analyzeSingleDiary(diary, async (tid, task) => {
    // 任务完成回调
    if (task.status === 'completed') {
      // 如果弹窗还开着，显示结果
      if (showAnalysisModal.value && currentAnalysisTaskId.value === tid) {
        analysisResult.value = { ...task.result, diaryId: diary.id };
        analyzing.value = false;
        stopLoading();
        // 加载版本列表
        await loadDiaryAnalysisVersions(diary.id);
      }
      // 刷新历史记录
      if (activeTab.value === 'history') {
        loadAnalysisHistory();
      }
    } else if (task.status === 'timeout') {
      // 超时/网络问题：后台可能仍在运行，不关闭弹窗
      if (showAnalysisModal.value && currentAnalysisTaskId.value === tid) {
        message.warning(task.error || '等待超时，后台可能仍在分析中');
        analyzing.value = false;
        stopLoading();
        // 不关闭弹窗，让用户可以稍后刷新查看结果
      }
    } else if (task.status === 'failed') {
      if (showAnalysisModal.value && currentAnalysisTaskId.value === tid) {
        message.error(task.error || '分析失败');
        analyzing.value = false;
        showAnalysisModal.value = false;
        stopLoading();
      }
    }
  });
  currentAnalysisTaskId.value = taskId;
};

// 返回（让任务继续后台运行）
const handleAnalysisBack = () => {
  showAnalysisModal.value = false;
  analyzing.value = false;
  stopLoading();
  if (currentAnalysisTaskId.value) {
    message.info('分析任务已转入后台，可在右上角查看进度');
  }
  currentAnalysisTaskId.value = null;
  currentAnalysisDiary.value = null;
};

// 停止分析
const handleAnalysisStop = () => {
  if (currentAnalysisTaskId.value) {
    cancelTask(currentAnalysisTaskId.value);
    message.info('已停止分析');
  }
  showAnalysisModal.value = false;
  analyzing.value = false;
  stopLoading();
  currentAnalysisTaskId.value = null;
  currentAnalysisDiary.value = null;
};

// 批量日记 AI 分析（本周/上周）
const analyzeBatch = async (period) => {
  // 先显示确认弹窗
  dialog.warning({
    title: period === 'this_week' ? '分析本周日记' : '分析上周日记',
    content: '批量分析预计需要 2-3 分钟，期间请勿离开页面。是否继续？',
    positiveText: '继续分析',
    negativeText: '取消',
    onPositiveClick: () => {
      startAnalyzeBatch(period);
    }
  });
};

// 执行批量日记分析
const startAnalyzeBatch = async (period) => {
  const now = new Date();
  let start, end;

  if (period === 'this_week') {
    start = startOfWeek(now, { weekStartsOn: 1 }); // 周一开始
    end = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    const lastWeek = subWeeks(now, 1);
    start = startOfWeek(lastWeek, { weekStartsOn: 1 });
    end = endOfWeek(lastWeek, { weekStartsOn: 1 });
  }

  try {
    // 先获取该时间范围的日记
    const res = await diaryAPI.getDiaries({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 7
    });

    const targetDiaries = res.diaries || res || [];

    if (targetDiaries.length === 0) {
      message.warning(period === 'this_week' ? '本周还没有日记' : '上周没有日记');
      return;
    }

    const periodText = period === 'this_week' ? '本周' : '上周';

    // 显示分析弹窗
    analysisResult.value = {
      isBatch: true,
      diary: null,
      analysis: '',
      period: periodText,
      diaryCount: targetDiaries.length,
      responseTime: 0
    };
    analyzing.value = true;
    showAnalysisModal.value = true;
    startLoading();

    // 启动后台任务
    const taskId = analyzeBatchDiaries(targetDiaries, period, periodText, (tid, task) => {
      if (task.status === 'completed') {
        if (showAnalysisModal.value && currentAnalysisTaskId.value === tid) {
          analysisResult.value = task.result;
          analyzing.value = false;
          stopLoading();
        }
        if (activeTab.value === 'history') {
          loadAnalysisHistory();
        }
      } else if (task.status === 'timeout') {
        // 超时/网络问题：后台可能仍在运行，不关闭弹窗
        if (showAnalysisModal.value && currentAnalysisTaskId.value === tid) {
          message.warning(task.error || '等待超时，后台可能仍在分析中');
          analyzing.value = false;
          stopLoading();
          // 不关闭弹窗，让用户可以稍后刷新查看结果
        }
      } else if (task.status === 'failed') {
        if (showAnalysisModal.value && currentAnalysisTaskId.value === tid) {
          message.error(task.error || '分析失败');
          analyzing.value = false;
          showAnalysisModal.value = false;
          stopLoading();
        }
      }
    });
    currentAnalysisTaskId.value = taskId;
  } catch (error) {
    message.error(error.error || '获取日记失败');
  }
};

// 查看任务结果
const handleViewTaskResult = async (result) => {
  analysisResult.value = result;
  analyzing.value = false;

  // 如果是单条分析且有 diaryId，加载版本列表
  if (!result.isBatch && result.diary?.id) {
    analysisResult.value.diaryId = result.diary.id;
    await loadDiaryAnalysisVersions(result.diary.id);
  } else {
    analysisVersions.value = [];
  }

  showAnalysisModal.value = true;
};

// ========== 分析历史相关方法 ==========

// 加载分析历史
const loadAnalysisHistory = async () => {
  historyLoading.value = true;
  try {
    const params = {
      page: historyPagination.page,
      limit: historyPagination.pageSize,
      aggregateByDiary: 'true'  // 默认按日记聚合
    };
    if (historyFilter.value.type === 'single') {
      params.isBatch = 'false';
    } else if (historyFilter.value.type === 'batch') {
      params.isBatch = 'true';
      params.aggregateByDiary = 'false';  // 批量分析不聚合
    }

    const res = await aiAnalysisAPI.getDiaryAnalysisHistory(params);
    if (res.success) {
      analysisHistory.value = res.data.records;
      historyPagination.total = res.data.pagination.total;
      historyPagination.pageCount = res.data.pagination.totalPages;
    }
  } catch (error) {
    message.error('加载历史记录失败');
  } finally {
    historyLoading.value = false;
  }
};

// 分页切换
const handleHistoryPageChange = (page) => {
  historyPagination.page = page;
  loadAnalysisHistory();
};

// 分页大小切换
const handleHistoryPageSizeChange = (pageSize) => {
  historyPagination.pageSize = pageSize;
  historyPagination.page = 1;
  loadAnalysisHistory();
};

// 格式化日期时间
const formatDateTime = (date) => format(new Date(date), 'MM-dd HH:mm');

// 获取评分等级样式类
const getGradeClass = (grade) => {
  if (!grade) return '';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'grade-a';
  if (g.startsWith('B')) return 'grade-b';
  if (g.startsWith('C')) return 'grade-c';
  return 'grade-d';
};

// 获取快照标题
const getSnapshotTitle = (snapshot) => {
  if (!snapshot) return '无标题';
  if (Array.isArray(snapshot)) {
    // 批量分析
    return snapshot.map(d => d.title || '无标题').join('、');
  }
  // 单条分析
  return snapshot.title || '无标题';
};

// 查看历史详情
const viewHistoryDetail = async (record) => {
  updateAnalysisResultFromRecord(record);
  currentVersionId.value = record.id;

  // 加载版本列表（仅单条分析）
  if (!record.isBatch && record.diaryId) {
    await loadDiaryAnalysisVersions(record.diaryId);
  } else {
    analysisVersions.value = [];
  }

  showAnalysisModal.value = true;
};

// 删除历史记录
const deleteHistory = async (record) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条分析记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await aiAnalysisAPI.deleteDiaryAnalysis(record.id);
        message.success('删除成功');
        loadAnalysisHistory();
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
};

// 分享分析结果
const shareAnalysis = async (record) => {
  const url = `${window.location.origin}/diary-analysis/${record.id}/public`;
  try {
    await navigator.clipboard.writeText(url);
    message.success('分享链接已复制');
  } catch (error) {
    message.error('复制失败');
  }
};

// 重新分析（从历史记录）
const reAnalyze = (record) => {
  if (record.isBatch) {
    message.info('批量分析暂不支持重新分析');
    return;
  }
  // 构造日记对象用于重新分析
  const diary = record.diarySnapshot;
  if (diary && record.diaryId) {
    diary.id = record.diaryId;
    showAnalysisConfirmDialog(diary);
  } else {
    message.warning('日记数据不完整，无法重新分析');
  }
};

// 保存分析记录到后端
const saveAnalysisRecord = async (data) => {
  try {
    await aiAnalysisAPI.saveDiaryAnalysis(data);
  } catch (error) {
    console.error('保存分析记录失败:', error);
  }
};

// 获取分析弹窗标题
const getAnalysisModalTitle = () => {
  if (analysisResult.value.isBatch) {
    return `${analysisResult.value.period}日记分析 (${analysisResult.value.diaryCount}篇)`;
  }
  return 'AI 日记分析';
};

// 打印分析结果
const handlePrintAnalysis = () => {
  // 创建打印内容
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    message.error('无法打开打印窗口，请检查浏览器设置');
    return;
  }

  const title = getAnalysisModalTitle();
  const result = analysisResult.value;

  // 构建打印内容
  const dimensionLabels = {
    content: '内容丰富度',
    language: '语言表达',
    structure: '结构条理',
    emotion: '情感真实度',
    creativity: '创意想象力'
  };

  let scoreSection = '';
  if (result.totalScore !== undefined && result.totalScore !== null) {
    let detailsHtml = '';
    if (result.scoreDetails) {
      const items = Object.entries(result.scoreDetails).map(([key, val]) => {
        const label = dimensionLabels[key] || key;
        const score = typeof val === 'object' ? (val.score ?? '-') : val;
        const max = typeof val === 'object' ? (val.max || 20) : 20;
        return `<span class="score-item">${label}: ${score}/${max}</span>`;
      });
      detailsHtml = `<div class="score-details">${items.join('')}</div>`;
    }
    scoreSection = `
      <div class="score-section">
        <div class="score-main">
          <span class="grade">${result.grade || '-'}</span>
          <span class="score">${result.totalScore}分</span>
        </div>
        ${detailsHtml}
      </div>
    `;
  }

  // 原日记内容（单条分析）
  let diarySection = '';
  if (!result.isBatch && result.diary) {
    const diary = result.diary;
    diarySection = `
      <div class="diary-section">
        <h3>原日记内容</h3>
        <div class="diary-meta">
          <span>${getMoodEmoji(diary.mood)} ${diary.weather || ''}</span>
          <span>${diary.createdAt ? formatDate(diary.createdAt) : ''}</span>
        </div>
        <h4>${diary.title || '无标题'}</h4>
        <div class="diary-content">${diary.content || ''}</div>
      </div>
    `;
  }

  // AI 分析内容
  const analysisContent = renderedAnalysis.value || '';

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 12mm 20mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
          max-height: 257mm; /* A4 高度减去页边距 */
          overflow: hidden;
          position: relative;
        }
        .print-container {
          max-height: 257mm;
          overflow: hidden;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 2px solid #3b82f6;
          margin-bottom: 15px;
        }
        .header h1 {
          font-size: 16pt;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .header .date {
          font-size: 10pt;
          color: #6b7280;
        }
        .score-section {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
          text-align: center;
        }
        .score-main {
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 10px;
        }
        .score-main .grade {
          font-size: 24pt;
          font-weight: bold;
          color: #0369a1;
        }
        .score-main .score {
          font-size: 14pt;
          color: #0284c7;
        }
        .score-details {
          margin-top: 8px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .score-item {
          font-size: 9pt;
          color: #475569;
        }
        .diary-section {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
        }
        .diary-section h3 {
          font-size: 11pt;
          color: #92400e;
          margin-bottom: 8px;
        }
        .diary-meta {
          font-size: 9pt;
          color: #78716c;
          margin-bottom: 5px;
          display: flex;
          gap: 15px;
        }
        .diary-section h4 {
          font-size: 11pt;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .diary-content {
          font-size: 10pt;
          color: #374151;
          white-space: pre-wrap;
          max-height: 80px;
          overflow: hidden;
        }
        .analysis-section h2 {
          font-size: 12pt;
          color: #1f2937;
          margin: 12px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e7eb;
        }
        .analysis-section h3 {
          font-size: 11pt;
          color: #374151;
          margin: 10px 0 6px 0;
        }
        .analysis-section p {
          margin-bottom: 8px;
          text-align: justify;
        }
        .analysis-section ul, .analysis-section ol {
          padding-left: 20px;
          margin-bottom: 8px;
        }
        .analysis-section li {
          margin-bottom: 4px;
        }
        .analysis-section strong {
          color: #1f2937;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 9pt;
          color: #9ca3af;
          padding: 8px 12mm;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .footer-tip {
          color: #f59e0b;
          font-weight: 500;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
          <h1>${title}</h1>
          <div class="date">打印时间：${format(new Date(), 'yyyy年M月d日 HH:mm')}</div>
        </div>
        ${scoreSection}
        ${diarySection}
        <div class="analysis-section">
          ${analysisContent}
        </div>
      </div>
      <div class="footer">
        <span class="footer-tip">如内容显示不完整，请登录系统查看完整分析报告</span>
        <br>
        <span>儿童成长记录系统 · AI 日记分析</span>
      </div>
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
};

onMounted(() => {
  loadDiaries();
  loadDrafts();
});

// 监听 Tab 切换，自动加载数据
watch(activeTab, (newTab) => {
  if (newTab === 'history') {
    loadAnalysisHistory();
  }
});
</script>

<style scoped>
/* AI 分析内容样式 */
.analysis-content {
  line-height: 1.9;
  font-size: 15px;
  color: #374151;
}

.analysis-content :deep(h1),
.analysis-content :deep(h2),
.analysis-content :deep(h3),
.analysis-content :deep(h4) {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5em;
}

.analysis-content :deep(h2) {
  font-size: 1.3em;
}

.analysis-content :deep(h3) {
  font-size: 1.15em;
}

.analysis-content :deep(p) {
  margin-bottom: 1em;
  text-align: justify;
}

.analysis-content :deep(ul),
.analysis-content :deep(ol) {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

.analysis-content :deep(li) {
  margin-bottom: 0.5em;
}

.analysis-content :deep(strong) {
  color: #1f2937;
  font-weight: 600;
}

.analysis-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.8em 1em;
  border-left: 4px solid #6366f1;
  background-color: #f8fafc;
  color: #4b5563;
  font-style: italic;
}

.analysis-content :deep(code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.analysis-content :deep(hr) {
  margin: 1.5em 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

/* 评分徽章样式 */
.score-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.score-badge .score-value {
  font-size: 11px;
  opacity: 0.8;
}

.score-badge.grade-a {
  background: #dcfce7;
  color: #166534;
}

.score-badge.grade-b {
  background: #dbeafe;
  color: #1e40af;
}

.score-badge.grade-c {
  background: #fef3c7;
  color: #92400e;
}

.score-badge.grade-d {
  background: #fee2e2;
  color: #991b1b;
}

/* AI 分析记录 Grid 布局 */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.analysis-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  min-height: 100px;
}

.analysis-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.analysis-card .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.analysis-card .grade-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
}

.analysis-card .grade-badge .grade-score {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.8;
}

.analysis-card .grade-badge.grade-a {
  background: #dcfce7;
  color: #166534;
}

.analysis-card .grade-badge.grade-b {
  background: #dbeafe;
  color: #1e40af;
}

.analysis-card .grade-badge.grade-c {
  background: #fef3c7;
  color: #92400e;
}

.analysis-card .grade-badge.grade-d {
  background: #fee2e2;
  color: #991b1b;
}

.analysis-card .card-title {
  flex: 1;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.analysis-card .card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
}

.analysis-card .card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.analysis-card:hover .card-actions {
  opacity: 1;
}

/* 周心理摘要卡片 */
.psychology-summary-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
  border: 1px solid #a7f3d0;
  border-radius: 16px;
  padding: 20px;
}

.psychology-summary-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #d1fae5;
}

.psychology-summary-card .card-icon {
  font-size: 24px;
}

.psychology-summary-card .card-title {
  font-size: 16px;
  font-weight: 600;
  color: #065f46;
  flex: 1;
}

.psychology-summary-card .summary-section {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
}

.psychology-summary-card .section-label {
  font-size: 13px;
  font-weight: 600;
  color: #047857;
  margin-bottom: 8px;
}

.psychology-summary-card .emotion-status {
  display: flex;
  gap: 24px;
  margin-bottom: 8px;
}

.psychology-summary-card .status-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.psychology-summary-card .status-label {
  font-size: 11px;
  color: #6b7280;
}

.psychology-summary-card .status-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.psychology-summary-card .triggers {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.psychology-summary-card .triggers-label {
  font-size: 12px;
  color: #6b7280;
}

.psychology-summary-card .needs-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.psychology-summary-card .need-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.psychology-summary-card .need-type {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.psychology-summary-card .need-type.satisfied {
  color: #059669;
}

.psychology-summary-card .need-type.attention {
  color: #d97706;
}

.psychology-summary-card .need-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.psychology-summary-card .growth-tags {
  display: flex;
  flex-wrap: wrap;
}

.psychology-summary-card .summary-section.guidance {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fcd34d;
}

.psychology-summary-card .guidance-list {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: #92400e;
  line-height: 1.8;
}

.psychology-summary-card .guidance-list li {
  margin-bottom: 4px;
}

.psychology-summary-card .week-summary {
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  font-style: italic;
  text-align: center;
  border-left: 3px solid #10b981;
}

/* 查重结果样式 */
/* 写作质量报告样式 */
.snapshot-report {
  padding: 4px 0;
}

.report-header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.report-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.report-date {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 4px;
}

.stats-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.stats-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}

.stat-item {
  background: #fff;
  border-radius: 8px;
  padding: 10px 4px;
}

.stat-item.stat-primary .stat-value {
  color: #2563eb;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #374151;
}

.stat-label {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.rate-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.rate-block {
  text-align: center;
  background: #fff;
  border-radius: 10px;
  padding: 14px 8px;
}

.rate-value {
  font-size: 32px;
  font-weight: 700;
}

.rate-desc {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.rate-block.rate-low .rate-value {
  color: #10b981;
}

.rate-block.rate-medium .rate-value {
  color: #f59e0b;
}

.rate-block.rate-high .rate-value {
  color: #ef4444;
}

.rate-detail-row {
  display: flex;
  justify-content: space-around;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 12px;
}

.duplicate-list {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
}

.duplicate-list-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.duplicate-item {
  padding: 10px;
  background: #fef2f2;
  border-radius: 8px;
  margin-bottom: 6px;
  border-left: 3px solid #ef4444;
}

.duplicate-item:last-child {
  margin-bottom: 0;
}

.duplicate-text {
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
  word-break: break-all;
}

.duplicate-source {
  font-size: 12px;
  color: #9ca3af;
}

.self-repeat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #fffbeb;
  border-radius: 6px;
  margin-bottom: 4px;
  border-left: 3px solid #f59e0b;
}

.self-repeat-item:last-child {
  margin-bottom: 0;
}

.repeat-text {
  font-size: 13px;
  color: #374151;
}

.repeat-count {
  font-size: 12px;
  color: #d97706;
  white-space: nowrap;
  margin-left: 8px;
}

.duplicate-empty {
  text-align: center;
  padding: 20px;
  background: #f0fdf4;
  border-radius: 10px;
  color: #10b981;
  font-size: 14px;
}

.no-data-card {
  text-align: center;
  padding: 32px 16px;
}

.no-data-text {
  color: #9ca3af;
  font-size: 14px;
}
</style>
