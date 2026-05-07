重建前端并重启预览服务

## 规则（参考 CLAUDE.md）

- 前端不走 Docker，本地 vite preview 提供服务
- 端口 12250: vite preview（生产构建）
- 端口 12253: vite dev（开发热更新，自动生效无需操作）
- 构建输出到 frontend/dist/

## 执行步骤

1. 构建前端：
```bash
cd /Users/beichentech/pinghu12250/frontend && npm run build
```

2. 杀掉旧的 vite preview 进程并重启：
```bash
lsof -ti:12250 | xargs kill -9 2>/dev/null; sleep 1; cd /Users/beichentech/pinghu12250/frontend && npx vite preview --port 12250 --host &
```

3. 等待 2 秒后验证服务状态：
```bash
sleep 2 && lsof -ti:12250 >/dev/null && echo "✅ 12250 preview 服务已启动" || echo "❌ 12250 启动失败"
```

## 注意

- 12253 dev 服务器有 HMR 热更新，修改源码自动生效，无需重启
- 如果 12253 也异常，重启命令：`lsof -ti:12253 | xargs kill -9; cd frontend && npx vite --port 12253 &`
- 不要动 docker-compose.yml 中已注释的 frontend 服务
