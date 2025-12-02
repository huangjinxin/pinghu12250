# 全局标签系统集成指南

## 已完成内容

✅ 数据库Schema（GlobalTag, ContentTag, UserFollowedTag）
✅ 官方标签种子数据（backend/scripts/seed-tags.js）
✅ TagService 服务（backend/src/services/tagService.js）
✅ 规范文档更新（POINT_SYSTEM.md）

## 部署步骤

### 步骤1：运行数据库迁移

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name add_global_tag_system

# 如果失败，使用 push
npx prisma db push
```

### 步骤2：运行种子数据

```bash
# 初始化官方标签
node scripts/seed-tags.js
```

### 步骤3：创建标签路由

创建 `backend/src/routes/tags.js`:

```javascript
const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');
const { authenticate, isAdmin } = require('../middleware/auth');

// ========== 公开接口 ==========

// GET /api/tags/search?q=关键词
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const tags = await tagService.searchTags(q, 10);
    res.json(tags);
  } catch (error) {
    console.error('搜索标签失败:', error);
    res.status(500).json({ error: '搜索标签失败' });
  }
});

// GET /api/tags/hot?days=7
router.get('/hot', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 20;

    const tags = await tagService.getHotTags(days, limit);
    res.json(tags);
  } catch (error) {
    console.error('获取热门标签失败:', error);
    res.status(500).json({ error: '获取热门标签失败' });
  }
});

// GET /api/tags/official
router.get('/official', async (req, res) => {
  try {
    const { category } = req.query;
    const tags = await tagService.getOfficialTags(category);
    res.json(tags);
  } catch (error) {
    console.error('获取官方标签失败:', error);
    res.status(500).json({ error: '获取官方标签失败' });
  }
});

// GET /api/tags/:tagName
router.get('/:tagName', authenticate, async (req, res) => {
  try {
    const { tagName } = req.params;
    const tag = await tagService.getTagDetail(
      decodeURIComponent(tagName),
      req.user?.id
    );

    if (!tag) {
      return res.status(404).json({ error: '标签不存在' });
    }

    res.json(tag);
  } catch (error) {
    console.error('获取标签详情失败:', error);
    res.status(500).json({ error: '获取标签详情失败' });
  }
});

// GET /api/tags/:tagName/contents?type=all&page=1
router.get('/:tagName/contents', async (req, res) => {
  try {
    const { tagName } = req.params;
    const { type = 'ALL', page = 1, limit = 20 } = req.query;

    const result = await tagService.getTagContents(
      decodeURIComponent(tagName),
      {
        contentType: type,
        page: parseInt(page),
        limit: parseInt(limit),
      }
    );

    res.json(result);
  } catch (error) {
    console.error('获取标签内容失败:', error);
    res.status(500).json({ error: '获取标签内容失败' });
  }
});

// ========== 需要认证的接口 ==========

// POST /api/tags/:tagId/follow
router.post('/:tagId/follow', authenticate, async (req, res) => {
  try {
    const { tagId } = req.params;
    const result = await tagService.followTag(req.user.id, tagId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: '关注成功' });
  } catch (error) {
    console.error('关注标签失败:', error);
    res.status(500).json({ error: '关注标签失败' });
  }
});

// DELETE /api/tags/:tagId/follow
router.delete('/:tagId/follow', authenticate, async (req, res) => {
  try {
    const { tagId } = req.params;
    const result = await tagService.unfollowTag(req.user.id, tagId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: '取消关注成功' });
  } catch (error) {
    console.error('取消关注失败:', error);
    res.status(500).json({ error: '取消关注失败' });
  }
});

// GET /api/tags/my-followed
router.get('/my/followed', authenticate, async (req, res) => {
  try {
    const tags = await tagService.getUserFollowedTags(req.user.id);
    res.json(tags);
  } catch (error) {
    console.error('获取关注标签失败:', error);
    res.status(500).json({ error: '获取关注标签失败' });
  }
});

// ========== 管理员接口 ==========

// POST /api/tags/admin/merge
router.post('/admin/merge', authenticate, isAdmin, async (req, res) => {
  try {
    const { sourceTagId, targetTagId } = req.body;

    if (!sourceTagId || !targetTagId) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    const result = await tagService.mergeTags(sourceTagId, targetTagId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: '标签合并成功' });
  } catch (error) {
    console.error('合并标签失败:', error);
    res.status(500).json({ error: '合并标签失败' });
  }
});

// DELETE /api/tags/admin/:tagId
router.delete('/admin/:tagId', authenticate, isAdmin, async (req, res) => {
  try {
    const { tagId } = req.params;
    const result = await tagService.deleteTag(tagId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: '标签删除成功' });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({ error: '删除标签失败' });
  }
});

module.exports = router;
```

### 步骤4：注册路由

在 `backend/src/index.js` 中添加：

```javascript
const tagsRoutes = require('./routes/tags');
app.use('/api/tags', tagsRoutes);
```

### 步骤5：集成到各内容模块

#### 5.1 日记模块（diary.js）

```javascript
const tagService = require('../services/tagService');

// POST /api/diaries - 创建日记
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, content, mood, weather, tags = [] } = req.body;

    const diary = await prisma.diary.create({
      data: {
        authorId: req.user.id,
        title,
        content,
        mood,
        weather,
      },
    });

    // 添加标签
    if (tags.length > 0) {
      await tagService.attachTags('DIARY', diary.id, req.user.id, tags);
    }

    res.status(201).json({ message: '日记创建成功', diary });
  } catch (error) {
    next(error);
  }
});

