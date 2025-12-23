/**
 * 拼音过滤工具
 * 用于语文课本中过滤 OCR 识别的拼音字母
 */

// 拼音字母正则（包括带声调的元音）
// a-z A-Z + 带声调的元音 āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ
const PINYIN_CHARS = 'a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜ';
const PINYIN_REGEX = new RegExp(`[${PINYIN_CHARS}]`, 'g');

/**
 * 过滤文本中的拼音字母
 * 规则：
 * 1. 去掉汉字后紧跟的字母序列（如：轰hTng → 轰）
 * 2. 去掉孤立的字母序列（被标点或空格包围的）
 *
 * @param {string} text - 原始文本
 * @returns {string} 过滤后的文本
 */
export function filterPinyin(text) {
  if (!text) return '';

  // 第一步：去掉汉字后紧跟的拼音字母（1-7个字母）
  // 例如：轰hTng响 → 轰响，学xué习 → 学习
  let result = text.replace(
    new RegExp(`([一-龥])[${PINYIN_CHARS}]{1,7}(?=[一-龥，。！？、；：""''（）\\s]|$)`, 'g'),
    '$1'
  );

  // 第二步：去掉句首或空格/标点后的孤立拼音
  // 例如：" shU润" → " 润"
  result = result.replace(
    new RegExp(`(^|[\\s，。！？、；：""''（）])[${PINYIN_CHARS}]{1,7}(?=[一-龥])`, 'g'),
    '$1'
  );

  // 第三步：去掉被汉字包围的短字母序列（残留拼音）
  result = result.replace(
    new RegExp(`(?<=[一-龥])[${PINYIN_CHARS}]{1,7}(?=[一-龥])`, 'g'),
    ''
  );

  // 清理多余空格
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * 判断是否需要过滤拼音
 * @param {string} subject - 教材学科类型
 * @returns {boolean}
 */
export function shouldFilterPinyin(subject) {
  return subject === 'CHINESE';
}

/**
 * 智能过滤文本（根据学科类型决定是否过滤）
 * @param {string} text - 原始文本
 * @param {string} subject - 教材学科类型
 * @returns {string}
 */
export function smartFilterText(text, subject) {
  if (shouldFilterPinyin(subject)) {
    return filterPinyin(text);
  }
  return text;
}
