/**
 * 两步验证 (2FA/TOTP) 服务
 *
 * 功能：
 * - TOTP secret 生成与验证
 * - Secret 加密存储 (AES-256-GCM)
 * - 二维码生成 (otpauth:// URI)
 * - 恢复码生成与验证
 */

const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// 配置 TOTP 参数
authenticator.options = {
  window: 1,      // 允许前后各1个时间窗口（共90秒）
  step: 30,       // 30秒时间步长
  digits: 6,      // 6位验证码
};

// 加密密钥（从环境变量读取，生产环境必须设置）
const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ISSUER = process.env.TOTP_ISSUER || '苹湖少儿空间';

/**
 * 生成 TOTP Secret
 * @returns {string} Base32 编码的 secret
 */
function generateSecret() {
  return authenticator.generateSecret();
}

/**
 * 使用 AES-256-GCM 加密 secret
 * @param {string} secret - 原始 secret
 * @returns {string} 格式: iv:authTag:encrypted (hex)
 */
function encryptSecret(secret) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * 解密 secret
 * @param {string} encryptedData - 加密数据 (iv:authTag:encrypted)
 * @returns {string} 原始 secret
 */
function decryptSecret(encryptedData) {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 生成 otpauth:// URI
 * @param {string} secret - TOTP secret
 * @param {string} username - 用户名
 * @returns {string} otpauth:// URI
 */
function generateOTPAuthURI(secret, username) {
  return authenticator.keyuri(username, ISSUER, secret);
}

/**
 * 生成二维码 Data URL
 * @param {string} secret - TOTP secret
 * @param {string} username - 用户名
 * @returns {Promise<string>} 二维码 Data URL (base64)
 */
async function generateQRCodeDataURL(secret, username) {
  const uri = generateOTPAuthURI(secret, username);
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * 验证 TOTP 验证码
 * @param {string} encryptedSecret - 加密的 secret
 * @param {string} token - 用户输入的6位验证码
 * @returns {boolean} 是否验证通过
 */
function verifyTOTP(encryptedSecret, token) {
  try {
    const secret = decryptSecret(encryptedSecret);
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('[2FA] TOTP验证失败:', error.message);
    return false;
  }
}

/**
 * 验证 TOTP（使用原始 secret，用于启用流程）
 * @param {string} secret - 原始 secret
 * @param {string} token - 用户输入的6位验证码
 * @returns {boolean} 是否验证通过
 */
function verifyTOTPWithPlainSecret(secret, token) {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('[2FA] TOTP验证失败:', error.message);
    return false;
  }
}

/**
 * 生成恢复码
 * @param {number} count - 恢复码数量（默认10个）
 * @returns {string[]} 恢复码数组（格式: XXXX-XXXX-XXXX）
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    // 格式化为 XXXX-XXXX-XXXX
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    codes.push(formatted);
  }
  return codes;
}

/**
 * 哈希恢复码（用于存储）
 * @param {string} code - 原始恢复码
 * @returns {Promise<string>} bcrypt 哈希
 */
async function hashBackupCode(code) {
  // 移除格式中的横杠，统一大写
  const normalized = code.replace(/-/g, '').toUpperCase();
  return bcrypt.hash(normalized, 10);
}

/**
 * 批量哈希恢复码
 * @param {string[]} codes - 恢复码数组
 * @returns {Promise<string[]>} 哈希数组
 */
async function hashBackupCodes(codes) {
  return Promise.all(codes.map(code => hashBackupCode(code)));
}

/**
 * 验证恢复码
 * @param {string} code - 用户输入的恢复码
 * @param {string[]} hashedCodes - 存储的哈希数组
 * @returns {Promise<{valid: boolean, index: number}>} 验证结果和匹配索引
 */
async function verifyBackupCode(code, hashedCodes) {
  // 移除格式中的横杠，统一大写
  const normalized = code.replace(/-/g, '').toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(normalized, hashedCodes[i]);
    if (isMatch) {
      return { valid: true, index: i };
    }
  }

  return { valid: false, index: -1 };
}

/**
 * 生成临时 Token（用于 2FA 验证流程）
 * @param {string} userId - 用户 ID
 * @param {number} expiresInMinutes - 过期时间（分钟）
 * @returns {string} 临时 token
 */
function generateTempToken(userId, expiresInMinutes = 5) {
  const payload = {
    userId,
    exp: Date.now() + expiresInMinutes * 60 * 1000,
    type: '2fa_pending',
  };
  const data = JSON.stringify(payload);
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * 验证临时 Token
 * @param {string} tempToken - 临时 token
 * @returns {{valid: boolean, userId?: string}} 验证结果
 */
function verifyTempToken(tempToken) {
  try {
    const [ivHex, authTagHex, encrypted] = tempToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted);

    // 检查是否过期
    if (Date.now() > payload.exp) {
      return { valid: false };
    }

    // 检查类型
    if (payload.type !== '2fa_pending') {
      return { valid: false };
    }

    return { valid: true, userId: payload.userId };
  } catch (error) {
    console.error('[2FA] 临时Token验证失败:', error.message);
    return { valid: false };
  }
}

module.exports = {
  generateSecret,
  encryptSecret,
  decryptSecret,
  generateOTPAuthURI,
  generateQRCodeDataURL,
  verifyTOTP,
  verifyTOTPWithPlainSecret,
  generateBackupCodes,
  hashBackupCode,
  hashBackupCodes,
  verifyBackupCode,
  generateTempToken,
  verifyTempToken,
  ISSUER,
};
