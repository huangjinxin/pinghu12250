/**
 * JWT工具函数
 */

const jwt = require('jsonwebtoken');

/**
 * 生成JWT token
 * @param {string} userId - 用户ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * 验证JWT token
 * @param {string} token - JWT token
 * @returns {object} 解码后的payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
