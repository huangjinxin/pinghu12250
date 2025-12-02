/**
 * 全局标签服务
 * 统一管理所有内容的标签
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 颜色方案
const COLOR_SCHEMES = {
  SUBJECT: ['#3B82F6', '#2563EB', '#1D4ED8'],
  SKILL: ['#10B981', '#059669', '#047857'],
  PROGRAMMING: ['#8B5CF6', '#7C3AED', '#6D28D9'],
  INTEREST: ['#F59E0B', '#D97706', '#B45309'],
  OTHER: ['#6B7280', '#4B5563', '#374151'],
};

class TagService {
  /**
   * 为内容添加标签
   * @param {string} contentType - 内容类型 (DIARY, WORK, READING_LOG等)
   * @param {string} contentId - 内容ID
   * @param {string} userId - 用户ID
   * @param {string[]} tagNames - 标签名称数组
   * @returns {Promise<{success: boolean, tags: array}>}
   */
  async attachTags(contentType, contentId, userId, tagNames) {
    try {
      if (!tagNames || tagNames.length === 0) {
        return { success: true, tags: [] };
      }

      // 过滤空标签和去重
      const uniqueTagNames = [...new Set(tagNames.filter(name => name && name.trim()))];

      const attachedTags = [];

      for (const tagName of uniqueTagNames) {
        // 获取或创建标签
        const tag = await this.getOrCreateTag(tagName.trim(), userId);

        // 检查是否已经关联
        const existingLink = await prisma.contentTag.findFirst({
          where: {
            tagId: tag.id,
            contentType,
            contentId,
          },
        });

        if (!existingLink) {
          // 创建关联
          await prisma.contentTag.create({
            data: {
              tagId: tag.id,
              contentType,
              contentId,
              userId,
            },
          });

          // 更新使用次数
          await prisma.globalTag.update({
            where: { id: tag.id },
            data: {
              useCount: {
                increment: 1,
              },
            },
          });
        }

        attachedTags.push(tag);
      }

      return { success: true, tags: attachedTags };
    } catch (error) {
      console.error('添加标签失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新内容的标签（先删除旧的，再添加新的）
   * @param {string} contentType - 内容类型
   * @param {string} contentId - 内容ID
   * @param {string} userId - 用户ID
   * @param {string[]} tagNames - 新的标签名称数组
   * @returns {Promise<{success: boolean, tags: array}>}
   */
  async updateTags(contentType, contentId, userId, tagNames) {
    try {
      // 删除旧的标签关联
      const oldTags = await prisma.contentTag.findMany({
        where: {
          contentType,
          contentId,
        },
        include: {
          tag: true,
        },
      });

      // 删除关联并减少使用次数
      for (const oldTag of oldTags) {
        await prisma.contentTag.delete({
          where: { id: oldTag.id },
        });

        await prisma.globalTag.update({
          where: { id: oldTag.tagId },
          data: {
            useCount: {
              decrement: 1,
            },
          },
        });
      }

      // 添加新标签
      return await this.attachTags(contentType, contentId, userId, tagNames);
    } catch (error) {
      console.error('更新标签失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取内容的标签
   * @param {string} contentType - 内容类型
   * @param {string} contentId - 内容ID
   * @returns {Promise<array>}
   */
  async getTags(contentType, contentId) {
    try {
      const contentTags = await prisma.contentTag.findMany({
        where: {
          contentType,
          contentId,
        },
        include: {
          tag: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return contentTags.map(ct => ct.tag);
    } catch (error) {
      console.error('获取标签失败:', error);
      return [];
    }
  }

  /**
   * 获取或创建标签
   * @param {string} tagName - 标签名称
   * @param {string} userId - 用户ID
   * @param {string} category - 分类（可选）
   * @returns {Promise<object>}
   */
  async getOrCreateTag(tagName, userId, category = 'OTHER') {
    try {
      // 大小写不敏感查询
      let tag = await prisma.globalTag.findFirst({
        where: {
          name: {
            equals: tagName,
            mode: 'insensitive',
          },
        },
      });

      if (!tag) {
        // 创建新标签
        const color = this._getRandomColor(category);

        tag = await prisma.globalTag.create({
          data: {
            name: tagName,
            category,
            color,
            createdBy: userId,
            useCount: 0,
            isOfficial: false,
          },
        });
      }

      return tag;
    } catch (error) {
      console.error('获取或创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 搜索标签（用于自动补全）
   * @param {string} query - 搜索关键词
   * @param {number} limit - 返回数量限制
   * @returns {Promise<array>}
   */
  async searchTags(query, limit = 10) {
    try {
      const tags = await prisma.globalTag.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        orderBy: [
          { isOfficial: 'desc' }, // 官方标签优先
          { useCount: 'desc' },   // 使用次数倒序
        ],
        take: limit,
      });

      return tags;
    } catch (error) {
      console.error('搜索标签失败:', error);
      return [];
    }
  }

  /**
   * 获取热门标签
   * @param {number} days - 时间范围（天）
   * @param {number} limit - 返回数量限制
   * @returns {Promise<array>}
   */
  async getHotTags(days = 7, limit = 20) {
    try {
      // 如果指定了天数，则查询该时间段内的使用情况
      if (days > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 统计时间范围内的使用次数
        const tagUsage = await prisma.contentTag.groupBy({
          by: ['tagId'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: {
            tagId: true,
          },
          orderBy: {
            _count: {
              tagId: 'desc',
            },
          },
          take: limit,
        });

        // 获取标签详情
        const tagIds = tagUsage.map(item => item.tagId);
        const tags = await prisma.globalTag.findMany({
          where: {
            id: {
              in: tagIds,
            },
          },
        });

        // 按使用次数排序
        const tagsMap = new Map(tags.map(tag => [tag.id, tag]));
        return tagUsage
          .map(item => tagsMap.get(item.tagId))
          .filter(tag => tag);
      }

      // 否则按总使用次数排序
      return await prisma.globalTag.findMany({
        orderBy: {
          useCount: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error('获取热门标签失败:', error);
      return [];
    }
  }

  /**
   * 获取官方标签
   * @param {string} category - 分类（可选）
   * @returns {Promise<array>}
   */
  async getOfficialTags(category = null) {
    try {
      const where = { isOfficial: true };
      if (category) {
        where.category = category;
      }

      const tags = await prisma.globalTag.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      // 按分类分组
      const grouped = {};
      for (const tag of tags) {
        if (!grouped[tag.category]) {
          grouped[tag.category] = [];
        }
        grouped[tag.category].push(tag);
      }

      return grouped;
    } catch (error) {
      console.error('获取官方标签失败:', error);
      return {};
    }
  }

  /**
   * 获取标签详情
   * @param {string} tagName - 标签名称
   * @param {string} userId - 用户ID（可选，用于判断是否关注）
   * @returns {Promise<object>}
   */
  async getTagDetail(tagName, userId = null) {
    try {
      const tag = await prisma.globalTag.findFirst({
        where: {
          name: {
            equals: tagName,
            mode: 'insensitive',
          },
        },
      });

      if (!tag) {
        return null;
      }

      // 统计关注人数
      const followersCount = await prisma.userFollowedTag.count({
        where: { tagId: tag.id },
      });

      // 检查当前用户是否关注
      let isFollowing = false;
      if (userId) {
        const follow = await prisma.userFollowedTag.findUnique({
          where: {
            userId_tagId: {
              userId,
              tagId: tag.id,
            },
          },
        });
        isFollowing = !!follow;
      }

      return {
        ...tag,
        followersCount,
        isFollowing,
      };
    } catch (error) {
      console.error('获取标签详情失败:', error);
      return null;
    }
  }

  /**
   * 获取标签下的内容
   * @param {string} tagName - 标签名称
   * @param {object} options - 选项
   * @returns {Promise<array>}
   */
  async getTagContents(tagName, options = {}) {
    try {
      const { contentType, page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const tag = await prisma.globalTag.findFirst({
        where: {
          name: {
            equals: tagName,
            mode: 'insensitive',
          },
        },
      });

      if (!tag) {
        return { contents: [], total: 0 };
      }

      const where = { tagId: tag.id };
      if (contentType && contentType !== 'ALL') {
        where.contentType = contentType;
      }

      const [contentTags, total] = await Promise.all([
        prisma.contentTag.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.contentTag.count({ where }),
      ]);

      return {
        contents: contentTags,
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取标签内容失败:', error);
      return { contents: [], total: 0 };
    }
  }

  /**
   * 关注标签
   * @param {string} userId - 用户ID
   * @param {string} tagId - 标签ID
   * @returns {Promise<{success: boolean}>}
   */
  async followTag(userId, tagId) {
    try {
      await prisma.userFollowedTag.create({
        data: {
          userId,
          tagId,
        },
      });

      return { success: true };
    } catch (error) {
      // 可能已经关注
      if (error.code === 'P2002') {
        return { success: true, message: '已关注' };
      }
      console.error('关注标签失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 取消关注标签
   * @param {string} userId - 用户ID
   * @param {string} tagId - 标签ID
   * @returns {Promise<{success: boolean}>}
   */
  async unfollowTag(userId, tagId) {
    try {
      await prisma.userFollowedTag.delete({
        where: {
          userId_tagId: {
            userId,
            tagId,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('取消关注失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户关注的标签
   * @param {string} userId - 用户ID
   * @returns {Promise<array>}
   */
  async getUserFollowedTags(userId) {
    try {
      const follows = await prisma.userFollowedTag.findMany({
        where: { userId },
        include: {
          tag: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return follows.map(follow => follow.tag);
    } catch (error) {
      console.error('获取关注标签失败:', error);
      return [];
    }
  }

  /**
   * 管理员：合并标签
   * @param {string} sourceTagId - 源标签ID
   * @param {string} targetTagId - 目标标签ID
   * @returns {Promise<{success: boolean}>}
   */
  async mergeTags(sourceTagId, targetTagId) {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新所有关联到源标签的content_tags
        await tx.contentTag.updateMany({
          where: { tagId: sourceTagId },
          data: { tagId: targetTagId },
        });

        // 更新目标标签的使用次数
        const sourceTag = await tx.globalTag.findUnique({
          where: { id: sourceTagId },
        });

        await tx.globalTag.update({
          where: { id: targetTagId },
          data: {
            useCount: {
              increment: sourceTag.useCount,
            },
          },
        });

        // 删除源标签
        await tx.globalTag.delete({
          where: { id: sourceTagId },
        });
      });

      return { success: true };
    } catch (error) {
      console.error('合并标签失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员：删除标签
   * @param {string} tagId - 标签ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteTag(tagId) {
    try {
      // 删除标签（关联记录会级联删除）
      await prisma.globalTag.delete({
        where: { id: tagId },
      });

      return { success: true };
    } catch (error) {
      console.error('删除标签失败:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 获取随机颜色
   * @private
   */
  _getRandomColor(category) {
    const colors = COLOR_SCHEMES[category] || COLOR_SCHEMES.OTHER;
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// 导出单例
const tagService = new TagService();
module.exports = tagService;
