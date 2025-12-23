/**
 * 认证模块 DTO 验证规则
 */

const Joi = require('joi');

// 注册验证
const registerDTO = Joi.object({
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
    'string.max': '密码最多50个字符',
    'any.required': '密码为必填项'
  }),
  role: Joi.string().valid('STUDENT', 'PARENT', 'TEACHER').default('STUDENT').messages({
    'any.only': '角色必须是 STUDENT、PARENT 或 TEACHER'
  })
});

// 登录验证
const loginDTO = Joi.object({
  username: Joi.string().required().messages({
    'any.required': '用户名或邮箱为必填项'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码为必填项'
  })
});

// 刷新令牌验证
const refreshTokenDTO = Joi.object({
  token: Joi.string().required().messages({
    'any.required': '未提供令牌'
  })
});

// 修改密码验证
const changePasswordDTO = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': '旧密码为必填项'
  }),
  newPassword: Joi.string().min(6).max(50).required().messages({
    'string.min': '新密码至少6个字符',
    'string.max': '新密码最多50个字符',
    'any.required': '新密码为必填项'
  })
});

// 重置密码验证（管理员）
const resetPasswordDTO = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.uuid': '无效的用户ID',
    'any.required': '用户ID为必填项'
  }),
  newPassword: Joi.string().min(6).max(50).required().messages({
    'string.min': '新密码至少6个字符',
    'any.required': '新密码为必填项'
  })
});

module.exports = {
  registerDTO,
  loginDTO,
  refreshTokenDTO,
  changePasswordDTO,
  resetPasswordDTO
};
