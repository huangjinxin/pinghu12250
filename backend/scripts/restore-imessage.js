const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// users.json 映射
const usersMap = {
  '+8618671476089': '主用户',
  'huangjinxin260@icloud.com': '大黄',
  '328426767@qq.com': '大黄2',
  'renqianyu0117@icloud.com': '同煤',
  'wangdandan2b250@icloud.com': 'huangqianxun',
  'renqianxun0117@icloud.com': '任芊浔',
  'zhengyunyi1029@hotmail.com': '郑韵伊',
  'xixingcheng0926@icloud.com': '席星诚',
  '1655195757@qq.com': '张羽宏',
  'fengxuyang428@icloud.com': '果果',
  'zhangruiqi0820@icloud.com': '果果2',
};

async function main() {
  const log = fs.readFileSync('/Users/beichentech/.imessage-ai/service.log', 'utf-8');
  const lines = log.split('\n');

  // 解析两种格式:
  // [2026-03-23 19:58:51] 收到消息: sender=xxx, chat_id=21, 群聊=False, text=xxx...
  // [2026-02-04 12:38:21] 收到消息: sender=xxx, text=xxx...
  const regexNew = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] 收到消息: sender=([^,]+), chat_id=(\d+), 群聊=(True|False), text=(.+)$/;
  const regexOld = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] 收到消息: sender=([^,]+), text=(.+)$/;

  const records = [];
  const seenKeys = new Set(); // dedup

  for (const line of lines) {
    let match = line.match(regexNew);
    if (match) {
      const [, ts, sender, chatId, isGroup, rawText] = match;
      // 清理 text: 去掉末尾的 "..." 和可能的 ", 图片数量=N"
      let text = rawText.replace(/\.\.\.$/, '').replace(/, 图片数量=\d+$/, '').replace(/^￼/, '').trim();
      if (!text) continue;
      const key = `${ts}-${sender}-${chatId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      records.push({
        chatId: String(chatId),
        sender,
        senderName: usersMap[sender] || null,
        role: 'user',
        content: text,
        isGroup: isGroup === 'True',
        source: 'imessage',
        createdAt: new Date(ts),
      });
      // 对应的 AI 回复（内容丢失）
      records.push({
        chatId: String(chatId),
        sender: 'assistant',
        senderName: 'AI助手',
        role: 'assistant',
        content: '[记录丢失]',
        isGroup: isGroup === 'True',
        modelName: 'deepseek-chat',
        source: 'imessage',
        createdAt: new Date(new Date(ts).getTime() + 5000), // +5s
      });
      continue;
    }

    match = line.match(regexOld);
    if (match) {
      const [, ts, sender, rawText] = match;
      let text = rawText.replace(/\.\.\.$/, '').replace(/, 图片数量=\d+$/, '').replace(/^￼/, '').trim();
      if (!text) continue;
      // 旧格式没有 chat_id，用 sender 作为 chatId
      const chatId = `legacy-${sender}`;
      const key = `${ts}-${sender}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      records.push({
        chatId,
        sender,
        senderName: usersMap[sender] || null,
        role: 'user',
        content: text,
        isGroup: false,
        source: 'imessage',
        createdAt: new Date(ts),
      });
      records.push({
        chatId,
        sender: 'assistant',
        senderName: 'AI助手',
        role: 'assistant',
        content: '[记录丢失]',
        isGroup: false,
        modelName: 'deepseek-chat',
        source: 'imessage',
        createdAt: new Date(new Date(ts).getTime() + 5000),
      });
    }
  }

  console.log(`解析到 ${records.length / 2} 条用户消息，共 ${records.length} 条记录`);

  // 批量写入
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await prisma.imessageChatLog.createMany({ data: batch });
    process.stdout.write(`\r已写入 ${Math.min(i + batchSize, records.length)} / ${records.length}`);
  }
  console.log('\n✅ 恢复完成');
}

main().catch(console.error).finally(() => prisma.$disconnect());
