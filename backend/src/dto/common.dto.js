/**
 * 通用 DTO 验证规则
 * 包含分页、排序、ID 等通用验证
 */

const Joi = require('joi');

// UUID 验证
const uuidSchema = Joi.string().uuid().required();
const optionalUuidSchema = Joi.string().uuid();

// 分页参数验证
const paginationDTO = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().max(50),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// ID 参数验证
const idParamDTO = Joi.object({
  id: uuidSchema
});

// 批量 ID 操作
const batchIdsDTO = Joi.object({
  ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
});

// 日期范围验证
const dateRangeDTO = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

// 搜索关键词
const searchDTO = Joi.object({
  keyword: Joi.string().min(1).max(100).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

module.exports = {
  uuidSchema,
  optionalUuidSchema,
  paginationDTO,
  idParamDTO,
  batchIdsDTO,
  dateRangeDTO,
  searchDTO
};
