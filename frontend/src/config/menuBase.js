import HomeOutline from '@vicons/ionicons5/es/HomeOutline'
import AddCircleOutline from '@vicons/ionicons5/es/AddCircleOutline'
import LibraryOutline from '@vicons/ionicons5/es/LibraryOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import TimerOutline from '@vicons/ionicons5/es/TimerOutline'
import CreateOutline from '@vicons/ionicons5/es/CreateOutline'
import BrushOutline from '@vicons/ionicons5/es/BrushOutline'
import TextOutline from '@vicons/ionicons5/es/TextOutline'
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import CodeSlashOutline from '@vicons/ionicons5/es/CodeSlashOutline'
import GameControllerOutline from '@vicons/ionicons5/es/GameControllerOutline'
import Ribbon from '@vicons/ionicons5/es/Ribbon'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import EaselOutline from '@vicons/ionicons5/es/EaselOutline'
import ChatbubblesOutline from '@vicons/ionicons5/es/ChatbubblesOutline'
import KeypadOutline from '@vicons/ionicons5/es/KeypadOutline'

import CartOutline from '@vicons/ionicons5/es/CartOutline'
import Wallet from '@vicons/ionicons5/es/Wallet'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'

export const baseMenuItems = [
  { key: 'home', path: '/', label: '每日任务', icon: HomeOutline },
  { key: 'submit', path: '/submit', label: '提交beta', icon: AddCircleOutline },
  {
    key: 'social', label: '学习动态', icon: PeopleOutline,
    children: [
      { key: 'works-square', path: '/works', icon: EaselOutline, label: '作品展廊' },
      { key: 'shopping', path: '/shopping', icon: CartOutline, label: '成长兑换' },
      { key: 'moments', path: '/moments', icon: CameraOutline, label: '学习圈' },
      { key: 'messages', path: '/messages', icon: ChatbubblesOutline, label: '消息中心' },
      { key: 'about-me', path: '/about-me', icon: PersonOutline, label: '关于我' },
    ]
  },
  {
    key: 'create', label: '我的创作', icon: CreateOutline,
    children: [
      { key: 'diaries', path: '/diaries', icon: BookOutline, label: '日记' },
      { key: 'writing', path: '/writing', icon: BrushOutline, label: '书法' },
      { key: 'pinyin', path: '/pinyin', icon: TextOutline, label: '拼音' },
      { key: 'typing', path: '/typing', icon: KeypadOutline, label: '打字' },
      { key: 'photos', path: '/photos', icon: CameraOutline, label: '照片' },
      { key: 'my-works', path: '/works/my', icon: CodeSlashOutline, label: '创作' },
    ]
  },
  { key: 'achievements', path: '/achievements', label: '成就中心', icon: Ribbon },
  {
    key: 'learning', label: '我的学习', icon: LibraryOutline,
    children: [
      { key: 'books', path: '/books', icon: BookOutline, label: '读书' },
      { key: 'my-notes', path: '/my-notes', icon: DocumentTextOutline, label: '笔记' },
      { key: 'learning-tracker', path: '/learning-tracker', icon: TimerOutline, label: '学习追踪' },
    ]
  },
  { key: 'wallet', path: '/wallet', label: '成长存折', icon: Wallet },
  { key: 'profile', path: '/profile', label: '个人中心', icon: PersonOutline },
];

export const baseBottomNav = [
  { path: '/', label: '首页', icon: HomeOutline },
  { path: '/submit', label: '提交', icon: AddCircleOutline },
  { path: '/works', label: '作品', icon: EaselOutline },
  { path: '/achievements', label: '成就', icon: Ribbon },
  { path: '/profile', label: '我的', icon: PersonOutline },
];

export { HomeOutline, PeopleOutline, EaselOutline, PersonOutline, CreateOutline, Ribbon };
