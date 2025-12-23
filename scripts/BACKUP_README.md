# 数据库自动备份系统

## 📋 概述

这是一个完整的 PostgreSQL 数据库自动备份解决方案，包含备份、恢复和定时任务配置功能。

## 🚀 快速开始

### 1. 手动执行备份

```bash
# 进入脚本目录
cd /Users/beichentech/pinghu12250/scripts

# 执行备份
./backup-database.sh
```

### 2. 配置自动备份（定时任务）

```bash
# 运行配置向导
./setup-cron.sh
```

选择合适的备份频率：
- **每天一次** - 适合数据变化不频繁的场景
- **每天两次** - 推荐配置，兼顾安全性和资源占用
- **每6小时** - 适合重要数据
- **每3小时** - 适合核心业务数据

### 3. 从备份恢复数据库

```bash
# 查看可用备份
ls -lh /Users/beichentech/pinghu12250/backups/

# 恢复数据库
./restore-database.sh /Users/beichentech/pinghu12250/backups/children_growth_20251205_134307.sql.gz
```

## 📁 文件说明

```
scripts/
├── backup-database.sh      # 备份脚本
├── restore-database.sh     # 恢复脚本
├── setup-cron.sh           # 定时任务配置脚本
└── BACKUP_README.md        # 本文档

backups/                    # 备份文件存储目录
├── children_growth_20251205_134307.sql.gz
├── children_growth_20251205_180000.sql.gz
└── ...

logs/
└── backup.log              # 备份日志文件
```

## ⚙️ 配置说明

### 备份脚本配置（backup-database.sh）

```bash
CONTAINER_NAME="children-growth-db"    # Docker 容器名称
DB_NAME="children_growth"              # 数据库名称
DB_USER="postgres"                     # 数据库用户
BACKUP_DIR="..."                       # 备份目录
BACKUP_RETENTION_DAYS=7                # 保留天数（默认7天）
```

### 修改保留天数

编辑 `backup-database.sh`，修改 `BACKUP_RETENTION_DAYS` 变量：
- `7` - 保留7天（默认）
- `30` - 保留30天
- `0` - 永久保留（不自动删除）

## 📊 监控和管理

### 查看备份日志

```bash
# 实时查看日志
tail -f /Users/beichentech/pinghu12250/logs/backup.log

# 查看最近的备份记录
tail -50 /Users/beichentech/pinghu12250/logs/backup.log
```

### 查看备份文件

```bash
# 列出所有备份
ls -lh /Users/beichentech/pinghu12250/backups/

# 查看备份文件大小统计
du -sh /Users/beichentech/pinghu12250/backups/
```

### 管理定时任务

```bash
# 查看当前定时任务
crontab -l | grep backup-database

# 编辑定时任务
crontab -e

# 删除定时任务
./setup-cron.sh  # 选择选项 7
```

## 🔧 常见问题

### Q: 如何测试备份是否成功？

```bash
# 1. 执行一次手动备份
./scripts/backup-database.sh

# 2. 检查备份文件是否生成
ls -lh /Users/beichentech/pinghu12250/backups/

# 3. 验证备份文件内容
gunzip -c /Users/beichentech/pinghu12250/backups/children_growth_*.sql.gz | head -20
```

### Q: 如何修改备份时间？

```bash
# 重新运行配置脚本
./scripts/setup-cron.sh

# 或者直接编辑 crontab
crontab -e
```

### Q: 备份文件太大怎么办？

备份文件会自动压缩（.gz），如果仍然太大：
1. 检查数据库是否有冗余数据
2. 增加清理频率（减少 BACKUP_RETENTION_DAYS）
3. 考虑使用外部存储

### Q: 定时任务没有执行？

检查步骤：
1. 确认 cron 服务运行：`ps aux | grep cron`
2. 检查脚本权限：`ls -l /Users/beichentech/pinghu12250/scripts/backup-database.sh`
3. 查看日志文件：`tail /Users/beichentech/pinghu12250/logs/backup.log`
4. 手动执行测试：`./scripts/backup-database.sh`

## 📝 Cron 表达式参考

```
格式: 分 时 日 月 周

示例：
0 2 * * *       # 每天凌晨2点
0 */6 * * *     # 每6小时
0 2,14 * * *    # 每天2点和14点
30 1 * * 0      # 每周日凌晨1:30
0 3 1 * *       # 每月1日凌晨3点
```

## 🔒 安全建议

1. **备份加密**：敏感数据建议加密备份文件
2. **异地备份**：定期将备份文件复制到其他位置
3. **权限控制**：确保备份文件只有授权用户可访问
4. **定期测试**：定期测试恢复流程确保备份可用

## 📞 技术支持

如有问题，请检查：
1. Docker 容器是否正常运行
2. 数据库连接是否正常
3. 磁盘空间是否充足
4. 日志文件中的错误信息
