#!/bin/bash

# 数据库备份脚本
# 用途：自动备份 Docker 容器中的 PostgreSQL 数据库

# cron 环境下需要完整 PATH 和 DOCKER_HOST
export PATH="/Applications/Docker.app/Contents/Resources/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export DOCKER_HOST="unix:///var/run/docker.sock"
DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"

# 配置项
CONTAINER_NAME="children-growth-db"
DB_NAME="children_growth"
DB_USER="postgres"
BACKUP_DIR="/Users/beichentech/pinghu12250/backups"
STATUS_FILE="${BACKUP_DIR}/status.json"
BACKUP_RETENTION_DAYS=7

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ISO_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

mkdir -p "${BACKUP_DIR}"

write_status() {
  local success=$1 file=$2 size=$3 error=$4
  printf '{"success":%s,"time":"%s","file":"%s","size":"%s","error":"%s"}\n' \
    "$success" "$ISO_TIME" "$file" "$size" "$error" > "${STATUS_FILE}"
}

echo "=========================================="
echo "开始数据库备份"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 检查容器是否运行
if ! $DOCKER ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ 错误: 容器 ${CONTAINER_NAME} 未运行"
    write_status "false" "" "" "容器 ${CONTAINER_NAME} 未运行"
    exit 1
fi

# 执行备份
echo "📦 正在备份数据库..."
$DOCKER exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"

if [ $? -eq 0 ] && [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ 备份成功: ${BACKUP_FILE} (${BACKUP_SIZE})"

    echo "🗜️  正在压缩备份文件..."
    gzip "${BACKUP_FILE}"

    if [ -f "${BACKUP_FILE_GZ}" ]; then
        COMPRESSED_SIZE=$(du -h "${BACKUP_FILE_GZ}" | cut -f1)
        echo "✅ 压缩完成: ${BACKUP_FILE_GZ} (${COMPRESSED_SIZE})"
        write_status "true" "$(basename ${BACKUP_FILE_GZ})" "${COMPRESSED_SIZE}" ""
    else
        echo "❌ 压缩失败"
        write_status "false" "" "" "压缩失败"
        exit 1
    fi
else
    echo "❌ 备份失败"
    rm -f "${BACKUP_FILE}"
    write_status "false" "" "" "pg_dump 执行失败"
    exit 1
fi

# 清理旧备份
echo "🧹 清理旧备份文件..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete

BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f | wc -l | tr -d ' ')
echo "📊 当前保留备份数量: ${BACKUP_COUNT}"

echo "=========================================="
echo "备份完成"
echo "=========================================="

exit 0
