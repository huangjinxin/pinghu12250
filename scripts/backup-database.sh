#!/bin/bash

# 数据库备份脚本
# 用途：自动备份 Docker 容器中的 PostgreSQL 数据库

# 配置项
CONTAINER_NAME="children-growth-db"
DB_NAME="children_growth"
DB_USER="postgres"
BACKUP_DIR="/Users/beichentech/pinghu12250/backups"
BACKUP_RETENTION_DAYS=7  # 保留最近7天的备份

# 生成备份文件名（包含时间戳）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# 创建备份目录（如果不存在）
mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "开始数据库备份"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 检查容器是否运行
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ 错误: 容器 ${CONTAINER_NAME} 未运行"
    exit 1
fi

# 执行备份
echo "📦 正在备份数据库..."
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"

# 检查备份是否成功
if [ $? -eq 0 ] && [ -f "${BACKUP_FILE}" ]; then
    # 获取备份文件大小
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ 备份成功: ${BACKUP_FILE} (${BACKUP_SIZE})"

    # 压缩备份文件
    echo "🗜️  正在压缩备份文件..."
    gzip "${BACKUP_FILE}"

    if [ -f "${BACKUP_FILE_GZ}" ]; then
        COMPRESSED_SIZE=$(du -h "${BACKUP_FILE_GZ}" | cut -f1)
        echo "✅ 压缩完成: ${BACKUP_FILE_GZ} (${COMPRESSED_SIZE})"
    else
        echo "❌ 压缩失败"
        exit 1
    fi
else
    echo "❌ 备份失败"
    exit 1
fi

# 清理旧备份（保留最近N天）
echo "🧹 清理旧备份文件..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete

# 统计当前备份文件数量
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
echo "📊 当前保留备份数量: ${BACKUP_COUNT}"

echo "=========================================="
echo "备份完成"
echo "=========================================="

exit 0
