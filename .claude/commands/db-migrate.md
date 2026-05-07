数据库迁移命令 - 修改 Prisma Schema 后执行

## 执行步骤

1. 生成 Prisma Client
```bash
docker exec children-growth-backend npx prisma generate
```

2. 推送数据库变更
```bash
docker exec children-growth-backend npx prisma db push
```

3. 重启后端服务
```bash
docker restart children-growth-backend
```

4. 验证启动成功（等待5秒后检查日志）
```bash
sleep 5 && docker logs children-growth-backend --tail 10
```

## 注意事项

- 如果有破坏性变更（删除字段/表），需要先备份数据
- 生产环境应使用 `prisma migrate` 而非 `db push`
- 确保容器名称正确（children-growth-backend）
