/**
 * 全局错误处理中间件
 */

const errorHandler = (err, req, res, next) => {
  console.error('错误详情:', err);

  // Prisma错误处理
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: '数据已存在',
      details: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: '记录不存在',
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: '验证失败',
      details: err.message,
    });
  }

  // 默认错误
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
