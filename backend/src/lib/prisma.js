// @AI:LOCK 此文件禁止修改
// @AI:SINGLETON 全项目唯一Prisma实例,必须通过此文件获取
// @AI:USAGE const prisma = require('../lib/prisma')
/**
 * Prisma Client 单例模式
 * 避免创建多个数据库连接实例，防止连接池耗尽
 */

const { PrismaClient } = require('@prisma/client');

// 全局单例实例
let prisma;

/**
 * 获取 Prisma 客户端单例
 * @returns {PrismaClient} Prisma 客户端实例
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
    });

    // 连接池健康检查
    prisma.$connect()
      .then(() => {
        console.log('✅ Prisma 数据库连接成功');
      })
      .catch((error) => {
        console.error('❌ Prisma 数据库连接失败:', error.message);
      });

    // 优雅关闭处理
    const cleanup = async () => {
      console.log('⏳ 正在关闭数据库连接...');
      await prisma.$disconnect();
      console.log('✅ 数据库连接已关闭');
      process.exit();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  return prisma;
}

// 导出单例实例
module.exports = getPrismaClient();
