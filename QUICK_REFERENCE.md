# ⚡ 快速命令参考

## GitHub 推送（本地执行）

由于网络问题，请手动执行GitHub推送：

```bash
# 方法1：通过VSCode推送（推荐）
# 在VSCode源代码管理面板点击"推送"按钮

# 方法2：命令行推送
git push -u origin main

# 如遇到HTTP2错误
git config --global http.version HTTP/1.1
git push -u origin main

# 如需要代理
git config --global http.proxy http://127.0.0.1:7890
git push -u origin main
```

---

## 服务器首次部署（完整流程）

```bash
# 1. 克隆代码
mkdir -p /var/www && cd /var/www
git clone https://github.com/huangjinxin/pinghu12250.git
cd pinghu12250

# 2. 配置环境变量
cat > backend/.env << 'ENVEOF'
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
PORT=12251
NODE_ENV=production
ENVEOF

# 3. 执行首次部署
chmod +x first-deploy.sh
./first-deploy.sh

# 4. 配置开机自启
pm2 startup
# 复制输出的命令并执行
pm2 save
```

---

## 日常更新部署

```bash
cd /var/www/pinghu12250
./deploy.sh
```

---

## PM2 常用命令

```bash
pm2 status              # 查看状态
pm2 logs                # 查看日志
pm2 logs pinghu-backend # 查看后端日志
pm2 restart all         # 重启所有服务
pm2 stop all            # 停止所有服务
pm2 monit               # 监控面板
```

---

## 数据库操作

```bash
cd /var/www/pinghu12250/backend

# 同步数据库
npx prisma db push

# 生成Prisma客户端
npx prisma generate

# 查看数据库
npx prisma studio
```

---

## 日志查看

```bash
# 实时日志
pm2 logs

# 后端日志
tail -f logs/backend-out.log
tail -f logs/backend-error.log

# 前端日志
tail -f logs/frontend-out.log
```

---

## 服务访问

- 前端: http://服务器IP:12250
- 后端: http://服务器IP:12251
- API健康检查: http://服务器IP:12251/api/health

---

## 应急命令

```bash
# 强制杀死所有Node进程
pkill -9 node

# 清理PM2
pm2 delete all
pm2 kill

# 重新启动
pm2 start ecosystem.config.js
pm2 save
```

---

## 文件权限

```bash
# 设置.env权限
chmod 600 backend/.env

# 设置脚本执行权限
chmod +x *.sh

# 设置日志目录权限
chmod 755 logs
```

