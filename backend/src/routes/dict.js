/**
 * 字典路由
 * 使用 chinese-xinhua 本地字典数据
 * 数据来源：https://github.com/pwxcoo/chinese-xinhua
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 字典数据索引 (word -> entry)
let dictIndex = new Map();
let dictLoaded = false;

/**
 * 加载字典数据
 */
function loadDictionary() {
  if (dictLoaded) return;

  const dictPath = path.join(__dirname, '../../data/word.json');

  try {
    console.log('[Dict] 正在加载字典数据...');
    const startTime = Date.now();

    const rawData = fs.readFileSync(dictPath, 'utf-8');
    const words = JSON.parse(rawData);

    // 构建索引
    for (const entry of words) {
      if (entry.word) {
        dictIndex.set(entry.word, entry);
      }
    }

    dictLoaded = true;
    const elapsed = Date.now() - startTime;
    console.log(`[Dict] 字典加载完成: ${dictIndex.size} 个汉字, 耗时 ${elapsed}ms`);
  } catch (error) {
    console.error('[Dict] 字典加载失败:', error.message);
  }
}

// 启动时加载字典
loadDictionary();

/**
 * 判断是否为汉字
 */
function isChinese(char) {
  return /^[\u4e00-\u9fa5]$/.test(char);
}

/**
 * 格式化拼音
 * 处理多音字，只取第一个读音
 */
function formatPinyin(raw) {
  if (!raw) return '';

  // 去除空格，取第一个拼音
  const first = raw.trim().split(/[,，、\s]+/)[0];
  return first || raw;
}

/**
 * 格式化释义
 * 从 explanation 字段提取简洁释义
 */
function formatDefinition(explanation) {
  if (!explanation) return '';

  // 移除特殊字符和多余空白
  let text = explanation
    .replace(/\n+/g, ';')
    .replace(/\s+/g, ' ')
    .trim();

  // 尝试提取核心释义
  // 格式通常是: "字〈词性〉\n\n 释义1\n\n 释义2..."
  const parts = text.split(/[;；]/);

  // 过滤掉太短或纯标点的部分
  const meanings = parts
    .map(p => p.trim())
    .filter(p => {
      // 过滤掉词性标注、拼音注音等
      if (p.length < 2) return false;
      if (/^[〈<].*[〉>]$/.test(p)) return false;
      if (/^[\u4e00-\u9fa5][\u4e00-\u9fa5]?[àáǎèéěìíǐòóǒùúǔǖǘǚǜāēīōū\d]+$/.test(p)) return false;
      return true;
    });

  // 取前 2 条有效释义
  const result = meanings.slice(0, 2).join('；');

  // 限制长度
  if (result.length > 80) {
    return result.slice(0, 80) + '…';
  }

  return result || explanation.slice(0, 50);
}

/**
 * 查找汉字
 */
function lookupCharacter(char) {
  if (!dictLoaded) {
    loadDictionary();
  }

  const entry = dictIndex.get(char);
  if (!entry) {
    return null;
  }

  return {
    character: char,
    pinyin: formatPinyin(entry.pinyin),
    definition: formatDefinition(entry.explanation),
    strokes: entry.strokes || '',
    radicals: entry.radicals || ''
  };
}

/**
 * GET /api/dict/:char
 * 查询单个汉字的拼音和释义
 */
router.get('/:char', async (req, res) => {
  try {
    const { char } = req.params;

    // 验证：必须是单个汉字
    if (!char || char.length !== 1) {
      return res.status(400).json({
        success: false,
        error: '请提供单个汉字'
      });
    }

    if (!isChinese(char)) {
      return res.status(400).json({
        success: false,
        error: '只支持查询汉字'
      });
    }

    // 查找汉字
    const result = lookupCharacter(char);

    if (result) {
      return res.json({
        success: true,
        data: result
      });
    }

    // 未找到
    return res.json({
      success: true,
      data: {
        character: char,
        pinyin: '',
        definition: ''
      }
    });

  } catch (error) {
    console.error('[Dict] 查询错误:', error);
    res.status(500).json({
      success: false,
      error: '查询失败'
    });
  }
});

/**
 * GET /api/dict/stats
 * 获取字典统计信息
 */
router.get('/info/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      loaded: dictLoaded,
      count: dictIndex.size,
      source: 'chinese-xinhua'
    }
  });
});

module.exports = router;
