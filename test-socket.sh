#!/bin/bash

# Socket.IO IM 快速测试脚本

echo "🧪 Socket.IO IM 功能测试"
echo "========================"
echo ""

# 1. 检查后端状态
echo "1️⃣ 检查后端服务..."
if docker ps | grep -q children-growth-backend; then
    echo "✅ 后端服务运行中"
else
    echo "❌ 后端服务未运行"
    exit 1
fi

# 2. 测试健康检查
echo ""
echo "2️⃣ 测试健康检查..."
HEALTH=$(curl -s http://localhost:12251/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    exit 1
fi

# 3. 登录获取token
echo ""
echo "3️⃣ 登录测试账号..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:12251/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xiaoming","password":"123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ 登录成功"
    echo "Token: ${TOKEN:0:50}..."
else
    echo "❌ 登录失败"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# 4. 检查好友关系
echo ""
echo "4️⃣ 检查好友列表..."
FRIENDS=$(curl -s http://localhost:12251/api/follows/friends \
  -H "Authorization: Bearer $TOKEN")

if echo "$FRIENDS" | grep -q "success"; then
    echo "✅ 好友列表获取成功"
    echo "$FRIENDS" | head -n 5
else
    echo "⚠️  好友列表为空或获取失败"
fi

# 5. 检查会话列表
echo ""
echo "5️⃣ 检查会话列表..."
CONVERSATIONS=$(curl -s http://localhost:12251/api/conversations/list \
  -H "Authorization: Bearer $TOKEN")

echo "$CONVERSATIONS" | head -n 10

# 6. 打开测试页面
echo ""
echo "6️⃣ 启动Web测试工具..."
echo ""
echo "📝 测试步骤："
echo "1. 在浏览器中打开: file://$(pwd)/socket-test.html"
echo "2. 使用 xiaoming/123456 登录"
echo "3. 点击'连接Socket'"
echo "4. 在另一个浏览器窗口用 parent_ming/123456 登录"
echo "5. 互相发送消息测试"
echo ""
echo "🔍 查看后端日志："
echo "docker logs -f children-growth-backend | grep Socket"
echo ""

# 自动打开测试页面（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "socket-test.html"
fi

echo "✅ 测试准备完成！"
