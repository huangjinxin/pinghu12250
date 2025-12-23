<template>
  <div class="textbook-workspace">
    <!-- 顶部导航 -->
    <div class="workspace-header">
      <div class="header-left">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
        </n-button>
        <h1>教材录入工作台</h1>
      </div>
      <div class="header-right">
        <n-button @click="showAiDrawer = true">
          <template #icon>
            <n-icon><SettingsOutline /></n-icon>
          </template>
          AI 设置
        </n-button>
        <n-dropdown trigger="click" :options="uploadMenuOptions" @select="handleUploadMenuSelect">
          <n-button class="upload-header-btn">
            <template #icon>
              <n-icon><CloudUploadOutline /></n-icon>
            </template>
            上传教材
            <n-icon style="margin-left: 4px;"><ChevronDown /></n-icon>
          </n-button>
        </n-dropdown>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          创建新教材
        </n-button>
      </div>
    </div>

    <!-- 教材列表 -->
    <div class="textbook-list" v-if="!selectedTextbook">
      <!-- 筛选搜索栏 -->
      <div class="filter-bar">
        <div class="filter-left">
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜索教材名称..."
            clearable
            style="width: 200px;"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
          <n-select
            v-model:value="filterSubject"
            :options="[{ label: '全部科目', value: '' }, ...subjectOptions]"
            style="width: 120px;"
            clearable
            placeholder="科目"
          />
          <n-select
            v-model:value="filterGrade"
            :options="[{ label: '全部年级', value: null }, ...gradeOptions]"
            style="width: 120px;"
            clearable
            placeholder="年级"
          />
          <n-checkbox v-model:checked="showHidden" style="margin-left: 12px;">
            显示已隐藏
          </n-checkbox>
          <n-select
            v-model:value="sortOrder"
            :options="sortOptions"
            style="width: 140px; margin-left: 12px;"
            placeholder="排序"
          />
        </div>
        <div class="filter-right">
          <span class="total-count">共 {{ filteredTextbooks.length }} 本教材</span>
        </div>
      </div>

      <n-spin :show="loading">
        <n-empty v-if="!loading && filteredTextbooks.length === 0" description="暂无符合条件的教材" />

        <div class="textbook-grid" v-else>
          <div
            v-for="textbook in paginatedTextbooks"
            :key="textbook.id"
            class="book-slot"
            :class="{ 'is-hidden': textbook.isHidden }"
            @click="openReader(textbook)"
          >
            <!-- 书本主体（背景层） -->
            <div class="book-body">
              <img
                v-if="coverImages[textbook.id]"
                :src="coverImages[textbook.id]"
                class="cover-image"
                alt="封面"
              />
              <div v-else class="cover-placeholder" :class="textbook.subject.toLowerCase()">
                <div class="subject-badge">
                  {{ subjectMap[textbook.subject] }}
                </div>
                <span class="loading-text">{{ textbook.pdfUrl ? '加载中...' : '暂无封面' }}</span>
              </div>
            </div>

            <!-- 插槽前挡板（前景层，遮挡书本下部） -->
            <div class="slot-front">
              <h3 class="book-title">{{ textbook.title }}</h3>
              <p class="book-meta">{{ textbook.version }} · {{ textbook.grade }}年级{{ semesterMap[textbook.semester] }}</p>
              <div class="slot-actions" @click.stop>
                <n-button size="small" type="primary" @click="openReader(textbook)">
                  <template #icon>
                    <n-icon><BookOutline /></n-icon>
                  </template>
                  阅读
                </n-button>
                <n-dropdown trigger="click" :options="bookMenuOptions" @select="(key) => handleBookMenuSelect(key, textbook)">
                  <n-button size="small" quaternary>
                    <template #icon>
                      <n-icon><EllipsisVertical /></n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>
          </div>
        </div>

        <!-- 翻页 -->
        <div class="pagination-bar" v-if="filteredTextbooks.length > 0">
          <n-pagination
            v-model:page="currentPageNum"
            v-model:page-size="pageSize"
            :item-count="filteredTextbooks.length"
            :page-sizes="pageSizeOptions"
            show-size-picker
            show-quick-jumper
          >
            <template #prefix="{ itemCount }">
              共 {{ itemCount }} 本
            </template>
          </n-pagination>
        </div>
      </n-spin>
    </div>
    <!-- 教材编辑视图 -->
    <div class="textbook-editor" v-else>
      <div class="editor-header">
        <n-button text @click="selectedTextbook = null">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回列表
        </n-button>
        <h2>{{ selectedTextbook.title }}</h2>
      </div>

      <div class="editor-content">
        <!-- 左侧：单元/课文树 -->
        <div class="unit-tree">
          <div class="tree-header">
            <span>章节结构</span>
            <n-button size="small" @click="showUnitModal = true">+ 添加单元</n-button>
          </div>

          <div class="unit-list">
            <div
              v-for="unit in selectedTextbook.units"
              :key="unit.id"
              class="unit-item"
            >
              <div class="unit-header" @click="toggleUnit(unit.id)">
                <n-icon :component="expandedUnits.includes(unit.id) ? ChevronDown : ChevronForward" />
                <span>{{ unit.title }}</span>
                <n-button text size="tiny" @click.stop="addLessonToUnit(unit)">+</n-button>
              </div>

              <div class="lesson-list" v-show="expandedUnits.includes(unit.id)">
                <div
                  v-for="lesson in unit.lessons"
                  :key="lesson.id"
                  class="lesson-item"
                  :class="{ active: currentLesson?.id === lesson.id }"
                  @click="selectLesson(lesson)"
                >
                  <span class="lesson-title">{{ lesson.lessonNumber }}. {{ lesson.title }}</span>
                  <n-tag :type="statusTagType[lesson.status]" size="small">
                    {{ statusMap[lesson.status] }}
                  </n-tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：课文编辑区 -->
        <div class="lesson-editor">
          <template v-if="currentLesson">
            <div class="lesson-header">
              <h3>{{ currentLesson.title }}</h3>
              <div class="lesson-meta">
                <span v-if="currentLesson.pageStart">页码：P{{ currentLesson.pageStart }}-{{ currentLesson.pageEnd }}</span>
                <n-tag :type="statusTagType[currentLesson.status]">{{ statusMap[currentLesson.status] }}</n-tag>
              </div>
            </div>

            <div class="html-editor">
              <n-tabs type="line" v-model:value="editorTab">
                <n-tab-pane name="code" tab="HTML代码">
                  <n-input
                    v-model:value="lessonHtml"
                    type="textarea"
                    placeholder="粘贴课文HTML代码..."
                    :autosize="{ minRows: 15, maxRows: 30 }"
                  />
                </n-tab-pane>
                <n-tab-pane name="preview" tab="预览">
                  <div class="preview-container">
                    <iframe
                      :srcdoc="previewHtml"
                      class="preview-frame"
                      sandbox="allow-scripts"
                    ></iframe>
                  </div>
                </n-tab-pane>
              </n-tabs>
            </div>

            <div class="lesson-actions">
              <n-button @click="saveLesson" :loading="saving">保存草稿</n-button>
              <n-button
                type="primary"
                @click="submitLesson"
                :loading="submitting"
                :disabled="!lessonHtml || currentLesson.status === 'SUBMITTED'"
              >
                提交审核
              </n-button>
            </div>
          </template>
          <n-empty v-else description="请从左侧选择一篇课文" />
        </div>
      </div>
    </div>

    <!-- 创建教材弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建新教材" style="width: 500px">
      <n-form ref="textbookFormRef" :model="textbookForm" :rules="textbookRules">
        <n-form-item label="学科" path="subject">
          <n-select v-model:value="textbookForm.subject" :options="subjectOptions" />
        </n-form-item>
        <n-form-item label="年级" path="grade">
          <n-select v-model:value="textbookForm.grade" :options="gradeOptions" />
        </n-form-item>
        <n-form-item label="学期" path="semester">
          <n-select v-model:value="textbookForm.semester" :options="semesterOptions" />
        </n-form-item>
        <n-form-item label="版本" path="version">
          <n-input v-model:value="textbookForm.version" placeholder="如：人教版" />
        </n-form-item>
        <n-form-item label="教材名称" path="title">
          <n-input v-model:value="textbookForm.title" placeholder="如：语文三年级上册" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="createTextbook" :loading="creating">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 添加单元弹窗 -->
    <n-modal v-model:show="showUnitModal" preset="card" title="添加单元" style="width: 450px">
      <n-form ref="unitFormRef" :model="unitForm" :rules="unitRules">
        <n-form-item label="单元序号" path="unitNumber">
          <n-input-number v-model:value="unitForm.unitNumber" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="单元标题" path="title">
          <n-input v-model:value="unitForm.title" placeholder="如：第一单元" />
        </n-form-item>
        <n-form-item label="起始页码">
          <n-input-number v-model:value="unitForm.pageStart" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="结束页码">
          <n-input-number v-model:value="unitForm.pageEnd" :min="1" style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showUnitModal = false">取消</n-button>
          <n-button type="primary" @click="createUnit" :loading="creatingUnit">添加</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 添加课文弹窗 -->
    <n-modal v-model:show="showLessonModal" preset="card" title="添加课文" style="width: 450px">
      <n-form ref="lessonFormRef" :model="lessonForm" :rules="lessonRules">
        <n-form-item label="课文序号" path="lessonNumber">
          <n-input-number v-model:value="lessonForm.lessonNumber" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="课文标题" path="title">
          <n-input v-model:value="lessonForm.title" placeholder="如：大青树下的小学" />
        </n-form-item>
        <n-form-item label="起始页码">
          <n-input-number v-model:value="lessonForm.pageStart" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="结束页码">
          <n-input-number v-model:value="lessonForm.pageEnd" :min="1" style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showLessonModal = false">取消</n-button>
          <n-button type="primary" @click="createLesson" :loading="creatingLesson">添加</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 上传PDF弹窗 -->
    <n-modal v-model:show="showUploadModal" preset="card" title="上传教材PDF" style="width: 500px">
      <n-form>
        <n-form-item label="PDF文件" required>
          <n-upload
            ref="uploadRef"
            :max="1"
            accept=".pdf"
            :default-upload="false"
            @change="handleUploadChange"
          >
            <n-button class="upload-btn">选择PDF文件</n-button>
          </n-upload>
          <div v-if="uploadForm.file" class="upload-file-info">
            已选择: {{ uploadForm.file.name }} ({{ formatFileSize(uploadForm.file.size) }})
          </div>
        </n-form-item>
        <n-form-item label="上传到">
          <n-radio-group v-model:value="uploadForm.uploadMode" style="margin-bottom: 12px;">
            <n-radio value="existing">已有教材</n-radio>
            <n-radio value="new">创建新教材</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="uploadForm.uploadMode === 'existing'" label="选择教材" required>
          <n-select
            v-model:value="uploadForm.textbookId"
            :options="textbookSelectOptions"
            placeholder="请选择要上传PDF的教材"
            filterable
          />
        </n-form-item>
        <template v-if="uploadForm.uploadMode === 'new'">
          <n-form-item label="教材名称">
            <n-input
              v-model:value="uploadForm.newTitle"
              :placeholder="uploadForm.file ? uploadForm.file.name.replace('.pdf', '') : '不填则使用文件名'"
            />
          </n-form-item>
          <n-form-item label="学科">
            <n-select v-model:value="uploadForm.subject" :options="subjectOptions" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="年级">
                <n-select v-model:value="uploadForm.grade" :options="gradeOptions" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="学期">
                <n-select v-model:value="uploadForm.semester" :options="semesterOptions" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </template>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="closeUploadModal">取消</n-button>
          <n-button
            type="primary"
            @click="uploadPdf"
            :loading="uploading"
            :disabled="!uploadForm.file || (uploadForm.uploadMode === 'existing' && !uploadForm.textbookId)"
          >
            上传
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- AI 设置抽屉 -->
    <n-drawer v-model:show="showAiDrawer" :width="650" placement="right">
      <n-drawer-content title="AI 设置" closable>
        <n-tabs type="line" animated>
          <n-tab-pane name="system" tab="系统设置">
            <AiSystemSettings />
          </n-tab-pane>
          <n-tab-pane name="api" tab="API 配置">
            <AiApiConfigList />
          </n-tab-pane>
          <n-tab-pane name="prompt" tab="科目模板">
            <AiPromptManager />
          </n-tab-pane>
        </n-tabs>
      </n-drawer-content>
    </n-drawer>

    <!-- 批量上传PDF弹窗 -->
    <n-modal v-model:show="showBatchUploadModal" preset="card" title="批量上传教材PDF" style="width: 900px; max-width: 95vw;" :mask-closable="!batchUploading">
      <div class="batch-upload-container">
        <!-- 上传进度显示 -->
        <div v-if="batchUploading" class="batch-upload-progress">
          <div class="progress-header">
            <span class="progress-title">正在上传...</span>
            <span class="progress-stats">{{ uploadProgress.current }} / {{ uploadProgress.total }}</span>
          </div>
          <n-progress
            type="line"
            :percentage="uploadProgress.percentage"
            :status="uploadProgress.status"
            :show-indicator="true"
            :height="12"
          />
          <div class="progress-current" v-if="uploadProgress.currentFile">
            当前: {{ uploadProgress.currentFile }}
          </div>
          <div class="progress-results" v-if="uploadProgress.results.length > 0">
            <div
              v-for="(result, index) in uploadProgress.results"
              :key="index"
              class="result-item"
              :class="result.success ? 'success' : 'error'"
            >
              <n-icon :component="result.success ? CheckmarkCircle : CloseCircle" />
              <span>{{ result.filename }}</span>
              <span v-if="!result.success" class="error-msg">{{ result.error }}</span>
            </div>
          </div>
        </div>
        <!-- 文件选择区域 -->
        <div v-if="batchFiles.length === 0" class="batch-upload-area">
          <n-upload
            multiple
            accept=".pdf"
            :default-upload="false"
            :show-file-list="false"
            @change="handleBatchFileChange"
          >
            <n-upload-dragger>
              <div class="upload-dragger-content">
                <n-icon size="48" color="#999"><CloudUploadOutline /></n-icon>
                <p class="upload-dragger-text">点击或拖拽PDF文件到此处</p>
                <p class="upload-dragger-hint">支持同时选择多个PDF文件</p>
              </div>
            </n-upload-dragger>
          </n-upload>
        </div>

        <!-- 文件列表编辑区域 -->
        <div v-else class="batch-file-list">
          <div class="batch-list-header">
            <span>已选择 {{ batchFiles.length }} 个文件</span>
            <n-button text type="primary" @click="addMoreFiles">+ 添加更多</n-button>
            <input
              ref="batchFileInputRef"
              type="file"
              multiple
              accept=".pdf"
              style="display: none;"
              @change="handleAddMoreFiles"
            />
          </div>

          <!-- 批量设置 -->
          <div class="batch-quick-set">
            <span class="quick-set-label">批量设置：</span>
            <n-select
              v-model:value="batchDefaultSubject"
              :options="subjectOptions"
              size="small"
              style="width: 100px;"
              @update:value="applyBatchSubject"
            />
            <n-select
              v-model:value="batchDefaultGrade"
              :options="gradeOptions"
              size="small"
              style="width: 100px;"
              @update:value="applyBatchGrade"
            />
            <n-select
              v-model:value="batchDefaultSemester"
              :options="semesterOptions"
              size="small"
              style="width: 100px;"
              @update:value="applyBatchSemester"
            />
          </div>

          <!-- 文件列表 -->
          <n-scrollbar style="max-height: 400px;">
            <div class="batch-file-items">
              <div v-for="(item, index) in batchFiles" :key="index" class="batch-file-item" :class="{ duplicate: item.isDuplicate }">
                <div class="file-index">{{ index + 1 }}</div>
                <div class="file-info-grid">
                  <div class="file-row">
                    <span class="file-name-label">文件：</span>
                    <span class="file-name">{{ item.file.name }}</span>
                    <span class="file-size">({{ formatFileSize(item.file.size) }})</span>
                    <n-tag v-if="item.isDuplicate" type="warning" size="small" style="margin-left: 8px;">
                      已存在同名教材
                    </n-tag>
                  </div>
                  <div class="file-form-row">
                    <n-input
                      v-model:value="item.title"
                      size="small"
                      :placeholder="item.file.name.replace('.pdf', '')"
                      :status="item.isDuplicate ? 'warning' : undefined"
                      style="flex: 2;"
                      @update:value="checkDuplicates"
                    >
                      <template #prefix>名称</template>
                    </n-input>
                    <n-select
                      v-model:value="item.subject"
                      :options="subjectOptions"
                      size="small"
                      style="width: 90px;"
                    />
                    <n-select
                      v-model:value="item.grade"
                      :options="gradeOptions"
                      size="small"
                      style="width: 90px;"
                    />
                    <n-select
                      v-model:value="item.semester"
                      :options="semesterOptions"
                      size="small"
                      style="width: 90px;"
                    />
                  </div>
                </div>
                <n-button text type="error" @click="removeBatchFile(index)">
                  <n-icon><CloseCircleOutline /></n-icon>
                </n-button>
              </div>
            </div>
          </n-scrollbar>
        </div>
      </div>
      <template #footer>
        <n-space justify="space-between" style="width: 100%;">
          <n-button v-if="batchFiles.length > 0" @click="clearBatchFiles">清空列表</n-button>
          <n-space>
            <n-button @click="closeBatchUploadModal">取消</n-button>
            <n-button
              type="primary"
              @click="batchUploadPdf"
              :loading="batchUploading"
              :disabled="batchFiles.length === 0"
            >
              上传全部 ({{ batchFiles.length }})
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <!-- 上传设置弹窗 -->
    <n-modal v-model:show="showUploadSettingsModal" preset="card" title="上传设置" style="width: 600px;">
      <n-tabs type="line" animated>
        <n-tab-pane name="subjects" tab="科目管理">
          <div class="settings-section">
            <div class="settings-header">
              <span>自定义科目列表</span>
              <n-button size="small" @click="addCustomSubject">+ 添加科目</n-button>
            </div>
            <p class="settings-hint">只需输入中文名称，英文标识自动生成</p>
            <div class="settings-list">
              <div v-for="(subject, index) in customSubjects" :key="index" class="settings-item">
                <n-input
                  v-model:value="subject.label"
                  size="small"
                  placeholder="中文名称（如：语文）"
                  style="width: 150px;"
                  @update:value="(val) => autoGenerateSubjectValue(index, val)"
                />
                <span class="auto-value">{{ subject.value || '自动生成' }}</span>
                <n-button text type="error" size="small" @click="removeCustomSubject(index)" :disabled="customSubjects.length <= 1">
                  <n-icon><CloseCircleOutline /></n-icon>
                </n-button>
              </div>
            </div>
          </div>
        </n-tab-pane>
        <n-tab-pane name="grades" tab="年级管理">
          <div class="settings-section">
            <div class="settings-header">
              <span>自定义年级列表</span>
              <n-button size="small" @click="addCustomGrade">+ 添加年级</n-button>
            </div>
            <p class="settings-hint">只需输入中文名称，数值自动递增</p>
            <div class="settings-list">
              <div v-for="(grade, index) in customGrades" :key="index" class="settings-item">
                <n-input
                  v-model:value="grade.label"
                  size="small"
                  placeholder="中文名称（如：1年级）"
                  style="width: 150px;"
                  @update:value="(val) => autoGenerateGradeValue(index, val)"
                />
                <span class="auto-value">值: {{ grade.value }}</span>
                <n-button text type="error" size="small" @click="removeCustomGrade(index)" :disabled="customGrades.length <= 1">
                  <n-icon><CloseCircleOutline /></n-icon>
                </n-button>
              </div>
            </div>
          </div>
        </n-tab-pane>
        <n-tab-pane name="semesters" tab="学期管理">
          <div class="settings-section">
            <div class="settings-header">
              <span>自定义学期列表</span>
              <n-button size="small" @click="addCustomSemester">+ 添加学期</n-button>
            </div>
            <p class="settings-hint">只需输入中文名称，英文标识自动生成</p>
            <div class="settings-list">
              <div v-for="(semester, index) in customSemesters" :key="index" class="settings-item">
                <n-input
                  v-model:value="semester.label"
                  size="small"
                  placeholder="中文名称（如：上册）"
                  style="width: 150px;"
                  @update:value="(val) => autoGenerateSemesterValue(index, val)"
                />
                <span class="auto-value">{{ semester.value || '自动生成' }}</span>
                <n-button text type="error" size="small" @click="removeCustomSemester(index)" :disabled="customSemesters.length <= 1">
                  <n-icon><CloseCircleOutline /></n-icon>
                </n-button>
              </div>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
      <template #footer>
        <n-space justify="end">
          <n-button @click="resetUploadSettings">恢复默认</n-button>
          <n-button type="primary" @click="saveUploadSettings">保存设置</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 修改教材信息弹窗 -->
    <n-modal v-model:show="showEditModal" preset="card" title="修改教材信息" style="width: 500px">
      <n-form ref="editFormRef" :model="editForm" :rules="textbookRules">
        <n-form-item label="学科" path="subject">
          <n-select v-model:value="editForm.subject" :options="subjectOptions" />
        </n-form-item>
        <n-form-item label="年级" path="grade">
          <n-select v-model:value="editForm.grade" :options="gradeOptions" />
        </n-form-item>
        <n-form-item label="学期" path="semester">
          <n-select v-model:value="editForm.semester" :options="semesterOptions" />
        </n-form-item>
        <n-form-item label="版本" path="version">
          <n-input v-model:value="editForm.version" placeholder="如：人教版" />
        </n-form-item>
        <n-form-item label="教材名称" path="title">
          <n-input v-model:value="editForm.title" placeholder="如：语文三年级上册" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="saveEditTextbook" :loading="editing">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="card" title="重命名教材" style="width: 400px">
      <n-input v-model:value="renameTitle" placeholder="请输入新名称" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRenameModal = false">取消</n-button>
          <n-button type="primary" @click="saveRename" :loading="renaming">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 更多信息弹窗 -->
    <n-modal v-model:show="showInfoModal" preset="card" title="教材信息" style="width: 500px">
      <n-descriptions v-if="infoTextbook" :column="1" label-placement="left" bordered>
        <n-descriptions-item label="教材名称">{{ infoTextbook.title }}</n-descriptions-item>
        <n-descriptions-item label="学科">{{ subjectMap[infoTextbook.subject] || infoTextbook.subject }}</n-descriptions-item>
        <n-descriptions-item label="年级">{{ infoTextbook.grade }}年级</n-descriptions-item>
        <n-descriptions-item label="学期">{{ semesterMap[infoTextbook.semester] }}</n-descriptions-item>
        <n-descriptions-item label="版本">{{ infoTextbook.version }}</n-descriptions-item>
        <n-descriptions-item label="PDF">{{ infoTextbook.pdfUrl ? '已上传' : '未上传' }}</n-descriptions-item>
        <n-descriptions-item label="单元数">{{ infoTextbook.units?.length || 0 }}</n-descriptions-item>
        <n-descriptions-item label="课文数">{{ infoTextbook.totalLessons || 0 }}</n-descriptions-item>
        <n-descriptions-item label="状态">
          <n-tag :type="infoTextbook.isHidden ? 'warning' : 'success'">
            {{ infoTextbook.isHidden ? '已隐藏' : '正常' }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="创建时间">{{ formatDate(infoTextbook.createdAt) }}</n-descriptions-item>
      </n-descriptions>
      <template #footer>
        <n-button @click="showInfoModal = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { ArrowBack, Add, ChevronDown, ChevronForward, BookOutline, CloudUploadOutline, CloseCircleOutline, SettingsOutline, EllipsisVertical, SearchOutline, CheckmarkCircle, CloseCircle } from '@vicons/ionicons5';
import { textbookAPI } from '@/api/index';
import AiApiConfigList from '@/components/textbook/AiApiConfigList.vue';
import AiPromptManager from '@/components/textbook/AiPromptManager.vue';
import AiSystemSettings from '@/components/textbook/AiSystemSettings.vue';

const router = useRouter();

// 封面缓存
const coverCache = new Map();
const coverImages = ref({});
const loadingTasks = new Map(); // 跟踪正在加载的任务

// 加载所有封面（优先使用数据库已保存的封面）
const loadAllCovers = () => {
  textbooks.value.forEach(textbook => {
    // 已有缓存，跳过
    if (coverImages.value[textbook.id]) return;

    // 优先使用数据库已保存的封面
    if (textbook.coverImage) {
      coverImages.value[textbook.id] = textbook.coverImage;
      coverCache.set(textbook.id, textbook.coverImage);
      return;
    }

    // 没有已保存封面但有PDF，则动态渲染并上传保存
    if (textbook.pdfUrl) {
      renderAndSavePdfCover(textbook.id, textbook.pdfUrl);
    }
  });
};

// 渲染PDF首页并保存到后端
const renderAndSavePdfCover = async (textbookId, pdfUrl) => {
  // 先渲染
  const imageUrl = await renderPdfCoverToDataUrl(textbookId, pdfUrl);
  if (!imageUrl) return;

  // 显示封面
  coverCache.set(textbookId, imageUrl);
  coverImages.value[textbookId] = imageUrl;

  // 异步保存到后端（不阻塞UI）
  try {
    await textbookAPI.uploadCover(textbookId, imageUrl);
    console.log('封面已保存:', textbookId);
  } catch (e) {
    console.warn('封面保存失败:', e);
  }
};

// 缩略图配置（优化显示速度）
const THUMBNAIL_WIDTH = 300;  // 缩略图宽度（像素）
const THUMBNAIL_QUALITY = 0.85; // JPEG 质量（0-1）

// 渲染PDF首页为DataURL（压缩优化版）
const renderPdfCoverToDataUrl = async (textbookId, pdfUrl) => {
  // 避免重复加载
  if (loadingTasks.has(textbookId)) return null;

  let loadingTask = null;
  let pdf = null;

  try {
    if (!window.pdfjsLib) return null;

    // 先检查 PDF 是否存在
    try {
      const checkResponse = await fetch(pdfUrl, { method: 'HEAD' });
      if (!checkResponse.ok) return null;
    } catch {
      return null;
    }

    loadingTask = window.pdfjsLib.getDocument(pdfUrl);
    loadingTasks.set(textbookId, loadingTask);

    pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // 计算缩放比例（缩小尺寸以加快加载）
    const viewport = page.getViewport({ scale: 1 });
    const scale = THUMBNAIL_WIDTH / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // 创建离屏Canvas
    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d');

    // 渲染
    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport
    }).promise;

    // 转为压缩后的JPEG图片
    return canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
  } catch (e) {
    if (e.name === 'AbortError' || e.message?.includes('abort') || e.message?.includes('terminated')) {
      return null;
    }
    return null;
  } finally {
    loadingTasks.delete(textbookId);
    if (pdf) {
      try { pdf.destroy(); } catch {}
    }
  }
};

