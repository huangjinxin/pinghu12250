/**
 * 字典 API 客户端
 * 调用后端代理接口查询汉字释义
 */

import api from './index';

// 内存缓存
const cache = new Map();
const CACHE_MAX_SIZE = 200;

/**
 * 查询单个汉字
 * @param {string} char - 单个汉字
 * @returns {Promise<{character: string, pinyin: string, definition: string} | null>}
 */
export async function lookupCharacter(char) {
  // 验证输入
  if (!char || char.length !== 1 || !/[\u4e00-\u9fa5]/.test(char)) {
    return null;
  }

  // 检查缓存
  if (cache.has(char)) {
    return cache.get(char);
  }

  try {
    const response = await api.get(`/dict/${encodeURIComponent(char)}`);

    if (response.success && response.data) {
      const result = response.data;

      // 写入缓存
      if (cache.size >= CACHE_MAX_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(char, result);

      return result;
    }

    return null;
  } catch (error) {
    console.warn('[Dict] 查询失败:', error.message);
    return null;
  }
}

/**
 * 判断是否为单个汉字
 */
export function isSingleChinese(text) {
  return text && text.length === 1 && /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 判断是否包含有效文字（汉字或字母）
 */
export function hasValidText(text) {
  return text && /[\u4e00-\u9fa5a-zA-Z]/.test(text);
}

/**
 * 清空缓存
 */
export function clearCache() {
  cache.clear();
}
