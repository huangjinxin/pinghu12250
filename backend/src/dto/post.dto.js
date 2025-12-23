/**
 * 动态/帖子模块 DTO 验证规则
 */

const Joi = require('joi');

// 创建动态验证
const createPostDTO = Joi.object({
  content: Joi.string().min(1).max(5000).required().messages({
    'string.min': '内容不能为空',
    'string.max': '内容最多5000个字符',
    'any.required': '内容为必填项'
  }),
  images: Joi.array().items(Joi.string().uri()).max(9).default([]).messages({
    'array.max': '最多上传9张图片',
    'string.uri': '图片地址格式不正确'
  }),
  visibility: Joi.string().valid('PUBLIC', 'FRIENDS', 'PRIVATE').default('PUBLIC').messages({
    'any.only': '可见性必须是 PUBLIC、FRIENDS 或 PRIVATE'
  }),
  tags: Joi.array().items(Joi.string().max(20)).max(5).default([]).messages({
    'array.max': '最多添加5个标签'
  })
});

// 更新动态验证
const updatePostDTO = Joi.object({
  content: Joi.string().min(1).max(5000).messages({
    'string.min': '内容不能为空',
    'string.max': '内容最多5000个字符'
  }),
  images: Joi.array().items(Joi.string().uri()).max(9).messages({
    'array.max': '最多上传9张图片'
  }),
  visibility: Joi.string().valid('PUBLIC', 'FRIENDS', 'PRIVATE').messages({
    'any.only': '可见性必须是 PUBLIC、FRIENDS 或 PRIVATE'
  }),
  tags: Joi.array().items(Joi.string().max(20)).max(5).messages({
    'array.max': '最多添加5个标签'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个字段'
});

// 创建评论验证
const createCommentDTO = Joi.object({
  content: Joi.string().min(1).max(1000).required().messages({
    'string.min': '评论内容不能为空',
    'string.max': '评论内容最多1000个字符',
    'any.required': '评论内容为必填项'
  }),
  parentId: Joi.string().uuid().messages({
    'string.uuid': '无效的父评论ID'
  })
});

// 获取动态列表验证
const getPostsDTO = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  userId: Joi.string().uuid().messages({
    'string.uuid': '无效的用户ID'
  }),
  tag: Joi.string().max(20),
  sortBy: Joi.string().valid('createdAt', 'likes', 'comments').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
  createPostDTO,
  updatePostDTO,
  createCommentDTO,
  getPostsDTO
};
