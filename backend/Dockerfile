# 后端生产环境Dockerfile
FROM node:20-slim

# 安装 OpenSSL 和其他必要的依赖
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装生产依赖
RUN npm ci --only=production

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 12251

# 启动命令
CMD ["npm", "start"]
