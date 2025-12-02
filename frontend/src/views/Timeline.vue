<template>
  <div class="space-y-6">
    <!-- 发布框 -->
    <div class="card">
      <div class="flex space-x-3">
        <AvatarText :username="authStore.user?.username" size="md" />
        <div class="flex-1">
          <n-input
            v-model:value="newPost.content"
            type="textarea"
            placeholder="分享你的想法..."
            :rows="3"
          />
          <div class="flex items-center justify-between mt-3">
            <n-checkbox v-model:checked="newPost.isPublic">公开到广场</n-checkbox>
            <n-button type="primary" :loading="posting" :disabled="!newPost.content.trim()" @click="createPost">
              发布
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页切换 -->
    <n-tabs v-model:value="activeTab" type="line" @update:value="loadPosts">
      <n-tab-pane name="personal" tab="我的动态" />
      <n-tab-pane name="public" tab="公共广场" />
    </n-tabs>

    <!-- 动态列表 -->
    <div v-if="loading" class="space-y-4">
      <n-skeleton v-for="i in 3" :key="i" height="150px" :sharp="false" />
    </div>

    <n-empty v-else-if="!posts.length" :description="activeTab === 'personal' ? '还没有发布动态' : '暂无公开动态'" />

    <div v-else class="space-y-4">
      <div v-for="post in posts" :key="post.id" class="card">
        <!-- 用户信息 -->
        <div class="flex items-center space-x-3 mb-3">
          <AvatarText :username="post.author.username" size="md" />
          <div class="flex-1">
            <div class="font-medium cursor-pointer hover:text-primary-600 transition-colors" @click.stop="$router.push(`/users/${post.author.id}`)">
              {{ post.author.profile?.nickname || post.author.username }}
            </div>
            <div class="text-sm text-gray-500">{{ formatTime(post.createdAt) }}</div>
          </div>
          <n-button v-if="post.authorId === authStore.user?.id" size="small" quaternary type="error" @click="deletePost(post)">
            删除
          </n-button>
        </div>

        <!-- 内容 -->
        <p class="text-gray-700 whitespace-pre-wrap mb-3">{{ post.content }}</p>

        <!-- 图片 -->
        <div v-if="post.images?.length" class="grid grid-cols-3 gap-2 mb-3">
          <img v-for="(img, i) in post.images" :key="i" :src="img" class="w-full h-24 object-cover rounded" />
        </div>

        <!-- 操作栏 -->
        <div class="flex items-center space-x-6 pt-3 border-t border-gray-100">
          <button class="flex items-center space-x-1 text-gray-500 hover:text-red-500" @click="toggleLike(post)">
            <n-icon :size="18"><HeartOutline v-if="!post.isLiked" /><Heart v-else class="text-red-500" /></n-icon>
            <span>{{ post._count?.likes || 0 }}</span>
          </button>
          <button class="flex items-center space-x-1 text-gray-500 hover:text-primary-500" @click="toggleComments(post)">
            <n-icon :size="18"><ChatbubbleOutline /></n-icon>
            <span>{{ post._count?.comments || 0 }}</span>
          </button>
        </div>

        <!-- 评论区 -->
        <div v-if="post.showComments" class="mt-4 pt-4 border-t border-gray-100">
          <div v-if="post.comments?.length" class="space-y-3 mb-3">
            <div v-for="comment in post.comments" :key="comment.id" class="flex space-x-2">
              <AvatarText :username="comment.author.username" size="sm" />
              <div class="flex-1 bg-gray-50 rounded-lg p-2">
                <span
                  class="font-medium text-sm cursor-pointer hover:text-primary-600 transition-colors"
                  @click.stop="$router.push(`/users/${comment.author.id}`)"
                >
                  {{ comment.author.profile?.nickname || comment.author.username }}
                </span>
                <p class="text-sm text-gray-700">{{ comment.content }}</p>
              </div>
            </div>
          </div>
          <div class="flex space-x-2">
            <n-input v-model:value="post.newComment" placeholder="写评论..." size="small" />
            <n-button size="small" type="primary" :disabled="!post.newComment?.trim()" @click="addComment(post)">
              发送
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="text-center">
      <n-button :loading="loadingMore" @click="loadMore">加载更多</n-button>
    </div>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { postAPI } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { HeartOutline, Heart, ChatbubbleOutline } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const loadingMore = ref(false);
const posting = ref(false);
const posts = ref([]);
const activeTab = ref('personal');
const page = ref(1);
const hasMore = ref(false);

const newPost = ref({ content: '', isPublic: false });

const formatTime = (date) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });

const loadPosts = async (reset = true) => {
  if (reset) {
    page.value = 1;
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const params = { page: page.value, limit: 10 };
    if (activeTab.value === 'personal') {
      params.type = 'personal';
    } else {
      params.type = 'public';
    }
    const data = await postAPI.getPosts(params);
    const newPosts = (data.posts || data).map(p => ({ ...p, showComments: false, newComment: '' }));

    if (reset) {
      posts.value = newPosts;
    } else {
      posts.value.push(...newPosts);
    }
    hasMore.value = newPosts.length === 10;
  } catch (error) {
    message.error('加载动态失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  page.value++;
  loadPosts(false);
};

const createPost = async () => {
  posting.value = true;
  try {
    await postAPI.createPost(newPost.value);
    message.success('发布成功');
    newPost.value = { content: '', isPublic: false };
    loadPosts();
  } catch (error) {
    message.error(error.error || '发布失败');
  } finally {
    posting.value = false;
  }
};

const deletePost = (post) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条动态吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await postAPI.deletePost(post.id);
        message.success('删除成功');
        loadPosts();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const toggleLike = async (post) => {
  try {
    await postAPI.toggleLike(post.id);
    post.isLiked = !post.isLiked;
    post._count.likes += post.isLiked ? 1 : -1;
  } catch (error) {
    message.error('操作失败');
  }
};

const toggleComments = async (post) => {
  post.showComments = !post.showComments;
  if (post.showComments && !post.comments) {
    try {
      const data = await postAPI.getPostById(post.id);
      post.comments = data.comments || [];
    } catch (error) {
      console.error('加载评论失败');
    }
  }
};

const addComment = async (post) => {
  if (!post.newComment?.trim()) return;
  try {
    await postAPI.addComment(post.id, post.newComment);
    message.success('评论成功');
    post.newComment = '';
    post._count.comments++;
    // 重新加载评论
    const data = await postAPI.getPostById(post.id);
    post.comments = data.comments || [];
  } catch (error) {
    message.error(error.error || '评论失败');
  }
};

onMounted(() => {
  loadPosts();
});
</script>