// 取消所有正在加载的任务
const cancelAllLoadingTasks = () => {
  loadingTasks.forEach((task) => {
    try {
      if (task.destroy) task.destroy();
    } catch {
      // 忽略
    }
  });
  loadingTasks.clear();
};

// 打开阅读器
const openReader = (textbook) => {
  router.push(`/textbook/reader/${textbook.id}`);
};
const message = useMessage();
const dialog = useDialog();
// 设置全局 dialog 以便在 async 函数中使用
window.$dialog = dialog;

// 数据
const loading = ref(false);
const textbooks = ref([]);
const selectedTextbook = ref(null);
const currentLesson = ref(null);
const lessonHtml = ref('');
const editorTab = ref('code');
const expandedUnits = ref([]);

// 筛选和分页
const searchKeyword = ref('');
const filterSubject = ref('');
const filterGrade = ref(null);
const showHidden = ref(false);
const currentPageNum = ref(1);
const pageSize = ref(12);
const sortOrder = ref('grade_asc');

// 每页数量选项
const pageSizeOptions = [
  { label: '6 本/页', value: 6 },
  { label: '12 本/页', value: 12 },
  { label: '24 本/页', value: 24 },
  { label: '48 本/页', value: 48 }
];

// 排序选项
const sortOptions = [
  { label: '年级升序', value: 'grade_asc' },
  { label: '年级降序', value: 'grade_desc' },
  { label: '名称升序', value: 'title_asc' },
  { label: '名称降序', value: 'title_desc' },
  { label: '最新创建', value: 'created_desc' },
  { label: '最早创建', value: 'created_asc' }
];

