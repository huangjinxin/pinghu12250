import SchoolOutline from '@vicons/ionicons5/es/SchoolOutline'
import HomeOutline from '@vicons/ionicons5/es/HomeOutline'
import EaselOutline from '@vicons/ionicons5/es/EaselOutline'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'

export const teacherMenuItems = [
  { key: 'teacher-classes', path: '/teacher/classes', label: '我的班级', icon: SchoolOutline },
];

export const teacherBottomNav = [
  { path: '/', label: '首页', icon: HomeOutline },
  { path: '/teacher/classes', label: '班级', icon: SchoolOutline },
  { path: '/works', label: '作品', icon: EaselOutline },
  { path: '/friends', label: '学习圈', icon: PeopleOutline },
  { path: '/profile', label: '我的', icon: PersonOutline },
];
