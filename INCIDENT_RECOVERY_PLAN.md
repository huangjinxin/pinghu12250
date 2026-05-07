# 故障记录与恢复计划

> 时间：2026-04-24 上午 | 记录人：AI | 状态：**修复中**

---

## 一、故障根因（中文说明）

### 核心问题：Docker 镜像过期 + 跨平台原生模块冲突

本次宕机由**两个相互叠加的问题**导致：

#### 问题 1 — `sharp` 模块平台不匹配（主因）

| 环境 | 平台 |
|---|---|
| 宿主机（Mac Mini） | `darwin/arm64` |
| Docker 容器内 | `linux/arm64` |

`sharp` 是一个带原生二进制（`.node` 文件）的 C++ 扩展。在 Mac 上 `npm install sharp` 会下载 **darwin 版**二进制，但容器需要 **linux 版**。

docker-compose.yml 里挂载了 `./backend:/app`，把整个宿主机 backend 目录（含 `node_modules`）覆盖进容器，导致容器加载了 **Mac 版**的 sharp，在 Linux 运行时直接崩溃：

```
Error: Could not load the "sharp" module using the linux-arm64 runtime
```

#### 问题 2 — `apn` 模块缺失（次因）

`apn`（Apple Push Notification）是后来新增的依赖，加入了 `package.json`，但 Docker 镜像**很久没有重建**，镜像内的 `node_modules` 是旧的，不包含 `apn`。

虽然 docker-compose 用了 `/app/node_modules` 匿名卷（本应隔离容器 node_modules），但匿名卷在 `docker rm -f` 后重新创建时，是从旧镜像复制的内容 → 仍然缺包。

#### 问题 3 — Docker 重建镜像受阻（修复被阻）

尝试 `docker compose build --no-cache` 重建镜像时，Docker BuildKit 直连 Docker Hub 遇到：
- 无代理时：TLS 握手超时
- 有代理时：代理环境变量对 Docker Desktop 的 BuildKit daemon 不生效（需在 Docker Desktop UI 设置）

---

## 二、受影响服务

| 服务 | 状态 | 端口 |
|---|---|---|
| **Backend API** | ❌ 崩溃循环 → 🔄 修复中 | 12251 |
| **Nginx HTTPS** | ⚠️ 运行但 502（后端挂了） | 443 / 80 |
| **PostgreSQL** | ✅ 正常，数据完整 | 12252 |
| **Frontend (preview)** | ✅ 正常 | 12250 |
| **Frontend (dev)** | ✅ 正常 | 12253 |

> **数据安全**：数据库数据完好，已确认 User:16, Diary:207, PointLog:1371 等核心表正常。
> 用户看到"没数据"是因为后端 API 报 502，前端无法获取数据，**不是真的数据丢失**。

---

## 三、当前修复进度

### ✅ 已完成
- [x] 确认数据库数据完好（不需要从备份恢复）
- [x] 确认前端 12250 / 12253 正常
- [x] 修改 `docker-compose.yml`：启动命令加入 `npm install`，确保每次启动时安装正确平台的包
- [x] 重新启动 backend 容器（当前容器正在执行 `npm install`）

### 🔄 进行中
- [ ] **等待 npm install 完成**（容器已 Up，正在安装依赖，约需 2-5 分钟）
  - 验证命令：`docker logs children-growth-backend --tail 30`
  - 看到 `Server running on port 12251` 表示成功

### ⏳ 待执行（需代理）
- [ ] **重建 Docker 镜像**（彻底修复，不再依赖启动时 npm install）
  - **操作**：在 Docker Desktop → Settings → Resources → Proxies 填入 `http://127.0.0.1:7897`，然后执行：
    ```bash
    docker compose build --no-cache backend
    docker rm -f children-growth-backend
    docker compose up -d backend
    # 完成后可恢复 docker-compose.yml 中去掉 npm install 的命令
    ```

---

## 四、完整恢复步骤（供中断后继续）

### Step 1：检查当前状态
```bash
cd /Users/beichentech/pinghu12250
docker ps -a | grep -E "backend|db|nginx"
docker logs children-growth-backend --tail 30
curl -s http://localhost:12251/api/health
```

**预期结果：**
- backend 状态 `Up`
- 日志出现 `Server running on port 12251`
- curl 返回 JSON

### Step 2：如果 backend 还在崩溃

```bash
# 强制删除旧容器，重新用新命令启动
docker rm -f children-growth-backend
docker compose up -d backend
# 等待 3-5 分钟让 npm install 完成
docker logs -f children-growth-backend
```

### Step 3：重建镜像（彻底修复）

```bash
# 先在 Docker Desktop UI 设置代理：http://127.0.0.1:7897
# 或在终端设置后用 --build-arg 传入：
export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897

docker compose build --no-cache backend
docker rm -f children-growth-backend
docker compose up -d backend
```

镜像重建成功后，**恢复 docker-compose.yml 的启动命令**：

```yaml
# 改回（去掉 npm install，因为镜像里已有正确的包）
command: sh -c "npx prisma generate && npm run dev"
```

### Step 4：验证服务正常

```bash
# 后端健康检查
curl http://localhost:12251/api/health

# nginx 502 应消失
curl -k https://localhost/api/health

# 检查数据
docker exec children-growth-db psql -U postgres -d children_growth \
  -c "SELECT COUNT(*) FROM \"User\";"
```

---

## 五、预防措施（规则）

### 规则 1：新增 npm 依赖后必须重建 Docker 镜像

```bash
# 任何 npm install <新包> 之后，必须执行：
docker compose build backend
docker compose up -d --force-recreate backend
```

> **原因**：镜像中的 node_modules 是构建时固化的，包含平台原生二进制。
> 仅修改 package.json 不会自动更新镜像。

### 规则 2：永远不要在宿主机 node_modules 里安装 Linux 包

```bash
# ❌ 错误：在 Mac 上用 docker compose run 安装包，然后依赖挂载
docker compose run --rm backend npm install some-pkg

# ✅ 正确：重建镜像，让镜像内 npm install 运行在 Linux 环境
docker compose build --no-cache backend
```

### 规则 3：Docker build 需要代理时，在 Docker Desktop UI 配置

Shell 的 `export https_proxy=...` **不影响** Docker BuildKit daemon 拉取基础镜像。
必须在：`Docker Desktop → Settings → Resources → Proxies` 配置。

### 规则 4：备份验证（已有，保持）

当前自动备份每 3 小时一次，最新备份 `children_growth_20260424_060000.sql.gz` (16MB)。
**每次重大操作前手动备份**：

```bash
docker exec children-growth-db pg_dump -U postgres children_growth | \
  gzip > ./backups/manual_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 六、时间线

| 时间 | 事件 |
|---|---|
| ~10:08 | 发现 backend 崩溃，sharp linux-arm64 报错 |
| 10:09 | 尝试 `docker compose run --rm npm install sharp`（无效，临时容器卷会被删） |
| 10:16 | 重启后报 `apn` 模块缺失 |
| 10:19 | 确认数据库数据完好（Diary:207, PointLog:1371） |
| 10:26 | 尝试 `docker compose build --no-cache` 失败（TLS 超时） |
| 10:30 | 修改 docker-compose.yml，启动命令加 `npm install` |
| 10:30 | 用代理重建镜像，失败（代理未对 BuildKit daemon 生效） |
| 10:31 | backend 容器 Up，正在执行 `npm install`（进行中） |
