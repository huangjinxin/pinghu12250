/**
 * RAWG API服务 - 游戏数据库API
 */

const axios = require('axios');

const RAWG_API_KEY = process.env.RAWG_API_KEY || ''; // 可选，限流更宽松
const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * 搜索游戏
 */
async function searchGames(query, page = 1, pageSize = 20) {
  try {
    const params = {
      search: query,
      page,
      page_size: pageSize,
    };

    if (RAWG_API_KEY) {
      params.key = RAWG_API_KEY;
    }

    const response = await axios.get(`${RAWG_BASE_URL}/games`, { params });

    return {
      results: response.data.results.map(game => ({
        rawgId: game.id,
        name: game.name,
        nameEn: game.name,
        coverImage: game.background_image,
        backgroundImage: game.background_image,
        description: game.description_raw || '',
        genres: game.genres?.map(g => g.name) || [],
        platforms: game.platforms?.map(p => p.platform.name) || [],
        releaseDate: game.released ? new Date(game.released) : null,
        rating: game.rating || null,
        metacritic: game.metacritic || null,
      })),
      total: response.data.count,
      next: response.data.next,
    };
  } catch (error) {
    console.error('RAWG API搜索失败:', error.message);
    throw new Error('游戏搜索失败');
  }
}

/**
 * 获取游戏详情
 */
async function getGameDetails(rawgId) {
  try {
    const params = {};
    if (RAWG_API_KEY) {
      params.key = RAWG_API_KEY;
    }

    const response = await axios.get(`${RAWG_BASE_URL}/games/${rawgId}`, { params });
    const game = response.data;

    return {
      rawgId: game.id,
      name: game.name,
      nameEn: game.name,
      coverImage: game.background_image,
      backgroundImage: game.background_image_additional || game.background_image,
      description: game.description_raw || '',
      genres: game.genres?.map(g => g.name) || [],
      platforms: game.platforms?.map(p => p.platform.name) || [],
      releaseDate: game.released ? new Date(game.released) : null,
      rating: game.rating || null,
      metacritic: game.metacritic || null,
    };
  } catch (error) {
    console.error('RAWG API详情获取失败:', error.message);
    throw new Error('游戏详情获取失败');
  }
}

/**
 * 获取热门游戏
 */
async function getTrendingGames(page = 1, pageSize = 20) {
  try {
    const params = {
      ordering: '-added', // 按收藏数排序
      page,
      page_size: pageSize,
    };

    if (RAWG_API_KEY) {
      params.key = RAWG_API_KEY;
    }

    const response = await axios.get(`${RAWG_BASE_URL}/games`, { params });

    return {
      results: response.data.results.map(game => ({
        rawgId: game.id,
        name: game.name,
        nameEn: game.name,
        coverImage: game.background_image,
        backgroundImage: game.background_image,
        description: game.description_raw || '',
        genres: game.genres?.map(g => g.name) || [],
        platforms: game.platforms?.map(p => p.platform.name) || [],
        releaseDate: game.released ? new Date(game.released) : null,
        rating: game.rating || null,
        metacritic: game.metacritic || null,
      })),
      total: response.data.count,
    };
  } catch (error) {
    console.error('RAWG API热门游戏获取失败:', error.message);
    throw new Error('热门游戏获取失败');
  }
}

module.exports = {
  searchGames,
  getGameDetails,
  getTrendingGames,
};
