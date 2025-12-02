#!/bin/bash

echo "========================================="
echo "  平湖少儿空间 - 自动部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 错误处理
set -e
trap 'echo -e "${RED}❌ 部署失败！${NC}"; exit 1' ERR

echo -e "${BLUE}📦 Step 1: 拉取最新代码...${NC}"
git pull origin main

echo ""
echo -e "${BLUE}📦 Step 2: 安装后端依赖...${NC}"
cd backend
npm install --production
cd ..

echo ""
echo -e "${BLUE}📦 Step 3: 安装前端依赖...${NC}"
cd frontend
npm install
cd ..

echo ""
echo -e "${BLUE}🔨 Step 4: 构建前端...${NC}"
cd frontend
npm run build
cd ..

echo ""
echo -e "${BLUE}🗄️  Step 5: 同步数据库...${NC}"
cd backend
npx prisma generate
npx prisma db push
cd ..

echo ""
echo -e "${BLUE}🚀 Step 6: 重启 PM2 服务...${NC}"
pm2 restart ecosystem.config.js
pm2 save

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ 部署成功！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "后端地址: http://localhost:12251"
echo "前端地址: http://localhost:12250"
echo ""
echo "查看日志: pm2 logs"
echo "查看状态: pm2 status"
