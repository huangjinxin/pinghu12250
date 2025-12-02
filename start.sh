#!/bin/bash

# 儿童成长记录系统 - 管理脚本
# 提供启动、停止、重启、查看日志、查看状态等功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker未运行，请先启动Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    print_success "Docker检查通过"
}

# 检查端口占用
check_ports() {
    print_info "检查端口占用..."

    local ports=(12250 12251 12252)
    local port_names=("前端" "后端" "数据库")
    local has_conflict=0

    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}

        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "端口 $port ($name) 已被占用"
            print_info "占用进程: $(lsof -Pi :$port -sTCP:LISTEN | tail -n +2)"
            has_conflict=1
        fi
    done

    if [ $has_conflict -eq 1 ]; then
        echo ""
        read -p "检测到端口冲突，是否继续？(y/n): " continue
        if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
            print_info "已取消启动"
            exit 0
        fi
    else
        print_success "端口检查通过，无冲突"
    fi
}

# 检查环境变量文件
check_env_files() {
    print_info "检查环境变量文件..."

    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在，正在创建..."
        cp .env.example .env
        print_success ".env 文件已创建"
    fi

    if [ ! -f "backend/.env" ]; then
        print_warning "backend/.env 文件不存在，正在创建..."
        cp backend/.env.example backend/.env
        print_success "backend/.env 文件已创建"
    fi

    print_success "环境变量文件检查完成"
}

# 查看服务状态
show_status() {
    echo ""
    print_info "======== 服务状态 ========"
    docker-compose ps
    echo ""

    print_info "======== 容器健康状态 ========"
    docker ps --filter "name=children-growth" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# 查看日志
show_logs() {
    echo ""
    print_info "请选择要查看的日志："
    echo "1) 所有服务"
    echo "2) 数据库 (postgres)"
    echo "3) 后端 (backend)"
    echo "4) 前端 (frontend)"
    echo "5) 返回主菜单"
    echo ""
    read -p "请输入选项 (1-5): " log_choice

    case $log_choice in
        1)
            print_info "显示所有服务日志（最后50行）..."
            docker-compose logs --tail=50 -f
            ;;
        2)
            print_info "显示数据库日志（最后50行）..."
            docker-compose logs --tail=50 -f postgres
            ;;
        3)
            print_info "显示后端日志（最后50行）..."
            docker-compose logs --tail=50 -f backend
            ;;
        4)
            print_info "显示前端日志（最后50行）..."
            docker-compose logs --tail=50 -f frontend
            ;;
        5)
            return
            ;;
        *)
            print_error "无效选项"
            ;;
    esac
}

# 诊断问题
diagnose() {
    echo ""
    print_info "======== 系统诊断 ========"

    echo ""
    print_info "1. Docker版本信息"
    docker --version
    docker-compose --version

    echo ""
    print_info "2. 容器状态"
    docker-compose ps

    echo ""
    print_info "3. 检查数据库容器健康状态"
    if docker ps --filter "name=children-growth-db" | grep -q "healthy"; then
        print_success "数据库容器健康"
    elif docker ps --filter "name=children-growth-db" | grep -q "unhealthy"; then
        print_error "数据库容器不健康"
        echo ""
        print_info "数据库日志（最后30行）："
        docker-compose logs --tail=30 postgres
    else
        print_warning "数据库容器未运行"
    fi

    echo ""
    print_info "4. 网络连接"
    docker network ls | grep children

    echo ""
    print_info "5. 数据卷"
    docker volume ls | grep children || docker volume ls | grep 12250

    echo ""
    print_info "6. 端口占用情况"
    echo "端口 12250 (前端):"
    lsof -i :12250 || echo "  未占用"
    echo "端口 12251 (后端):"
    lsof -i :12251 || echo "  未占用"
    echo "端口 12252 (数据库):"
    lsof -i :12252 || echo "  未占用"

    echo ""
    print_info "诊断完成"
    echo ""
}

