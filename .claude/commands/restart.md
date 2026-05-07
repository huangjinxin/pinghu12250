重启后端服务

## 执行命令

```bash
docker restart children-growth-backend && sleep 3 && docker logs children-growth-backend --tail 20
```

## 说明

1. 重启 children-growth-backend 容器
2. 等待 3 秒让服务启动
3. 显示最后 20 行日志确认启动状态

## 常见问题

- 如果启动失败，查看完整日志：`docker logs children-growth-backend -f`
- 检查数据库连接：确保 children-growth-postgres 正在运行
