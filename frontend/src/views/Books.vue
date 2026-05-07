<template>
  <div class="books-container">
    <!-- 顶层分类 Tabs -->
    <n-tabs v-model:value="mainTab" type="segment" size="large" class="main-tabs">
      <n-tab name="textbooks">📖 教材</n-tab>
      <n-tab name="reading">📚 读书笔记</n-tab>
    </n-tabs>

    <!-- 读书笔记区域 -->
    <n-card v-show="mainTab === 'reading'" :bordered="false">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 子Tab 1: 我的书架 -->
        <n-tab-pane name="bookshelf" tab="我的书架">
          <div class="mb-4 flex items-center justify-between">
            <n-radio-group v-model:value="shelfStatus" name="status">
              <n-radio-button value="all">全部</n-radio-button>
              <n-radio-button value="WANT_TO_READ">想读</n-radio-button>
              <n-radio-button value="READING">在读</n-radio-button>
              <n-radio-button value="COMPLETED">读完</n-radio-button>
              <n-radio-button value="DROPPED">弃读</n-radio-button>
            </n-radio-group>
            <n-button type="primary" @click="showAddBookModal = true">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加书籍
            </n-button>
          </div>

          <n-spin :show="loadingBookshelf">
            <div v-if="bookshelfList.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <n-card
                v-for="item in bookshelfList"
                :key="item.id"
                class="book-card cursor-pointer hover:shadow-lg transition-shadow"
                @click="$router.push(`/books/${item.book.id}`)"
              >
                <div class="flex gap-4">
                  <img
                    :src="item.book.coverUrl || 'https://via.placeholder.com/100x140?text=No+Cover'"
                    :alt="item.book.title"
                    class="w-20 h-28 object-cover rounded"
                  />
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold mb-1 line-clamp-1">{{ item.book.title }}</h3>
                    <p class="text-sm text-gray-500 mb-2">{{ item.book.author }}</p>
                    <n-tag :type="getStatusType(item.status)" size="small">
                      {{ getStatusLabel(item.status) }}
                    </n-tag>
                    <div class="mt-2 text-xs text-gray-600">
                      <div>已读: {{ item.totalReadPages }} / {{ item.book.totalPages || '?' }} 页</div>
                      <div class="mt-1">
                        <n-progress
                          type="line"
                          :percentage="getReadingProgress(item)"
                          :show-indicator="false"
                          :height="4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="暂无书籍，快去添加吧" class="py-8" />
          </n-spin>
        </n-tab-pane>

        <!-- Tab 2: 阅读动态 -->
        <n-tab-pane name="feed" tab="阅读动态">
          <n-spin :show="loadingFeed">
            <div v-if="readingLogsList.length > 0" class="space-y-4">
              <n-card
                v-for="log in readingLogsList"
                :key="log.id"
                class="reading-log-card"
              >
                <div class="flex items-start gap-3">
                  <AvatarText :username="log.user.username" size="md" />
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="font-semibold">{{ log.user.profile?.nickname || log.user.username }}</span>
                      <span class="text-gray-400 text-sm">读了</span>
                      <span
                        class="text-primary-600 hover:underline cursor-pointer"
                        @click="$router.push(`/books/${log.book.id}`)"
                      >
                        《{{ log.book.title }}》
                      </span>
                    </div>
                    <div v-if="log.chapterInfo" class="text-sm text-gray-600 mb-1">
                      {{ log.chapterInfo }} · {{ log.readPages }} 页
                    </div>
                    <p class="text-gray-800 mb-3">{{ log.content }}</p>
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                      <span>{{ formatDate(log.createdAt) }}</span>
                      <div class="flex items-center gap-3">
                        <button
                          class="flex items-center gap-1 hover:text-primary-600 transition-colors"
                          :class="{ 'text-primary-600': log.myLikeStatus === 'like' }"
                          @click.stop="toggleLike(log.id, true)"
                        >
                          <n-icon :size="18">
                            <ThumbsUpOutline v-if="log.myLikeStatus !== 'LIKE'" />
                            <ThumbsUp v-else />
                          </n-icon>
                          <span>{{ log.likesCount }}</span>
                        </button>
                        <button
                          class="flex items-center gap-1 hover:text-red-600 transition-colors"
                          :class="{ 'text-red-600': log.myLikeStatus === 'dislike' }"
                          @click.stop="toggleLike(log.id, false)"
                        >
                          <n-icon :size="18">
                            <ThumbsDownOutline v-if="log.myLikeStatus !== 'DISLIKE'" />
                            <ThumbsDown v-else />
                          </n-icon>
                          <span>{{ log.dislikesCount }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="还没有阅读动态" class="py-8" />
          </n-spin>
        </n-tab-pane>

        <!-- Tab 3: 书库搜索 -->
        <n-tab-pane name="search" tab="书库搜索">
          <div class="mb-4">
            <n-input
              v-model:value="searchKeyword"
              placeholder="搜索书名或作者"
              clearable
              @keyup.enter="handleBookSearch"
            >
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
              <template #suffix>
                <n-button text @click="handleBookSearch">搜索</n-button>
              </template>
            </n-input>
          </div>

          <!-- 顶部分页 -->
          <div v-if="!loadingSearch && searchTotal > searchPageSize" class="mb-4">
            <n-card>
              <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-sm text-gray-600">
                  共 <span class="font-semibold text-primary-600">{{ searchTotal }}</span> 本书，
                  当前第 <span class="font-semibold text-primary-600">{{ searchPage }}</span> 页，
                  共 <span class="font-semibold text-primary-600">{{ Math.ceil(searchTotal / searchPageSize) }}</span> 页
                </div>
                <n-pagination
                  v-model:page="searchPage"
                  :page-count="Math.ceil(searchTotal / searchPageSize)"
                  :page-size="searchPageSize"
                  show-size-picker
                  :page-sizes="[9, 18, 27, 36]"
                  show-quick-jumper
                  @update:page="loadBooks"
                  @update:page-size="handleSearchPageSizeChange"
                >
                  <template #prefix>
                    <n-button size="small" @click="goToSearchFirstPage" :disabled="searchPage === 1">首页</n-button>
                  </template>
                  <template #suffix>
                    <n-button size="small" @click="goToSearchLastPage" :disabled="searchPage === Math.ceil(searchTotal / searchPageSize)">尾页</n-button>
                  </template>
                </n-pagination>
              </div>
            </n-card>
          </div>

          <n-spin :show="loadingSearch">
            <div v-if="loadingSearch" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <n-skeleton v-for="i in 9" :key="i" height="140px" :sharp="false" />
            </div>

            <n-empty v-else-if="!searchResults.length" description="还没有任何书籍" class="py-8" />

            <div v-else>
              <div v-if="searchKeyword && searchKeyword.trim()" class="mb-3 text-sm text-gray-500">
                搜索结果
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <n-card
                  v-for="book in searchResults"
                  :key="book.id"
                  class="book-card cursor-pointer hover:shadow-lg transition-shadow"
                  @click="$router.push(`/books/${book.id}`)"
                >
                  <div class="flex gap-4">
                    <img
                      :src="book.coverUrl || 'https://via.placeholder.com/100x140?text=No+Cover'"
                      :alt="book.title"
                      class="w-20 h-28 object-cover rounded"
                    />
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold mb-1 line-clamp-2">{{ book.title }}</h3>
                      <p class="text-sm text-gray-500 mb-2">{{ book.author }}</p>
                      <div class="text-xs text-gray-600">
                        <div v-if="book.totalPages">共 {{ book.totalPages }} 页</div>
                        <div v-if="book.sourceType" class="mt-1">
                          <n-tag size="tiny">{{ book.sourceType === 'ebook' ? '电子书' : '纸质书' }}</n-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </n-card>
              </div>
            </div>
          </n-spin>

          <!-- 底部分页 -->
          <div v-if="!loadingSearch && searchTotal > searchPageSize" class="mt-4">
            <n-card>
              <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-sm text-gray-600">
                  共 <span class="font-semibold text-primary-600">{{ searchTotal }}</span> 本书，
                  当前第 <span class="font-semibold text-primary-600">{{ searchPage }}</span> 页，
                  共 <span class="font-semibold text-primary-600">{{ Math.ceil(searchTotal / searchPageSize) }}</span> 页
                </div>
                <n-pagination
                  v-model:page="searchPage"
                  :page-count="Math.ceil(searchTotal / searchPageSize)"
                  :page-size="searchPageSize"
                  show-size-picker
                  :page-sizes="[9, 18, 27, 36]"
                  show-quick-jumper
                  @update:page="loadBooks"
                  @update:page-size="handleSearchPageSizeChange"
                >
                  <template #prefix>
                    <n-button size="small" @click="goToSearchFirstPage" :disabled="searchPage === 1">首页</n-button>
                  </template>
                  <template #suffix>
                    <n-button size="small" @click="goToSearchLastPage" :disabled="searchPage === Math.ceil(searchTotal / searchPageSize)">尾页</n-button>
                  </template>
                </n-pagination>
              </div>
            </n-card>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 教材区域 -->
    <n-card v-show="mainTab === 'textbooks'" :bordered="false">
      <n-tabs v-model:value="textbookTab" type="line" animated>
        <!-- 子Tab 1: 我的教材 -->
        <n-tab-pane name="my-textbooks" tab="我的教材">
          <!-- 搜索筛选区域 -->
          <div class="filter-section mb-4">
            <n-space align="center" :wrap="true">
              <n-input
                v-model:value="myTextbooksSearch"
                placeholder="搜索教材名称..."
                clearable
                style="width: 200px"
                @keyup.enter="handleMyTextbooksSearch"
                @clear="handleMyTextbooksSearch"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-select
                v-model:value="myTextbooksSubject"
                placeholder="科目"
                clearable
                style="width: 120px"
                :options="subjectOptions"
                @update:value="handleMyTextbooksFilterChange"
              />
              <n-select
                v-model:value="myTextbooksSortBy"
                style="width: 120px"
                :options="textbookSortOptions"
                @update:value="handleMyTextbooksFilterChange"
              />
              <n-button type="primary" @click="handleMyTextbooksSearch">
                <template #icon><n-icon><SearchOutline /></n-icon></template>
                搜索
              </n-button>
            </n-space>
          </div>

          <n-spin :show="loadingMyTextbooks">
            <div v-if="myTextbooksList.length > 0" class="textbook-grid">
              <n-card
                v-for="textbook in myTextbooksList"
                :key="textbook.id"
                class="textbook-card hover:shadow-lg transition-shadow"
                hoverable
              >
                <div class="flex gap-4">
                  <div class="textbook-cover" :class="textbook.subject?.toLowerCase()">
                    <img
                      v-if="textbook.coverImage"
                      :src="textbook.coverImage"
                      :alt="textbook.title"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="cover-placeholder">
                      <span class="subject-icon">{{ subjectIcon[textbook.subject] || '📖' }}</span>
                    </div>
                  </div>
                  <div class="flex-1 flex flex-col">
                    <h3 class="text-base font-semibold mb-1 line-clamp-1">{{ textbook.title }}</h3>
                    <p class="text-xs text-gray-500 mb-1">
                      {{ textbook.version }} · {{ textbook.grade }}年级{{ semesterMap[textbook.semester] }}
                    </p>
                    <div class="mt-auto flex items-center gap-2">
                      <n-button size="small" type="primary" @click="startLearning(textbook)">
                        <template #icon><n-icon><PlayOutline /></n-icon></template>
                        继续学习
                      </n-button>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="还没有收藏教材" class="py-8">
              <template #extra>
                <n-button @click="textbookTab = 'library'">去电子书库看看</n-button>
              </template>
            </n-empty>
          </n-spin>

          <!-- 分页组件 -->
          <div v-if="myTextbooksList.length && myTextbooksPagination.totalPages > 1" class="pagination-section mt-6">
            <n-space justify="center" align="center">
              <n-pagination
                v-model:page="myTextbooksPage"
                :page-count="myTextbooksPagination.totalPages"
                :page-size="myTextbooksPageSize"
                :item-count="myTextbooksPagination.total"
                show-size-picker
                show-quick-jumper
                :page-sizes="[12, 24, 48]"
                @update:page="handleMyTextbooksPageChange"
                @update:page-size="handleMyTextbooksPageSizeChange"
              >
                <template #prefix="{ itemCount }">
                  共 {{ itemCount }} 本教材
                </template>
              </n-pagination>
            </n-space>
          </div>
        </n-tab-pane>

        <!-- 子Tab 3: 动态 -->
        <n-tab-pane name="textbook-feed" tab="动态">
          <n-empty description="教材学习动态，敬请期待" class="py-8" />
        </n-tab-pane>

        <!-- 子Tab 4: 电子书库 -->
        <n-tab-pane name="library" tab="电子书库">
          <!-- 搜索筛选区域 -->
          <div class="filter-section mb-4">
            <n-space align="center" :wrap="true">
              <n-input
                v-model:value="librarySearch"
                placeholder="搜索教材名称..."
                clearable
                style="width: 200px"
                @keyup.enter="handleLibrarySearch"
                @clear="handleLibrarySearch"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-select
                v-model:value="librarySubject"
                placeholder="科目"
                clearable
                style="width: 120px"
                :options="subjectOptions"
                @update:value="handleLibraryFilterChange"
              />
              <n-select
                v-model:value="libraryGrade"
                placeholder="年级"
                clearable
                style="width: 100px"
                :options="gradeOptions"
                @update:value="handleLibraryFilterChange"
              />
              <n-select
                v-model:value="librarySortBy"
                style="width: 120px"
                :options="textbookSortOptions"
                @update:value="handleLibraryFilterChange"
              />
              <n-button type="primary" @click="handleLibrarySearch">
                <template #icon><n-icon><SearchOutline /></n-icon></template>
                搜索
              </n-button>
            </n-space>
          </div>

          <div class="mb-4 flex items-center justify-between">
            <span class="text-gray-600 text-sm">共 {{ libraryPagination.total }} 本教材</span>
            <n-button text @click="$router.push('/textbook/workspace')">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              共建教材
            </n-button>
          </div>

          <n-spin :show="loadingTextbooks">
            <div v-if="textbooksList.length > 0" class="textbook-grid">
              <n-card
                v-for="textbook in textbooksList"
                :key="textbook.id"
                class="textbook-card hover:shadow-lg transition-shadow"
                hoverable
              >
                <div class="flex gap-4">
                  <div class="textbook-cover" :class="textbook.subject?.toLowerCase()">
                    <img
                      v-if="textbook.coverImage"
                      :src="textbook.coverImage"
                      :alt="textbook.title"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="cover-placeholder">
                      <span class="subject-icon">{{ subjectIcon[textbook.subject] || '📖' }}</span>
                    </div>
                  </div>
                  <div class="flex-1 flex flex-col">
                    <h3 class="text-base font-semibold mb-1 line-clamp-1">{{ textbook.title }}</h3>
                    <p class="text-xs text-gray-500 mb-1">
                      {{ textbook.version }} · {{ textbook.grade }}年级{{ semesterMap[textbook.semester] }}
                    </p>
                    <p class="text-xs text-gray-400 mb-2">
                      <span v-if="textbook.pdfUrl">
                        <n-tag size="tiny" type="success">PDF</n-tag>
                      </span>
                    </p>
                    <div class="mt-auto flex items-center gap-2">
                      <n-button size="small" type="primary" @click="startLearning(textbook)">
                        <template #icon><n-icon><PlayOutline /></n-icon></template>
                        开始学习
                      </n-button>
                      <n-button
                        size="small"
                        quaternary
                        :type="isTextbookFavorite(textbook.id) ? 'error' : 'default'"
                        @click.stop="toggleTextbookFavorite(textbook.id)"
                      >
                        <template #icon>
                          <n-icon>
                            <Heart v-if="isTextbookFavorite(textbook.id)" />
                            <HeartOutline v-else />
                          </n-icon>
                        </template>
                      </n-button>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="暂无教材，快去共建吧" class="py-8">
              <template #extra>
                <n-button type="primary" @click="$router.push('/textbook/workspace')">
                  前往共建工具区
                </n-button>
              </template>
            </n-empty>
          </n-spin>

          <!-- 分页组件 -->
          <div v-if="textbooksList.length && libraryPagination.totalPages > 1" class="pagination-section mt-6">
            <n-space justify="center" align="center">
              <n-pagination
                v-model:page="libraryPage"
                :page-count="libraryPagination.totalPages"
                :page-size="libraryPageSize"
                :item-count="libraryPagination.total"
                show-size-picker
                show-quick-jumper
                :page-sizes="[12, 24, 48]"
                @update:page="handleLibraryPageChange"
                @update:page-size="handleLibraryPageSizeChange"
              >
                <template #prefix="{ itemCount }">
                  共 {{ itemCount }} 本教材
                </template>
              </n-pagination>
            </n-space>
          </div>
        </n-tab-pane>

        <!-- 子Tab 5: 工作台 -->
        <n-tab-pane name="workspace" tab="工作台">
          <div class="workspace-entry">
            <div class="workspace-icon">🛠️</div>
            <h3>教材共建工具区</h3>
            <p class="text-gray-500 mb-4">上传、编辑和维护电子教材</p>
            <n-button type="primary" size="large" @click="$router.push('/textbook/workspace')">
              进入工作台
            </n-button>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 添加书籍弹窗 -->
    <n-modal v-model:show="showAddBookModal" preset="card" title="添加书籍到书库" style="width: 600px">
      <n-form ref="addBookFormRef" :model="newBook" :rules="addBookRules">
        <n-form-item label="书名" path="title">
          <n-input v-model:value="newBook.title" placeholder="请输入书名" />
        </n-form-item>
        <n-form-item label="作者" path="author">
          <n-input v-model:value="newBook.author" placeholder="请输入作者" />
        </n-form-item>
        <n-form-item label="封面URL" path="coverUrl">
          <n-input v-model:value="newBook.coverUrl" placeholder="请输入封面图片URL（可选）" />
        </n-form-item>
        <n-form-item label="来源类型" path="sourceType">
          <n-radio-group v-model:value="newBook.sourceType">
            <n-radio value="paper">纸质书</n-radio>
            <n-radio value="ebook">电子书</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="来源链接" path="sourceUrl">
          <n-input v-model:value="newBook.sourceUrl" placeholder="请输入来源链接（可选）" />
        </n-form-item>
        <n-form-item label="总页数" path="totalPages">
          <n-input-number v-model:value="newBook.totalPages" placeholder="请输入总页数" :min="1" class="w-full" />
        </n-form-item>
        <n-form-item label="简介" path="description">
          <n-input
            v-model:value="newBook.description"
            type="textarea"
            placeholder="请输入简介（可选）"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAddBookModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddBook" :loading="submittingBook">提交</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import PracticeQuestions from '@/components/textbook/PracticeQuestions.vue'
import StrokeRenderer from '@/components/textbook/StrokeRenderer.vue'
import { getDrawingPreviewUrl } from '@/composables/useStrokeData'
import { ref, computed, onMounted, watch, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NIcon } from 'naive-ui';
import api, { textbookAPI, textbookNoteAPI } from '@/api';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import ThumbsUpOutline from '@vicons/ionicons5/es/ThumbsUpOutline'
import ThumbsUp from '@vicons/ionicons5/es/ThumbsUp'
import ThumbsDownOutline from '@vicons/ionicons5/es/ThumbsDownOutline'
import ThumbsDown from '@vicons/ionicons5/es/ThumbsDown'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import Heart from '@vicons/ionicons5/es/Heart'
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import CloseCircleOutline from '@vicons/ionicons5/es/CloseCircleOutline'
import EllipsisHorizontalOutline from '@vicons/ionicons5/es/EllipsisHorizontalOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import TrashOutline from '@vicons/ionicons5/es/TrashOutline'
import ExpandOutline from '@vicons/ionicons5/es/ExpandOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline'

const router = useRouter();
const message = useMessage();

// 顶层Tab状态
const mainTab = ref('textbooks');

// 读书笔记子Tab状态
const activeTab = ref('bookshelf');

// 我的书架
const shelfStatus = ref('all');
const bookshelfList = ref([]);
const loadingBookshelf = ref(false);

// 阅读动态
const readingLogsList = ref([]);
const loadingFeed = ref(false);

// 书库搜索
const searchKeyword = ref('');
const searchResults = ref([]);
const searchPage = ref(1);
const searchPageSize = ref(9); // 每页显示数量（默认9个，3x3布局）
const searchTotal = ref(0);
const loadingSearch = ref(false);

// 电子教材
const textbookTab = ref('my-textbooks');
const textbooksList = ref([]);
const loadingTextbooks = ref(false);
const myTextbooksList = ref([]);
const loadingMyTextbooks = ref(false);
const textbookNotesList = ref([]);
const loadingTextbookNotes = ref(false);
const notesViewMode = ref('timeline'); // 'timeline' | 'textbook'
const expandedNotes = ref(new Set()); // 展开的笔记ID集合

// ========== 我的笔记 筛选分页 ==========
const notesSearch = ref('');
const notesSourceType = ref(null);
const notesSortBy = ref('latest');
const notesPage = ref(1);
const notesPageSize = ref(20);
const notesPagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });

// 笔记类型选项
const noteTypeOptions = [
  { label: '查字', value: 'dict' },
  { label: '搜索', value: 'search' },
  { label: 'AI分析', value: 'ai_analysis' },
  { label: 'AI对话', value: 'ai_quote' },
  { label: '笔记', value: 'user_note' },
  { label: '摘录', value: 'pdf_selection' },
  { label: '练习', value: 'practice' },
];

// 笔记排序选项
const notesSortOptions = [
  { label: '最新优先', value: 'latest' },
  { label: '最早优先', value: 'oldest' },
];

// ========== 我的教材 筛选分页 ==========
const myTextbooksSearch = ref('');
const myTextbooksSubject = ref(null);
const myTextbooksSortBy = ref('latest');
const myTextbooksPage = ref(1);
const myTextbooksPageSize = ref(12);
const myTextbooksPagination = ref({ page: 1, limit: 12, total: 0, totalPages: 0 });

// ========== 电子书库 筛选分页 ==========
const librarySearch = ref('');
const librarySubject = ref(null);
const libraryGrade = ref(null);
const librarySortBy = ref('latest');
const libraryPage = ref(1);
const libraryPageSize = ref(12);
const libraryPagination = ref({ page: 1, limit: 12, total: 0, totalPages: 0 });
const libraryFilterOptions = ref({ subjects: [], grades: [] }); // 服务器返回的筛选选项

