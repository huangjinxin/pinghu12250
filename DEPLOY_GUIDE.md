# 平湖少儿空间 - 服务器部署指南

## 📋 目录结构

```
/var/www/pinghu12250/         # 项目根目录
├── backend/                   # 后端代码
│   ├── src/                   # 源代码
│   ├── prisma/                # 数据库模型
│   ├── package.json
│   └── .env                   # 环境变量（需手动创建）
├── frontend/                  # 前端代码
│   ├── src/                   # 源代码
│   ├── dist/                  # 构建产物（自动生成）
│   └── package.json
├── logs/                      # 日志目录
├── ecosystem.config.js        # PM2配置
├── deploy.sh                  # 部署脚本
└── first-deploy.sh            # 首次部署脚本
```

---

## 🚀 一、首次部署（服务器执行）

### 1.1 检查环境依赖

```bash
# 检查 Node.js（需要 v16+）
node --version

# 检查 npm
npm --version

# 检查 Git
git --version

# 安装 PM2（如果未安装）
npm install -g pm2
```

### 1.2 克隆代码

```bash
# 创建项目目录
mkdir -p /var/www
cd /var/www

# 克隆仓库
git clone https://github.com/huangjinxin/pinghu12250.git
cd pinghu12250
```

### 1.3 配置环境变量

**创建 backend/.env 文件：**

```bash
cat > backend/.env << 'ENVEOF'
# 数据库配置（根据实际修改）
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名"

# JWT密钥（随机生成，保密）
JWT_SECRET="your-random-secret-key-change-this"

# 服务端口
PORT=12251

# Node环境
NODE_ENV=production
ENVEOF
```

**修改实际的数据库连接信息。**

### 1.4 执行首次部署脚本

```bash
chmod +x first-deploy.sh
./first-deploy.sh
```

脚本会自动：
1. ✅ 检查环境依赖
2. ✅ 创建日志目录
3. ✅ 安装后端依赖
4. ✅ 安装前端依赖
5. ✅ 构建前端
6. ✅ 初始化数据库
7. ✅ 启动PM2服务

### 1.5 配置PM2开机自启

```bash
# 执行命令后会输出系统启动脚本
pm2 startup

# 复制输出的命令并执行（示例）
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u yourusername --hp /home/yourusername

# 保存当前PM2进程列表
pm2 save
```

---

## 🔄 二、日常更新部署

### 2.1 更新代码

```bash
cd /var/www/pinghu12250
./deploy.sh
```

部署脚本会自动：
1. ✅ 拉取最新代码
2. ✅ 安装后端依赖
3. ✅ 安装前端依赖
4. ✅ 构建前端
5. ✅ 同步数据库
6. ✅ 重启PM2服务

### 2.2 手动部署步骤（如果脚本失败）

```bash
# 1. 拉取代码
git pull origin main

# 2. 安装后端依赖
cd backend
npm install --production
cd ..

# 3. 安装前端依赖
cd frontend
npm install
cd ..

# 4. 构建前端
cd frontend
npm run build
cd ..

# 5. 同步数据库
cd backend
npx prisma generate
npx prisma db push
cd ..

# 6. 重启服务
pm2 restart all
pm2 save
```

---

## 📊 三、PM2常用命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs

# 查看后端日志
pm2 logs pinghu-backend

# 查看前端日志
pm2 logs pinghu-frontend

# 重启所有服务
pm2 restart all

# 重启单个服务
pm2 restart pinghu-backend
pm2 restart pinghu-frontend

# 停止所有服务
pm2 stop all

# 删除所有服务
pm2 delete all

# 监控CPU/内存使用
pm2 monit

# 查看详细信息
pm2 describe pinghu-backend
```

---

## 🔧 四、Nginx配置（可选）

### 4.1 安装Nginx

```bash
# macOS
brew install nginx

# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 4.2 配置反向代理

创建配置文件 `/etc/nginx/sites-available/pinghu12250`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 前端
    location / {
        proxy_pass http://localhost:12250;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:12251;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket支持（聊天系统）
    location /socket.io/ {
        proxy_pass http://localhost:12251;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/pinghu12250 /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

---

## 🗄️ 五、PostgreSQL数据库配置

### 5.1 安装PostgreSQL

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
```

### 5.2 创建数据库和用户

```bash
# 切换到postgres用户
sudo -u postgres psql

# 在psql中执行：
CREATE DATABASE pinghu12250;
CREATE USER pinghu_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pinghu12250 TO pinghu_user;
\q
```

### 5.3 更新.env文件

```bash
# 修改 backend/.env
DATABASE_URL="postgresql://pinghu_user:your_password@localhost:5432/pinghu12250"
```

---

## 📝 六、初始化数据（可选）

### 6.1 创建管理员账号

```bash
cd /var/www/pinghu12250/backend
node scripts/create-admin.js
```

### 6.2 导入系统配置

```bash
node scripts/init-system-settings.js
```

### 6.3 导入标签数据

```bash
node scripts/seed-tags.js
```

### 6.4 导入挑战模板

```bash
node scripts/seed-challenges.js
```

### 6.5 导入成就系统

```bash
node scripts/seed-achievements.js
```

---

## 🔍 七、检查部署状态

### 7.1 检查PM2状态

```bash
pm2 status
```

**预期输出：**
```
┌────┬────────────────────┬─────────┬─────────┐
│ id │ name               │ status  │ restart │
├────┼────────────────────┼─────────┼─────────┤
│ 0  │ pinghu-backend     │ online  │ 0       │
│ 1  │ pinghu-frontend    │ online  │ 0       │
└────┴────────────────────┴─────────┴─────────┘
```

### 7.2 检查服务访问

```bash
# 检查后端
curl http://localhost:12251/api/health

# 检查前端
curl http://localhost:12250
```

### 7.3 检查日志

```bash
# 实时查看日志
pm2 logs

# 查看后端日志文件
tail -f logs/backend-out.log
tail -f logs/backend-error.log

# 查看前端日志文件
tail -f logs/frontend-out.log
tail -f logs/frontend-error.log
```

---

## ⚠️ 八、常见问题

### 8.1 PM2服务无法启动

```bash
# 检查日志
pm2 logs

# 检查.env文件是否存在
ls -la backend/.env

# 检查数据库连接
cd backend
npx prisma db pull
```

### 8.2 前端构建失败

```bash
# 清除缓存重新构建
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### 8.3 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 检查数据库连接字符串
cat backend/.env | grep DATABASE_URL

# 手动测试连接
cd backend
npx prisma db pull
```

### 8.4 端口被占用

```bash
# 查找占用端口的进程
lsof -i :12250
lsof -i :12251

# 杀死进程
kill -9 <PID>

# 重启PM2
pm2 restart all
```

---

## 🔒 九、安全建议

1. **修改默认端口**：在生产环境建议更改端口号
2. **配置防火墙**：只开放Nginx端口（80/443）
3. **启用HTTPS**：使用Let's Encrypt免费证书
4. **定期备份数据库**：使用cron定时备份
5. **保护.env文件**：设置权限 `chmod 600 backend/.env`
6. **配置日志轮转**：防止日志文件过大

---

## 📞 十、服务地址

部署成功后访问：

- **前端地址**: http://your-server-ip:12250
- **后端API**: http://your-server-ip:12251/api
- **如配置Nginx**: http://your-domain.com

---

## 📚 相关文档

- [PM2官方文档](https://pm2.keymetrics.io/)
- [Prisma文档](https://www.prisma.io/docs/)
- [Nginx配置指南](https://nginx.org/en/docs/)

---

**祝部署顺利！** 🎉
