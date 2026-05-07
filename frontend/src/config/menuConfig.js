/**
 * 导航菜单配置
 * 结构化分组，支持多角色
 */
import HomeOutline from '@vicons/ionicons5/es/HomeOutline'
import LibraryOutline from '@vicons/ionicons5/es/LibraryOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import BrushOutline from '@vicons/ionicons5/es/BrushOutline'
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import FilmOutline from '@vicons/ionicons5/es/FilmOutline'
import TimerOutline from '@vicons/ionicons5/es/TimerOutline'
import EaselOutline from '@vicons/ionicons5/es/EaselOutline'
import CodeSlashOutline from '@vicons/ionicons5/es/CodeSlashOutline'
import GameControllerOutline from '@vicons/ionicons5/es/GameControllerOutline'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import FlagOutline from '@vicons/ionicons5/es/FlagOutline'
import Ribbon from '@vicons/ionicons5/es/Ribbon'
import StarOutline from '@vicons/ionicons5/es/StarOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import PersonAdd from '@vicons/ionicons5/es/PersonAdd'
import TimeOutline from '@vicons/ionicons5/es/TimeOutline'
import Pricetags from '@vicons/ionicons5/es/Pricetags'
import HelpCircleOutline from '@vicons/ionicons5/es/HelpCircleOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import CheckboxOutline from '@vicons/ionicons5/es/CheckboxOutline'
import CalendarOutline from '@vicons/ionicons5/es/CalendarOutline'
import StatsChartOutline from '@vicons/ionicons5/es/StatsChartOutline'
import Wallet from '@vicons/ionicons5/es/Wallet'
import CardOutline from '@vicons/ionicons5/es/CardOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import SchoolOutline from '@vicons/ionicons5/es/SchoolOutline'
import QrCodeOutline from '@vicons/ionicons5/es/QrCodeOutline'
import AnalyticsOutline from '@vicons/ionicons5/es/AnalyticsOutline'
import ChatbubblesOutline from '@vicons/ionicons5/es/ChatbubblesOutline'
import ListOutline from '@vicons/ionicons5/es/ListOutline'
import AddCircleOutline from '@vicons/ionicons5/es/AddCircleOutline'

/**
 * 学生基础菜单
 */
export const studentMenuItems = [
  // Core 核心
  {
    key: 'home',
    path: '/',
    label: '首页',
    icon: HomeOutline,
  },
  {
    key: 'submit',
    path: '/submit',
    label: '提交',
    icon: AddCircleOutline,
  },

  // Learn 学习
  {
    key: 'learning',
    label: '我的学习',
    icon: LibraryOutline,
    children: [
      { key: 'books', path: '/books', icon: BookOutline, label: '读书' },
      { key: 'my-notes', path: '/my-notes', icon: DocumentTextOutline, label: '笔记' },
      { key: 'learning-tracker', path: '/learning-tracker', icon: TimerOutline, label: '学习追踪' },
    ],
  },

  // Create 创作
  {
    key: 'create',
    label: '我的创作',
    icon: CreateOutline,
    children: [
      { key: 'diaries', path: '/diaries', icon: BookOutline, label: '日记' },
      { key: 'writing', path: '/writing', icon: BrushOutline, label: '书法' },
      { key: 'photos', path: '/photos', icon: CameraOutline, label: '照片' },
      { key: 'my-works', path: '/works/my', icon: CodeSlashOutline, label: '作品中心' },
    ],

  },

  // Growth 成长
  {
    key: 'growth',
    label: '成长激励',
    icon: TrophyOutline,
    children: [
      { key: 'challenges', path: '/challenges', icon: FlagOutline, label: '每日挑战' },
      { key: 'achievements', path: '/achievements', icon: Ribbon, label: '成就中心' },
      { key: 'points', path: '/points', icon: StarOutline, label: '积分中心' },
    ],
  },

  // Social 社交
  {
    key: 'social',
    label: '学习动态',
    icon: PeopleOutline,
    children: [
      { key: 'friends', path: '/friends', icon: PersonAdd, label: '学伴' },
      { key: 'moments', path: '/moments', icon: CameraOutline, label: '学习圈' },
      { key: 'messages', path: '/messages', icon: ChatbubblesOutline, label: '消息中心' },
      { key: 'works-square', path: '/works', icon: EaselOutline, label: '作品展廊' },
      { key: 'about-me', path: '/about-me', icon: PersonOutline, label: '关于我' },
    ],
  },

  // Profile 个人
  {
    key: 'wallet',
    path: '/wallet',
    label: '成长存折',
    icon: Wallet,
  },
  {
    key: 'profile',
    path: '/profile',
    label: '个人中心',
    icon: PersonOutline,
  },
];

