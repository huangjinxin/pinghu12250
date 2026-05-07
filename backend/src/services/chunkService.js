/**
 * 文本分段服务
 * 将日记内容切分为适合 Embedding 的片段
 */

const crypto = require('crypto');

/**
 * 分段配置
 */
const CHUNK_CONFIG = {
  MIN_CHUNK_SIZE: 100,    // 最小片段字数
  MAX_CHUNK_SIZE: 500,    // 最大片段字数
  OVERLAP_SIZE: 50,       // 片段重叠字数（用于上下文连贯）
};

/**
 * 计算内容哈希
 * @param {string} content - 文本内容
 * @returns {string} MD5 哈希值
 */
function computeHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 按自然段切分文本
 * @param {string} text - 原始文本
 * @returns {string[]} 段落数组
 */
function splitByParagraph(text) {
  // 按换行符切分
  const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  return paragraphs;
}

/**
 * 按句子切分段落
 * @param {string} paragraph - 段落文本
 * @returns {string[]} 句子数组
 */
function splitBySentence(paragraph) {
  // 按中英文句号、问号、感叹号切分
  const sentences = paragraph.split(/([。！？.!?]+)/);

  const result = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i];
    const punctuation = sentences[i + 1] || '';
    if (sentence.trim()) {
      result.push(sentence.trim() + punctuation);
    }
  }

  return result;
}

/**
 * 合并小段落
 * @param {string[]} paragraphs - 段落数组
 * @returns {string[]} 合并后的段落
 */
function mergeTinyParagraphs(paragraphs) {
  const result = [];
  let buffer = '';

  for (const para of paragraphs) {
    if (buffer.length + para.length < CHUNK_CONFIG.MIN_CHUNK_SIZE) {
      // 累积到缓冲区
      buffer = buffer ? `${buffer}\n${para}` : para;
    } else {
      // 如果缓冲区有内容，先输出
      if (buffer) {
        if (buffer.length >= CHUNK_CONFIG.MIN_CHUNK_SIZE) {
          result.push(buffer);
        } else {
          // 缓冲区太小，与当前段落合并
          buffer = `${buffer}\n${para}`;
          if (buffer.length >= CHUNK_CONFIG.MIN_CHUNK_SIZE) {
            result.push(buffer);
            buffer = '';
          }
          continue;
        }
      }

      // 处理当前段落
      if (para.length >= CHUNK_CONFIG.MIN_CHUNK_SIZE) {
        result.push(para);
        buffer = '';
      } else {
        buffer = para;
      }
    }
  }

  // 处理剩余缓冲区
  if (buffer) {
    if (result.length > 0 && buffer.length < CHUNK_CONFIG.MIN_CHUNK_SIZE) {
      // 合并到最后一个结果
      result[result.length - 1] = `${result[result.length - 1]}\n${buffer}`;
    } else {
      result.push(buffer);
    }
  }

  return result;
}

/**
 * 切分超长段落
 * @param {string} paragraph - 段落文本
 * @returns {string[]} 切分后的片段
 */
function splitLargeParagraph(paragraph) {
  if (paragraph.length <= CHUNK_CONFIG.MAX_CHUNK_SIZE) {
    return [paragraph];
  }

  const sentences = splitBySentence(paragraph);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= CHUNK_CONFIG.MAX_CHUNK_SIZE) {
      currentChunk = currentChunk ? `${currentChunk}${sentence}` : sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // 如果单个句子超长，强制切分
      if (sentence.length > CHUNK_CONFIG.MAX_CHUNK_SIZE) {
        const forceSplit = forceSplitText(sentence, CHUNK_CONFIG.MAX_CHUNK_SIZE);
        chunks.push(...forceSplit.slice(0, -1));
        currentChunk = forceSplit[forceSplit.length - 1];
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 强制按字数切分文本
 * @param {string} text - 文本
 * @param {number} maxSize - 最大字数
 * @returns {string[]} 切分后的片段
 */
function forceSplitText(text, maxSize) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - CHUNK_CONFIG.OVERLAP_SIZE; // 带重叠
    if (start < 0) start = end;
  }

  return chunks;
}

/**
 * 将日记内容切分为适合 Embedding 的片段
 *
 * 切分策略：
 * 1. 按自然段切分
 * 2. 若单段 > 500 字，按句号分割
 * 3. 若单段 < 100 字，与下一段合并
 *
 * @param {string} content - 日记内容
 * @returns {Array<{index: number, content: string, hash: string}>} 分段结果
 */
function chunkDiaryContent(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // 1. 按自然段切分
  let paragraphs = splitByParagraph(content);

  // 2. 合并小段落
  paragraphs = mergeTinyParagraphs(paragraphs);

  // 3. 切分超长段落
  const chunks = [];
  for (const para of paragraphs) {
    const splitParts = splitLargeParagraph(para);
    chunks.push(...splitParts);
  }

  // 4. 生成结果（带索引和哈希）
  const result = chunks.map((chunk, index) => ({
    index,
    content: chunk.trim(),
    hash: computeHash(chunk.trim()),
  }));

  return result;
}

/**
 * 计算 ISO 周格式
 * @param {Date} date - 日期
 * @returns {string} 如 "2026-W02"
 */
function getISOWeekId(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // 获取年份和周数
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - yearStart) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + yearStart.getDay() + 1) / 7);

  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

module.exports = {
  chunkDiaryContent,
  computeHash,
  getISOWeekId,
  CHUNK_CONFIG,
};