// 筛选条件变化时重置页码
watch([searchKeyword, filterSubject, filterGrade, showHidden, sortOrder], () => {
  currentPageNum.value = 1;
});

// 弹窗
const showCreateModal = ref(false);
const showUnitModal = ref(false);
const showLessonModal = ref(false);
const showUploadModal = ref(false);
const showBatchUploadModal = ref(false);
const showAiDrawer = ref(false);
const showUploadSettingsModal = ref(false);
const showEditModal = ref(false);
const showRenameModal = ref(false);
const showInfoModal = ref(false);

// 编辑相关
const editFormRef = ref(null);
const editForm = ref({ subject: '', grade: 1, semester: 'UP', version: '', title: '' });
const editingTextbookId = ref(null);
const editing = ref(false);
const renameTitle = ref('');
const renamingTextbookId = ref(null);
const renaming = ref(false);
const infoTextbook = ref(null);

// 上传菜单选项
const uploadMenuOptions = [
  { label: '单个上传', key: 'single' },
  { label: '批量上传', key: 'batch' },
  { type: 'divider' },
  { label: '上传设置', key: 'settings' }
];

// 书本操作菜单选项
const bookMenuOptions = [
  { label: '修改信息', key: 'edit' },
  { label: '重命名', key: 'rename' },
  { type: 'divider' },
  { label: '更多信息', key: 'info' },
  { type: 'divider' },
  { label: '隐藏教材', key: 'hide' }
];