// PUT /api/diaries/:id - 更新日记
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, mood, weather, tags } = req.body;

    const updated = await prisma.diary.update({
      where: { id },
      data: { title, content, mood, weather },
    });

    // 更新标签
    if (tags !== undefined) {
      await tagService.updateTags('DIARY', id, req.user.id, tags);
    }

    res.json({ message: '更新成功', diary: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/diaries/:id - 获取日记详情
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const diary = await prisma.diary.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 获取标签
    const tags = await tagService.getTags('DIARY', id);
    diary.tags = tags;

    res.json({ diary });
  } catch (error) {
    next(error);
  }
});
```

#### 5.2 同理修改其他模块

- **htmlWork.js**: 使用 `'WORK'` 作为contentType
- **readingNote.js**: 使用 `'READING_LOG'` 作为contentType
- **learning.js**: 使用 `'LEARNING_SESSION'` 作为contentType
- **homework.js**: 使用 `'HOMEWORK'` 作为contentType

每个模块都需要在：
1. 创建时调用 `tagService.attachTags()`
2. 更新时调用 `tagService.updateTags()`
3. 查询详情时调用 `tagService.getTags()`

## 前端组件

### 1. TagInput.vue

```vue
<template>
  <div class="tag-input">
    <div class="tags-container">
      <div v-for="(tag, index) in modelValue" :key="index" class="tag-chip">
        <span>{{ tag }}</span>
        <button @click="removeTag(index)" class="remove-btn">×</button>
      </div>
      <input
        v-model="inputValue"
        @input="onInput"
        @keydown.enter.prevent="addTag"
        @keydown.comma.prevent="addTag"
        placeholder="添加标签（按回车或逗号）"
        class="tag-input-field"
      />
    </div>

    <!-- 搜索建议 -->
    <div v-if="suggestions.length > 0" class="suggestions">
      <div
        v-for="tag in suggestions"
        :key="tag.id"
        @click="selectTag(tag.name)"
        class="suggestion-item"
      >
        <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
        <span>{{ tag.name }}</span>
        <span v-if="tag.isOfficial" class="official-badge">官方</span>
      </div>
    </div>

    <!-- 官方标签快捷选择 -->
    <div v-if="showQuickPicks && !inputValue" class="quick-picks">
      <div class="quick-pick-title">快捷选择</div>
      <div class="quick-pick-tags">
        <button
          v-for="tag in quickPickTags"
          :key="tag.id"
          @click="selectTag(tag.name)"
          class="quick-pick-tag"
          :style="{ borderColor: tag.color, color: tag.color }"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../api/axios';

export default {
  name: 'TagInput',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    showQuickPicks: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      inputValue: '',
      suggestions: [],
      quickPickTags: [],
    };
  },
  mounted() {
    if (this.showQuickPicks) {
      this.loadQuickPicks();
    }
  },
  methods: {
    async onInput() {
      if (this.inputValue.trim()) {
        try {
          const response = await axios.get(`/tags/search?q=${this.inputValue}`);
          this.suggestions = response.data;
        } catch (error) {
          console.error('搜索标签失败:', error);
        }
      } else {
        this.suggestions = [];
      }
    },

    addTag() {
      const tag = this.inputValue.trim();
      if (tag && !this.modelValue.includes(tag)) {
        this.$emit('update:modelValue', [...this.modelValue, tag]);
      }
      this.inputValue = '';
      this.suggestions = [];
    },

    removeTag(index) {
      const newTags = [...this.modelValue];
      newTags.splice(index, 1);
      this.$emit('update:modelValue', newTags);
    },

    selectTag(tagName) {
      if (!this.modelValue.includes(tagName)) {
        this.$emit('update:modelValue', [...this.modelValue, tagName]);
      }
      this.inputValue = '';
      this.suggestions = [];
    },

    async loadQuickPicks() {
      try {
        const response = await axios.get('/tags/hot?limit=12');
        this.quickPickTags = response.data;
      } catch (error) {
        console.error('加载快捷标签失败:', error);
      }
    },
  },
};
</script>

<style scoped>
.tag-input {
  width: 100%;
  position: relative;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  min-height: 48px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 16px;
  font-size: 14px;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
}

.tag-input-field {
  flex: 1;
  border: none;
  outline: none;
  min-width: 120px;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.suggestion-item:hover {
  background: #f3f4f6;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.official-badge {
  margin-left: auto;
  padding: 2px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 12px;
}

.quick-picks {
  margin-top: 12px;
}

.quick-pick-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.quick-pick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-pick-tag {
  padding: 6px 12px;
  border: 1px solid;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.quick-pick-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
```

### 2. TagChip.vue

```vue
<template>
  <router-link
    :to="`/tags/${encodeURIComponent(tag.name)}`"
    class="tag-chip"
    :style="{ backgroundColor: tag.color + '20', color: tag.color }"
  >
    {{ tag.name }}
  </router-link>
</template>

<script>
export default {
  name: 'TagChip',
  props: {
    tag: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style scoped>
.tag-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  text-decoration: none;
  transition: transform 0.2s;
}

.tag-chip:hover {
  transform: translateY(-2px);
}
</style>
```

## 前端页面

由于篇幅限制，前端页面（TagDetail.vue, TagSquare.vue）的完整代码请参考：
- 挑战页面（Challenges.vue）的结构
- 使用类似的卡片布局和Tab切换
- 集成TagChip组件显示标签

## 测试清单

- [ ] 创建日记时添加标签
- [ ] 更新日记时修改标签
- [ ] 标签搜索自动补全
- [ ] 查看标签详情页
- [ ] 关注/取消关注标签
- [ ] 查看热门标签
- [ ] 官方标签显示正确
- [ ] 标签颜色正确显示

## 注意事项

1. 所有内容类型必须使用新的GlobalTag系统
2. 标签名称大小写不敏感
3. 删除内容时，ContentTag会自动级联删除
4. 标签useCount会自动更新

完整实现后，系统将拥有统一的全局标签功能！
