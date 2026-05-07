/**
 * JWT工具函数
 */

const jwt = require('jsonwebtoken');

/**
 * 生成JWT Access Token (短期)
 * @param {string} userId - 用户ID
 * @returns {string} JWT token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * 生成JWT Refresh Token (长期)
 * @param {string} userId - 用户ID
 * @returns {string} JWT token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
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

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

module.exports = { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken };
