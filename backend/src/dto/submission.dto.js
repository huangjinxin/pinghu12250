/**
 * 提交记录模块 DTO 验证规则
 */

const Joi = require('joi');

// 创建提交验证
const createSubmissionDTO = Joi.object({
  templateId: Joi.string().uuid().required().messages({
    'string.uuid': '无效的规则模板ID',
    'any.required': '规则模板ID为必填项'
  }),
  content: Joi.string().max(5000).allow('').default('').messages({
    'string.max': '内容最多5000个字符'
  }),
  images: Joi.array().items(Joi.string()).max(9).default([]).messages({
    'array.max': '最多上传9张图片'
  }),
  audios: Joi.array().items(Joi.string()).max(3).default([]).messages({
    'array.max': '最多上传3个音频'
  }),
  link: Joi.string().uri().allow('', null).messages({
    'string.uri': '链接格式不正确'
  }),
  quantity: Joi.number().integer().min(1).max(100).default(1).messages({
    'number.min': '数量至少为1',
    'number.max': '数量最多为100'
  })
});

// 更新提交验证
const updateSubmissionDTO = Joi.object({
  content: Joi.string().max(5000).allow('').messages({
    'string.max': '内容最多5000个字符'
  }),
  images: Joi.array().items(Joi.string()).max(9).messages({
    'array.max': '最多上传9张图片'
  }),
  audios: Joi.array().items(Joi.string()).max(3).messages({
    'array.max': '最多上传3个音频'
  }),
  link: Joi.string().uri().allow('', null).messages({
    'string.uri': '链接格式不正确'
  }),
  quantity: Joi.number().integer().min(1).max(100).messages({
    'number.min': '数量至少为1',
    'number.max': '数量最多为100'
  })
});

// 审核提交验证
const reviewSubmissionDTO = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required().messages({
    'any.only': '状态必须是 APPROVED 或 REJECTED',
    'any.required': '审核状态为必填项'
  }),
  reviewNote: Joi.string().max(500).allow('').messages({
    'string.max': '审核备注最多500个字符'
  })
});

// 获取提交列表验证
const getSubmissionsDTO = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED'),
  userId: Joi.string().uuid(),
  templateId: Joi.string().uuid(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso()
});

module.exports = {
  createSubmissionDTO,
  updateSubmissionDTO,
  reviewSubmissionDTO,
  getSubmissionsDTO
};
