/**
 * 打字成就配置
 */

export const TYPING_ACHIEVEMENTS = [
  {
    code: 'TYPING_FIRST_FLIGHT',
    name: '初次起航',
    description: '首次完成一局星际字航员训练',
    emoji: '🚀',
    category: 'typing',
    rewardPoints: 20,
  },
  {
    code: 'TYPING_SESSION_10',
    name: '星际老兵',
    description: '累计完成 10 次打字训练',
    emoji: '🛰️',
    category: 'typing',
    rewardPoints: 80,
  },
  {
    code: 'TYPING_SCORE_1000',
    name: '火力全开',
    description: '单局得分达到 1000 分',
    emoji: '💥',
    category: 'typing',
    rewardPoints: 60,
  },
  {
    code: 'TYPING_WPM_40',
    name: '高速推进',
    description: '单局速度达到 40 WPM',
    emoji: '⚡',
    category: 'typing',
    rewardPoints: 60,
  },
  {
    code: 'TYPING_WPM_60',
    name: '超光速',
    description: '单局速度达到 60 WPM',
    emoji: '🌠',
    category: 'typing',
    rewardPoints: 120,
  },
  {
    code: 'TYPING_COMBO_20',
    name: '连击风暴',
    description: '单局最大连击达到 20',
    emoji: '🎯',
    category: 'typing',
    rewardPoints: 80,
  },
  {
    code: 'TYPING_STREAK_3',
    name: '连续出航',
    description: '连续 3 天完成打字训练',
    emoji: '🔥',
    category: 'typing',
    rewardPoints: 100,
  },
  {
    code: 'TYPING_ACCURACY_98',
    name: '零误锁定',
    description: '单局准确率达到 98%',
    emoji: '🎖️',
    category: 'typing',
    rewardPoints: 100,
  },
];

export const TYPING_ACHIEVEMENT_CATEGORIES = [
  { key: 'typing', name: '打字成就', icon: '⌨️' },
];
