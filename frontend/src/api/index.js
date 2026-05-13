// @AI:LOCK 此目录仅此一个文件,禁止新增api/*.js
// @AI:MODIFY 仅在文件末尾追加新API对象,不重构现有代码
// @AI:PATTERN [module]API = { getList,getById,create,update,delete,... }
/**
 * API服务 - 统一管理所有API请求
 */

import axios from 'axios';
import { detectAndShowPointNotification } from '@/utils/pointNotification';

const api = axios.create({
  baseURL: '/api',
  timeout: 0, 
  withCredentials: true, // 启用跨域 Cookie 传输
});

// 静默刷新状态维护
let isRefreshing = false;
let requestsQueue = [];

// 将请求加入等待队列
const subscribeTokenRefresh = (cb) => {
  requestsQueue.push(cb);
};

// 刷新成功后重发队列
const onRefreshed = (token) => {
  requestsQueue.map((cb) => cb(token));
  requestsQueue = [];
};

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // Cookie 模式下通常不需要手动设置 Authorization Header
    // 但如果后端仍需要兼容旧的 Bearer Token 模式，可以保留逻辑。
    // 这里我们优先信任 Cookie。
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和积分通知
api.interceptors.response.use(
  (response) => {
    const data = response.data;
    detectAndShowPointNotification(data);
    return data;
  },
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    // 如果状态码是 401 且不是刷新接口本身报的错
    if (response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 发起静默刷新
        await authAPI.refresh();
        isRefreshing = false;
        onRefreshed(); // 通知队列
        return api(originalRequest); // 重试当前请求
      } catch (refreshError) {
        isRefreshing = false;
        requestsQueue = [];
        // 刷新也失败，清除登录状态并跳转
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

// 认证API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyTwoFactor: (data) => api.post('/auth/verify-2fa', data),
  refresh: () => api.get('/auth/refresh'), // 刷新接口改为 GET 且不传参
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/logout-all'),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.post(`/auth/sessions/${id}/revoke`),
  deleteAccount: (password) => api.delete('/auth/delete-account', { data: { password } }),
};

// 用户API
export const userAPI = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  updatePassword: (data) => api.put('/users/me/password', data),
  uploadAvatar: (formData) => api.post('/users/me/avatar', formData),
  getUserById: (id) => api.get(`/users/${id}`),
  getUserStats: (id) => api.get(`/users/${id}/stats`),
  linkParent: (parentEmail) => api.post('/users/link-parent', { parentEmail }),
  generateInviteCode: (inviteType) => api.post('/users/invites/generate', { inviteType }),
  getInviteRecords: () => api.get('/users/invites/records'),
  getChildren: () => api.get('/users/me/children'),
  getTeachers: () => api.get('/users/teachers'),
  search: (params) => api.get('/users/search', { params }),
  // 支付密码
  resetPaymentPassword: (data) => api.put('/users/me/payment-password', data),
  verifyPaymentPassword: (password) => api.post('/users/me/payment-password/verify', { password }),
  checkPaymentPasswordSet: () => api.get('/users/me/payment-password/check'),
  // 好友设置
  getFriendSettings: () => api.get('/users/me/friend-settings'),
  updateFriendSettings: (data) => api.put('/users/me/friend-settings', data),
  // 学校班级
  updateMySchoolClass: (data) => api.put('/users/me/school-class', data),
  // 登录活动
  getLoginActivities: (params) => api.get('/users/me/login-activities', { params }),
  // 操作日志
  getActivityLogs: (params) => api.get('/users/me/activity-logs', { params }),
};

