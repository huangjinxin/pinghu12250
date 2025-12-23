/**
 * 家长状态管理
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export const useParentStore = defineStore('parent', () => {
  // 孩子列表
  const children = ref([]);
  // 当前选中的孩子ID
  const selectedChildId = ref(null);
  // 是否已加载
  const loaded = ref(false);

  // 当前选中的孩子对象
  const selectedChild = computed(() => {
    if (!selectedChildId.value) return null;
    return children.value.find(c => c.id === selectedChildId.value);
  });

  // 获取孩子昵称
  const getChildNickname = (child) => {
    if (!child) return '孩子';
    return child.profile?.nickname || child.username || '孩子';
  };

  // 当前选中孩子的名字
  const selectedChildName = computed(() => {
    return getChildNickname(selectedChild.value);
  });

  // 加载孩子列表
  const loadChildren = async () => {
    try {
      const data = await api.get('/users/me/children');
      children.value = data.children || [];
      // 默认选中最后一个孩子
      if (children.value.length > 0 && !selectedChildId.value) {
        selectedChildId.value = children.value[children.value.length - 1].id;
      }
      loaded.value = true;
    } catch (error) {
      console.error('加载孩子列表失败:', error);
    }
  };

  // 切换选中的孩子
  const selectChild = (childId) => {
    selectedChildId.value = childId;
  };

  // 重置状态
  const reset = () => {
    children.value = [];
    selectedChildId.value = null;
    loaded.value = false;
  };

  return {
    children,
    selectedChildId,
    selectedChild,
    selectedChildName,
    loaded,
    loadChildren,
    selectChild,
    getChildNickname,
    reset,
  };
});
