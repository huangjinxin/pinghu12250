/**
 * 日记段位配置
 * 与后端 backend/src/config/diaryRanks.js 同步
 */

export const DIARY_RANKS = [
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
export function getRankByStreak(streak) {
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
export function getRankByCode(rankCode) {
  return DIARY_RANKS.find(r => r.rank === rankCode) || DIARY_RANKS[0]
}

/**
 * 获取降级后的段位
 * @param {string} currentRank - 当前段位代码
 * @returns {object} 降级后的段位信息
 */
export function getRankDowngrade(currentRank) {
  const idx = DIARY_RANKS.findIndex(r => r.rank === currentRank)
  return idx > 0 ? DIARY_RANKS[idx - 1] : DIARY_RANKS[0]
}

/**
 * 获取升级所需的连续天数
 * @param {string} currentRank - 当前段位代码
 * @returns {number|null} 升级所需天数，已满级返回null
 */
export function getStreakForNextRank(currentRank) {
  const idx = DIARY_RANKS.findIndex(r => r.rank === currentRank)
  if (idx < DIARY_RANKS.length - 1) {
    return DIARY_RANKS[idx + 1].minStreak
  }
  return null
}

/**
 * 获取距离下一段位还需要的天数
 * @param {number} currentStreak - 当前连续天数
 * @param {string} currentRank - 当前段位代码
 * @returns {number|null} 还需天数，已满级返回null
 */
export function getDaysToNextRank(currentStreak, currentRank) {
  const nextRankStreak = getStreakForNextRank(currentRank)
  if (nextRankStreak === null) return null
  return Math.max(0, nextRankStreak - currentStreak)
}

/**
 * 获取段位进度百分比
 * @param {number} currentStreak - 当前连续天数
 * @param {string} currentRank - 当前段位代码
 * @returns {number} 进度百分比 0-100
 */
export function getRankProgress(currentStreak, currentRank) {
  const currentRankInfo = getRankByCode(currentRank)
  const nextRankStreak = getStreakForNextRank(currentRank)

  if (nextRankStreak === null) {
    return 100 // 已满级
  }

  const range = nextRankStreak - currentRankInfo.minStreak
  const progress = currentStreak - currentRankInfo.minStreak
  return Math.min(100, Math.round((progress / range) * 100))
}
