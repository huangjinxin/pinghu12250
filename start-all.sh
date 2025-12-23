#!/bin/bash

echo "正在启动服务..."

# 创建日志目录
mkdir -p /Users/beichentech/pinghu12250/logs

# 清理旧进程
echo "清理旧进程..."
lsof -ti:12250,12251 2>/dev/null | xargs kill -9 2>/dev/null

# 启动后端
cd /Users/beichentech/pinghu12250/backend
echo "启动后端..."
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "后端已启动，PID: $BACKEND_PID"

# 等待3秒让后端启动
sleep 3

# 启动前端
cd /Users/beichentech/pinghu12250/frontend
echo "启动前端..."
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端已启动，PID: $FRONTEND_PID"

# 等待2秒
sleep 2

echo ""
echo "=== 服务启动完成 ==="
echo "后端PID: $BACKEND_PID (端口 12251)"
echo "前端PID: $FRONTEND_PID (端口 12250)"
echo ""
echo "正在检查服务状态..."

# 检查后端
if lsof -ti:12251 > /dev/null 2>&1; then
    echo "✓ 后端正在运行"
else
    echo "✗ 后端启动失败，请查看日志: tail -f logs/backend.log"
fi

# 检查前端
if lsof -ti:12250 > /dev/null 2>&1; then
    echo "✓ 前端正在运行"
else
    echo "✗ 前端启动失败，请查看日志: tail -f logs/frontend.log"
fi

echo ""
echo "访问: http://localhost:12250"
echo ""
echo "查看日志:"
echo "  后端: tail -f logs/backend.log"
echo "  前端: tail -f logs/frontend.log"
