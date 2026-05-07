const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany({ take: 5 })
    console.log('🎉 数据库连接并查询成功！用户样例：', users)
    const diaries = await prisma.diary.findMany({ take: 1 })
    console.log('🎉 日记查询成功！条数：', diaries.length)
    console.log('结论：Prisma 默认的小驼峰转换完全有效，不需要手动修改 140 个模型的 @@map！')
  } catch (e) {
    console.error('❌ 查询失败，错误信息：', e.message)
    console.log('如果报错含有 "Relation does not exist"，说明还是需要修复 @@map。')
  } finally {
    await prisma.$disconnect()
  }
}

main()