// 科目中英文映射（用于显示）
const subjectLabelMap = {
  'CHINESE': '语文',
  'MATH': '数学',
  'ENGLISH': '英语',
  'SCIENCE': '科学',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治',
  'MORAL': '道德法治',
  'IT': '信息技术',
  'MUSIC': '音乐',
  'ART': '美术',
  'PE': '体育',
};

// 科目选项（使用服务器返回的数据）
const subjectOptions = computed(() => {
  return libraryFilterOptions.value.subjects.map(s => ({
    label: subjectLabelMap[s] || s, // 如果没有映射则直接显示原值
    value: s
  })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
});

// 年级选项（使用服务器返回的数据）
const gradeOptions = computed(() => {
  return libraryFilterOptions.value.grades.map(g => ({
    label: `${g}年级`,
    value: g
  }));
});

// 教材排序选项
const textbookSortOptions = [
  { label: '最新上传', value: 'latest' },
  { label: '按年级', value: 'grade' },
  { label: '按科目', value: 'subject' },
];

// 按日期分组笔记
const notesByDate = computed(() => {
  const groups = {};
  textbookNotesList.value.forEach(note => {
    const date = new Date(note.createdAt);
    const dateKey = formatDateKey(date);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(note);
  });
  return groups;
});

// 按教材分组笔记
const notesByTextbook = computed(() => {
  const groups = {};
  textbookNotesList.value.forEach(note => {
    const textbookId = note.textbookId || 'unknown';
    if (!groups[textbookId]) {
      groups[textbookId] = {
        title: note.textbook?.title || '未知教材',
        notes: []
      };
    }
    groups[textbookId].notes.push(note);
  });
  return groups;
});

// 格式化日期键
const formatDateKey = (date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (noteDate.getTime() === today.getTime()) {
    return '今天';
  } else if (noteDate.getTime() === yesterday.getTime()) {
    return '昨天';
  } else if (now.getTime() - noteDate.getTime() < 7 * 86400000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  }
};

// 格式化笔记详细时间
const formatNoteDetailTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 跳转到教材页面
const goToTextbookPage = (note) => {
  if (note.textbookId) {
    router.push(`/textbook/reader/${note.textbookId}?page=${note.page || 1}`);
  }
};

// 展开/折叠笔记（一次只展开一个）
const toggleNoteExpand = (note) => {
  if (expandedNotes.value.has(note.id)) {
    expandedNotes.value.delete(note.id);
  } else {
    // 展开新的笔记前，先清除其他展开的笔记
    expandedNotes.value.clear();
    expandedNotes.value.add(note.id);
  }
  // 触发响应式更新
  expandedNotes.value = new Set(expandedNotes.value);
};

// 获取笔记完整内容
const getNoteFullText = (note) => {
  if (note.content?.text) return note.content.text;
  return note.snippet || '';
};

// 获取练习题数组（兼容多题和单题两种格式）
const getPracticeQuestions = (note) => {
  if (!note?.content) return [];
  // 多题格式：{ questions: [...] }
  if (Array.isArray(note.content.questions) && note.content.questions.length > 0) {
    return note.content.questions;
  }
  // 单题格式：{ question: {...} }
  if (note.content.question && note.content.question.stem) {
    return [note.content.question];
  }
  return [];
};

// 收藏ID集合（从服务器加载）
const textbookFavorites = ref(new Set());
const subjectIcon = {
  CHINESE: '语',
  MATH: '数',
  ENGLISH: '英',
  SCIENCE: '科',
  PHYSICS: '物',
  CHEMISTRY: '化',
  BIOLOGY: '生',
  HISTORY: '史',
  GEOGRAPHY: '地',
  POLITICS: '政',
  MUSIC: '音',
  ART: '美',
  PE: '体',
  IT: '信',
  MORAL: '德',
};
const semesterMap = {
  UP: '上册',
  DOWN: '下册',
  FULL: '全册',
};

// 添加书籍
const showAddBookModal = ref(false);
const submittingBook = ref(false);
const addBookFormRef = ref(null);
const newBook = ref({
  title: '',
  author: '',
  coverUrl: '',
  sourceType: 'paper',
  sourceUrl: '',
  totalPages: null,
  description: '',
});

const addBookRules = {
  title: { required: true, message: '请输入书名', trigger: 'blur' },
  author: { required: true, message: '请输入作者', trigger: 'blur' },
  totalPages: { required: true, type: 'number', message: '请输入总页数', trigger: 'blur' },
};

// 获取我的书架
const fetchBookshelf = async () => {
  try {
    loadingBookshelf.value = true;
    const params = {};
    if (shelfStatus.value !== 'all') {
      params.status = shelfStatus.value;
    }
    const response = await api.get('/books/bookshelf/my', { params });
    bookshelfList.value = response.bookshelves;
  } catch (error) {
    console.error('获取书架失败:', error);
    message.error(error.error || '获取书架失败');
  } finally {
    loadingBookshelf.value = false;
  }
};

// 获取阅读动态
const fetchReadingLogs = async () => {
  try {
    loadingFeed.value = true;
    const response = await api.get('/books/reading-logs');
    readingLogsList.value = response.readingLogs;
  } catch (error) {
    console.error('获取阅读动态失败:', error);
    message.error(error.error || '获取阅读动态失败');
  } finally {
    loadingFeed.value = false;
  }
};

// 搜索按钮点击
const handleBookSearch = () => {
  // 搜索时重置到第一页
  searchPage.value = 1;
  loadBooks();
};

// 分页控制函数
const goToSearchFirstPage = () => {
  searchPage.value = 1;
  loadBooks();
};

const goToSearchLastPage = () => {
  searchPage.value = Math.ceil(searchTotal.value / searchPageSize.value);
  loadBooks();
};

const handleSearchPageSizeChange = (newPageSize) => {
  searchPageSize.value = newPageSize;
  searchPage.value = 1; // 改变每页数量时重置到第一页
  loadBooks();
};

// 加载书籍（包括搜索和分页）
const loadBooks = async () => {
  try {
    loadingSearch.value = true;
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const params = {
      page: searchPage.value,
      limit: searchPageSize.value,
    };

    // 如果有搜索关键词，添加到参数中
    if (searchKeyword.value && searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim();
    }

    const response = await api.get('/books/search', { params });
    searchResults.value = response.books || [];
    // 从响应中获取总数
    searchTotal.value = response.total || response.pagination?.total || 0;
  } catch (error) {
    console.error('加载书籍失败:', error);
    message.error(error.error || '加载书籍失败');
  } finally {
    loadingSearch.value = false;
  }
};

// 添加书籍
const handleAddBook = async () => {
  try {
    await addBookFormRef.value?.validate();
    submittingBook.value = true;
    await api.post('/books', newBook.value);
    message.success('添加书籍成功，奖励 +2 积分');
    showAddBookModal.value = false;
    // 重置表单
    newBook.value = {
      title: '',
      author: '',
      coverUrl: '',
      sourceType: 'paper',
      sourceUrl: '',
      totalPages: null,
      description: '',
    };
    // 刷新搜索结果
    loadBooks();
  } catch (error) {
    if (error.error) {
      message.error(error.error);
    } else {
      console.error('添加书籍失败:', error);
    }
  } finally {
    submittingBook.value = false;
  }
};

// 点赞/点踩
const toggleLike = async (logId, isLike) => {
  try {
    await api.post(`/books/reading-logs/${logId}/like`, { isLike });
    // 刷新阅读动态
    await fetchReadingLogs();
  } catch (error) {
    console.error('操作失败:', error);
    message.error(error.error || '操作失败');
  }
};

// 获取电子教材列表（电子书库）
const fetchTextbooks = async () => {
  try {
    loadingTextbooks.value = true;
    const params = {
      page: libraryPage.value,
      limit: libraryPageSize.value,
      sortBy: librarySortBy.value,
    };
    if (librarySearch.value && librarySearch.value.trim()) {
      params.search = librarySearch.value.trim();
    }
    if (librarySubject.value) {
      params.subject = librarySubject.value;
    }
    if (libraryGrade.value) {
      params.grade = libraryGrade.value;
    }
    const response = await textbookAPI.getPublicTextbooks(params);
    textbooksList.value = response.textbooks || [];
    if (response.pagination) {
      libraryPagination.value = response.pagination;
    }
    // 保存筛选选项（来自服务器，包含所有教材的科目和年级）
    if (response.filterOptions) {
      libraryFilterOptions.value = response.filterOptions;
    }
  } catch (error) {
    console.error('获取教材列表失败:', error);
    message.error('获取教材列表失败');
  } finally {
    loadingTextbooks.value = false;
  }
};

// 电子书库 - 搜索
const handleLibrarySearch = () => {
  libraryPage.value = 1;
  fetchTextbooks();
};

// 电子书库 - 筛选变化
const handleLibraryFilterChange = () => {
  libraryPage.value = 1;
  fetchTextbooks();
};

// 电子书库 - 翻页
const handleLibraryPageChange = (page) => {
  libraryPage.value = page;
  fetchTextbooks();
};

// 电子书库 - 改变每页数量
const handleLibraryPageSizeChange = (size) => {
  libraryPageSize.value = size;
  libraryPage.value = 1;
  fetchTextbooks();
};

// 收藏/取消收藏教材
const toggleTextbookFavorite = async (textbookId) => {
  try {
    if (textbookFavorites.value.has(textbookId)) {
      // 取消收藏
      await textbookAPI.removeFavorite(textbookId);
      textbookFavorites.value.delete(textbookId);
      textbookFavorites.value = new Set(textbookFavorites.value);
      myTextbooksList.value = myTextbooksList.value.filter(t => t.id !== textbookId);
      message.success('已取消收藏');
    } else {
      // 添加收藏
      await textbookAPI.addFavorite(textbookId);
      textbookFavorites.value.add(textbookId);
      textbookFavorites.value = new Set(textbookFavorites.value);
      // 添加到我的教材列表
      const textbook = textbooksList.value.find(t => t.id === textbookId);
      if (textbook && !myTextbooksList.value.find(t => t.id === textbookId)) {
        myTextbooksList.value.unshift(textbook);
      }
      message.success('已收藏');
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    message.error('操作失败');
  }
};

// 检查是否收藏
const isTextbookFavorite = (textbookId) => {
  return textbookFavorites.value.has(textbookId);
};

// 开始学习教材
const startLearning = (textbook) => {
  if (textbook.pdfUrl) {
    router.push(`/textbook/reader/${textbook.id}`);
  } else {
    router.push(`/textbook`);
    message.info('该教材暂无 PDF，请从课文列表选择阅读');
  }
};

// 获取教材课文数量
const getTotalLessons = (textbook) => {
  if (!textbook.units) return 0;
  return textbook.units.reduce((count, unit) => count + (unit.lessons?.length || 0), 0);
};

// 获取我的教材（收藏的教材）- 从服务器加载
const fetchMyTextbooks = async () => {
  loadingMyTextbooks.value = true;
  try {
    const params = {
      page: myTextbooksPage.value,
      limit: myTextbooksPageSize.value,
      sortBy: myTextbooksSortBy.value,
    };
    if (myTextbooksSearch.value && myTextbooksSearch.value.trim()) {
      params.search = myTextbooksSearch.value.trim();
    }
    if (myTextbooksSubject.value) {
      params.subject = myTextbooksSubject.value;
    }
    const response = await textbookAPI.getFavorites(params);
    myTextbooksList.value = response.textbooks || [];
    // 同步更新收藏ID集合
    textbookFavorites.value = new Set(myTextbooksList.value.map(t => t.id));
    if (response.pagination) {
      myTextbooksPagination.value = response.pagination;
    }
  } catch (error) {
    console.error('获取我的教材失败:', error);
  } finally {
    loadingMyTextbooks.value = false;
  }
};

// 我的教材 - 搜索
const handleMyTextbooksSearch = () => {
  myTextbooksPage.value = 1;
  fetchMyTextbooks();
};

// 我的教材 - 筛选变化
const handleMyTextbooksFilterChange = () => {
  myTextbooksPage.value = 1;
  fetchMyTextbooks();
};

// 我的教材 - 翻页
const handleMyTextbooksPageChange = (page) => {
  myTextbooksPage.value = page;
  fetchMyTextbooks();
};

// 我的教材 - 改变每页数量
const handleMyTextbooksPageSizeChange = (size) => {
  myTextbooksPageSize.value = size;
  myTextbooksPage.value = 1;
  fetchMyTextbooks();
};

// 获取教材笔记
const fetchTextbookNotes = async () => {
  loadingTextbookNotes.value = true;
  try {
    const params = {
      page: notesPage.value,
      limit: notesPageSize.value,
      sortBy: notesSortBy.value,
    };
    if (notesSearch.value && notesSearch.value.trim()) {
      params.search = notesSearch.value.trim();
    }
    if (notesSourceType.value) {
      params.sourceType = notesSourceType.value;
    }
    const response = await textbookNoteAPI.list(params);
    textbookNotesList.value = response.data?.notes || [];
    if (response.data?.pagination) {
      notesPagination.value = response.data.pagination;
    }
  } catch (error) {
    console.error('获取教材笔记失败:', error);
  } finally {
    loadingTextbookNotes.value = false;
  }
};

// 我的笔记 - 搜索
const handleNotesSearch = () => {
  notesPage.value = 1;
  fetchTextbookNotes();
};

// 我的笔记 - 筛选变化
const handleNotesFilterChange = () => {
  notesPage.value = 1;
  fetchTextbookNotes();
};

// 我的笔记 - 翻页
const handleNotesPageChange = (page) => {
  notesPage.value = page;
  fetchTextbookNotes();
};

// 我的笔记 - 改变每页数量
const handleNotesPageSizeChange = (size) => {
  notesPageSize.value = size;
  notesPage.value = 1;
  fetchTextbookNotes();
};

// 删除教材笔记
const deleteTextbookNote = async (noteId) => {
  try {
    await textbookNoteAPI.delete(noteId);
    textbookNotesList.value = textbookNotesList.value.filter(n => n.id !== noteId);
    message.success('笔记已删除');
  } catch (error) {
    message.error('删除失败');
  }
};

// 笔记操作菜单选项
const noteActionOptions = [
  {
    label: '跳转教材',
    key: 'jump',
    icon: () => h(NIcon, null, { default: () => h(BookOutline) })
  },
  {
    label: '专注模式',
    key: 'focus',
    icon: () => h(NIcon, null, { default: () => h(ExpandOutline) })
  },
  {
    label: '编辑',
    key: 'edit',
    icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
  },
  {
    label: '删除',
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
  }
];

// 处理笔记操作
const handleNoteAction = (key, note) => {
  if (key === 'delete') {
    deleteTextbookNote(note.id);
  } else if (key === 'jump') {
    // 跳转到教材对应页面
    if (note.textbookId) {
      router.push(`/textbook/reader/${note.textbookId}?page=${note.page || 1}`);
      message.info(`已跳转到第 ${note.page} 页`);
    } else {
      message.warning('该笔记没有关联教材');
    }
  } else if (key === 'focus') {
    // 进入专注模式
    router.push(`/textbook/focus/${note.id}`);
  } else if (key === 'edit') {
    // 展开笔记以便查看/编辑
    if (!expandedNotes.value.has(note.id)) {
      expandedNotes.value.add(note.id);
      expandedNotes.value = new Set(expandedNotes.value);
    }
    message.info('已展开笔记内容');
  }
};

// 笔记类型标签
const getNoteTypeLabel = (sourceType) => {
  const map = {
    'dict': '查字',
    'search': '搜索',
    'ai_analysis': 'AI分析',
    'ai_quote': 'AI对话',
    'user_note': '笔记',
    'pdf_selection': '摘录',
    'practice': '练习',
    'drawing': '草稿',
  };
  return map[sourceType] || '笔记';
};

// 笔记类型样式
const getNoteTypeStyle = (sourceType) => {
  const map = {
    'dict': 'info',
    'search': 'default',
    'ai_analysis': 'success',
    'ai_quote': 'success',
    'user_note': 'warning',
    'pdf_selection': 'info',
    'practice': 'primary',
    'drawing': 'warning',
  };
  return map[sourceType] || 'default';
};

// 工具函数
const getStatusType = (status) => {
  const types = {
    WANT_TO_READ: 'default',
    READING: 'info',
    COMPLETED: 'success',
    DROPPED: 'warning',
  };
  return types[status] || 'default';
};

const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_READ: '想读',
    READING: '在读',
    COMPLETED: '读完',
    DROPPED: '弃读',
  };
  return labels[status] || status;
};