// 处理上传菜单选择
const handleUploadMenuSelect = (key) => {
  if (key === 'single') {
    showUploadModal.value = true;
  } else if (key === 'batch') {
    showBatchUploadModal.value = true;
  } else if (key === 'settings') {
    showUploadSettingsModal.value = true;
  }
};

// 默认配置
const defaultSubjects = [
  { label: '语文', value: 'CHINESE' },
  { label: '数学', value: 'MATH' },
  { label: '英语', value: 'ENGLISH' },
];

const defaultGrades = [
  { label: '1年级', value: 1 },
  { label: '2年级', value: 2 },
  { label: '3年级', value: 3 },
  { label: '4年级', value: 4 },
  { label: '5年级', value: 5 },
  { label: '6年级', value: 6 },
  { label: '7年级', value: 7 },
  { label: '8年级', value: 8 },
  { label: '9年级', value: 9 },
];

const defaultSemesters = [
  { label: '上册', value: 'UP' },
  { label: '下册', value: 'DOWN' },
];

// 自定义配置（从本地存储加载）
const customSubjects = ref([...defaultSubjects]);
const customGrades = ref([...defaultGrades]);
const customSemesters = ref([...defaultSemesters]);

// 加载自定义设置
const loadUploadSettings = () => {
  try {
    const saved = localStorage.getItem('textbook_upload_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.subjects?.length) customSubjects.value = settings.subjects;
      if (settings.grades?.length) customGrades.value = settings.grades;
      if (settings.semesters?.length) customSemesters.value = settings.semesters;
    }
  } catch (e) {
    console.warn('加载上传设置失败:', e);
  }
};

