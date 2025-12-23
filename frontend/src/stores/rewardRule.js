import { defineStore } from 'pinia';
import api from '@/api';

export const useRewardRuleStore = defineStore('rewardRule', {
  state: () => ({
    // 技术类型
    types: [],
    typesLoading: false,

    // 展示标准
    standards: [],
    standardsLoading: false,

    // 规则模板
    templates: [],
    templatesLoading: false,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0
    },

    // 筛选条件
    filters: {
      keyword: '',
      typeId: '',
      standardId: '',
      status: ''
    },

    // 当前编辑的模板
    currentTemplate: null
  }),

  getters: {
    typeOptions() {
      return this.types.map(t => ({
        value: t.id,
        label: t.name
      }));
    },

    standardOptions() {
      return this.standards.map(s => ({
        value: s.id,
        label: s.name
      }));
    },

    statusOptions() {
      return [
        { value: 'ENABLED', label: '已启用' },
        { value: 'DISABLED', label: '已禁用' }
      ];
    }
  },

  actions: {
    // 获取技术类型
    async fetchTypes() {
      this.typesLoading = true;
      try {
        const { types } = await api.get('/rules/types');
        this.types = types || [];
      } catch (error) {
        console.error('获取技术类型失败:', error);
      } finally {
        this.typesLoading = false;
      }
    },

    // 创建技术类型
    async createType(name, description) {
      try {
        const { type } = await api.post('/rules/types', { name, description });
        this.types.unshift(type);
        return type;
      } catch (error) {
        console.error('创建技术类型失败:', error);
        throw error;
      }
    },

    // 删除技术类型
    async deleteType(id) {
      try {
        await api.delete(`/rules/types/${id}`);
        this.types = this.types.filter(t => t.id !== id);
      } catch (error) {
        console.error('删除技术类型失败:', error);
        throw error;
      }
    },

    // 获取展示标准
    async fetchStandards() {
      this.standardsLoading = true;
      try {
        const { standards } = await api.get('/rules/standards');
        this.standards = standards || [];
      } catch (error) {
        console.error('获取展示标准失败:', error);
      } finally {
        this.standardsLoading = false;
      }
    },

    // 创建展示标准
    async createStandard(name, description) {
      try {
        const { standard } = await api.post('/rules/standards', { name, description });
        this.standards.unshift(standard);
        return standard;
      } catch (error) {
        console.error('创建展示标准失败:', error);
        throw error;
      }
    },

    // 删除展示标准
    async deleteStandard(id) {
      try {
        await api.delete(`/rules/standards/${id}`);
        this.standards = this.standards.filter(s => s.id !== id);
      } catch (error) {
        console.error('删除展示标准失败:', error);
        throw error;
      }
    },

    // 获取规则模板列表
    async fetchTemplates(page = 1) {
      this.templatesLoading = true;
      try {
        const params = {
          page,
          pageSize: this.pagination.pageSize,
          ...this.filters
        };
        const { templates, pagination } = await api.get('/rules/templates', { params });
        this.templates = templates || [];
        this.pagination = pagination || this.pagination;
      } catch (error) {
        console.error('获取规则模板失败:', error);
      } finally {
        this.templatesLoading = false;
      }
    },

    // 创建规则模板
    async createTemplate(data) {
      try {
        await api.post('/rules/templates', data);
        await this.fetchTemplates(this.pagination.page);
      } catch (error) {
        console.error('创建规则模板失败:', error);
        throw error;
      }
    },

    // 更新规则模板
    async updateTemplate(id, data) {
      try {
        await api.put(`/rules/templates/${id}`, data);
        await this.fetchTemplates(this.pagination.page);
      } catch (error) {
        console.error('更新规则模板失败:', error);
        throw error;
      }
    },

    // 删除规则模板
    async deleteTemplate(id) {
      try {
        await api.delete(`/rules/templates/${id}`);
        await this.fetchTemplates(this.pagination.page);
      } catch (error) {
        console.error('删除规则模板失败:', error);
        throw error;
      }
    },

    // 切换规则状态
    async toggleTemplateStatus(id) {
      try {
        await api.patch(`/rules/templates/${id}/status`);
        await this.fetchTemplates(this.pagination.page);
      } catch (error) {
        console.error('切换规则状态失败:', error);
        throw error;
      }
    },

    // 设置筛选条件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
      this.fetchTemplates(1);
    },

    // 重置筛选条件
    resetFilters() {
      this.filters = {
        keyword: '',
        typeId: '',
        standardId: '',
        status: ''
      };
      this.fetchTemplates(1);
    }
  }
});