// 动态API
export const postAPI = {
  getPosts: (params) => api.get('/posts', { params }),
  getPostById: (id) => api.get(`/posts/${id}`),
  createPost: (data) => api.post('/posts', data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  addComment: (id, content, parentId) => api.post(`/posts/${id}/comments`, { content, parentId }),
  deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`),
};

// 日记API
export const diaryAPI = {
  getDiaries: (params) => api.get('/diaries', { params }),
  createDiary: (data) => api.post('/diaries', data),
  updateDiary: (id, data) => api.put(`/diaries/${id}`, data),
  deleteDiary: (id) => api.delete(`/diaries/${id}`),
  // 公开接口
  getPublicDiary: (id) => api.get(`/diaries/${id}/public`),
  addComment: (id, data) => api.post(`/diaries/${id}/comments`, data),
  deleteComment: (diaryId, commentId) => api.delete(`/diaries/${diaryId}/comments/${commentId}`),
  // 查重检测
  checkDuplicate: (content) => api.post('/diaries/check-duplicate', { content }),
};

// 日记模板API
export const diaryTemplateAPI = {
  // 获取所有模板
  getList: () => api.get('/diary-templates'),
  // 创建模板
  create: (data) => api.post('/diary-templates', data),
  // 使用模板（增加使用次数）
  use: (id) => api.post(`/diary-templates/${id}/use`),
  // 删除模板
  delete: (id) => api.delete(`/diary-templates/${id}`),
};

// 作业API
export const homeworkAPI = {
  getHomeworks: (params) => api.get('/homeworks', { params }),
  createHomework: (data) => api.post('/homeworks', data),
  deleteHomework: (id) => api.delete(`/homeworks/${id}`),
};

// 笔记API
export const noteAPI = {
  getNotes: () => api.get('/notes'),
  createNote: (data) => api.post('/notes', data),
  updateNote: (id, data) => api.put(`/notes/${id}`, data),
  deleteNote: (id) => api.delete(`/notes/${id}`),
};

// 读书笔记API
export const readingNoteAPI = {
  getReadingNotes: () => api.get('/reading-notes'),
  createReadingNote: (data) => api.post('/reading-notes', data),
  updateReadingNote: (id, data) => api.put(`/reading-notes/${id}`, data),
  deleteReadingNote: (id) => api.delete(`/reading-notes/${id}`),
};

// HTML作品API
export const htmlWorkAPI = {
  getWorks: (params) => api.get('/html-works', { params }),
  getCategories: () => api.get('/html-works/categories/list'),
  getWorkById: (id) => api.get(`/html-works/${id}`),
  createWork: (data) => api.post('/html-works', data),
  updateWork: (id, data) => api.put(`/html-works/${id}`, data),
  deleteWork: (id) => api.delete(`/html-works/${id}`),
  forkWork: (id) => api.post(`/html-works/${id}/fork`),
  toggleLike: (id) => api.post(`/html-works/${id}/like`),
  addComment: (id, content) => api.post(`/html-works/${id}/comments`, { content }),
};

// 任务API
export const taskAPI = {
  getTasks: (params) => api.get('/tasks', { params }),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  completeTask: (id, data) => api.put(`/tasks/${id}/complete`, data),
  archiveTask: (id) => api.put(`/tasks/${id}/archive`),
  // 个人任务
  createPersonalTask: (data) => api.post('/tasks/personal', data),
  updatePersonalTask: (id, data) => api.put(`/tasks/personal/${id}`, data),
  completePersonalTask: (id, data) => api.put(`/tasks/personal/${id}/complete`, data),
  archivePersonalTask: (id) => api.put(`/tasks/personal/${id}/archive`),
  deletePersonalTask: (id) => api.delete(`/tasks/personal/${id}`),
};

// 日历API
export const calendarAPI = {
  getEvents: (params) => api.get('/calendar', { params }),
  createEvent: (data) => api.post('/calendar', data),
  deleteEvent: (id) => api.delete(`/calendar/${id}`),
};

// 统计API
export const statsAPI = {
  getHeatmap: (params) => api.get('/stats/heatmap', { params }),
  getOverview: () => api.get('/stats/overview'),
};

// 搜索API
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
};

// 看板API
export const boardAPI = {
  getBoards: () => api.get('/boards'),
  searchUsers: (params) => api.get('/boards/users/search', { params }),
  getBoardById: (id) => api.get(`/boards/${id}`),
  createBoard: (data) => api.post('/boards', data),
  updateBoard: (id, data) => api.put(`/boards/${id}`, data),
  deleteBoard: (id) => api.delete(`/boards/${id}`),
  inviteMembers: (boardId, data) => api.post(`/boards/${boardId}/members`, data),
  updateMemberRole: (boardId, memberId, data) => api.put(`/boards/${boardId}/members/${memberId}`, data),
  removeMember: (boardId, memberId) => api.delete(`/boards/${boardId}/members/${memberId}`),
  createList: (boardId, data) => api.post(`/boards/${boardId}/lists`, data),
  updateList: (listId, data) => api.put(`/boards/lists/${listId}`, data),
  deleteList: (listId) => api.delete(`/boards/lists/${listId}`),
  createCard: (listId, data) => api.post(`/boards/lists/${listId}/cards`, data),
  updateCard: (cardId, data) => api.put(`/boards/cards/${cardId}`, data),
  deleteCard: (cardId) => api.delete(`/boards/cards/${cardId}`),
  assignCardMembers: (cardId, data) => api.post(`/boards/cards/${cardId}/members`, data),
  removeCardMember: (cardId, memberId) => api.delete(`/boards/cards/${cardId}/members/${memberId}`),
  getCardComments: (cardId) => api.get(`/boards/cards/${cardId}/comments`),
  addCardComment: (cardId, data) => api.post(`/boards/cards/${cardId}/comments`, data),
  deleteComment: (commentId) => api.delete(`/boards/comments/${commentId}`),
};

// 管理员API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  updateUserJoinedDate: (id, data) => api.put(`/admin/users/${id}/joined-date`, data),
  updateUserChildren: (id, data) => api.put(`/admin/users/${id}/children`, data),
  resetUserPassword: (id, data) => api.put(`/admin/users/${id}/reset-password`, data),
  clearUser2FA: (id) => api.delete(`/admin/users/${id}/2fa`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPendingUsers: () => api.get('/admin/pending-users'),
  getStudents: (params) => api.get('/admin/students', { params }),
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  getStats: () => api.get('/admin/stats'),
  assignStudentClass: (id, data) => api.put(`/admin/users/${id}/assign-class`, data),
  getUserSettings: (id) => api.get(`/admin/users/${id}/settings`),
  updateUserSettings: (id, data) => api.put(`/admin/users/${id}/settings`, data),
};

// 扫码支付API
export const payAPI = {
  // 管理员接口
  createPayCode: (data) => api.post('/pay/codes', data),
  getPayCodes: (params) => api.get('/pay/codes', { params }),
  getPayCode: (id) => api.get(`/pay/codes/${id}`),
  updatePayCode: (id, data) => api.put(`/pay/codes/${id}`, data),
  togglePayCode: (id) => api.put(`/pay/codes/${id}/toggle`),
  deletePayCode: (id) => api.delete(`/pay/codes/${id}`),
  getCategories: () => api.get('/pay/codes/categories'),
  getAllOrders: (params) => api.get('/pay/orders', { params }),
  getUserOrders: (userId, params) => api.get(`/pay/orders/user/${userId}`, { params }),
  getOrderStats: (params) => api.get('/pay/orders/stats', { params }),

  // 学生接口
  scanPayCode: (code) => api.get(`/pay/scan/${code}`),
  submitPayment: (data) => api.post('/pay/submit', data),
  getMyOrders: (params) => api.get('/pay/my-orders', { params }),

  // 公开接口（无需登录）
  getPublicPayCodes: (params) => api.get('/pay/public/codes', { params }),
};

// 校区API
export const campusAPI = {
  getCampuses: () => api.get('/campuses'),
  getCampus: (id) => api.get(`/campuses/${id}`),
  createCampus: (data) => api.post('/campuses', data),
  updateCampus: (id, data) => api.put(`/campuses/${id}`, data),
  deleteCampus: (id) => api.delete(`/campuses/${id}`),
};

// 班级API
export const classAPI = {
  getClasses: (params) => api.get('/classes', { params }),
  getClass: (id) => api.get(`/classes/${id}`),
  createClass: (data) => api.post('/classes', data),
  updateClass: (id, data) => api.put(`/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/classes/${id}`),
  assignTeacher: (id, data) => api.post(`/classes/${id}/teachers`, data),
  removeTeacher: (id, teacherId) => api.delete(`/classes/${id}/teachers/${teacherId}`),
  getMyClasses: () => api.get('/classes/my-classes'),
};

// 日常记录API
export const recordAPI = {
  getRecords: (params) => api.get('/records', { params }),
  getStudentRecords: (studentId, params) => api.get(`/records/student/${studentId}`, { params }),
  getStudentDayRecords: (studentId, date) => api.get(`/records/student/${studentId}/date/${date}`),
  createRecord: (data) => api.post('/records', data),
  updateRecord: (id, data) => api.put(`/records/${id}`, data),
  deleteRecord: (id) => api.delete(`/records/${id}`),
  getStatistics: (params) => api.get('/records/statistics', { params }),
};

// 积分API
// ===== 信用评分 API =====
export const dictAPI = {
  getWordDetail: (word) => api.get(`/dict/${encodeURIComponent(word)}`)
};

export const adminCreditAPI = {
  getRules: () => api.get('/admin/credit-rules'),
  createRule: (data) => api.post('/admin/credit-rules', data),
  updateRule: (id, data) => api.put(`/admin/credit-rules/${id}`, data),
  deleteRule: (id) => api.delete(`/admin/credit-rules/${id}`),
  getProfiles: (params) => api.get('/admin/credit-profiles', { params }),
  getUserCreditDetail: (userId) => api.get(`/admin/credit-profiles/${userId}`)
};

export const creditAPI = {
  getProfile: () => api.get('/credit/profile'),
  submitOfflineActivity: (data) => api.post('/credit/offline-activity', data)
};

export const pointAPI = {
  getRules: () => api.get('/points/admin/rules'),
  getMyPoints: () => api.get('/points/my'),
  getMy: () => api.get('/points/my'), // 保持兼容
  getPointLogs: (params) => api.get('/points/records', { params }),
  getRecords: (params) => api.get('/points/records', { params }), // 保持兼容
  getStats: () => api.get('/points/stats'),
  getLeaderboard: (params) => api.get('/points/leaderboard', { params }),

  // 每日限制
  getDailyLimit: () => api.get('/points/daily-limit'),

  // 积分兑换
  getExchangeConfig: () => api.get('/points/exchange/config'),
  exchangePointsToCoins: (data) => api.post('/points/exchange', data),
  getExchangeHistory: (params) => api.get('/points/exchange/history', { params }),

  // 管理员功能
  adminCreateRule: (data) => api.post('/points/admin/rules', data),
  adminUpdateRule: (id, data) => api.put(`/points/admin/rules/${id}`, data),
  adminAdjust: (data) => api.post('/points/admin/adjust', data),
  adminInitRules: () => api.post('/points/admin/init'),
  adminGetLogs: (params) => api.get('/points/admin/logs', { params }),
  adminGetDailyLimitConfig: () => api.get('/points/admin/daily-limit-config'),
  adminUpdateDailyLimitConfig: (data) => api.put('/points/admin/daily-limit-config', data),

  // 信用分
  getCreditScore: () => api.get('/points/credit-score'),
};

// 游戏API
export const gameAPI = {
  // 游戏大厅
  getFeed: (params) => api.get('/games/feed', { params }),
  getHot: (params) => api.get('/games/hot', { params }),
  searchGames: (params) => api.get('/games/search', { params }),
  getTypes: () => api.get('/games/types'),
  addGame: (data) => api.post('/games', data),

  // 游戏详情
  getGameDetails: (id) => api.get(`/games/${id}`),
  getShortReviews: (id, params) => api.get(`/games/${id}/short-reviews`, { params }),
  getLongReviews: (id, params) => api.get(`/games/${id}/long-reviews`, { params }),

  // 我的游戏库
  getMyLibrary: (params) => api.get('/games/my/library', { params }),
  addToLibrary: (id, data) => api.post(`/games/${id}/add-to-library`, data),

  // 写评测
  writeShortReview: (id, data) => api.post(`/games/${id}/short-review`, data),
  writeLongReview: (id, data) => api.post(`/games/${id}/long-review`, data),

  // 长评详情
  getLongReviewDetail: (id) => api.get(`/games/long-review/${id}`),
  likeLongReview: (id) => api.post(`/games/long-review/${id}/like`),
  commentLongReview: (id, data) => api.post(`/games/long-review/${id}/comment`, data),

  // 管理员功能
  createGame: (data) => api.post('/games', data),
  updateGame: (id, data) => api.put(`/games/${id}`, data),
  deleteGame: (id) => api.delete(`/games/${id}`),
};

// 管理员游戏API
export const adminGameAPI = {
  getRecords: (params) => api.get('/admin/games/records', { params }),
  deleteRecord: (id) => api.delete(`/admin/games/records/${id}`),
  blockGame: (id, data) => api.put(`/admin/games/${id}/block`, data),
  getStats: () => api.get('/admin/games/stats'),
};

// 学习追踪API
export const learningAPI = {
  // 项目管理
  getProjects: () => api.get('/learning/projects'),
  createProject: (data) => api.post('/learning/projects', data),
  updateProject: (id, data) => api.put(`/learning/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/learning/projects/${id}`),

  // 计时器
  startTimer: (data) => api.post('/learning/start', data),
  getActiveTimer: () => api.get('/learning/active-timer'),
  stopLearning: (data) => api.post('/learning/stop', data),
  abandonTimer: () => api.delete('/learning/active-timer'),

  // 学习记录
  getSessions: (params) => api.get('/learning/sessions', { params }),
  getSession: (id) => api.get(`/learning/sessions/${id}`),
  toggleSessionLike: (id) => api.post(`/learning/sessions/${id}/like`),
  deleteSession: (id) => api.delete(`/learning/sessions/${id}`),

  // 学习动态
  getFeed: (params) => api.get('/learning/feed', { params }),

  // 统计数据
  getStats: () => api.get('/learning/stats'),
  getHeatmap: (params) => api.get('/learning/heatmap', { params }),
  getLeaderboard: (params) => api.get('/learning/leaderboard', { params }),
};

// 每日挑战API
export const challengeAPI = {
  // 用户接口
  getTodayChallenges: () => api.get('/challenges/today'),
  getMyChallenges: (params) => api.get('/challenges/my', { params }),
  getChallengeStatus: (challengeId) => api.get(`/challenges/${challengeId}/status`),
  claimReward: (recordId) => api.post(`/challenges/${recordId}/claim`),
  getHistory: (params) => api.get('/challenges/history', { params }),
  getStats: () => api.get('/challenges/stats'),

  // 管理员接口
  adminGetTemplates: () => api.get('/challenges/admin/templates'),
  adminCreateTemplate: (data) => api.post('/challenges/admin/templates', data),
  adminUpdateTemplate: (id, data) => api.put(`/challenges/admin/templates/${id}`, data),
  adminDeleteTemplate: (id) => api.delete(`/challenges/admin/templates/${id}`),
  adminGenerateChallenges: () => api.post('/challenges/admin/generate'),
  adminGetList: (params) => api.get('/challenges/admin/list', { params }),
  adminCreate: (data) => api.post('/challenges/admin', data),
  adminUpdate: (id, data) => api.put(`/challenges/admin/${id}`, data),
  adminDelete: (id) => api.delete(`/challenges/admin/${id}`),
  adminAssign: (data) => api.post('/challenges/admin/assign', data),
};

// 互评API
export const reviewAPI = {
  getTaskStatus: () => api.get('/review/task-status'),
  getTaskTargets: () => api.get('/review/task-targets'),
  submitReview: (data) => api.post('/review/submit', data),
  getMyReviews: (params) => api.get('/review/my-reviews', { params }),
  skipTarget: () => api.post('/review/skip-target'),
};

// 标签系统API
export const tagAPI = {
  // 用户接口
  getHotTags: (params) => api.get('/tags/hot', { params }),
  getTagsByCategory: (category) => api.get('/tags/category/' + category),
  searchTags: (params) => api.get('/tags/search', { params }),
  getTagDetail: (tagName) => api.get(`/tags/${tagName}`),
  getTagContents: (tagName, params) => api.get(`/tags/${tagName}/contents`, { params }),

  // 根据类型获取已标记内容
  getTaggedWorks: (tagId, params) => api.get(`/tags/${tagId}/works`, { params }),
  getTaggedDiaries: (tagId, params) => api.get(`/tags/${tagId}/diaries`, { params }),
  getTaggedNotes: (tagId, params) => api.get(`/tags/${tagId}/notes`, { params }),
  getTaggedBooks: (tagId, params) => api.get(`/tags/${tagId}/books`, { params }),

  // 管理员接口
  adminGetList: (params) => api.get('/tags/admin/list', { params }),
  adminCreate: (data) => api.post('/tags/admin', data),
  adminUpdate: (id, data) => api.put(`/tags/admin/${id}`, data),
  adminDelete: (id) => api.delete(`/tags/admin/${id}`),
  adminMerge: (data) => api.post('/tags/admin/merge', data),
};

// 钱包/市集系统API
export const walletAPI = {
  // 钱包接口
  getWallet: () => api.get('/wallet'),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
  exchangePoints: (data) => api.post('/wallet/exchange', data),

  // 市集接口
  getMarketWorks: (params) => api.get('/market/works', { params }),
  getWorkById: (id) => api.get(`/market/works/${id}`),
  purchaseWork: (workId) => api.post(`/market/works/${workId}/purchase`),
  getMyShop: () => api.get('/market/my-shop'),
  getMyPurchases: (params) => api.get('/market/my-purchases', { params }),
  listWork: (data) => api.post('/market/listings', data),
  delistWork: (listingId) => api.delete(`/market/listings/${listingId}`),
  updateListing: (listingId, data) => api.put(`/market/listings/${listingId}`, data),

  // 排行榜
  getMarketLeaderboard: (type) => api.get(`/market/leaderboard/${type}`),
  getMySales: (params) => api.get('/market/my-sales', { params }),

  // 管理员接口
  adminGetWorks: (params) => api.get('/market/admin/works', { params }),
  adminGetTransactions: (params) => api.get('/market/admin/transactions', { params }),
  adminDeleteListing: (id) => api.delete(`/market/admin/listings/${id}`),
  adminUpdateCommission: (data) => api.put('/market/admin/commission', data),
};

// 朋友关系API
export const friendAPI = {
  // 关注操作
  follow: (userId) => api.post(`/follows/${userId}`),
  unfollow: (userId) => api.delete(`/follows/${userId}`),

  // 查询接口
  getFollowing: (params) => api.get('/follows/following', { params }),
  getFollowers: (params) => api.get('/follows/followers', { params }),
  getFriends: (params) => api.get('/follows/friends', { params }),
  getStatus: (userId) => api.get(`/follows/status/${userId}`),
  getRecommendations: (params) => api.get('/follows/recommendations', { params }),
  getStats: (userId) => api.get(`/follows/stats/${userId}`),

  // 排行榜
  getLeaderboard: (type, params) => api.get(`/follows/leaderboard/${type}`, { params }),

  // 推荐系统
  getNewUsers: (params) => api.get('/follows/new-users', { params }),
  getActiveUsers: (params) => api.get('/follows/active-users', { params }),

  // 好友申请
  sendRequest: (data) => api.post('/friend-requests', data),
  getReceivedRequests: (params) => api.get('/friend-requests/received', { params }),
  getSentRequests: (params) => api.get('/friend-requests/sent', { params }),
  acceptRequest: (requestId) => api.post(`/friend-requests/${requestId}/accept`),
  rejectRequest: (requestId) => api.post(`/friend-requests/${requestId}/reject`),
};

// 成就系统API
export const achievementAPI = {
  // 用户接口
  getMyAchievements: () => api.get('/achievements/my'),
  getAllAchievements: (params) => api.get('/achievements/all', { params }),
  getUserAchievements: (userId, params) => api.get(`/achievements/user/${userId}`, { params }),
  toggleShowcase: (achievementId) => api.post(`/achievements/${achievementId}/showcase`),
  getProgress: () => api.get('/achievements/progress'),

  // 管理员接口
  adminGetList: (params) => api.get('/achievements/admin/list', { params }),
  adminCreate: (data) => api.post('/achievements/admin', data),
  adminUpdate: (id, data) => api.put(`/achievements/admin/${id}`, data),
  adminDelete: (id) => api.delete(`/achievements/admin/${id}`),
  adminUnlock: (data) => api.post('/achievements/admin/unlock', data),
};

// 知识问答API
export const questionAPI = {
  // 问题列表（支持Tab筛选）
  getQuestions: (params) => api.get('/questions', { params }),

  // 问题详情
  getQuestionDetail: (id) => api.get(`/questions/${id}`),

  // 发布问题
  createQuestion: (data) => api.post('/questions', data),

  // 编辑问题
  updateQuestion: (id, data) => api.put(`/questions/${id}`, data),

  // 删除问题（软删除）
  deleteQuestion: (id) => api.delete(`/questions/${id}/soft`),

  // 回答问题
  createAnswer: (questionId, data) => api.post(`/questions/${questionId}/answers`, data),

  // 采纳最佳答案
  acceptAnswer: (questionId, data) => api.post(`/questions/${questionId}/accept`, data),

  // 回答点赞/取消点赞
  likeAnswer: (answerId) => api.post(`/answers/${answerId}/like`),

  // 增加悬赏
  addReward: (id, data) => api.post(`/questions/${id}/add-reward`, data),

  // 补充内容
  appendContent: (id, data) => api.post(`/questions/${id}/append`, data),

  // 手动关闭
  closeQuestion: (id) => api.post(`/questions/${id}/close`),

  // 我的回答
  getMyAnswers: (params) => api.get('/questions/my-answers', { params }),

  // 管理员强制删除问题
  adminDeleteQuestion: (id) => api.delete(`/questions/${id}`),
};

// 音乐API
export const musicAPI = {
  // 音乐搜索
  searchMusic: (params) => api.get('/music/search', { params }),

  // 音乐详情
  getMusicDetail: (id) => api.get(`/music/${id}`),

  // 添加音乐到音乐库
  addMusic: (data) => api.post('/music', data),
  updateMusic: (id, data) => api.put(`/music/${id}`, data),
  deleteMusic: (id) => api.delete(`/music/${id}`),

  // 我的音乐库
  getMyMusicLibrary: (params) => api.get('/music/library/my', { params }),
  addToLibrary: (data) => api.post('/music/library', data),
  updateLibraryStatus: (id, data) => api.put(`/music/library/${id}`, data),

  // 听后感记录
  getMusicLogs: (params) => api.get('/music/logs', { params }),
  createMusicLog: (data) => api.post('/music/logs', data),
  deleteMusicLog: (id) => api.delete(`/music/logs/${id}`),
  toggleMusicLogLike: (id, data) => api.post(`/music/logs/${id}/like`, data),
};

// 影视API
export const movieAPI = {
  // 影视搜索
  searchMovies: (params) => api.get('/movies/search', { params }),

  // 影视详情
  getMovieDetail: (id) => api.get(`/movies/${id}`),

  // 添加影视到影视库
  addMovie: (data) => api.post('/movies', data),
  updateMovie: (id, data) => api.put(`/movies/${id}`, data),
  deleteMovie: (id) => api.delete(`/movies/${id}`),

  // 我的影视库
  getMyMovieLibrary: (params) => api.get('/movies/library/my', { params }),
  addToLibrary: (data) => api.post('/movies/library', data),
  updateLibraryStatus: (id, data) => api.put(`/movies/library/${id}`, data),

  // 观后感记录
  getMovieLogs: (params) => api.get('/movies/logs', { params }),
  createMovieLog: (data) => api.post('/movies/logs', data),
  deleteMovieLog: (id) => api.delete(`/movies/logs/${id}`),
  toggleMovieLogLike: (id, data) => api.post(`/movies/logs/${id}/like`, data),
};

// 奖罚规则管理API
export const rewardRuleAPI = {
  // 技术类型管理
  getTechTypes: () => api.get('/reward-rules/tech-types'),
  createTechType: (data) => api.post('/reward-rules/tech-types', data),
  updateTechType: (id, data) => api.put(`/reward-rules/tech-types/${id}`, data),
  deleteTechType: (id) => api.delete(`/reward-rules/tech-types/${id}`),

  // 规则管理
  getRules: (params) => api.get('/reward-rules', { params }),
  getRuleById: (id) => api.get(`/reward-rules/${id}`),
  createRule: (data) => api.post('/reward-rules', data),
  updateRule: (id, data) => api.put(`/reward-rules/${id}`, data),
  deleteRule: (id) => api.delete(`/reward-rules/${id}`),
  toggleRuleStatus: (id) => api.patch(`/reward-rules/${id}/status`),
};

// 用户提交记录API
export const submissionAPI = {
  // 提交记录查询
  getSubmissions: (params) => api.get('/submissions', { params }),
  getSubmissionById: (id) => api.get(`/submissions/${id}`),
  getSubmissionStats: () => api.get('/submissions/stats'),

  // 仪表盘统计
  getTodayStatus: (params) => api.get('/submissions/my/today-status', { params }),
  getDashboardStats: (params) => api.get('/submissions/my/dashboard-stats', { params }),
  getFullDashboardStats: (params) => api.get('/submissions/my/full-stats', { params }),

  // 审核中心
  getPendingSubmissions: (params) => api.get('/submissions/pending', { params }),
  reviewSubmission: (id, data) => api.post(`/submissions/${id}/review`, data),
  approveSubmission: (id, data) => api.post(`/submissions/${id}/approve`, data),
  batchGetSubmissions: (data) => api.post('/submissions/admin/batch', data),

  // 管理操作
  deleteSubmission: (id) => api.delete(`/submissions/${id}`),

  // 每日挑战奖励
  getChallengeConfig: () => api.get('/submissions/challenge-config'),
  updateChallengeConfig: (data) => api.put('/submissions/challenge-config', data),
  getDailyRewardStatus: (params) => api.get('/submissions/daily-reward/status', { params }),
  claimDailyReward: (data) => api.post('/submissions/daily-reward/claim', data),

  // 家长审核
  getParentPending: (params) => api.get('/submissions/parent/pending', { params }),
  parentReview: (id, data) => api.post(`/submissions/${id}/parent-review`, data),
};

// 电子课本API
export const textbookAPI = {
  // 公开接口（无需登录）
  getTextbookOptions: () => api.get('/textbooks/options'),
  getPublicTextbooks: (params) => api.get('/textbooks/public', { params }),
  getPublicTextbookToc: (id) => api.get(`/textbooks/public/${id}/toc`),
  getPublicLesson: (id) => api.get(`/textbooks/public/lesson/${id}`),

  // 用户接口（需登录）
  getMyTextbooks: () => api.get('/textbooks/my'),
  createTextbook: (data) => api.post('/textbooks', data),
  getTextbookDetail: (id) => api.get(`/textbooks/${id}`),
  updateTextbook: (id, data) => api.put(`/textbooks/${id}`, data),
  deleteTextbook: (id) => api.delete(`/textbooks/${id}`),

  // 单元管理
  createUnit: (data) => api.post('/textbooks/units', data),
  updateUnit: (id, data) => api.put(`/textbooks/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/textbooks/units/${id}`),

  // 课文管理
  createLesson: (data) => api.post('/textbooks/lessons', data),
  getLessonDetail: (id) => api.get(`/textbooks/lessons/${id}`),
  updateLesson: (id, data) => api.put(`/textbooks/lessons/${id}`, data),
  submitLesson: (id) => api.post(`/textbooks/lessons/${id}/submit`),
  deleteLesson: (id) => api.delete(`/textbooks/lessons/${id}`),

  // 管理员接口
  getPendingLessons: () => api.get('/textbooks/admin/pending'),
  getAdminStats: () => api.get('/textbooks/admin/stats'),
  reviewLesson: (id, data) => api.put(`/textbooks/admin/lesson/${id}/review`, data),

  // PDF管理
  uploadPdf: (id, formData) => api.post(`/textbooks/${id}/pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5分钟超时（大文件）
  }),
  deletePdf: (id) => api.delete(`/textbooks/${id}/pdf`),
  getPdf: (id) => api.get(`/textbooks/${id}/pdf`),

  // EPUB管理
  uploadEpub: (id, formData) => api.post(`/textbooks/${id}/epub`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5分钟超时（大文件）
  }),
  deleteEpub: (id) => api.delete(`/textbooks/${id}/epub`),
  getEpubToc: (id) => api.get(`/textbooks/${id}/epub/toc`),
  getEpubChapter: (id, chapterId) => api.get(`/textbooks/${id}/epub/chapter/${chapterId}`),

  // 封面管理
  uploadCover: (id, coverData) => api.post(`/textbooks/${id}/cover`, { coverData }),

  // 收藏管理
  getFavorites: (params) => api.get('/textbooks/favorites', { params }),
  addFavorite: (id) => api.post(`/textbooks/favorites/${id}`),
  removeFavorite: (id) => api.delete(`/textbooks/favorites/${id}`),

  // 上传设置管理
  getUploadSettings: () => api.get('/textbooks/upload-settings'),
  saveUploadSettings: (data) => api.post('/textbooks/upload-settings', data),
};

