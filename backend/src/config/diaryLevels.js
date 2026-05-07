/**
 * 日记字数级别配置
 * 前后端共享配置（需同步更新 frontend/src/config/diaryLevels.js）
 */

const DIARY_LEVELS = [
  { level: 0,  name: '萌芽', minWords: 0,     maxWords: 799,   points: -2,  emoji: '🌱', color: '#9E9E9E', ruleId: 'D001' },
  { level: 1,  name: '入门', minWords: 800,   maxWords: 999,   points: 5,   emoji: '📝', color: '#8BC34A', ruleId: 'D002' },
  { level: 2,  name: '良好', minWords: 1000,  maxWords: 1199,  points: 10,  emoji: '📗', color: '#4CAF50', ruleId: 'D003' },
  { level: 3,  name: '优秀', minWords: 1200,  maxWords: 1499,  points: 15,  emoji: '📘', color: '#2196F3', ruleId: 'D004' },
  { level: 4,  name: '卓越', minWords: 1500,  maxWords: 1999,  points: 20,  emoji: '📙', color: '#FF9800', ruleId: 'D005' },
  { level: 5,  name: '大师', minWords: 2000,  maxWords: 2999,  points: 30,  emoji: '🏅', color: '#FF5722', ruleId: 'D006' },
  { level: 6,  name: '精英', minWords: 3000,  maxWords: 3999,  points: 40,  emoji: '🎖️', color: '#E91E63', ruleId: 'D007' },
  { level: 7,  name: '专家', minWords: 4000,  maxWords: 4999,  points: 50,  emoji: '🏆', color: '#9C27B0', ruleId: 'D008' },
  { level: 8,  name: '宗师', minWords: 5000,  maxWords: 5999,  points: 60,  emoji: '👑', color: '#673AB7', ruleId: 'D009' },
  { level: 9,  name: '传奇', minWords: 6000,  maxWords: 7999,  points: 70,  emoji: '⭐', color: '#3F51B5', ruleId: 'D010' },
  { level: 10, name: '史诗', minWords: 8000,  maxWords: 9999,  points: 85,  emoji: '🌟', color: '#00BCD4', ruleId: 'D011' },
  { level: 11, name: '神话', minWords: 10000, maxWords: 11999, points: 100, emoji: '💫', color: '#009688', ruleId: 'D012' },
  { level: 12, name: '不朽', minWords: 12000, maxWords: 14999, points: 120, emoji: '🔱', color: '#795548', ruleId: 'D013' },
  { level: 13, name: '创世', minWords: 15000, maxWords: 17999, points: 150, emoji: '💎', color: '#607D8B', ruleId: 'D014' },
  { level: 14, name: '永恒', minWords: 18000, maxWords: 19999, points: 180, emoji: '🌈', color: '#FF4081', ruleId: 'D015' },
  { level: 15, name: '至尊', minWords: 20000, maxWords: Infinity, points: 200, emoji: '👼', color: '#FFD700', ruleId: 'D016' },
]

/**
 * 根据字数获取级别信息
 * @param {number} wordCount - 字数
 * @returns {object} 级别信息
 */
function getDiaryLevel(wordCount) {
  for (let i = DIARY_LEVELS.length - 1; i >= 0; i--) {
    if (wordCount >= DIARY_LEVELS[i].minWords) {
      return DIARY_LEVELS[i]
    }
  }
  return DIARY_LEVELS[0]
}

/**
 * 根据级别数字获取级别信息
 * @param {number} level - 级别数字
 * @returns {object} 级别信息
 */
function getDiaryLevelByNumber(level) {
  return DIARY_LEVELS.find(l => l.level === level) || DIARY_LEVELS[0]
}

/**
 * 计算字数（不含空格和标点）
 * @param {string} content - 内容
 * @returns {number} 有效字数
 */
function calculateWordCount(content) {
  if (!content) return 0
  // 移除HTML标签
  const plainText = content.replace(/<[^>]*>/g, '')
  // 移除空白字符
  const noSpaces = plainText.replace(/\s/g, '')
  // 移除标点符号
  const noPunctuation = noSpaces.replace(/[，。！？；：、""''《》【】（）,\.!?;:'"<>(){}\[\]·…—\-_]/g, '')
  return noPunctuation.length
}

module.exports = {
  DIARY_LEVELS,
  getDiaryLevel,
  getDiaryLevelByNumber,
  calculateWordCount,
}
