/**
 * 日记成就配置
 * 与后端 backend/src/config/diaryAchievements.js 同步
 */

export const DIARY_ACHIEVEMENTS = [
  // ========== 连续天数类 ==========
  {
    code: 'DIARY_STREAK_3',
    name: '三日笔耕',
    description: '连续3天写日记',
    emoji: '🔥',
    category: 'streak',
    conditionType: 'streak',
    conditionValue: 3,
    rewardPoints: 50
  },
  {
    code: 'DIARY_STREAK_7',
    name: '周周不断',
    description: '连续7天写日记',
    emoji: '🔥',
    category: 'streak',
    conditionType: 'streak',
    conditionValue: 7,
    rewardPoints: 150
  },
  {
    code: 'DIARY_STREAK_14',
    name: '双周坚持',
    description: '连续14天写日记',
    emoji: '🔥',
    category: 'streak',
    conditionType: 'streak',
    conditionValue: 14,
    rewardPoints: 300
  },
  {
    code: 'DIARY_STREAK_30',
    name: '月度达人',
    description: '连续30天写日记',
    emoji: '🔥',
    category: 'streak',
    conditionType: 'streak',
    conditionValue: 30,
    rewardPoints: 500
  },
  {
    code: 'DIARY_STREAK_60',
    name: '双月传奇',
    description: '连续60天写日记',
    emoji: '🔥',
    category: 'streak',
    conditionType: 'streak',
    conditionValue: 60,
    rewardPoints: 1000
  },
  {
    code: 'DIARY_STREAK_100',
    name: '百日英雄',
    description: '连续100天写日记',
    emoji: '🔥',
    category: 'streak',
    conditionType: 'streak',
    conditionValue: 100,
    rewardPoints: 2000
  },

  // ========== 字数级别类 ==========
  {
    code: 'DIARY_LEVEL_5',
    name: '大师初成',
    description: '单篇日记达到大师级别(2000字)',
    emoji: '🏅',
    category: 'level',
    conditionType: 'single_level',
    conditionValue: 5,
    rewardPoints: 100
  },
  {
    code: 'DIARY_LEVEL_8',
    name: '宗师境界',
    description: '单篇日记达到宗师级别(5000字)',
    emoji: '👑',
    category: 'level',
    conditionType: 'single_level',
    conditionValue: 8,
    rewardPoints: 300
  },
  {
    code: 'DIARY_LEVEL_11',
    name: '万字神话',
    description: '单篇日记达到神话级别(10000字)',
    emoji: '💫',
    category: 'level',
    conditionType: 'single_level',
    conditionValue: 11,
    rewardPoints: 500
  },
  {
    code: 'DIARY_LEVEL_15',
    name: '至尊作者',
    description: '单篇日记达到至尊级别(20000字)',
    emoji: '👼',
    category: 'level',
    conditionType: 'single_level',
    conditionValue: 15,
    rewardPoints: 1000
  },

  // ========== 评分类 ==========
  {
    code: 'DIARY_GRADE_A',
    name: '优等生',
    description: '日记获得A-以上评分(85分+)',
    emoji: '⭐',
    category: 'grade',
    conditionType: 'grade_min',
    conditionValue: 85,
    rewardPoints: 80
  },
  {
    code: 'DIARY_GRADE_A_PLUS',
    name: '满分作家',
    description: '日记获得A+评分(95分+)',
    emoji: '🌟',
    category: 'grade',
    conditionType: 'grade_min',
    conditionValue: 95,
    rewardPoints: 200
  },

  // ========== 累计字数类 ==========
  {
    code: 'DIARY_WORDS_10K',
    name: '万字作家',
    description: '累计写作1万字',
    emoji: '📚',
    category: 'words',
    conditionType: 'total_words',
    conditionValue: 10000,
    rewardPoints: 300
  },
  {
    code: 'DIARY_WORDS_50K',
    name: '五万字巨匠',
    description: '累计写作5万字',
    emoji: '📚',
    category: 'words',
    conditionType: 'total_words',
    conditionValue: 50000,
    rewardPoints: 1000
  },
  {
    code: 'DIARY_WORDS_100K',
    name: '十万字传说',
    description: '累计写作10万字',
    emoji: '📚',
    category: 'words',
    conditionType: 'total_words',
    conditionValue: 100000,
    rewardPoints: 3000
  },

  // ========== 段位晋升类 ==========
  {
    code: 'DIARY_RANK_SILVER',
    name: '白银晋级',
    description: '晋升到白银段位',
    emoji: '🥈',
    category: 'rank',
    conditionType: 'rank',
    conditionValue: 'silver',
    rewardPoints: 100
  },
  {
    code: 'DIARY_RANK_GOLD',
    name: '黄金晋级',
    description: '晋升到黄金段位',
    emoji: '🥇',
    category: 'rank',
    conditionType: 'rank',
    conditionValue: 'gold',
    rewardPoints: 200
  },
  {
    code: 'DIARY_RANK_PLATINUM',
    name: '铂金晋级',
    description: '晋升到铂金段位',
    emoji: '💎',
    category: 'rank',
    conditionType: 'rank',
    conditionValue: 'platinum',
    rewardPoints: 400
  },
  {
    code: 'DIARY_RANK_DIAMOND',
    name: '钻石晋级',
    description: '晋升到钻石段位',
    emoji: '💠',
    category: 'rank',
    conditionType: 'rank',
    conditionValue: 'diamond',
    rewardPoints: 800
  },
  {
    code: 'DIARY_RANK_MASTER',
    name: '大师登顶',
    description: '晋升到大师段位',
    emoji: '👑',
    category: 'rank',
    conditionType: 'rank',
    conditionValue: 'master',
    rewardPoints: 2000
  },

  // ========== 特殊成就类 ==========
  {
    code: 'DIARY_FIRST',
    name: '开篇之作',
    description: '发布第一篇日记',
    emoji: '🎉',
    category: 'special',
    conditionType: 'count',
    conditionValue: 1,
    rewardPoints: 30
  },
  {
    code: 'DIARY_COUNT_10',
    name: '小有所成',
    description: '累计发布10篇日记',
    emoji: '📖',
    category: 'special',
    conditionType: 'count',
    conditionValue: 10,
    rewardPoints: 100
  },
  {
    code: 'DIARY_COUNT_50',
    name: '笔耕不辍',
    description: '累计发布50篇日记',
    emoji: '📖',
    category: 'special',
    conditionType: 'count',
    conditionValue: 50,
    rewardPoints: 300
  },
  {
    code: 'DIARY_COUNT_100',
    name: '百篇作者',
    description: '累计发布100篇日记',
    emoji: '📖',
    category: 'special',
    conditionType: 'count',
    conditionValue: 100,
    rewardPoints: 500
  },
]