// 教材阅读笔记API（用于保存查字/搜索结果）
export const textbookNoteAPI = {
  // 创建笔记
  create: (data) => api.post('/textbook-notes', data),
  // 删除笔记
  delete: (id) => api.delete(`/textbook-notes/${id}`),
  // 获取笔记列表
  list: (params) => api.get('/textbook-notes', { params }),
  // 获取笔记详情
  getDetail: (id) => api.get(`/textbook-notes/${id}`),
  // 更新笔记
  update: (id, data) => api.put(`/textbook-notes/${id}`, data),
  // 切换收藏状态
  toggleFavorite: (id) => api.post(`/textbook-notes/${id}/favorite`),
  // 获取教材笔记数量
  getCount: (textbookId) => api.get('/textbook-notes', { params: { textbookId, limit: 1 } }).then(res => res.data?.total || 0),
};

// AI 配置 API（管理员）
export const aiConfigAPI = {
  getActive: () => api.get('/ai-config/active'),
  getList: () => api.get('/ai-config'),
  create: (data) => api.post('/ai-config', data),
  update: (id, data) => api.put(`/ai-config/${id}`, data),
  delete: (id) => api.delete(`/ai-config/${id}`),
  setDefault: (id) => api.put(`/ai-config/${id}/default`),
  toggle: (id) => api.put(`/ai-config/${id}/toggle`),
  test: (id) => api.post(`/ai-config/${id}/test`),
  fetchModels: (data) => api.post('/ai-config/fetch-models', data),
  getModels: (id) => api.get(`/ai-config/${id}/models`),
  getAutomationSettings: () => api.get('/ai-config/automation-settings'),
  updateAutomationSettings: (data) => api.put('/ai-config/automation-settings', data),
  getTasksSummary: () => api.get('/ai-config/tasks/summary'),
  getTasks: (params) => api.get('/ai-config/tasks', { params }),
  retryTask: (id) => api.post(`/ai-config/tasks/${id}/retry`),

  // RAG / Embedding 相关
  getEmbeddingActiveConfig: () => api.get('/ai-config/embedding/active-config'),
  getEmbeddingQueueStats: () => api.get('/ai-config/embedding/queue-stats'),
  getEmbeddingMyStats: () => api.get('/ai-config/embedding/my-stats'),
  retryFailedEmbedding: (taskId) => api.post('/ai-config/embedding/retry-failed', { taskId }),
  cleanupEmbedding: () => api.post('/ai-config/embedding/cleanup'),
  searchEmbeddingTest: (data) => api.post('/ai-config/embedding/search-test', data),
};