/**
 * 管理员专属菜单
 */
export const adminMenuItems = [
  {
    key: 'admin',
    label: '系统管理',
    icon: SettingsOutline,
    children: [
      { key: 'admin-users', path: '/admin/users', icon: PeopleOutline, label: '用户管理' },
      { key: 'admin-paycodes', path: '/admin/paycodes', icon: QrCodeOutline, label: '收款码管理' },
      { key: 'admin-payment-plans', path: '/admin/payment-plans', icon: CardOutline, label: '付款计划' },
      { key: 'admin-reward-rules', path: '/admin/reward-rules', icon: TrophyOutline, label: '奖罚管理' },
      { key: 'admin-analytics', path: '/admin/analytics', icon: AnalyticsOutline, label: '数据分析' },
      { key: 'admin-feedback', path: '/admin/feedback', icon: ChatbubblesOutline, label: '用户反馈' },
      { key: 'admin-bots', path: '/admin/bots', icon: ChatbubblesOutline, label: 'Bot管理' },
      { key: 'admin-qrcode', path: '/admin/qrcode', icon: QrCodeOutline, label: '二维码生成' },
      { key: 'admin-logs', path: '/admin/logs', icon: ListOutline, label: '活动日志' },
    ],
  },
];

/**
 * 老师专属菜单
 */
export const teacherMenuItems = [
  {
    key: 'teacher-classes',
    path: '/teacher/classes',
    label: '我的班级',
    icon: SchoolOutline,
  },
];

/**
 * 家长专属菜单（动态生成）
 * @param {string} childName - 选中的孩子名字
 */
export function getParentMenuItems(childName) {
  const displayName = childName && childName !== '孩子' ? childName : '孩子';
  return [
    {
      key: 'parent-children',
      path: '/parent/children',
      label: `我的${displayName}`,
      icon: PeopleOutline,
    },
    {
      key: 'works-square',
      path: '/works',
      label: '作品展廊',
      icon: EaselOutline,
    },
    {
      key: 'parent-submissions',
      path: '/parent/submissions',
      label: `${displayName}历程`,
      icon: CreateOutline,
    },
    {
      key: 'parent-profile',
      path: '/profile',
      label: '我的',
      icon: PersonOutline,
    },
  ];
}

/**
 * 移动端底部导航
 */
export const mobileNavItems = {
  student: [
    { path: '/', label: '首页', icon: HomeOutline },
    { path: '/diaries', label: '学习', icon: LibraryOutline },
    { path: '/works', label: '作品', icon: EaselOutline },
    { path: '/friends', label: '动态', icon: PeopleOutline },
    { path: '/profile', label: '我的', icon: PersonOutline },
  ],
  admin: [
    { path: '/', label: '首页', icon: HomeOutline },
    { path: '/admin/users', label: '管理', icon: SettingsOutline },
    { path: '/works', label: '作品', icon: EaselOutline },
    { path: '/friends', label: '学伴', icon: PeopleOutline },
    { path: '/profile', label: '我的', icon: PersonOutline },
  ],
  teacher: [
    { path: '/', label: '首页', icon: HomeOutline },
    { path: '/teacher/classes', label: '班级', icon: SchoolOutline },
    { path: '/works', label: '作品', icon: EaselOutline },
    { path: '/friends', label: '学伴', icon: PeopleOutline },
    { path: '/profile', label: '我的', icon: PersonOutline },
  ],
};

/**
 * 获取家长移动端导航
 */
export function getParentMobileNav(childName) {
  const displayName = childName && childName !== '孩子' ? childName : '孩子';
  return [
    { path: '/parent/children', label: `我的${displayName}`, icon: PeopleOutline },
    { path: '/works', label: '作品展廊', icon: EaselOutline },
    { path: '/parent/submissions', label: `${displayName}历程`, icon: CreateOutline },
    { path: '/profile', label: '我的', icon: PersonOutline },
  ];
}