/**
 * AI 评分等级映射
 */
export const GRADE_MAP = {
  'A+': { min: 95, max: 100, color: '#FFD700', name: '卓越非凡' },
  'A':  { min: 90, max: 94,  color: '#4CAF50', name: '优秀' },
  'A-': { min: 85, max: 89,  color: '#8BC34A', name: '良好偏优' },
  'B+': { min: 80, max: 84,  color: '#00BCD4', name: '良好' },
  'B':  { min: 75, max: 79,  color: '#2196F3', name: '中等偏上' },
  'B-': { min: 70, max: 74,  color: '#03A9F4', name: '中等' },
  'C+': { min: 65, max: 69,  color: '#FFC107', name: '及格偏上' },
  'C':  { min: 60, max: 64,  color: '#FF9800', name: '及格' },
  'C-': { min: 55, max: 59,  color: '#FF5722', name: '勉强及格' },
  'D':  { min: 50, max: 54,  color: '#f44336', name: '需要努力' },
  'D-': { min: 0,  max: 49,  color: '#9E9E9E', name: '加油进步' },
}

/**
 * 根据分数获取等级
 * @param {number} score - 分数 0-100
 * @returns {string} 等级 A+/A/A-/B+/B/B-/C+/C/C-/D/D-
 */
export function getGradeByScore(score) {
  for (const [grade, config] of Object.entries(GRADE_MAP)) {
    if (score >= config.min && score <= config.max) {
      return grade
    }
  }
  return 'D-'
}

/**
 * 获取等级配置
 * @param {string} grade - 等级
 * @returns {object} 等级配置
 */
export function getGradeConfig(grade) {
  return GRADE_MAP[grade] || GRADE_MAP['D-']
}

/**
 * 根据成就代码获取成就
 * @param {string} code - 成就代码
 * @returns {object|null} 成就信息
 */
export function getAchievementByCode(code) {
  return DIARY_ACHIEVEMENTS.find(a => a.code === code) || null
}

/**
 * 获取某类别的所有成就
 * @param {string} category - 类别
 * @returns {array} 成就列表
 */
export function getAchievementsByCategory(category) {
  return DIARY_ACHIEVEMENTS.filter(a => a.category === category)
}

/**
 * 成就类别列表
 */
export const ACHIEVEMENT_CATEGORIES = [
  { key: 'streak', name: '连续挑战', icon: '🔥' },
  { key: 'level', name: '字数突破', icon: '📝' },
  { key: 'grade', name: '评分达人', icon: '⭐' },
  { key: 'words', name: '累计字数', icon: '📚' },
  { key: 'rank', name: '段位晋升', icon: '🏆' },
  { key: 'special', name: '特殊成就', icon: '🎉' },
]
