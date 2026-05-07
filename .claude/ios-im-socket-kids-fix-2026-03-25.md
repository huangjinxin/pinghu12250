# iOS IM kids 域名 Socket.IO 排障记录（2026-03-25）

## 现象
- iOS 使用生产地址 `https://kids.706tech.cn` 时，IM 页面顶部长期显示“正在连接消息服务...”。
- REST 接口可用，消息列表、好友列表等能正常加载。
- 本机直连后端 `http://localhost:12251` 的 Socket.IO 握手正常。

## 根因
请求链路为：

`iOS -> kids.706tech.cn (云服务器 Caddy) -> 100.85.113.25:443 (本机 Nginx HTTPS) -> backend/frontend`

云端 Caddy 只是整站透传：

```caddy
kids.706tech.cn {
    reverse_proxy https://100.85.113.25:443 {
        transport http {
            tls_insecure_skip_verify
        }
    }
}
```

真正的问题在本机 `nginx/nginx.conf`：
- 已有 `/api/` -> `backend:12251`
- 已有 `/uploads/` / `/photos-static/`
- 默认 `/` -> `host.docker.internal:12250`
- **缺少 `/socket.io/` -> `backend:12251`**

因此 `https://kids.706tech.cn/socket.io/...` 被错误转发到了前端，返回 HTML 首页，导致 iOS `SocketManager` 一直停在 `.connecting`。

## 代码定位
- `ios-app/pinghu12250/Core/Network/SocketManager.swift`
  - `connect(token:)` 进入即设为 `.connecting`
  - 只有收到 `.connect` 才变 `.authenticated`
- `ios-app/pinghu12250/Features/Main/SidebarNavigationView.swift`
  - `.connecting` 时显示“正在连接消息服务...”
- `backend/src/index.js`
  - Socket.IO 服务运行在后端 `12251`
  - 支持 `handshake.auth.token` 和 `handshake.query.token`

## 修复
在本机 `nginx/nginx.conf` 的 HTTPS server 中补充：

```nginx
location /socket.io/ {
    proxy_pass http://backend:12251/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 60s;
    proxy_send_timeout 86400s;
    proxy_read_timeout 86400s;
}
```

## 操作过程中的额外问题
修改配置后，`docker exec children-growth-nginx nginx -t` 一度报错：
- `unexpected end of file, expecting "}"`
- 后续又出现 `pread() returned only 3957 bytes instead of 4096`

最终判断不是 Socket 规则本身错误，而是 **Nginx 容器对只读 bind mount 的 `nginx.conf` 读取状态异常**。处理方式：

```bash
docker restart children-growth-nginx
```

重启后重新测试，配置恢复正常。

## 验证结果
### 1. kids 域名的 Socket.IO 握手恢复正常

```bash
curl -i "https://kids.706tech.cn/socket.io/?EIO=3&transport=polling&token=test"
```

返回：

```text
HTTP/2 200
content-type: text/plain; charset=UTF-8
...
118:0{"sid":"...","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":60000,...}
```

说明 `/socket.io` 已经正确到达后端 Socket.IO 服务，而不是返回前端 HTML。

### 2. API 代理仍正常

```bash
curl -i "https://kids.706tech.cn/api/messages/conversations/list"
```

返回 `401 未提供认证令牌`，说明请求已正确进入后端 Express，而不是落到前端。

## 结论
- 主因：本机 Nginx HTTPS 路由缺少 `/socket.io/` 转发。
- 修复：在 `nginx/nginx.conf` 中补充 `/socket.io/` 到 `backend:12251` 的代理。
- 额外处理：若容器语法检查出现 `pread()`/EOF 异常，先重启 `children-growth-nginx` 刷新 bind mount。

## 后续建议
1. 若以后再次出现“REST 正常但 IM 一直连接中”，优先执行：
   ```bash
   curl -i "https://kids.706tech.cn/socket.io/?EIO=3&transport=polling&token=test"
   ```
2. 若返回 HTML，优先检查本机 `nginx/nginx.conf` 的 `/socket.io/` 规则。
3. iOS 客户端后续可补连接超时兜底，避免服务异常时长期停留在 `.connecting`。