// AI 提示词 API
export const aiPromptAPI = {
  // 科目模板
  getList: (params) => api.get('/ai-prompts', { params }),
  getDefault: (subject) => api.get('/ai-prompts/default', { params: { subject } }),
  create: (data) => api.post('/ai-prompts', data),
  update: (id, data) => api.put(`/ai-prompts/${id}`, data),
  delete: (id) => api.delete(`/ai-prompts/${id}`),
  setDefault: (id) => api.put(`/ai-prompts/${id}/default`),

  // 系统提示词
  getSystemPrompt: () => api.get('/ai-prompts/system'),
  saveSystemPrompt: (data) => api.post('/ai-prompts/system', data),
  initDefaults: () => api.post('/ai-prompts/init-defaults'),
  getEchoBotPrompt: () => api.get('/ai-prompts/bot/echo'),
  saveEchoBotPrompt: (content) => api.post('/ai-prompts/bot/echo', { content }),
  resetEchoBotPrompt: () => api.post('/ai-prompts/bot/echo/reset'),

  // 教材提示词
  getTextbookPrompts: (textbookId) => api.get(`/ai-prompts/textbook/${textbookId}`),
  createTextbookPrompt: (textbookId, data) => api.post(`/ai-prompts/textbook/${textbookId}`, data),
  updateTextbookPrompt: (id, data) => api.put(`/ai-prompts/textbook-prompt/${id}`, data),
  deleteTextbookPrompt: (id) => api.delete(`/ai-prompts/textbook-prompt/${id}`),
  activateTextbookPrompt: (id) => api.put(`/ai-prompts/textbook-prompt/${id}/activate`),
  copyDefaultToTextbook: (textbookId) => api.post(`/ai-prompts/textbook/${textbookId}/copy-default`),

  // 评分提示词
  getEvalPrompt: (key) => api.get(`/ai-prompts/eval/${key}`),
  saveEvalPrompt: (key, content) => api.post(`/ai-prompts/eval/${key}`, { content }),
  resetEvalPrompt: (key) => api.post(`/ai-prompts/eval/${key}/reset`),
};