const getReadingProgress = (item) => {
  if (!item.book.totalPages) return 0;
  return Math.min(Math.round((item.totalReadPages / item.book.totalPages) * 100), 100);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN');
};

// 监听书架状态变化
watch(shelfStatus, () => {
  fetchBookshelf();
});

// 监听顶层tab切换
watch(mainTab, (newTab) => {
  if (newTab === 'textbooks') {
    // 切换到教材区域时，根据当前子tab加载数据
    if (textbookTab.value === 'my-textbooks' && myTextbooksList.value.length === 0) {
      fetchMyTextbooks();
    } else if (textbookTab.value === 'library' && textbooksList.value.length === 0) {
      fetchTextbooks();
    } else if (textbookTab.value === 'my-notes' && textbookNotesList.value.length === 0) {
      fetchTextbookNotes();
    }
  }
});

// 监听教材子tab切换
watch(textbookTab, (newTab) => {
  if (newTab === 'my-textbooks' && myTextbooksList.value.length === 0) {
    fetchMyTextbooks();
  } else if (newTab === 'library' && textbooksList.value.length === 0) {
    fetchTextbooks();
  } else if (newTab === 'my-notes' && textbookNotesList.value.length === 0) {
    fetchTextbookNotes();
  }
});

// 监听读书笔记子tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'bookshelf' && bookshelfList.value.length === 0) {
    fetchBookshelf();
  } else if (newTab === 'feed' && readingLogsList.value.length === 0) {
    fetchReadingLogs();
  } else if (newTab === 'search' && searchResults.value.length === 0) {
    loadBooks();
  }
});

