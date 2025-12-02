/**
 * 头像工具函数
 * 用于生成文字头像
 */

/**
 * 从用户名中提取最后一个有效字符（中文或字母）
 * @param {string} username - 用户名
 * @returns {string} - 最后一个有效字符，如果没有则返回 '?'
 */
function getAvatarChar(username) {
  if (!username || typeof username !== 'string') {
    return '?';
  }

  // 移除所有空格和符号，只保留中文、字母
  // 匹配：中文字符(\u4e00-\u9fa5) + 英文字母(a-zA-Z)
  const validChars = username.match(/[\u4e00-\u9fa5a-zA-Z]/g);

  if (!validChars || validChars.length === 0) {
    return '?';
  }

  // 返回最后一个有效字符
  return validChars[validChars.length - 1];
}

/**
 * 生成 SVG 格式的文字头像
 * @param {string} username - 用户名
 * @param {number} size - 尺寸（像素）
 * @returns {string} - SVG Data URL
 */
function generateTextAvatar(username, size = 80) {
  const char = getAvatarChar(username);

  // 定义渐变色方案（基于字符的 Unicode 值选择颜色）
  const colorSchemes = [
    { bg: '#FF6B6B', text: '#FFFFFF' }, // 红色
    { bg: '#4ECDC4', text: '#FFFFFF' }, // 青色
    { bg: '#45B7D1', text: '#FFFFFF' }, // 蓝色
    { bg: '#FFA07A', text: '#FFFFFF' }, // 橙色
    { bg: '#98D8C8', text: '#FFFFFF' }, // 绿色
    { bg: '#F7DC6F', text: '#2C3E50' }, // 黄色
    { bg: '#BB8FCE', text: '#FFFFFF' }, // 紫色
    { bg: '#85C1E2', text: '#FFFFFF' }, // 浅蓝
    { bg: '#F8B500', text: '#FFFFFF' }, // 金色
    { bg: '#E74C3C', text: '#FFFFFF' }, // 深红
  ];

  // 根据字符的 Unicode 值选择颜色
  const charCode = char.charCodeAt(0);
  const colorIndex = charCode % colorSchemes.length;
  const colors = colorSchemes[colorIndex];

  // 判断是否为中文字符
  const isChinese = /[\u4e00-\u9fa5]/.test(char);
  const fontSize = isChinese ? size * 0.5 : size * 0.55;
  const fontWeight = isChinese ? '500' : 'bold';

  // 生成 SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${colors.bg}" rx="${size / 2}"/>
      <text
        x="50%"
        y="50%"
        font-family="Arial, 'Microsoft YaHei', sans-serif"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        fill="${colors.text}"
        text-anchor="middle"
        dominant-baseline="central"
      >${char}</text>
    </svg>
  `.trim();

  // 转换为 Base64 Data URL
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * 为用户对象添加头像字段
 * 如果用户没有上传头像，生成文字头像
 * @param {object} user - 用户对象
 * @param {number} size - 头像尺寸
 * @returns {object} - 包含 avatar 和 avatarChar 的对象
 */
function processUserAvatar(user, size = 80) {
  if (!user) {
    return { avatar: null, avatarChar: '?' };
  }

  const avatarChar = getAvatarChar(user.username);

  // 如果用户已上传头像，直接使用
  if (user.avatar && user.avatar !== '/default-avatar.png' && !user.avatar.includes('default')) {
    return {
      avatar: user.avatar,
      avatarChar,
    };
  }

  // 否则生成文字头像
  return {
    avatar: generateTextAvatar(user.username, size),
    avatarChar,
  };
}

module.exports = {
  getAvatarChar,
  generateTextAvatar,
  processUserAvatar,
};