# 启动服务
start_services() {
    local mode=$1

    check_docker
    check_env_files
    check_ports

    echo ""

    if [ "$mode" = "prod" ]; then
        print_info "启动生产环境..."
        docker-compose -f docker-compose.prod.yml up -d

        print_info "等待服务启动（最长等待60秒）..."
        sleep 10

        # 检查数据库是否健康
        local counter=0
        while [ $counter -lt 50 ]; do
            if docker ps --filter "name=children-growth-db" | grep -q "healthy"; then
                print_success "数据库已就绪"
                break
            fi
            echo -n "."
            sleep 1
            counter=$((counter+1))
        done
        echo ""

        if [ $counter -ge 50 ]; then
            print_error "数据库启动超时，请查看日志"
            docker-compose -f docker-compose.prod.yml logs --tail=50 postgres
            exit 1
        fi

        print_info "执行数据库迁移..."
        if docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy; then
            print_success "数据库迁移完成"
        else
            print_error "数据库迁移失败，请查看日志"
            docker-compose -f docker-compose.prod.yml logs --tail=50 backend
            exit 1
        fi

        print_success "生产环境启动完成！"
    else
        print_info "启动开发环境..."

        # 先清理可能存在的不健康容器
        if docker ps -a --filter "name=children-growth" | grep -q "unhealthy"; then
            print_warning "检测到不健康的容器，正在清理..."
            docker-compose down
            sleep 2
        fi

        docker-compose up -d

        print_info "等待服务启动（最长等待60秒）..."
        sleep 10

        # 检查数据库是否健康
        local counter=0
        while [ $counter -lt 50 ]; do
            if docker ps --filter "name=children-growth-db" --format "{{.Status}}" | grep -q "healthy"; then
                print_success "数据库已就绪"
                break
            fi

            # 检查容器是否存在但不健康
            if docker ps --filter "name=children-growth-db" --format "{{.Status}}" | grep -q "unhealthy"; then
                print_error "数据库容器不健康，正在显示日志..."
                docker-compose logs --tail=50 postgres
                echo ""
                print_info "建议操作："
                echo "1. 运行 ./start.sh 选择'清理并重启'"
                echo "2. 或手动执行: docker-compose down -v && docker-compose up -d"
                exit 1
            fi

            echo -n "."
            sleep 1
            counter=$((counter+1))
        done
        echo ""

        if [ $counter -ge 50 ]; then
            print_error "数据库启动超时"
            echo ""
            print_info "显示数据库日志（最后50行）："
            docker-compose logs --tail=50 postgres
            echo ""
            print_info "可能的原因："
            echo "1. 端口12252已被占用"
            echo "2. 数据卷有问题"
            echo "3. PostgreSQL镜像下载失败"
            echo ""
            print_info "建议操作："
            echo "1. 运行 ./start.sh 选择'诊断问题'"
            echo "2. 运行 ./start.sh 选择'清理并重启'"
            exit 1
        fi

        print_info "执行数据库迁移..."
        if docker-compose exec -T backend npx prisma migrate deploy 2>&1; then
            print_success "数据库迁移完成"
        else
            print_warning "数据库迁移失败（可能是首次启动），尝试生成Prisma客户端..."
            docker-compose exec -T backend npx prisma generate
            sleep 2
            docker-compose exec -T backend npx prisma migrate deploy
        fi

        echo ""
        read -p "是否需要填充测试数据？(y/n): " seed
        if [ "$seed" = "y" ] || [ "$seed" = "Y" ]; then
            print_info "填充测试数据..."
            if docker-compose exec -T backend npm run prisma:seed; then
                print_success "测试数据已填充"
                echo ""
                print_info "测试账号："
                echo "  学生1: xiaoming / 123456"
                echo "  学生2: xiaohong / 123456"
                echo "  家长: parent_ming / 123456"
                echo "  老师: teacher_wang / 123456"
            else
                print_error "测试数据填充失败"
            fi
        fi

        print_success "开发环境启动完成！"
    fi

    echo ""
    print_info "访问地址："
    echo "  前端: http://localhost:12250"
    echo "  后端API: http://localhost:12251"
    echo "  数据库: localhost:12252"
    echo ""
    show_status
}

# 停止服务
stop_services() {
    print_info "停止服务..."
    docker-compose down
    print_success "服务已停止"
}

# 重启服务
restart_services() {
    print_info "重启服务..."
    docker-compose restart
    print_success "服务已重启"
    show_status
}

# 清理并重启
clean_restart() {
    print_warning "此操作将删除所有数据（包括数据库），是否继续？"
    read -p "确认删除？(yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        print_info "停止并删除容器、网络和数据卷..."
        docker-compose down -v

        print_info "清理悬空的镜像和容器..."
        docker system prune -f

        print_success "清理完成"

        echo ""
        read -p "是否立即重新启动？(y/n): " restart
        if [ "$restart" = "y" ] || [ "$restart" = "Y" ]; then
            start_services "dev"
        fi
    else
        print_info "已取消清理操作"
    fi
}

# 主菜单
show_menu() {
    clear
    echo "=========================================="
    echo "   儿童成长记录系统 - 管理工具"
    echo "=========================================="
    echo ""
    echo "1) 启动服务（开发环境）"
    echo "2) 启动服务（生产环境）"
    echo "3) 停止服务"
    echo "4) 重启服务"
    echo "5) 查看服务状态"
    echo "6) 查看日志"
    echo "7) 诊断问题"
    echo "8) 清理并重启（删除所有数据）"
    echo "9) 退出"
    echo ""
}

# 主循环
main() {
    if [ "$1" = "start" ]; then
        start_services "dev"
        exit 0
    elif [ "$1" = "stop" ]; then
        stop_services
        exit 0
    elif [ "$1" = "restart" ]; then
        restart_services
        exit 0
    elif [ "$1" = "status" ]; then
        show_status
        exit 0
    elif [ "$1" = "logs" ]; then
        docker-compose logs -f
        exit 0
    fi

    while true; do
        show_menu
        read -p "请选择操作 (1-9): " choice

        case $choice in
            1)
                start_services "dev"
                read -p "按Enter键返回菜单..."
                ;;
            2)
                start_services "prod"
                read -p "按Enter键返回菜单..."
                ;;
            3)
                stop_services
                read -p "按Enter键返回菜单..."
                ;;
            4)
                restart_services
                read -p "按Enter键返回菜单..."
                ;;
            5)
                show_status
                read -p "按Enter键返回菜单..."
                ;;
            6)
                show_logs
                ;;
            7)
                diagnose
                read -p "按Enter键返回菜单..."
                ;;
            8)
                clean_restart
                read -p "按Enter键返回菜单..."
                ;;
            9)
                print_info "再见！"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                sleep 2
                ;;
        esac
    done
}

# 运行主程序
main "$@"
