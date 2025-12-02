# 🚀 快速部署指南

> **项目**: 平湖少儿空间学习平台  
> **仓库**: https://github.com/huangjinxin/pinghu12250  
> **部署方式**: GitHub + PM2 + 服务器构建

---

## 📋 服务器要求

- **操作系统**: macOS arm / Linux
- **Node.js**: v16+ 
- **npm**: 最新版本
- **PostgreSQL**: v12+
- **Git**: 已安装
- **PM2**: 全局安装

---

## ⚡ 一键部署（5步完成）

### 1️⃣ 克隆代码
```bash
cd /var/www
git clone https://github.com/huangjinxin/pinghu12250.git
cd pinghu12250
```

### 2️⃣ 配置环境变量
```bash
vi backend/.env
```
填写：
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
JWT_SECRET="your-random-secret-key"
PORT=12251
NODE_ENV=production
```

### 3️⃣ 首次部署
```bash
chmod +x first-deploy.sh
./first-deploy.sh
```

### 4️⃣ 配置自启
```bash
pm2 startup
# 复制输出的命令执行
pm2 save
```

### 5️⃣ 验证
```bash
pm2 status
curl http://localhost:12251/api/health
```

✅ 完成！访问 http://服务器IP:12250

---

## 🔄 日常更新

```bash
cd /var/www/pinghu12250
./deploy.sh
```

---

## 📚 详细文档

| 文档 | 说明 |
|------|------|
| [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) | 完整部署指南 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 快速命令参考 |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | 部署检查清单 |
| [SERVER_COMMANDS.txt](./SERVER_COMMANDS.txt) | 服务器命令汇总 |

---

## 🛠️ PM2常用命令

```bash
pm2 status      # 查看状态
pm2 logs        # 查看日志
pm2 restart all # 重启服务
pm2 monit       # 监控面板
```

---

## 🆘 遇到问题？

1. 查看日志: `pm2 logs`
2. 检查环境: `pm2 describe pinghu-backend`
3. 重启服务: `pm2 restart all`
4. 参考文档: [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

---

**祝部署顺利！** 🎉