// 保存自定义设置
const saveUploadSettings = () => {
  try {
    const settings = {
      subjects: customSubjects.value.filter(s => s.label && s.value),
      grades: customGrades.value.filter(g => g.label && g.value),
      semesters: customSemesters.value.filter(s => s.label && s.value),
    };
    localStorage.setItem('textbook_upload_settings', JSON.stringify(settings));
    message.success('设置已保存');
    showUploadSettingsModal.value = false;
  } catch (e) {
    message.error('保存设置失败');
  }
};

// 恢复默认设置
const resetUploadSettings = () => {
  customSubjects.value = [...defaultSubjects];
  customGrades.value = [...defaultGrades];
  customSemesters.value = [...defaultSemesters];
  localStorage.removeItem('textbook_upload_settings');
  message.success('已恢复默认设置');
};

// 添加/删除自定义项
const addCustomSubject = () => {
  customSubjects.value.push({ label: '', value: '' });
};
const removeCustomSubject = (index) => {
  customSubjects.value.splice(index, 1);
};
const addCustomGrade = () => {
  const maxValue = Math.max(...customGrades.value.map(g => g.value || 0));
  customGrades.value.push({ label: '', value: maxValue + 1 });
};
const removeCustomGrade = (index) => {
  customGrades.value.splice(index, 1);
};
const addCustomSemester = () => {
  customSemesters.value.push({ label: '', value: '' });
};
const removeCustomSemester = (index) => {
  customSemesters.value.splice(index, 1);
};

// 中文转拼音首字母（简化版）
const chineseToPinyin = {
  '语文': 'CHINESE', '数学': 'MATH', '英语': 'ENGLISH',
  '物理': 'PHYSICS', '化学': 'CHEMISTRY', '生物': 'BIOLOGY',
  '历史': 'HISTORY', '地理': 'GEOGRAPHY', '政治': 'POLITICS',
  '音乐': 'MUSIC', '美术': 'ART', '体育': 'PE',
  '科学': 'SCIENCE', '道德': 'MORAL', '信息': 'IT',
  '上册': 'UP', '下册': 'DOWN', '全一册': 'FULL',
  '春季': 'SPRING', '秋季': 'AUTUMN', '寒假': 'WINTER', '暑假': 'SUMMER',
};

// 生成唯一英文标识
const generateEnglishValue = (chineseLabel, existingValues = []) => {
  if (!chineseLabel) return '';

  // 先查找预设映射
  if (chineseToPinyin[chineseLabel]) {
    return chineseToPinyin[chineseLabel];
  }

  // 取中文转大写拼音首字母
  let base = chineseLabel
    .replace(/[年级册期学段]/g, '')
    .split('')
    .map(char => {
      // 简单映射常见字
      const map = {
        '一': 'YI', '二': 'ER', '三': 'SAN', '四': 'SI', '五': 'WU',
        '六': 'LIU', '七': 'QI', '八': 'BA', '九': 'JIU', '十': 'SHI',
        '初': 'CHU', '高': 'GAO', '中': 'ZHONG', '小': 'XIAO',
      };
      return map[char] || char.toUpperCase();
    })
    .join('');

  // 如果生成的是数字，保留
  if (/^\d+$/.test(base)) return base;

  // 确保唯一性
  let value = base;
  let counter = 1;
  while (existingValues.includes(value)) {
    value = `${base}_${counter}`;
    counter++;
  }
  return value;
};

// 自动生成科目英文值
const autoGenerateSubjectValue = (index, label) => {
  const existingValues = customSubjects.value
    .filter((_, i) => i !== index)
    .map(s => s.value);
  customSubjects.value[index].value = generateEnglishValue(label, existingValues);
};

// 自动生成年级数值
const autoGenerateGradeValue = (index, label) => {
  // 从标签中提取数字
  const match = label.match(/(\d+)/);
  if (match) {
    customGrades.value[index].value = parseInt(match[1], 10);
  } else {
    // 尝试中文数字转换
    const chineseNum = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12 };
    for (const [cn, num] of Object.entries(chineseNum)) {
      if (label.includes(cn)) {
        customGrades.value[index].value = num;
        return;
      }
    }
    // 如果无法识别，使用索引+1
    customGrades.value[index].value = index + 1;
  }
};

// 自动生成学期英文值
const autoGenerateSemesterValue = (index, label) => {
  const existingValues = customSemesters.value
    .filter((_, i) => i !== index)
    .map(s => s.value);
  customSemesters.value[index].value = generateEnglishValue(label, existingValues);
};

// 批量上传
const batchFileInputRef = ref(null);
const batchFiles = ref([]);
const batchDefaultSubject = ref('CHINESE');
const batchDefaultGrade = ref(3);
const batchDefaultSemester = ref('UP');
const batchUploading = ref(false);

// 上传进度
const uploadProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  status: 'default',
  currentFile: '',
  results: [],
});

// 表单
const textbookFormRef = ref(null);
const textbookForm = ref({
  subject: 'CHINESE',
  grade: 3,
  semester: 'UP',
  version: '人教版',
  title: '',
});

const unitFormRef = ref(null);
const unitForm = ref({
  unitNumber: 1,
  title: '',
  pageStart: null,
  pageEnd: null,
});

const lessonFormRef = ref(null);
const lessonForm = ref({
  unitId: '',
  lessonNumber: 1,
  title: '',
  pageStart: null,
  pageEnd: null,
});

// 上传表单
const uploadRef = ref(null);
const uploadForm = ref({
  uploadMode: 'new',  // 'existing' 或 'new'
  textbookId: null,
  file: null,
  newTitle: '',
  subject: 'CHINESE',
  grade: 3,
  semester: 'UP',
});

// 加载状态
const creating = ref(false);
const creatingUnit = ref(false);
const creatingLesson = ref(false);
const saving = ref(false);
const submitting = ref(false);
const uploading = ref(false);

// 映射
const subjectMap = { CHINESE: '语文', MATH: '数学', ENGLISH: '英语' };
const semesterMap = { UP: '上册', DOWN: '下册' };
const statusMap = {
  EMPTY: '空',
  DRAFT: '草稿',
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  PUBLISHED: '已发布',
};
const statusTagType = {
  EMPTY: 'default',
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  PUBLISHED: 'success',
};

// 选项（使用自定义配置）
const subjectOptions = computed(() => customSubjects.value.filter(s => s.label && s.value));
const gradeOptions = computed(() => customGrades.value.filter(g => g.label && g.value));
const semesterOptions = computed(() => customSemesters.value.filter(s => s.label && s.value));

// 筛选后的教材列表
const filteredTextbooks = computed(() => {
  let result = textbooks.value;

  // 搜索关键词
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(keyword));
  }

  // 科目筛选
  if (filterSubject.value) {
    result = result.filter(t => t.subject === filterSubject.value);
  }

  // 年级筛选
  if (filterGrade.value !== null) {
    result = result.filter(t => t.grade === filterGrade.value);
  }

  // 隐藏筛选
  if (!showHidden.value) {
    result = result.filter(t => !t.isHidden);
  }

  // 排序
  result = [...result].sort((a, b) => {
    switch (sortOrder.value) {
      case 'grade_asc':
        return (a.grade || 0) - (b.grade || 0);
      case 'grade_desc':
        return (b.grade || 0) - (a.grade || 0);
      case 'title_asc':
        return (a.title || '').localeCompare(b.title || '', 'zh-CN');
      case 'title_desc':
        return (b.title || '').localeCompare(a.title || '', 'zh-CN');
      case 'created_desc':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'created_asc':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      default:
        return 0;
    }
  });

  return result;
});

