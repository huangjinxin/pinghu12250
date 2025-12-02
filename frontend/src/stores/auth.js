/**
 * 认证状态管理
 */

import { defineStore } from 'pinia';
import { authAPI, userAPI, pointAPI } from '@/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    isLoading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isStudent: (state) => state.user?.role === 'STUDENT',
    isParent: (state) => state.user?.role === 'PARENT',
    isTeacher: (state) => state.user?.role === 'TEACHER',
  },

  actions: {
    async register(data) {
      this.isLoading = true;
      try {
        const response = await authAPI.register(data);
        this.setAuth(response.token, response.user);
        return response;
      } catch (error) {
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async login(data) {
      this.isLoading = true;
      try {
        const response = await authAPI.login(data);
        this.setAuth(response.token, response.user);
        return response;
      } catch (error) {
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCurrentUser() {
      try {
        const user = await userAPI.getCurrentUser();
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        this.logout();
        throw error;
      }
    },

    async fetchUserInfo() {
      try {
        // 获取用户基本信息
        const user = await userAPI.getCurrentUser();

        // 获取积分信息
        const pointsData = await pointAPI.getMyPoints();

        // 合并积分信息到用户对象
        user.totalPoints = pointsData.totalPoints || 0;

        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));

        return user;
      } catch (error) {
        console.error('获取用户信息失败:', error);
        throw error;
      }
    },

    setAuth(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
