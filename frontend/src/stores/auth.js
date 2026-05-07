/**
 * 认证状态管理
 */

import { defineStore } from 'pinia';
import { authAPI, userAPI, pointAPI } from '@/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isLoading: false,
    // 2FA 相关状态
    pendingTwoFactor: false,
    tempToken: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isStudent: (state) => state.user?.role === 'STUDENT',
    isParent: (state) => state.user?.role === 'PARENT',
    isTeacher: (state) => state.user?.role === 'TEACHER',
  },

  actions: {
    async register(data) {
      this.isLoading = true;
      try {
        const response = await authAPI.register(data);
        this.setUser(response.user);
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

        // 检查是否需要两步验证
        if (response.requiresTwoFactor) {
          this.pendingTwoFactor = true;
          this.tempToken = response.tempToken;
          return { requiresTwoFactor: true };
        }

        this.setUser(response.user);
        return response;
      } catch (error) {
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async verifyTwoFactor(code) {
      this.isLoading = true;
      try {
        const response = await authAPI.verifyTwoFactor({
          tempToken: this.tempToken,
          code,
        });

        this.setUser(response.user);

        // 清除 2FA 临时状态
        this.pendingTwoFactor = false;
        this.tempToken = null;

        return response;
      } catch (error) {
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    cancelTwoFactor() {
      this.pendingTwoFactor = false;
      this.tempToken = null;
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

    setUser(user) {
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },

    async logout() {
      try {
        await authAPI.logout();
      } catch (e) {
        console.error('登出失败:', e);
      }
      this.user = null;
      this.pendingTwoFactor = false;
      this.tempToken = null;
      localStorage.removeItem('user');
      window.location.href = '/login';
    },

    async logoutAll() {
      try {
        await authAPI.logoutAll();
      } catch (e) {
        console.error('登出失败:', e);
      }
      this.user = null;
      this.pendingTwoFactor = false;
      this.tempToken = null;
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },
});