// 总页数
const totalPages = computed(() => Math.ceil(filteredTextbooks.value.length / pageSize.value));

// 当前页的教材
const paginatedTextbooks = computed(() => {
  const start = (currentPageNum.value - 1) * pageSize.value;
  return filteredTextbooks.value.slice(start, start + pageSize.value);
});

// 表单验证
const textbookRules = {
  subject: { required: true, message: '请选择学科' },
  grade: { required: true, type: 'number', message: '请选择年级' },
  semester: { required: true, message: '请选择学期' },
  title: { required: true, message: '请输入教材名称' },
};
const unitRules = {
  unitNumber: { required: true, type: 'number', message: '请输入单元序号' },
  title: { required: true, message: '请输入单元标题' },
};
const lessonRules = {
  lessonNumber: { required: true, type: 'number', message: '请输入课文序号' },
  title: { required: true, message: '请输入课文标题' },
};

// 教材选择选项
const textbookSelectOptions = computed(() => {
  return textbooks.value.map(t => ({
    label: `${t.title} (${subjectMap[t.subject]} ${t.grade}年级${semesterMap[t.semester]})`,
    value: t.id,
  }));
});

// 预览HTML
const previewHtml = computed(() => {
  if (!lessonHtml.value) return '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; padding: 20px; line-height: 1.8; color: #333; }
        .textbook-lesson { max-width: 800px; margin: 0 auto; }
        .lesson-header { text-align: center; margin-bottom: 24px; }
        .lesson-title { font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .lesson-type { display: inline-block; padding: 2px 8px; background: #e8f4f8; color: #0077b6; border-radius: 4px; font-size: 12px; margin-bottom: 8px; }
        .lesson-number { display: inline-block; width: 28px; height: 28px; line-height: 28px; background: #f0f0f0; border-radius: 50%; font-size: 14px; margin-right: 8px; }
        .lesson-page { margin-bottom: 20px; }
        .lesson-body { font-size: 18px; }
        .paragraph { text-indent: 2em; margin-bottom: 1em; }
        ruby rt { font-size: 10px; color: #666; }
        .lesson-vocabulary { margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; }
        .vocab-grid table { width: 100%; border-collapse: collapse; }
        .vocab-grid td { padding: 12px; text-align: center; font-size: 24px; border: 1px solid #ddd; }
        .lesson-exercises { margin-top: 24px; }
        .exercise-item { margin-bottom: 16px; padding-left: 24px; position: relative; }
        .exercise-item::before { content: "◆"; position: absolute; left: 0; color: #0077b6; }
        .word-group { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; padding-left: 24px; }
        .lesson-footnote { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>${lessonHtml.value}</body>
    </html>
  `;
});

// 方法
const goBack = () => {
  router.back();
};

const loadTextbooks = async () => {
  loading.value = true;
  try {
    const data = await textbookAPI.getMyTextbooks();
    textbooks.value = data.textbooks || [];
    // 加载封面
    loadAllCovers();
  } catch (error) {
    message.error('加载教材列表失败');
  } finally {
    loading.value = false;
  }
};

// 书本菜单处理
const handleBookMenuSelect = (key, textbook) => {
  if (key === 'edit') {
    openEditModal(textbook);
  } else if (key === 'rename') {
    openRenameModal(textbook);
  } else if (key === 'info') {
    openInfoModal(textbook);
  } else if (key === 'hide') {
    toggleHideTextbook(textbook);
  }
};

// 打开修改信息弹窗
const openEditModal = (textbook) => {
  editingTextbookId.value = textbook.id;
  editForm.value = {
    subject: textbook.subject,
    grade: textbook.grade,
    semester: textbook.semester,
    version: textbook.version || '',
    title: textbook.title,
  };
  showEditModal.value = true;
};

// 保存修改信息
const saveEditTextbook = async () => {
  try {
    await editFormRef.value?.validate();
    editing.value = true;
    await textbookAPI.updateTextbook(editingTextbookId.value, editForm.value);
    message.success('修改成功');
    showEditModal.value = false;
    loadTextbooks();
  } catch (error) {
    if (error.error) message.error(error.error);
  } finally {
    editing.value = false;
  }
};

// 打开重命名弹窗
const openRenameModal = (textbook) => {
  renamingTextbookId.value = textbook.id;
  renameTitle.value = textbook.title;
  showRenameModal.value = true;
};

// 保存重命名
const saveRename = async () => {
  if (!renameTitle.value.trim()) {
    message.warning('请输入名称');
    return;
  }
  renaming.value = true;
  try {
    await textbookAPI.updateTextbook(renamingTextbookId.value, { title: renameTitle.value });
    message.success('重命名成功');
    showRenameModal.value = false;
    loadTextbooks();
  } catch (error) {
    message.error(error.error || '重命名失败');
  } finally {
    renaming.value = false;
  }
};

// 打开更多信息弹窗
const openInfoModal = (textbook) => {
  infoTextbook.value = textbook;
  showInfoModal.value = true;
};

// 切换隐藏状态
const toggleHideTextbook = async (textbook) => {
  const newState = !textbook.isHidden;
  try {
    await textbookAPI.updateTextbook(textbook.id, { isHidden: newState });
    message.success(newState ? '教材已隐藏' : '教材已显示');
    loadTextbooks();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const selectTextbook = async (textbook) => {
  try {
    const data = await textbookAPI.getTextbookDetail(textbook.id);
    selectedTextbook.value = data.textbook;
    // 展开所有单元
    expandedUnits.value = data.textbook.units.map(u => u.id);
  } catch (error) {
    message.error('加载教材详情失败');
  }
};

const toggleUnit = (unitId) => {
  const index = expandedUnits.value.indexOf(unitId);
  if (index > -1) {
    expandedUnits.value.splice(index, 1);
  } else {
    expandedUnits.value.push(unitId);
  }
};

const selectLesson = async (lesson) => {
  try {
    const data = await textbookAPI.getLessonDetail(lesson.id);
    currentLesson.value = data.lesson;
    lessonHtml.value = data.lesson.htmlContent || '';
    editorTab.value = 'code';
  } catch (error) {
    message.error('加载课文详情失败');
  }
};

const createTextbook = async () => {
  try {
    await textbookFormRef.value?.validate();
    creating.value = true;
    await textbookAPI.createTextbook(textbookForm.value);
    message.success('创建成功');
    showCreateModal.value = false;
    loadTextbooks();
    // 重置表单
    textbookForm.value = {
      subject: 'CHINESE',
      grade: 3,
      semester: 'UP',
      version: '人教版',
      title: '',
    };
  } catch (error) {
    if (error.error) message.error(error.error);
  } finally {
    creating.value = false;
  }
};

const createUnit = async () => {
  try {
    await unitFormRef.value?.validate();
    creatingUnit.value = true;
    await textbookAPI.createUnit({
      textbookId: selectedTextbook.value.id,
      ...unitForm.value,
    });
    message.success('添加成功');
    showUnitModal.value = false;
    // 刷新教材详情
    selectTextbook(selectedTextbook.value);
    // 重置表单
    unitForm.value = { unitNumber: 1, title: '', pageStart: null, pageEnd: null };
  } catch (error) {
    if (error.error) message.error(error.error);
  } finally {
    creatingUnit.value = false;
  }
};

const addLessonToUnit = (unit) => {
  lessonForm.value.unitId = unit.id;
  lessonForm.value.lessonNumber = unit.lessons.length + 1;
  showLessonModal.value = true;
};

const createLesson = async () => {
  try {
    await lessonFormRef.value?.validate();
    creatingLesson.value = true;
    await textbookAPI.createLesson(lessonForm.value);
    message.success('添加成功');
    showLessonModal.value = false;
    // 刷新教材详情
    selectTextbook(selectedTextbook.value);
    // 重置表单
    lessonForm.value = { unitId: '', lessonNumber: 1, title: '', pageStart: null, pageEnd: null };
  } catch (error) {
    if (error.error) message.error(error.error);
  } finally {
    creatingLesson.value = false;
  }
};

const saveLesson = async () => {
  if (!currentLesson.value) return;
  saving.value = true;
  try {
    await textbookAPI.updateLesson(currentLesson.value.id, {
      htmlContent: lessonHtml.value,
    });
    message.success('保存成功');
    // 刷新教材详情
    selectTextbook(selectedTextbook.value);
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const submitLesson = async () => {
  if (!currentLesson.value || !lessonHtml.value) return;
  submitting.value = true;
  try {
    // 先保存
    await textbookAPI.updateLesson(currentLesson.value.id, {
      htmlContent: lessonHtml.value,
    });
    // 再提交
    await textbookAPI.submitLesson(currentLesson.value.id);
    message.success('提交成功，等待审核');
    // 刷新教材详情
    selectTextbook(selectedTextbook.value);
    currentLesson.value.status = 'SUBMITTED';
  } catch (error) {
    message.error(error.error || '提交失败');
  } finally {
    submitting.value = false;
  }
};

// 处理文件选择
const handleUploadChange = (options) => {
  const { fileList } = options;
  if (fileList.length > 0) {
    uploadForm.value.file = fileList[0].file;
  } else {
    uploadForm.value.file = null;
  }
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 关闭上传弹窗
const closeUploadModal = () => {
  showUploadModal.value = false;
  uploadForm.value = {
    uploadMode: 'new',
    textbookId: null,
    file: null,
    newTitle: '',
    subject: 'CHINESE',
    grade: 3,
    semester: 'UP',
  };
  if (uploadRef.value) {
    uploadRef.value.clear();
  }
};

// 上传PDF
const uploadPdf = async () => {
  if (!uploadForm.value.file) {
    message.warning('请选择PDF文件');
    return;
  }

  if (uploadForm.value.uploadMode === 'existing' && !uploadForm.value.textbookId) {
    message.warning('请选择目标教材');
    return;
  }

  uploading.value = true;
  try {
    let targetTextbookId = uploadForm.value.textbookId;

    // 如果是创建新教材模式
    if (uploadForm.value.uploadMode === 'new') {
      // 使用文件名作为默认名称（去掉.pdf后缀）
      const fileName = uploadForm.value.file.name.replace(/\.pdf$/i, '');
      const title = uploadForm.value.newTitle.trim() || fileName;

      // 先创建教材
      const result = await textbookAPI.createTextbook({
        title,
        subject: uploadForm.value.subject,
        grade: uploadForm.value.grade,
        semester: uploadForm.value.semester,
        version: '人教版',
      });
      targetTextbookId = result.textbook.id;
    }

    // 上传PDF
    const formData = new FormData();
    formData.append('pdf', uploadForm.value.file);
    const uploadResult = await textbookAPI.uploadPdf(targetTextbookId, formData);

    // 生成并保存封面缩略图
    if (uploadResult.pdfUrl) {
      message.success('PDF上传成功，正在生成封面...');
      // 清除旧缓存
      coverCache.delete(targetTextbookId);
      delete coverImages.value[targetTextbookId];
      // 渲染并保存封面
      await renderAndSavePdfCover(targetTextbookId, uploadResult.pdfUrl);
      message.success('封面已保存');
    } else {
      message.success('PDF上传成功');
    }

    closeUploadModal();
    // 刷新教材列表以更新封面
    loadTextbooks();
  } catch (error) {
    message.error(error.error || 'PDF上传失败');
  } finally {
    uploading.value = false;
  }
};

// ========== 批量上传相关方法 ==========

// 处理批量文件选择
const handleBatchFileChange = (options) => {
  const { fileList } = options;
  // 过滤出新文件（避免重复添加）
  const existingNames = new Set(batchFiles.value.map(f => f.file.name));
  const newFiles = fileList
    .filter(f => !existingNames.has(f.file.name))
    .map(f => ({
      file: f.file,
      title: '',
      subject: batchDefaultSubject.value,
      grade: batchDefaultGrade.value,
      semester: batchDefaultSemester.value,
      isDuplicate: false, // 是否与已有教材重名
    }));

  if (newFiles.length > 0) {
    batchFiles.value = [...batchFiles.value, ...newFiles];
    // 检查重复
    checkDuplicates();
  }
};

// 添加更多文件
const addMoreFiles = () => {
  batchFileInputRef.value?.click();
};

// 处理添加更多文件
const handleAddMoreFiles = (event) => {
  const files = event.target.files;
  if (files && files.length > 0) {
    // 过滤出新文件（避免重复添加）
    const existingNames = new Set(batchFiles.value.map(f => f.file.name));
    const newFiles = Array.from(files)
      .filter(f => !existingNames.has(f.name))
      .map(f => ({
        file: f,
        title: '',
        subject: batchDefaultSubject.value,
        grade: batchDefaultGrade.value,
        semester: batchDefaultSemester.value,
        isDuplicate: false,
      }));

    if (newFiles.length > 0) {
      batchFiles.value = [...batchFiles.value, ...newFiles];
      // 检查重复
      checkDuplicates();
    } else {
      message.info('所选文件已在列表中');
    }
  }
  // 重置 input
  event.target.value = '';
};

// 移除单个文件
const removeBatchFile = (index) => {
  batchFiles.value.splice(index, 1);
};

// 清空所有文件
const clearBatchFiles = () => {
  batchFiles.value = [];
};

// 应用批量学科
const applyBatchSubject = (value) => {
  batchFiles.value.forEach(item => {
    item.subject = value;
  });
};

// 应用批量年级
const applyBatchGrade = (value) => {
  batchFiles.value.forEach(item => {
    item.grade = value;
  });
};

// 应用批量学期
const applyBatchSemester = (value) => {
  batchFiles.value.forEach(item => {
    item.semester = value;
  });
};

// 检查是否与已有教材重名
const checkDuplicates = () => {
  const existingTitles = new Set(textbooks.value.map(t => t.title.toLowerCase()));

  batchFiles.value.forEach(item => {
    const fileName = item.file.name.replace(/\.pdf$/i, '');
    const title = (item.title.trim() || fileName).toLowerCase();
    item.isDuplicate = existingTitles.has(title);
  });
};

// 关闭批量上传弹窗
const closeBatchUploadModal = () => {
  showBatchUploadModal.value = false;
  batchFiles.value = [];
  batchUploading.value = false;
  // 重置进度
  uploadProgress.value = {
    current: 0,
    total: 0,
    percentage: 0,
    status: 'default',
    currentFile: '',
    results: [],
  };
};

// 批量上传PDF
const batchUploadPdf = async () => {
  if (batchFiles.value.length === 0) {
    message.warning('请选择PDF文件');
    return;
  }

  // 检查是否有重复项
  const duplicateCount = batchFiles.value.filter(f => f.isDuplicate).length;
  if (duplicateCount > 0) {
    const confirmed = await new Promise(resolve => {
      const d = window.$dialog?.warning({
        title: '存在同名教材',
        content: `有 ${duplicateCount} 个文件与已有教材同名，继续上传将创建重复教材。是否继续？`,
        positiveText: '继续上传',
        negativeText: '取消',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
      });
      // 如果 dialog 不可用，直接继续
      if (!d) resolve(true);
    });

    if (!confirmed) return;
  }

  batchUploading.value = true;

  // 初始化进度
  uploadProgress.value = {
    current: 0,
    total: batchFiles.value.length,
    percentage: 0,
    status: 'default',
    currentFile: '',
    results: [],
  };

  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < batchFiles.value.length; i++) {
      const item = batchFiles.value[i];
      const fileName = item.file.name.replace(/\.pdf$/i, '');
      const title = item.title.trim() || fileName;

      // 更新当前进度
      uploadProgress.value.currentFile = item.file.name;
      uploadProgress.value.current = i + 1;
      uploadProgress.value.percentage = Math.round(((i + 0.5) / batchFiles.value.length) * 100);

      try {
        // 创建教材
        const result = await textbookAPI.createTextbook({
          title,
          subject: item.subject,
          grade: item.grade,
          semester: item.semester,
          version: '人教版',
        });

        // 上传PDF
        const formData = new FormData();
        formData.append('pdf', item.file);
        const uploadResult = await textbookAPI.uploadPdf(result.textbook.id, formData);

        // 生成并保存封面（异步，不阻塞批量上传）
        if (uploadResult.pdfUrl) {
          renderAndSavePdfCover(result.textbook.id, uploadResult.pdfUrl);
        }

        successCount++;
        uploadProgress.value.results.push({
          filename: item.file.name,
          success: true,
        });
      } catch (error) {
        console.error('上传失败:', item.file.name, error);
        failCount++;
        uploadProgress.value.results.push({
          filename: item.file.name,
          success: false,
          error: error.error || error.message || '上传失败',
        });
      }

      // 更新完成进度
      uploadProgress.value.percentage = Math.round(((i + 1) / batchFiles.value.length) * 100);
    }

    // 设置最终状态
    uploadProgress.value.status = failCount === 0 ? 'success' : (successCount === 0 ? 'error' : 'warning');
    uploadProgress.value.currentFile = '';

    if (failCount === 0) {
      message.success(`全部上传成功，共 ${successCount} 个文件`);
      // 成功时自动关闭
      setTimeout(() => {
        closeBatchUploadModal();
        loadTextbooks();
      }, 1500);
    } else {
      message.warning(`上传完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      // 失败时保持显示，让用户看结果
      loadTextbooks();
    }
  } catch (error) {
    message.error('批量上传出错');
    uploadProgress.value.status = 'error';
  } finally {
    // 如果全部失败，允许关闭
    if (uploadProgress.value.status !== 'success') {
      batchUploading.value = false;
    }
  }
};

onMounted(() => {
  loadUploadSettings();
  loadTextbooks();
});
</script>

<style scoped>
.textbook-workspace {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-count {
  font-size: 13px;
  color: #888;
}

/* 翻页 */
.pagination-bar {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* 隐藏教材样式 */
.book-slot.is-hidden {
  opacity: 0.5;
}

.book-slot.is-hidden .slot-front {
  background: #f0f0f0;
}

.upload-file-info {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}

.upload-btn,
.upload-header-btn {
  border-color: #555 !important;
  color: #333 !important;
}

.upload-btn:hover,
.upload-header-btn:hover {
  border-color: #333 !important;
  color: #000 !important;
  background-color: #f5f5f5 !important;
}

.ai-settings-btn {
  color: #666;
  padding: 4px 8px;
  margin-right: 8px;
}

.ai-settings-btn:hover {
  color: #18a058;
}

/* 批量上传样式 */
.batch-upload-container {
  min-height: 300px;
}

.batch-upload-area {
  padding: 20px;
}

.upload-dragger-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
}

.upload-dragger-text {
  font-size: 16px;
  color: #333;
  margin: 0;
}

.upload-dragger-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.batch-file-list {
  padding: 0;
}

.batch-list-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  margin-bottom: 12px;
}

.batch-list-header span:first-child {
  font-weight: 500;
  color: #333;
}

.batch-quick-set {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 16px;
}

.quick-set-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.batch-file-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
}

.batch-file-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #eee;
}

.batch-file-item.duplicate {
  background: #fffbe6;
  border-color: #ffe58f;
}

.file-index {
  width: 24px;
  height: 24px;
  background: #e8e8e8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
  margin-top: 4px;
}

.file-info-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name-label {
  font-size: 12px;
  color: #999;
}

.file-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.file-form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 教材列表 - 书架布局 */
.textbook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 180px));
  gap: 32px 24px;
  justify-content: start;
  padding: 20px 0;
}

/* 书本插槽容器 */
.book-slot {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 5;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.book-slot:hover {
  transform: translateY(-8px);
}

.book-slot:hover .book-body {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

/* 书本主体（背景层） */
.book-body {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 4px 8px 8px 4px;
  overflow: hidden;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    -2px 0 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease;
}

/* 书脊效果 */
.book-body::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  background: linear-gradient(90deg,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.05) 40%,
    rgba(255,255,255,0.1) 50%,
    rgba(0,0,0,0.05) 60%,
    transparent 100%
  );
  z-index: 10;
}

.book-body .cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 无封面时的占位 */
.book-body .cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.book-body .cover-placeholder.chinese {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.book-body .cover-placeholder.math {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
}

.book-body .cover-placeholder.english {
  background: linear-gradient(135deg, #45b7d1 0%, #2980b9 100%);
}

.book-body .subject-badge {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  font-size: 20px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.book-body .loading-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 插槽前挡板（前景层） */
.slot-front {
  position: absolute;
  bottom: 0;
  left: -6px;
  right: -6px;
  height: 35%;
  z-index: 2;
  background: #fafafa;
  border-radius: 8px 8px 10px 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  box-shadow:
    0 -4px 12px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 插槽顶部边缘阴影线 */
.slot-front::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 8px;
  right: 8px;
  height: 3px;
  background: linear-gradient(180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.08) 50%,
    transparent 100%
  );
  border-radius: 2px 2px 0 0;
}

.slot-front .book-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
  flex-shrink: 0;
}

.slot-front .book-meta {
  font-size: 10px;
  color: #888;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.slot-front .slot-actions {
  margin-top: auto;
  display: flex;
  gap: 6px;
}

.slot-front .slot-actions .n-button:first-child {
  flex: 1;
}

.slot-front .slot-actions .n-button:last-child {
  flex-shrink: 0;
}

/* 教材编辑器 */
.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.editor-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.editor-content {
  display: flex;
  gap: 20px;
  min-height: calc(100vh - 180px);
}

.unit-tree {
  width: 300px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  flex-shrink: 0;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 600;
}

.unit-item {
  margin-bottom: 8px;
}

.unit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.unit-header:hover {
  background: #e8edf3;
}

.unit-header span {
  flex: 1;
  font-weight: 500;
}

.lesson-list {
  padding-left: 20px;
  margin-top: 4px;
}

.lesson-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.lesson-item:hover {
  background: #f0f5ff;
}

.lesson-item.active {
  background: #e6f7ff;
  color: #1890ff;
}

.lesson-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.lesson-editor {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.lesson-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.lesson-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 13px;
}

.html-editor {
  flex: 1;
}

.preview-container {
  height: 500px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.lesson-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* 上传设置样式 */
.settings-section {
  padding: 16px 0;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.settings-header span {
  font-weight: 500;
  color: #333;
}

.settings-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #eee;
}

.auto-value {
  flex: 1;
  font-size: 12px;
  color: #18a058;
  padding: 4px 8px;
  background: #e8f5e9;
  border-radius: 4px;
  font-family: monospace;
}

/* 上传进度样式 */
.batch-upload-progress {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 12px;
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.progress-stats {
  font-size: 14px;
  color: #666;
}

.progress-current {
  margin-top: 12px;
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-results {
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.result-item.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.result-item.error {
  background: #ffebee;
  color: #c62828;
}

.result-item .error-msg {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.8;
}
</style>
