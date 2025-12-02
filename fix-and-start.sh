#!/bin/bash

# 自动修复并启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}儿童成长记录系统 - 自动修复脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 停止并清理旧容器
echo -e "${YELLOW}步骤 1/6: 清理旧容器...${NC}"
docker-compose down -v 2>/dev/null || true
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 2. 构建后端镜像
echo -e "${YELLOW}步骤 2/6: 构建后端镜像（使用 node:20-slim + OpenSSL）...${NC}"
echo -e "${BLUE}这可能需要几分钟，请耐心等待...${NC}"

max_retries=3
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if docker-compose build backend; then
        echo -e "${GREEN}✅ 后端镜像构建成功${NC}"
        break
    else
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            echo -e "${YELLOW}⚠️  构建失败，等待10秒后重试 ($retry_count/$max_retries)...${NC}"
            sleep 10
        else
            echo -e "${RED}❌ 构建失败，请检查网络连接或手动运行: docker-compose build backend${NC}"
            exit 1
        fi
    fi
done
echo ""

# 3. 启动数据库
echo -e "${YELLOW}步骤 3/6: 启动数据库...${NC}"
docker-compose up -d postgres
echo -e "${BLUE}等待数据库启动...${NC}"
sleep 15

# 检查数据库健康状态
counter=0
while [ $counter -lt 30 ]; do
    if docker-compose ps postgres | grep -q "healthy"; then
        echo -e "${GREEN}✅ 数据库已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 1
    counter=$((counter + 1))
done
echo ""

if [ $counter -ge 30 ]; then
    echo -e "${RED}❌ 数据库启动超时${NC}"
    docker-compose logs postgres
    exit 1
fi
echo ""

# 4. 启动后端
echo -e "${YELLOW}步骤 4/6: 启动后端服务...${NC}"
docker-compose up -d backend
echo -e "${BLUE}等待后端启动...${NC}"
sleep 15
echo ""

# 5. 初始化数据库
echo -e "${YELLOW}步骤 5/6: 初始化数据库（Prisma）...${NC}"

# 确保 Prisma Client 已生成
docker-compose exec -T backend npx prisma generate || {
    echo -e "${YELLOW}⚠️  Prisma generate 失败，正在重试...${NC}"
    sleep 5
    docker-compose exec -T backend npx prisma generate
}

# 推送数据库 schema
echo -e "${BLUE}推送数据库 Schema...${NC}"
docker-compose exec -T backend npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库初始化成功${NC}"
else
    echo -e "${YELLOW}⚠️  数据库推送失败，尝试使用 migrate...${NC}"
    docker-compose exec -T backend npx prisma migrate deploy
fi
echo ""

# 6. 填充测试数据
echo ""
read -p "是否填充测试数据？(y/n): " seed_choice
if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
    echo -e "${YELLOW}步骤 6/6: 填充测试数据...${NC}"
    docker-compose exec -T backend npm run prisma:seed

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 测试数据填充成功${NC}"
        echo ""
        echo -e "${BLUE}测试账号：${NC}"
        echo "  学生1: xiaoming / 123456"
        echo "  学生2: xiaohong / 123456"
        echo "  家长: parent_ming / 123456"
        echo "  老师: teacher_wang / 123456"
    else
        echo -e "${YELLOW}⚠️  测试数据填充失败${NC}"
    fi
else
    echo -e "${BLUE}跳过测试数据填充${NC}"
fi
echo ""

# 7. 启动前端
echo -e "${YELLOW}启动前端服务...${NC}"
docker-compose up -d frontend
echo ""

# 8. 显示状态
sleep 5
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 系统启动完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

docker-compose ps

echo ""
echo -e "${BLUE}访问地址：${NC}"
echo "  前端: http://localhost:12250"
echo "  后端API: http://localhost:12251"
echo "  数据库: localhost:12252"
echo ""

# 测试后端API
echo -e "${YELLOW}测试后端连接...${NC}"
sleep 2
if curl -s http://localhost:12251/health > /dev/null; then
    echo -e "${GREEN}✅ 后端API正常${NC}"
    curl -s http://localhost:12251/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:12251/health
else
    echo -e "${RED}❌ 后端API无响应，查看日志：${NC}"
    echo "  docker-compose logs backend"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}常用命令：${NC}"
echo "  查看日志: docker-compose logs -f [service]"
echo "  重启服务: docker-compose restart [service]"
echo "  停止服务: docker-compose down"
echo "  管理工具: ./start.sh"
echo -e "${BLUE}========================================${NC}"
