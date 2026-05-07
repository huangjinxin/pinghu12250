import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import CardOutline from '@vicons/ionicons5/es/CardOutline'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import AnalyticsOutline from '@vicons/ionicons5/es/AnalyticsOutline'
import ChatbubblesOutline from '@vicons/ionicons5/es/ChatbubblesOutline'
import HomeOutline from '@vicons/ionicons5/es/HomeOutline'
import EaselOutline from '@vicons/ionicons5/es/EaselOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import StarOutline from '@vicons/ionicons5/es/StarOutline'

export const adminMenuItems = [
  {
    key: 'admin', label: '系统管理', icon: SettingsOutline,
    children: [
      { key: 'admin-home', path: '/admin', icon: HomeOutline, label: '管理首页' },
      { key: 'admin-users', path: '/admin/users', icon: PeopleOutline, label: '用户管理' },
      { key: 'admin-paycodes', path: '/admin/paycodes', icon: CardOutline, label: '财务管理' },
      { key: 'admin-reward-rules', path: '/admin/reward-rules', icon: TrophyOutline, label: '奖罚管理' },
      { key: 'admin-credit-rules', path: '/admin/credit-rules', icon: StarOutline, label: '信用管理' },
      { key: 'admin-interaction', path: '/admin/interaction', icon: ChatbubblesOutline, label: '互动管理' },
      { key: 'admin-analytics', path: '/admin/analytics', icon: AnalyticsOutline, label: '数据中心' },
    ]
  },
];

export const adminBottomNav = [
  { path: '/', label: '首页', icon: HomeOutline },
  { path: '/admin', label: '管理', icon: SettingsOutline },
  { path: '/works', label: '作品', icon: EaselOutline },
  { path: '/friends', label: '学习圈', icon: PeopleOutline },
  { path: '/profile', label: '我的', icon: PersonOutline },
];
