/**
 * 全局标签系统种子数据
 * 初始化官方标签
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 颜色方案
const colors = {
  SUBJECT: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'],
  SKILL: ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'],
  PROGRAMMING: ['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95'],
  INTEREST: ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F'],
  OTHER: ['#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'],
};

// 官方标签数据
const officialTags = [
  // 学科类
  { name: '数学', category: 'SUBJECT' },
  { name: '语文', category: 'SUBJECT' },
  { name: '英语', category: 'SUBJECT' },
  { name: '物理', category: 'SUBJECT' },
  { name: '化学', category: 'SUBJECT' },
  { name: '生物', category: 'SUBJECT' },
  { name: '历史', category: 'SUBJECT' },
  { name: '地理', category: 'SUBJECT' },
  { name: '政治', category: 'SUBJECT' },
  { name: '音乐', category: 'SUBJECT' },
  { name: '美术', category: 'SUBJECT' },
  { name: '体育', category: 'SUBJECT' },

  // 技能类
  { name: '编程', category: 'SKILL' },
  { name: '绘画', category: 'SKILL' },
  { name: '写作', category: 'SKILL' },
  { name: '演讲', category: 'SKILL' },
  { name: '运动', category: 'SKILL' },
  { name: '阅读', category: 'SKILL' },
  { name: '思维导图', category: 'SKILL' },
  { name: '手工制作', category: 'SKILL' },
  { name: '摄影', category: 'SKILL' },
  { name: '视频剪辑', category: 'SKILL' },

  // 编程类
  { name: 'HTML', category: 'PROGRAMMING' },
  { name: 'CSS', category: 'PROGRAMMING' },
  { name: 'JavaScript', category: 'PROGRAMMING' },
  { name: 'Python', category: 'PROGRAMMING' },
  { name: 'Scratch', category: 'PROGRAMMING' },
  { name: '游戏开发', category: 'PROGRAMMING' },
  { name: 'Web开发', category: 'PROGRAMMING' },
  { name: '算法', category: 'PROGRAMMING' },
  { name: '数据结构', category: 'PROGRAMMING' },
  { name: '前端开发', category: 'PROGRAMMING' },
  { name: '后端开发', category: 'PROGRAMMING' },

  // 兴趣类
  { name: '科学实验', category: 'INTEREST' },
  { name: '探索发现', category: 'INTEREST' },
  { name: '创意设计', category: 'INTEREST' },
  { name: '机器人', category: 'INTEREST' },
  { name: '天文观测', category: 'INTEREST' },
  { name: '自然观察', category: 'INTEREST' },
  { name: '手工艺术', category: 'INTEREST' },
  { name: '烹饪美食', category: 'INTEREST' },
  { name: '音乐欣赏', category: 'INTEREST' },
  { name: '电影评论', category: 'INTEREST' },

  // 其他
  { name: '日常记录', category: 'OTHER' },
  { name: '思考总结', category: 'OTHER' },
  { name: '成长日记', category: 'OTHER' },
  { name: '挑战自我', category: 'OTHER' },
  { name: '学习方法', category: 'OTHER' },
  { name: '心情日记', category: 'OTHER' },
  { name: '目标计划', category: 'OTHER' },
  { name: '读书笔记', category: 'OTHER' },
  { name: '观影笔记', category: 'OTHER' },
  { name: '游戏评测', category: 'OTHER' },
];

// 获取随机颜色
function getRandomColor(category) {
  const colorArray = colors[category] || colors.OTHER;
  return colorArray[Math.floor(Math.random() * colorArray.length)];
}

async function main() {
  console.log('开始初始化全局标签系统...');

  let createdCount = 0;
  let updatedCount = 0;

  for (const tagData of officialTags) {
    try {
      const color = getRandomColor(tagData.category);

      const existing = await prisma.globalTag.findUnique({
        where: { name: tagData.name },
      });

      if (existing) {
        // 更新为官方标签
        await prisma.globalTag.update({
          where: { id: existing.id },
          data: {
            category: tagData.category,
            color,
            isOfficial: true,
          },
        });
        updatedCount++;
      } else {
        // 创建新标签
        await prisma.globalTag.create({
          data: {
            name: tagData.name,
            category: tagData.category,
            color,
            isOfficial: true,
            useCount: 0,
          },
        });
        createdCount++;
      }
    } catch (error) {
      console.error(`处理标签 "${tagData.name}" 失败:`, error.message);
    }
  }

  console.log(`✓ 创建了 ${createdCount} 个官方标签`);
  console.log(`✓ 更新了 ${updatedCount} 个现有标签为官方标签`);
  console.log('全局标签系统初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
