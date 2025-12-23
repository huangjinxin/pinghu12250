#!/bin/bash

# 定时任务设置脚本
# 用途：配置数据库自动备份的定时任务

SCRIPT_DIR="/Users/beichentech/pinghu12250/scripts"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"
LOG_DIR="/Users/beichentech/pinghu12250/logs"
LOG_FILE="${LOG_DIR}/backup.log"

# 创建日志目录
mkdir -p "${LOG_DIR}"

echo "=========================================="
echo "数据库自动备份 - 定时任务配置"
echo "=========================================="
echo ""
echo "请选择备份频率："
echo "  1) 每天备份一次（凌晨2点）"
echo "  2) 每天备份两次（凌晨2点和下午2点）"
echo "  3) 每6小时备份一次"
echo "  4) 每3小时备份一次"
echo "  5) 自定义"
echo "  6) 查看当前定时任务"
echo "  7) 删除定时任务"
echo ""
read -p "请输入选项 (1-7): " OPTION

case ${OPTION} in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="每天凌晨2点备份"
        ;;
    2)
        CRON_SCHEDULE="0 2,14 * * *"
        DESCRIPTION="每天凌晨2点和下午2点备份"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="每6小时备份一次"
        ;;
    4)
        CRON_SCHEDULE="0 */3 * * *"
        DESCRIPTION="每3小时备份一次"
        ;;
    5)
        echo ""
        echo "Cron 表达式格式: 分 时 日 月 周"
        echo "示例: 0 2 * * * (每天凌晨2点)"
        echo "      0 */4 * * * (每4小时)"
        echo "      30 1 * * 0 (每周日凌晨1:30)"
        read -p "请输入 Cron 表达式: " CRON_SCHEDULE
        read -p "请输入描述: " DESCRIPTION
        ;;
    6)
        echo ""
        echo "当前定时任务："
        crontab -l | grep "backup-database.sh" || echo "  未配置备份任务"
        exit 0
        ;;
    7)
        echo ""
        crontab -l | grep -v "backup-database.sh" | crontab -
        echo "✅ 已删除备份定时任务"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "配置信息："
echo "  Cron 表达式: ${CRON_SCHEDULE}"
echo "  描述: ${DESCRIPTION}"
echo "  备份脚本: ${BACKUP_SCRIPT}"
echo "  日志文件: ${LOG_FILE}"
echo ""
read -p "确认添加此定时任务? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 备份现有 crontab
crontab -l > /tmp/crontab.backup 2>/dev/null

# 删除旧的备份任务（如果存在）
crontab -l 2>/dev/null | grep -v "backup-database.sh" > /tmp/crontab.new

# 添加新任务
echo "# ${DESCRIPTION}" >> /tmp/crontab.new
echo "${CRON_SCHEDULE} ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1" >> /tmp/crontab.new

# 安装新的 crontab
crontab /tmp/crontab.new

# 清理临时文件
rm -f /tmp/crontab.new

echo "✅ 定时任务配置成功"
echo ""
echo "当前定时任务："
crontab -l | grep "backup-database.sh"
echo ""
echo "提示："
echo "  - 查看备份日志: tail -f ${LOG_FILE}"
echo "  - 查看备份文件: ls -lh /Users/beichentech/pinghu12250/backups/"
echo "  - 手动执行备份: ${BACKUP_SCRIPT}"
echo ""
