/**
 * 日记段位配置
 * 前后端共享配置（需同步更新 frontend/src/config/diaryRanks.js）
 */

const DIARY_RANKS = [
  { rank: 'bronze',   name: '青铜', emoji: '🥉', minStreak: 0,   color: '#CD7F32', order: 0 },
  { rank: 'silver',   name: '白银', emoji: '🥈', minStreak: 7,   color: '#C0C0C0', order: 1 },
  { rank: 'gold',     name: '黄金', emoji: '🥇', minStreak: 14,  color: '#FFD700', order: 2 },
  { rank: 'platinum', name: '铂金', emoji: '💎', minStreak: 30,  color: '#E5E4E2', order: 3 },
  { rank: 'diamond',  name: '钻石', emoji: '💠', minStreak: 60,  color: '#B9F2FF', order: 4 },
  { rank: 'master',   name: '大师', emoji: '👑', minStreak: 100, color: '#9400D3', order: 5 },
]

/**
 * 根据连续天数获取段位
 * @param {number} streak - 连续天数
 * @returns {object} 段位信息
 */
function getRankByStreak(streak) {
  for (let i = DIARY_RANKS.length - 1; i >= 0; i--) {
    if (streak >= DIARY_RANKS[i].minStreak) {
      return DIARY_RANKS[i]
    }
  }
  return DIARY_RANKS[0]
}

/**
 * 根据段位代码获取段位信息
 * @param {string} rankCode - 段位代码
 * @returns {object} 段位信息
 */
function getRankByCode(rankCode) {
  return DIARY_RANKS.find(r => r.rank === rankCode) || DIARY_RANKS[0]
}

/**
 * 获取降级后的段位
 * @param {string} currentRank - 当前段位代码
 * @returns {object} 降级后的段位信息
 */
function getRankDowngrade(currentRank) {
  const idx = DIARY_RANKS.findIndex(r => r.rank === currentRank)
  return idx > 0 ? DIARY_RANKS[idx - 1] : DIARY_RANKS[0]
}

/**
 * 获取升级所需的连续天数
 * @param {string} currentRank - 当前段位代码
 * @returns {number|null} 升级所需天数，已满级返回null
 */
function getStreakForNextRank(currentRank) {
  const idx = DIARY_RANKS.findIndex(r => r.rank === currentRank)
  if (idx < DIARY_RANKS.length - 1) {
    return DIARY_RANKS[idx + 1].minStreak
  }
  return null
}

/**
 * 检查是否需要升级
 * @param {string} currentRank - 当前段位代码
 * @param {number} streak - 当前连续天数
 * @returns {object|null} 新段位信息或null
 */
function checkRankUpgrade(currentRank, streak) {
  const newRank = getRankByStreak(streak)
  if (newRank.rank !== currentRank) {
    const currentOrder = DIARY_RANKS.find(r => r.rank === currentRank)?.order || 0
    if (newRank.order > currentOrder) {
      return newRank
    }
  }
  return null
}

module.exports = {
  DIARY_RANKS,
  getRankByStreak,
  getRankByCode,
  getRankDowngrade,
  getStreakForNextRank,
  checkRankUpgrade,
}
