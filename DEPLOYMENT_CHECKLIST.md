# ✅ 部署检查清单

## 📦 本地准备（已完成）

- [x] 创建 .gitignore 文件
- [x] 创建 ecosystem.config.js (PM2配置)
- [x] 创建 deploy.sh (部署脚本)
- [x] 创建 first-deploy.sh (首次部署脚本)
- [x] Git仓库初始化
- [x] 代码已提交
- [ ] **待办：推送到GitHub** (网络问题待解决)

## 🖥️ 服务器环境检查

### 必需软件
- [ ] Node.js v16+ 已安装
- [ ] npm 已安装
- [ ] Git 已安装
- [ ] PM2 已安装（`npm install -g pm2`）
- [ ] PostgreSQL 已安装并运行

### 数据库配置
- [ ] PostgreSQL 服务已启动
- [ ] 已创建数据库（如：pinghu12250）
- [ ] 已创建数据库用户
- [ ] 用户拥有数据库权限

## 🚀 首次部署步骤

### 1. 克隆代码
```bash
cd /var/www
git clone https://github.com/huangjinxin/pinghu12250.git
cd pinghu12250
```
- [ ] 代码克隆成功

### 2. 配置环境变量
```bash
vi backend/.env
```
必填项：
- [ ] DATABASE_URL 已配置
- [ ] JWT_SECRET 已配置
- [ ] PORT=12251 已设置

### 3. 执行首次部署脚本
```bash
chmod +x first-deploy.sh
./first-deploy.sh
```
- [ ] 后端依赖安装成功
- [ ] 前端依赖安装成功
- [ ] 前端构建成功（dist目录已生成）
- [ ] 数据库初始化成功
- [ ] PM2 服务启动成功

### 4. 配置开机自启
```bash
pm2 startup
# 复制输出的命令执行
pm2 save
```
- [ ] PM2 开机自启已配置
- [ ] 当前进程列表已保存

## 🔍 部署验证

### PM2 状态检查
```bash
pm2 status
```
预期结果：
- [ ] pinghu-backend 状态为 online
- [ ] pinghu-frontend 状态为 online
- [ ] restart 次数为 0

### 服务可访问性
```bash
# 后端健康检查
curl http://localhost:12251/api/health

# 前端访问测试
curl http://localhost:12250
```
- [ ] 后端API响应正常
- [ ] 前端页面响应正常

### 日志检查
```bash
pm2 logs
```
- [ ] 后端无错误日志
- [ ] 前端无错误日志
- [ ] 数据库连接成功

## 🎯 功能测试

### 基础功能
- [ ] 访问前端首页能正常显示
- [ ] 能看到登录页面
- [ ] 后端API能正常响应
- [ ] 数据库连接正常

### 可选：创建测试账号
```bash
cd backend
node scripts/create-admin.js
```
- [ ] 管理员账号创建成功
- [ ] 能用管理员账号登录

## 📊 性能检查

```bash
pm2 monit
```
- [ ] 后端内存使用 < 300MB
- [ ] 前端内存使用 < 200MB
- [ ] CPU使用率正常
- [ ] 无频繁重启

## 🔧 可选配置

### Nginx反向代理
- [ ] Nginx已安装
- [ ] 已配置前端代理（端口12250）
- [ ] 已配置后端代理（/api路径）
- [ ] 已配置WebSocket代理（/socket.io）
- [ ] Nginx配置测试通过
- [ ] Nginx已重启

### HTTPS证书
- [ ] Let's Encrypt证书已安装
- [ ] 已配置SSL
- [ ] 强制HTTPS跳转已启用

### 防火墙
- [ ] 已开放80端口（HTTP）
- [ ] 已开放443端口（HTTPS）
- [ ] 内部端口12250/12251已保护

## 📝 文档确认

- [ ] 已阅读 DEPLOY_GUIDE.md
- [ ] 已阅读 QUICK_REFERENCE.md
- [ ] 已了解PM2常用命令
- [ ] 已了解部署更新流程

## 🎉 最终确认

- [ ] 前端可通过浏览器正常访问
- [ ] 后端API正常响应
- [ ] 数据库连接稳定
- [ ] PM2服务稳定运行
- [ ] 日志无异常错误
- [ ] 开机自启已配置

---

**全部完成后，部署成功！** 🚀

**访问地址：**
- 前端: http://服务器IP:12250
- 后端: http://服务器IP:12251/api

**下次更新只需：**
```bash
cd /var/www/pinghu12250
./deploy.sh
```
