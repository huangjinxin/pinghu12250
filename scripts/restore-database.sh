#!/bin/bash

# 数据库恢复脚本
# 用途：从备份文件恢复数据库

# 配置项
CONTAINER_NAME="children-growth-db"
DB_NAME="children_growth"
DB_USER="postgres"
BACKUP_DIR="/Users/beichentech/pinghu12250/backups"

# 检查参数
if [ $# -eq 0 ]; then
    echo "用法: $0 <备份文件路径>"
    echo ""
    echo "可用的备份文件:"
    ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ 错误: 备份文件不存在: ${BACKUP_FILE}"
    exit 1
fi

echo "=========================================="
echo "开始数据库恢复"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "备份文件: ${BACKUP_FILE}"
echo "=========================================="

# 检查容器是否运行
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ 错误: 容器 ${CONTAINER_NAME} 未运行"
    exit 1
fi

# 询问确认
read -p "⚠️  警告: 此操作将清空现有数据库！是否继续? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 解压备份文件（如果是压缩的）
TEMP_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    echo "📦 正在解压备份文件..."
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "${BACKUP_FILE}" > "${TEMP_FILE}"
fi

# 清空现有数据库
echo "🗑️  正在清空现有数据库..."
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ${DB_USER}; GRANT ALL ON SCHEMA public TO public;"

# 恢复数据
echo "📥 正在恢复数据..."
cat "${TEMP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

# 检查恢复结果
if [ $? -eq 0 ]; then
    echo "✅ 数据库恢复成功"
else
    echo "❌ 数据库恢复失败"
    exit 1
fi

# 清理临时文件
if [[ "${BACKUP_FILE}" == *.gz ]] && [ -f "${TEMP_FILE}" ]; then
    rm -f "${TEMP_FILE}"
fi

echo "=========================================="
echo "恢复完成"
echo "=========================================="

exit 0
