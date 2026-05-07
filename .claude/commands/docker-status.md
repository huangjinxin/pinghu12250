查看Docker容器状态

## 用途

检查项目相关Docker容器的运行状态。

## 执行步骤

```bash
docker ps -a --filter "name=children-growth" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 容器说明

| 容器名 | 服务 | 端口 |
|--------|------|------|
| children-growth-frontend | 前端 | 12250 |
| children-growth-backend | 后端 | 12251 |
| children-growth-postgres | 数据库 | 12252 |

## 常用操作

```bash
# 查看日志
docker logs children-growth-backend -f --tail 100

# 重启容器
docker restart children-growth-backend

# 进入容器
docker exec -it children-growth-backend sh
```
