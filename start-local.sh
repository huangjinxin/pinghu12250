#!/bin/bash

# 本地启动脚本（不使用 Docker）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}儿童成长记录系统 - 本地启动${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 PostgreSQL
echo -e "${YELLOW}检查 PostgreSQL 数据库...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL 未安装${NC}"
    echo ""
    echo "请安装 PostgreSQL:"
    echo "  macOS: brew install postgresql@15"
    echo "  或使用 Postgres.app: https://postgresapp.com/"
    echo ""
    exit 1
fi

# 检查数据库是否运行
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL 未运行，尝试启动...${NC}"

    # 尝试使用 brew services 启动
    if command -v brew &> /dev/null; then
        brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null || true
        sleep 3
    fi

    # 再次检查
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${RED}❌ 无法启动 PostgreSQL${NC}"
        echo ""
        echo "请手动启动 PostgreSQL:"
        echo "  brew services start postgresql"
        echo "  或使用 Postgres.app"
        echo ""
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL 正在运行${NC}"
echo ""

# 创建数据库（如果不存在）
echo -e "${YELLOW}创建数据库...${NC}"
psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'children_growth'" | grep -q 1 || \
    psql -h localhost -U postgres -c "CREATE DATABASE children_growth" 2>/dev/null || \
    createdb -h localhost children_growth 2>/dev/null || true

echo -e "${GREEN}✅ 数据库已就绪${NC}"
echo ""

# 更新 .env 文件使用本地数据库
echo -e "${YELLOW}配置数据库连接...${NC}"
cd backend

# 备份原 .env
cp .env .env.backup 2>/dev/null || true

# 更新数据库 URL（使用本地 PostgreSQL，默认端口 5432）
cat > .env << 'EOF'
# 数据库配置（本地 PostgreSQL）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/children_growth?schema=public"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=12251
NODE_ENV="development"

# 文件上传配置
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880

# CORS配置
FRONTEND_URL="http://localhost:12250"

# RAWG API (可选)
RAWG_API_KEY=""
EOF

echo -e "${GREEN}✅ 配置已更新${NC}"
echo ""

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装后端依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
    echo ""
fi

# Prisma 操作
echo -e "${YELLOW}初始化数据库...${NC}"
npx prisma generate
npx prisma db push --accept-data-loss || npx prisma migrate deploy

echo -e "${GREEN}✅ 数据库初始化完成${NC}"
echo ""

# 询问是否填充测试数据
read -p "是否填充测试数据？(y/n): " seed_choice
if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
    echo -e "${YELLOW}填充测试数据...${NC}"
    npm run prisma:seed || true
    echo -e "${GREEN}✅ 测试数据填充完成${NC}"
    echo ""
    echo -e "${BLUE}测试账号：${NC}"
    echo "  学生1: xiaoming / 123456"
    echo "  学生2: xiaohong / 123456"
    echo "  家长: parent_ming / 123456"
    echo "  老师: teacher_wang / 123456"
    echo ""
fi

# 停止旧进程
echo -e "${YELLOW}停止旧进程...${NC}"
lsof -ti:12251 | xargs kill -9 2>/dev/null || true
echo ""

# 启动后端
echo -e "${YELLOW}启动后端服务...${NC}"
PORT=12251 NODE_ENV=development node src/index.js &
BACKEND_PID=$!
echo "后端进程 PID: $BACKEND_PID"
sleep 3

# 检查后端是否启动成功
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ 后端启动成功${NC}"
else
    echo -e "${RED}❌ 后端启动失败${NC}"
    exit 1
fi
echo ""

# 启动前端
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
    echo ""
fi

echo -e "${YELLOW}启动前端服务...${NC}"
lsof -ti:12250 | xargs kill -9 2>/dev/null || true
npm run dev &
FRONTEND_PID=$!
echo "前端进程 PID: $FRONTEND_PID"
sleep 3

# 检查前端是否启动成功
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ 前端启动成功${NC}"
else
    echo -e "${RED}❌ 前端启动失败${NC}"
fi
echo ""

# 显示总结
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 系统启动完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}访问地址：${NC}"
echo "  前端: http://localhost:12250"
echo "  后端API: http://localhost:12251"
echo ""
echo -e "${BLUE}进程 PID：${NC}"
echo "  后端: $BACKEND_PID"
echo "  前端: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}停止服务：${NC}"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  或按 Ctrl+C 然后运行: lsof -ti:12250,12251 | xargs kill -9"
echo ""

# 测试后端
sleep 2
echo -e "${YELLOW}测试后端连接...${NC}"
if curl -s http://localhost:12251/health > /dev/null; then
    echo -e "${GREEN}✅ 后端API正常${NC}"
    curl -s http://localhost:12251/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:12251/health
else
    echo -e "${RED}❌ 后端API无响应${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}日志查看：${NC}"
echo "  后端日志: tail -f backend/logs/*.log (如果配置了)"
echo "  查看进程: ps aux | grep node"
echo -e "${BLUE}========================================${NC}"