// AI 分析 API
export const aiAnalysisAPI = {
  analyze: (data) => api.post('/ai-analysis/analyze', data, { timeout: 120000 }), // 2分钟超时
  chat: (data) => api.post('/ai-analysis/chat', data, { timeout: 120000 }), // 普通聊天
  abort: (connectionId) => api.post(`/ai-analysis/abort/${connectionId}`),
  getLogs: (params) => api.get('/ai-analysis/logs', { params }),
  getLog: (id) => api.get(`/ai-analysis/logs/${id}`),
  getAdminStats: (params) => api.get('/ai-analysis/admin/stats', { params }),
  // 日记 AI 分析
  analyzeDiary: (data) => api.post('/ai-analysis/diary/analyze', data, { timeout: 600000 }), // 10分钟超时
  analyzeDiariesBatch: (data) => api.post('/ai-analysis/diary/analyze-batch', data, { timeout: 600000 }), // 10分钟超时
  // 日记分析记录
  saveDiaryAnalysis: (data) => api.post('/ai-analysis/diary/save', data),
  getDiaryAnalysisHistory: (params) => api.get('/ai-analysis/diary/history', { params }),
  getDiaryAnalysisDetail: (id) => api.get(`/ai-analysis/diary/history/${id}`),
  getDiaryAnalysisVersions: (diaryId) => api.get(`/ai-analysis/diary/history/versions/${diaryId}`),
  deleteDiaryAnalysis: (id) => api.delete(`/ai-analysis/diary/history/${id}`),
  // 公开日记分析记录（作品广场用）
  getPublicDiaryAnalysis: (params) => api.get('/ai-analysis/diary/public', { params }),
  getPublicDiaryAnalysisDetail: (id) => api.get(`/ai-analysis/diary/public/${id}`),
  // 日记分析提示词
  getDiaryPrompts: () => api.get('/ai-analysis/diary/prompts'),
  saveDiaryPrompts: (data) => api.post('/ai-analysis/diary/prompts', data),
  resetDiaryPrompts: () => api.delete('/ai-analysis/diary/prompts'),
  // 默认提示词（管理员）
  getDefaultDiaryPrompts: () => api.get('/ai-analysis/diary/default-prompts'),
  saveDefaultDiaryPrompts: (data) => api.post('/ai-analysis/diary/default-prompts', data),
};

