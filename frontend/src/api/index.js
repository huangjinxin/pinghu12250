/**
 * API服务 - 统一管理所有API请求
 */

import axios from 'axios';
import { detectAndShowPointNotification } from '@/utils/pointNotification';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

    // 检测并显示积分通知
    detectAndShowPointNotification(data);

    return data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// 认证API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (token) => api.post('/auth/refresh', { token }),
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
  getChildren: () => api.get('/users/me/children'),
  getTeachers: () => api.get('/users/teachers'),
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
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  updateUserJoinedDate: (id, data) => api.put(`/admin/users/${id}/joined-date`, data),
  resetUserPassword: (id, data) => api.put(`/admin/users/${id}/reset-password`, data),
  getPendingUsers: () => api.get('/admin/pending-users'),
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  getStats: () => api.get('/admin/stats'),
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
  getAllOrders: (params) => api.get('/pay/orders', { params }),

  // 学生接口
  scanPayCode: (code) => api.get(`/pay/scan/${code}`),
  submitPayment: (data) => api.post('/pay/submit', data),
  getMyOrders: (params) => api.get('/pay/my-orders', { params }),
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
export const pointAPI = {
  getRules: () => api.get('/points/admin/rules'),
  getMyPoints: () => api.get('/points/my'),
  getMy: () => api.get('/points/my'), // 保持兼容
  getPointLogs: (params) => api.get('/points/records', { params }),
  getRecords: (params) => api.get('/points/records', { params }), // 保持兼容
  getStats: () => api.get('/points/stats'),
  getLeaderboard: (params) => api.get('/points/leaderboard', { params }),

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

export default api;
