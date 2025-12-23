/**
 * 用户模块 DTO 验证规则
 */

const Joi = require('joi');

// 更新个人资料验证
const updateProfileDTO = Joi.object({
  nickname: Joi.string().min(1).max(50).messages({
    'string.min': '昵称至少1个字符',
    'string.max': '昵称最多50个字符'
  }),
  bio: Joi.string().max(500).allow('').messages({
    'string.max': '个人简介最多500个字符'
  }),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').messages({
    'any.only': '性别必须是 MALE、FEMALE 或 OTHER'
  }),
  birthday: Joi.date().iso().messages({
    'date.format': '生日格式不正确'
  }),
  grade: Joi.string().max(20).messages({
    'string.max': '年级最多20个字符'
  }),
  school: Joi.string().max(100).messages({
    'string.max': '学校名称最多100个字符'
  }),
  interests: Joi.array().items(Joi.string().max(20)).max(10).messages({
    'array.max': '兴趣标签最多10个'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个字段'
});

// 更新用户设置验证
const updateSettingsDTO = Joi.object({
  emailNotifications: Joi.boolean(),
  pushNotifications: Joi.boolean(),
  privateProfile: Joi.boolean(),
  showOnlineStatus: Joi.boolean(),
  language: Joi.string().valid('zh-CN', 'en-US').default('zh-CN'),
  theme: Joi.string().valid('light', 'dark', 'auto').default('light')
});

// 管理员创建用户验证
const adminCreateUserDTO = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱为必填项'
  }),
  username: Joi.string().min(2).max(30).required().messages({
    'string.min': '用户名至少2个字符',
    'string.max': '用户名最多30个字符',
    'any.required': '用户名为必填项'
  }),
  password: Joi.string().min(6).max(50).required().messages({
    'string.min': '密码至少6个字符',
    'any.required': '密码为必填项'
  }),
  role: Joi.string().valid('STUDENT', 'PARENT', 'TEACHER', 'ADMIN').required().messages({
    'any.only': '无效的用户角色',
    'any.required': '角色为必填项'
  }),
  status: Joi.string().valid('ACTIVE', 'PENDING', 'DISABLED').default('ACTIVE')
});

// 管理员更新用户验证
const adminUpdateUserDTO = Joi.object({
  email: Joi.string().email().messages({
    'string.email': '请输入有效的邮箱地址'
  }),
  username: Joi.string().min(2).max(30).messages({
    'string.min': '用户名至少2个字符',
    'string.max': '用户名最多30个字符'
  }),
  role: Joi.string().valid('STUDENT', 'PARENT', 'TEACHER', 'ADMIN').messages({
    'any.only': '无效的用户角色'
  }),
  status: Joi.string().valid('ACTIVE', 'PENDING', 'DISABLED').messages({
    'any.only': '无效的用户状态'
  })
});

// 绑定孩子账号验证
const bindChildDTO = Joi.object({
  childId: Joi.string().uuid().required().messages({
    'string.uuid': '无效的孩子ID',
    'any.required': '孩子ID为必填项'
  })
});

// 搜索用户验证
const searchUsersDTO = Joi.object({
  keyword: Joi.string().min(1).max(50).required().messages({
    'string.min': '搜索关键词至少1个字符',
    'string.max': '搜索关键词最多50个字符',
    'any.required': '搜索关键词为必填项'
  }),
  role: Joi.string().valid('STUDENT', 'PARENT', 'TEACHER', 'ADMIN'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

module.exports = {
  updateProfileDTO,
  updateSettingsDTO,
  adminCreateUserDTO,
  adminUpdateUserDTO,
  bindChildDTO,
  searchUsersDTO
};
