#!/bin/bash

echo "========================================="
echo "  平湖少儿空间 - 首次部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查必要工具
echo -e "${BLUE}🔍 检查环境依赖...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ 未安装 Node.js${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ 未安装 npm${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ 未安装 git${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  未安装 pm2，正在安装...${NC}"; npm install -g pm2; }

echo -e "${GREEN}✅ 环境检查通过${NC}"
echo ""

# 创建日志目录
echo -e "${BLUE}📁 创建日志目录...${NC}"
mkdir -p logs
mkdir -p backend/logs
mkdir -p frontend/logs

# 检查 .env 文件
echo -e "${BLUE}🔐 检查环境变量文件...${NC}"
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}⚠️  未找到 backend/.env 文件${NC}"
    echo "请手动创建 backend/.env 文件，参考以下内容："
    echo ""
    echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/dbname\""
    echo "JWT_SECRET=\"your-secret-key-here\""
    echo "PORT=12251"
    echo ""
    exit 1
fi

# 安装依赖
echo -e "${BLUE}📦 安装后端依赖...${NC}"
cd backend
npm install --production
cd ..

echo ""
echo -e "${BLUE}📦 安装前端依赖...${NC}"
cd frontend
npm install
cd ..

# 构建前端
echo ""
echo -e "${BLUE}🔨 构建前端...${NC}"
cd frontend
npm run build
cd ..

# 数据库初始化
echo ""
echo -e "${BLUE}🗄️  初始化数据库...${NC}"
cd backend
npx prisma generate
npx prisma db push
cd ..

# 启动 PM2
echo ""
echo -e "${BLUE}🚀 启动 PM2 服务...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ 首次部署成功！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "后端地址: http://localhost:12251"
echo "前端地址: http://localhost:12250"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs"
echo "  查看状态: pm2 status"
echo "  重启服务: pm2 restart all"
echo "  停止服务: pm2 stop all"
echo ""
echo -e "${YELLOW}注意: 请执行 pm2 startup 命令输出的指令以配置开机自启${NC}"
