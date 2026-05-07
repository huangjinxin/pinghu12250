查看后端日志

## 用途

查看后端服务的运行日志，用于调试和排查问题。

## 执行步骤

```bash
# 查看最近100行日志
docker logs children-growth-backend --tail 100

# 实时跟踪日志
docker logs children-growth-backend -f --tail 50
```

## 常见日志类型

- **启动日志**: Server running on port 12251
- **请求日志**: GET /api/xxx 200
- **错误日志**: Error: xxx
- **Prisma日志**: prisma:query SELECT ...

## 日志过滤

```bash
# 只看错误
docker logs children-growth-backend 2>&1 | grep -i error

# 只看特定API
docker logs children-growth-backend 2>&1 | grep "/api/textbook"
```
