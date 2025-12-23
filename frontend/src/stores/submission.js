import { defineStore } from 'pinia';
import api from '@/api';

export const useSubmissionStore = defineStore('submission', {
  state: () => ({
    // 管理员端数据
    allSubmissions: [],
    pendingSubmissions: [],
    loading: false,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0
    },

    // 用户端数据
    mySubmissions: [],
    myLoading: false,
    myPagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0
    },

    // 统计数据
    stats: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }
  }),

  actions: {
    // 管理员获取所有提交
    async fetchAllSubmissions(page = 1, filters = {}) {
      this.loading = true;
      try {
        const params = {
          page,
          pageSize: this.pagination.pageSize,
          ...filters
        };
        const { submissions, pagination } = await api.get('/submissions', { params });
        this.allSubmissions = submissions || [];
        this.pagination = pagination || this.pagination;
      } catch (error) {
        console.error('获取所有提交失败:', error);
      } finally {
        this.loading = false;
      }
    },

    // 管理员获取待审核提交
    async fetchPendingSubmissions(page = 1, filters = {}) {
      this.loading = true;
      try {
        const params = { page, pageSize: this.pagination.pageSize, ...filters };
        const { submissions, pagination } = await api.get('/submissions/pending', { params });
        this.pendingSubmissions = submissions || [];
        this.pagination = pagination || this.pagination;
      } catch (error) {
        console.error('获取待审核提交失败:', error);
      } finally {
        this.loading = false;
      }
    },

    // 管理员审核提交
    async reviewSubmission(id, action, reviewNote, customPoints = null) {
      try {
        const data = { action, reviewNote };
        if (customPoints !== null) {
          data.customPoints = customPoints;
        }
        await api.post(`/submissions/${id}/review`, data);
        await this.fetchPendingSubmissions(this.pagination.page);
        await this.fetchStats();
      } catch (error) {
        console.error('审核提交失败:', error);
        throw error;
      }
    },

    // 获取统计数据
    async fetchStats() {
      try {
        const { stats } = await api.get('/submissions/stats');
        this.stats = stats || this.stats;
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    },

    // 用户获取自己的提交
    async fetchMySubmissions(page = 1, status = '') {
      this.myLoading = true;
      try {
        const params = {
          page,
          pageSize: this.myPagination.pageSize
        };
        if (status) params.status = status;

        const { submissions, pagination } = await api.get('/submissions/my', { params });
        this.mySubmissions = submissions || [];
        this.myPagination = pagination || this.myPagination;
      } catch (error) {
        console.error('获取我的提交失败:', error);
      } finally {
        this.myLoading = false;
      }
    },

    // 用户创建提交
    async createSubmission(data) {
      try {
        await api.post('/submissions', data);
        await this.fetchMySubmissions(1);
      } catch (error) {
        console.error('创建提交失败:', error);
        throw error;
      }
    },

    // 用户更新提交
    async updateMySubmission(id, data) {
      try {
        await api.put(`/submissions/my/${id}`, data);
        await this.fetchMySubmissions(this.myPagination.page);
      } catch (error) {
        console.error('更新提交失败:', error);
        throw error;
      }
    },

    // 用户删除提交
    async deleteMySubmission(id) {
      try {
        await api.delete(`/submissions/my/${id}`);
        await this.fetchMySubmissions(this.myPagination.page);
      } catch (error) {
        console.error('删除提交失败:', error);
        throw error;
      }
    },

    // 管理员删除提交（用于审核出错的情况，会回滚积分）
    async deleteSubmission(id) {
      try {
        await api.delete(`/submissions/admin/${id}`);
        await this.fetchAllSubmissions(this.pagination.page);
        await this.fetchStats();
      } catch (error) {
        console.error('删除提交失败:', error);
        throw error;
      }
    }
  }
});