// 初始化
onMounted(() => {
  // 默认进入教材-我的笔记页面，加载笔记数据
  fetchTextbookNotes();
  // 加载收藏列表（用于显示收藏状态）
  fetchMyTextbooks();
});
</script>

<style scoped>
.books-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 草稿预览缩略图 */
.drawing-preview-thumb {
  max-width: 120px;
  max-height: 80px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  margin: 4px 0;
}

/* 顶层分类 Tabs */
.main-tabs {
  margin-bottom: 16px;
}

.main-tabs :deep(.n-tabs-tab) {
  font-size: 16px;
  padding: 10px 24px;
}

.book-card {
  transition: all 0.3s ease;
}

.book-card:hover {
  transform: translateY(-2px);
}

.reading-log-card {
  border-left: 3px solid var(--n-color-target);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 教材网格 */
.textbook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.textbook-card {
  transition: all 0.3s ease;
}

.textbook-card:hover {
  transform: translateY(-2px);
}

/* 教材封面 */
.textbook-cover {
  width: 80px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.textbook-cover.chinese {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.textbook-cover.math {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
}

.textbook-cover.english {
  background: linear-gradient(135deg, #45b7d1 0%, #2980b9 100%);
}

.textbook-cover .cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.textbook-cover .subject-icon {
  font-size: 28px;
  color: white;
  font-weight: 600;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

@media (max-width: 640px) {
  .textbook-grid {
    grid-template-columns: 1fr;
  }
}

/* 搜索筛选区域 - 统一样式 */
.filter-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

/* 分页区域 - 统一样式 */
.pagination-section {
  padding: 16px 0;
  border-top: 1px solid #e9ecef;
}

/* 工作台入口 */
.workspace-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.workspace-entry .workspace-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.workspace-entry h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

/* 笔记列表 */
.notes-list {
  max-width: 600px;
}

.note-card {
  cursor: pointer;
  transition: all 0.2s;
}

.note-card:hover {
  border-color: #1890ff;
}

.note-card.expanded {
  background: #f6f8fa;
  border-color: #d0d7de;
}

.note-expanded-content {
  margin-top: 8px;
  padding: 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

/* 时间线视图 */
.notes-timeline {
  max-width: 700px;
}

.timeline-group {
  margin-bottom: 24px;
}

.timeline-date {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.timeline-items {
  padding-left: 12px;
}

/* 按教材分组视图 */
.notes-by-textbook {
  max-width: 700px;
}

.notes-group-items {
  padding: 8px 0;
}
</style>