// AI 流式聊天辅助函数
export const aiStreamChat = {
  /**
   * 将 File 对象转换为 base64 字符串
   * @param {File} file - 图片文件
   * @returns {Promise<string>} - base64 字符串
   */
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * 创建流式聊天连接（支持图片）
   * @param {object} params - 参数（包含 textbookId, sessionId, message, context, subject, image）
   * @param {object} callbacks - 回调函数（onStart, onChunk, onDone, onError, onAborted）
   * @returns {object} - 包含 abort 方法的对象
   */
  create: (params, { onStart, onChunk, onDone, onError, onAborted }) => {
    const token = localStorage.getItem('token');
    let connectionId = null;
    const controller = new AbortController();

    const fetchStream = async () => {
      try {
        // 构建请求体
        const requestBody = {
          textbookId: params.textbookId,
          sessionId: params.sessionId,
          message: params.message,
          context: params.context || '',
          subject: params.subject || 'CHINESE',
        };

        // 如果有图片，转换为 base64
        if (params.image) {
          if (params.image instanceof File) {
            requestBody.imageBase64 = await aiStreamChat.fileToBase64(params.image);
          } else if (typeof params.image === 'string') {
            // 已经是 base64 字符串
            requestBody.imageBase64 = params.image;
          }
        }

        // 使用 POST 请求（支持图片数据）
        const response = await fetch('/api/ai-analysis/chat/stream', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        connectionId = response.headers.get('X-Connection-Id');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              continue;
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                // 根据上一个 event 类型处理
                if (data.connectionId && onStart) {
                  onStart(data.connectionId);
                } else if (data.content !== undefined) {
                  // chunk 或 done
                  if (data.responseTime !== undefined) {
                    // done 事件
                    onDone && onDone(data);
                  } else {
                    // chunk 事件
                    onChunk && onChunk(data.content);
                  }
                } else if (data.message) {
                  // error 或 aborted
                  if (data.message === '用户中断') {
                    onAborted && onAborted();
                  } else {
                    onError && onError(data.message);
                  }
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          onAborted && onAborted();
        } else {
          onError && onError(error.message);
        }
      }
    };

    fetchStream();

    return {
      abort: () => {
        controller.abort();
        if (connectionId) {
          // 通知服务端中断
          fetch(`/api/ai-analysis/abort/${connectionId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).catch(() => {});
        }
      },
      getConnectionId: () => connectionId,
    };
  },
};

// 教材聊天记录 API
export const textbookChatAPI = {
  getMessages: (textbookId, params) => api.get(`/textbook-chat/${textbookId}`, { params }),
  addMessage: (textbookId, data) => api.post(`/textbook-chat/${textbookId}`, data),
  deleteMessage: (textbookId, messageId) => api.delete(`/textbook-chat/${textbookId}/${messageId}`),
  clear: (textbookId) => api.delete(`/textbook-chat/${textbookId}/clear`),
};

// 两步验证 (2FA) API
export const twoFactorAPI = {
  // 获取 2FA 状态
  getStatus: () => api.get('/2fa/status'),
  // 开始启用 2FA（获取二维码）
  setup: () => api.post('/2fa/setup'),
  // 验证并完成启用（返回恢复码）
  verifySetup: (data) => api.post('/2fa/verify-setup', data),
  // 关闭 2FA
  disable: (data) => api.post('/2fa/disable', data),
  // 重新生成恢复码
  regenerateBackupCodes: (data) => api.post('/2fa/regenerate-backup', data),
  // 获取恢复码剩余数量
  getBackupCodesCount: () => api.get('/2fa/backup-codes-count'),
};

// 日记游戏化 API
export const diaryGameAPI = {
  // 获取用户日记统计
  getStats: () => api.get('/diary-game/stats'),
  // 获取配置（字数级别、段位定义）
  getConfig: () => api.get('/diary-game/config'),
  // 获取成就列表（包含解锁状态）
  getAchievements: () => api.get('/diary-game/achievements'),
  // 获取成就统计
  getAchievementStats: () => api.get('/diary-game/achievements/stats'),
  // 获取补签卡列表
  getMakeupCards: () => api.get('/diary-game/makeup-cards'),
  // 检查是否可以购买补签卡
  canPurchaseMakeupCard: () => api.get('/diary-game/makeup-cards/can-purchase'),
  // 购买补签卡
  purchaseMakeupCard: () => api.post('/diary-game/makeup-cards/purchase'),
  // 检查补签机会
  getMakeupOpportunity: () => api.get('/diary-game/makeup-cards/opportunity'),
  // 使用补签卡
  useMakeupCard: (cardId, diaryId) => api.post(`/diary-game/makeup-cards/${cardId}/use`, { diaryId }),
  // 获取首页综合数据
  getOverview: () => api.get('/diary-game/overview'),
};

// 照片分享 API
export const photoAPI = {
  // 发布照片（使用 FormData）
  create: (formData) => api.post('/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // 获取照片列表
  getList: (params) => api.get('/photos', { params }),
  // 获取照片详情
  getDetail: (id) => api.get(`/photos/${id}`),
  // 删除照片
  delete: (id) => api.delete(`/photos/${id}`),
  // 点赞/取消点赞
  toggleLike: (id) => api.post(`/photos/${id}/like`),
  // 评论
  comment: (id, data) => api.post(`/photos/${id}/comment`, data),
  // 获取统计（心理分析用）
  getStats: (params) => api.get('/photos/stats/my', { params }),
};

// 公开接口 API
export const publicAPI = {
  // 公开排行榜
  getLeaderboard: (params) => api.get('/public/leaderboard', { params }),
  // 统一动态 Feed（包含所有类型）
  getUnifiedFeed: (params) => api.get('/public/unified-feed', { params }),
  // 作品动态 Feed（仅作品）
  getWorksFeed: (params) => api.get('/public/works-feed', { params }),
};

// 书写评价 API
export const writingEvaluationAPI = {
  // 获取分析状态（是否可分析，剩余冷却时间）
  getStatus: (noteId) => api.get(`/writing-evaluation/${noteId}/status`),
  // 获取评价结果
  get: (noteId) => api.get(`/writing-evaluation/${noteId}`),
  // 发起 AI 分析
  analyze: (data) => api.post('/writing-evaluation/analyze', data, {
    timeout: 300000  // 5分钟超时
  }),
};

// 字体管理 API
export const fontAPI = {
  // 获取我的字体列表
  list: () => api.get('/fonts'),
  // 上传字体
  upload: (formData) => api.post('/fonts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // 删除字体
  delete: (id) => api.delete(`/fonts/${id}`),
  // 设为默认字体
  setDefault: (id) => api.put(`/fonts/${id}/default`),
  // 获取字体文件URL
  getFileUrl: (id) => `${api.defaults.baseURL}/fonts/${id}/file`,
};

// 书写作品 API
export const calligraphyAPI = {
  // 获取公开作品列表
  list: (params) => api.get('/calligraphy', { params }),
  // 获取我的作品列表
  myList: (params) => api.get('/calligraphy/my', { params }),
  // 获取今日书写状态
  getTodayStatus: (params) => api.get('/calligraphy/my/today-status', { params }),
  // 获取作品详情
  get: (id) => api.get(`/calligraphy/${id}`),
  // 创建作品
  create: (data) => api.post('/calligraphy', data),
  // 删除作品
  delete: (id) => api.delete(`/calligraphy/${id}`),
  // 点赞/取消点赞
  toggleLike: (id) => api.post(`/calligraphy/${id}/like`),
  // 管理员AI评分（20分钟超时，字数多时需要更长时间）
  evaluate: (id) => api.post(`/calligraphy/${id}/evaluate`, {}, { timeout: 1200000 }),
  // 管理员：获取审核列表
  reviewList: (params) => api.get('/calligraphy/review/list', { params }),
  // 管理员：审核作品（带积分）
  review: (id, data) => api.post(`/calligraphy/${id}/review`, data),
  // 管理员：批量审核（带积分）
  batchReview: (data) => api.post('/calligraphy/review/batch', data),
  // 管理员：删除作品
  adminDelete: (id) => api.delete(`/calligraphy/admin/${id}`),
};

// 创业作品 API
export const creativeWorkAPI = {
  getPublicWorks: (params) => api.get('/creative-works/public', { params }),
  getMyWorks: (params) => api.get('/creative-works/my', { params }),
  create: (data) => api.post('/creative-works', data),
  update: (id, data) => api.put(`/creative-works/${id}`, data),
  delete: (id) => api.delete(`/creative-works/${id}`),
  toggleLike: (id) => api.post(`/creative-works/${id}/like`),
  adminGetPending: (params) => api.get('/creative-works/admin/pending', { params }),
  adminGetPendingUsers: (params) => api.get('/creative-works/admin/pending/users', { params }),
  adminGetStats: () => api.get('/creative-works/admin/stats'),
  adminGetHistory: (params) => api.get('/creative-works/admin/history', { params }),
  adminReview: (id, data) => api.put(`/creative-works/${id}/review`, data),
};

// 诗词作品 API
export const poetryWorkAPI = {
  getWorks: (params) => api.get('/poetry-works', { params }),
  getPublicWorks: (params) => api.get('/poetry-works/public', { params }),
  getPublicWork: (id) => api.get(`/poetry-works/public/${id}`),
  getMyWorks: (params) => api.get('/poetry-works/my', { params }),
  create: (data) => api.post('/poetry-works', data),
  update: (id, data) => api.put(`/poetry-works/${id}`, data),
  delete: (id) => api.delete(`/poetry-works/${id}`),
  toggleLike: (id) => api.post(`/poetry-works/${id}/like`),
  adminGetPending: (params) => api.get('/poetry-works/admin/pending', { params }),
  adminGetPendingUsers: (params) => api.get('/poetry-works/admin/pending/users', { params }),
  adminGetStats: () => api.get('/poetry-works/admin/stats'),
  adminGetHistory: (params) => api.get('/poetry-works/admin/history', { params }),
  adminReview: (id, data) => api.put(`/poetry-works/${id}/status`, data),
};

// 用户行为埋点 API
export const analyticsAPI = {
  // 上报单个事件
  trackEvent: (data) => api.post('/analytics/event', data),
  // 批量上报事件
  trackEvents: (events) => api.post('/analytics/events', { events }),
  // 管理员：获取统计摘要
  getSummary: (days = 7) => api.get('/analytics/admin/summary', { params: { days } }),
  // 管理员：获取功能使用统计
  getFeatureStats: (days = 7) => api.get('/analytics/admin/features', { params: { days } }),
  // 管理员：手动触发聚合
  aggregate: (date) => api.post('/analytics/admin/aggregate', { date }),
  // 管理员：获取数据看板聚合数据
  getDashboard: () => api.get('/analytics/admin/dashboard'),
  // 公共访问：获取数据看板（无需登录）
  getPublicDashboard: () => api.get('/analytics/public/dashboard'),
};

// 付款计划 API
export const paymentPlanAPI = {
  // 获取我的付款计划列表
  list: (status) => api.get('/payment-plans', { params: { status } }),
  // 获取付款计划详情
  get: (id) => api.get(`/payment-plans/${id}`),
  // 创建分期付款计划
  create: (payCodeId, installments, downPaymentRate, paymentPassword) => api.post('/payment-plans', { payCodeId, installments, downPaymentRate, paymentPassword }),
  // 支付当期款项
  pay: (id, paymentPassword) => api.post(`/payment-plans/${id}/pay`, { paymentPassword }),
  // 一次性还清
  payAll: (id, paymentPassword) => api.post(`/payment-plans/${id}/pay-all`, { paymentPassword }),
  // 管理员：获取所有付款计划
  adminList: (params) => api.get('/payment-plans/admin/all', { params }),
  // 管理员：获取逾期计划
  adminOverdue: () => api.get('/payment-plans/admin/overdue'),
  // 管理员：获取统计
  adminStats: () => api.get('/payment-plans/admin/stats'),
  // 管理员：检查逾期状态
  adminCheckOverdue: () => api.post('/payment-plans/admin/check-overdue'),
  // 管理员：获取分期配置
  adminGetConfig: () => api.get('/payment-plans/admin/config'),
  // 管理员：保存分期配置
  adminSaveConfig: (data) => api.post('/payment-plans/admin/config', data),
};

// 用户反馈 API
export const feedbackAPI = {
  // 提交反馈
  submit: (data) => api.post('/feedback', data),
  // 获取我的反馈列表
  list: (params) => api.get('/feedback', { params }),
  // 管理员：获取所有反馈
  adminList: (params) => api.get('/feedback/admin/all', { params }),
  // 管理员：获取反馈统计
  adminStats: () => api.get('/feedback/admin/stats'),
  // 管理员：更新反馈
  adminUpdate: (id, data) => api.put(`/feedback/admin/${id}`, data),
  // 管理员：批量更新反馈
  adminBatchUpdate: (data) => api.put('/feedback/admin/batch', data),
  // 管理员：删除反馈
  adminDelete: (id) => api.delete(`/feedback/admin/${id}`),
};

// iMessage 聊天记录 API
export const imessageAPI = {
  getLogs: (params) => api.get('/imessage/admin/logs', { params }),
  getStats: () => api.get('/imessage/admin/stats'),
  getAnalytics: () => api.get('/imessage/admin/analytics'),
  getChats: (params) => api.get('/imessage/admin/chats', { params }),
  getChatDetail: (chatId) => api.get(`/imessage/admin/chat/${chatId}`),
  getChatBatch: (chatIds, senders = []) => api.get('/imessage/admin/chat-batch', { params: { chatIds: chatIds.join(','), senders: senders.join(',') } }),
  getChatBySender: (sender) => api.get(`/imessage/admin/chat-by-sender/${encodeURIComponent(sender)}`),
  evaluate: (chatId, analysisType) => api.post(`/imessage/admin/evaluate/${chatId}`, { analysisType }, { timeout: 180000 }),
  evaluateBySender: (sender, data) => api.post(`/imessage/admin/evaluate-by-sender/${encodeURIComponent(sender)}`, data, { timeout: 180000 }),
  getEvaluations: (chatId) => api.get(`/imessage/admin/evaluations/${chatId}`),
  getEvaluationsBySender: (sender) => api.get(`/imessage/admin/evaluations-by-sender/${encodeURIComponent(sender)}`),
  getAllEvaluations: (params) => api.get('/imessage/admin/all-evaluations', { params }),
  getSenderMappings: () => api.get('/imessage/admin/sender-mappings'),
  createSenderMapping: (data) => api.post('/imessage/admin/sender-mappings', data),
  deleteSenderMapping: (sender) => api.delete(`/imessage/admin/sender-mappings/${encodeURIComponent(sender)}`),
  searchUsers: (keyword) => api.get('/imessage/admin/search-users', { params: { keyword } }),
  getUserSummary: (userId) => api.get(`/imessage/user/${userId}/summary`),
  getLinkedUsersStats: () => api.get('/imessage/admin/linked-users-stats'),
};

// 动态流 API
export const feedAPI = {
  getFeed: (params) => api.get('/feed', { params }),
  getLeaderboard: (params) => api.get('/feed/leaderboard', { params }),
  getMyRankings: (params) => api.get('/feed/my-rankings', { params }),
  getTodaySocial: (params) => api.get('/feed/today-social', { params }),
};

// 消息 API
export const messageAPI = {
  markChatRead: (friendId) => api.post('/messages/mark-chat-read', { friendId }),
};

// 会话 API
export const conversationAPI = {
  getConversations: () => api.get('/conversations'),
  getMessages: (conversationId, params) => api.get(`/conversations/${conversationId}/messages`, { params }),
  markAsRead: (conversationId) => api.post(`/conversations/${conversationId}/read`),
};

// Bot API
export const botAPI = {
  list: () => api.get('/bot'),
  adminList: () => api.get('/bot/admin'),
  create: (data) => api.post('/bot', data),
  update: (id, data) => api.put(`/bot/${id}`, data),
  delete: (id) => api.delete(`/bot/${id}`),
};

// Bot聊天 API
export const chatMessageAPI = {
  getConversations: () => api.get('/chat-message/conversations'),
  getMessages: (botId, params) => api.get(`/chat-message/${botId}/messages`, { params }),
  send: (botId, data) => api.post(`/chat-message/${botId}/send`, data),
  markRead: (conversationId) => api.post(`/chat-message/${conversationId}/read`),
  adminStats: () => api.get('/chat-message/admin/stats'),
  adminBotConvs: (botId) => api.get(`/chat-message/admin/bot/${botId}`),
  adminMessages: (convId) => api.get(`/chat-message/admin/conversation/${convId}`),
};

// 扫码 API
export const scanAPI = {
  parse: (data) => api.post('/scan', data),
  logs: () => api.get('/scan/logs'),
};

// 拼音打字练习 API
export const pinyinAPI = {
  convert: (data) => api.post('/pinyin/convert', data),
  submit: (data) => api.post('/pinyin/practice', data),
  myList: (params) => api.get('/pinyin/practice/my', { params }),
  myStats: () => api.get('/pinyin/practice/my/stats'),
  getTodayStatus: (params) => api.get('/pinyin/practice/my/today-status', { params }),
  leaderboard: (params) => api.get('/pinyin/practice/leaderboard', { params }),
  delete: (id) => api.delete(`/pinyin/practice/${id}`),
  errorAnalysis: () => api.get('/pinyin/practice/my/error-analysis'),
};

// 邀请码 API
export const inviteCodeAPI = {
  generate: (data) => api.post('/invite-codes', data),
  list: () => api.get('/invite-codes'),
  delete: (id) => api.delete(`/invite-codes/${id}`),
  getCostSettings: () => api.get('/invite-codes/cost-settings'),
  saveCostSettings: (data) => api.put('/invite-codes/cost-settings', data),
};

// 用户审核 API
export const userReviewAPI = {
  getPendingUsers: () => api.get('/admin/users/pending'),
  approve: (id) => api.post(`/admin/users/${id}/approve`),
  reject: (id, data) => api.post(`/admin/users/${id}/reject`, data),
};

// 打字训练 API
export const typingAPI = {
  submit: (data) => api.post('/typing/practice', data),
  myList: (params) => api.get('/typing/practice/my', { params }),
  myStats: () => api.get('/typing/practice/my/stats'),
  getTodayStatus: (params) => api.get('/typing/practice/my/today-status', { params }),
  getGlobalBestScore: () => api.get('/typing/global-best-score'),
  leaderboard: (params) => api.get('/typing/practice/leaderboard', { params }),
  delete: (id) => api.delete(`/typing/practice/${id}`),
  getAchievements: () => api.get('/typing/achievements'),
  getAchievementStats: () => api.get('/typing/achievements/stats'),
  analyticsOverview: () => api.get('/typing/analytics/overview'),
  analyticsTrend: (params) => api.get('/typing/analytics/trend', { params }),
  analyticsComboDist: () => api.get('/typing/analytics/combo-dist'),
  analyticsDifficultyDist: () => api.get('/typing/analytics/difficulty-dist'),
  analyticsErrorKeys: () => api.get('/typing/analytics/error-keys'),
  multiLeaderboard: (params) => api.get('/typing/leaderboard/multi', { params }),
  getIdiomStats: () => api.get('/typing/idioms'),
};

// 备份管理API
export const backupAPI = {
  getList: () => api.get('/backup/list'),
  getStatus: () => api.get('/backup/status'),
  trigger: () => api.post('/backup/trigger'),
  downloadUrl: (filename) => `/api/backup/download/${filename}`,
  remove: (filename) => api.delete(`/backup/${filename}`),
};

// 书写作品轻列表 API
export const calligraphyListAPI = {
  list: (params) => api.get('/calligraphy', { params }),
  myList: (params) => api.get('/calligraphy/my', { params }),
  reviewList: (params) => api.get('/calligraphy/review/list', { params }),
  myAnalysis: (params) => api.get('/calligraphy/my/analysis', { params }),
};

// 老师系统API
export const teacherAPI = {
  bindTeacher: (data) => api.post('/teacher/bind', data),
  getMyBindings: () => api.get('/teacher/my'),
  unbindTeacher: () => api.post('/teacher/unbind'),
  getStats: () => api.get('/teacher/stats'),
  getLeaderboard: () => api.get('/teacher/leaderboard'),
};

export const delegatedReviewAPI = {
  getPendingReviews: (params) => api.get('/delegated-reviews/pending', { params }),
  reviewSubmission: (id, data) => api.post(`/delegated-reviews/${id}/review`, data),
};

// 日记权限管理API（管理员）
export const diaryAdminAPI = {
  getWhitelist: (params) => api.get('/admin/diary-whitelist', { params }),
  toggleUser: (userId) => api.put(`/admin/diary-whitelist/${userId}`),
  checkPermission: () => api.get('/diaries/check-permission'),
};

// 名单导入API（管理员）
export const rosterAPI = {
  import: (entries) => api.post('/roster/import', { entries }),
  getStudents: (params) => api.get('/roster/students', { params }),
};

// 互评管理员API
export const reviewAdminAPI = {
  getAllStudents: (params) => api.get('/review/admin/all-students', { params }),
  getStudentDetail: (studentId, params) => api.get(`/review/admin/student/${studentId}`, { params }),
};

export default api;
