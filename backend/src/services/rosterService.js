const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BATCH_PREFIX = `import_${new Date().toISOString().split('T')[0]}`;

const GRADE_MAP = { '1': '一年级', '2': '二年级', '3': '三年级', '4': '四年级', '5': '五年级', '6': '六年级', '7': '七年级', '8': '八年级', '9': '九年级' };

function toChineseGrade(g) {
  return GRADE_MAP[String(g)] || String(g);
}

function toChineseClass(c) {
  return String(c).includes('班') ? String(c) : `${c}班`;
}

function generatePlaceholderEmail(index) {
  return `import_${Date.now()}_${index}_${crypto.randomBytes(3).toString('hex')}@placeholder.local`;
}

function generatePlaceholderUsername(index) {
  return `${BATCH_PREFIX}_${String(index).padStart(4, '0')}`;
}

async function findOrCreateSchool(name) {
  let school = await prisma.school.findUnique({ where: { name } });
  if (!school) {
    school = await prisma.school.create({ data: { name } });
  }
  return school;
}

async function findOrCreateClass(schoolId, grade, className) {
  const g = toChineseGrade(grade);
  const c = toChineseClass(className);
  let cls = await prisma.class.findFirst({
    where: { schoolId, grade: g, name: c }
  });
  if (!cls) {
    cls = await prisma.class.create({
      data: { name: c, grade: g, schoolId }
    });
  }
  return cls;
}

/**
 * 导入名单到 PENDING 用户
 * @param {Array} entries - [{ name, school, grade, class }]
 * @returns {{ created: number, skipped: number, errors: string[] }}
 */
async function importRoster(entries) {
  const result = { created: 0, skipped: 0, errors: [], users: [] };

  // 按 (name, school, grade, class) 去重
  const seen = new Set();
  const uniqueEntries = [];
  for (const e of entries) {
    const key = `${e.name}|${e.school}|${e.grade}|${e.class}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(e);
    }
  }

  const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

  for (let i = 0; i < uniqueEntries.length; i++) {
    const entry = uniqueEntries[i];
    try {
      const school = await findOrCreateSchool(entry.school);
      const cls = await findOrCreateClass(school.id, entry.grade, entry.class);

      const existing = await prisma.user.findFirst({
        where: {
          status: 'PENDING',
          realName: entry.name,
          classId: cls.id
        }
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      const user = await prisma.user.create({
        data: {
          username: generatePlaceholderUsername(i + 1),
          email: generatePlaceholderEmail(i + 1),
          password: hashedPassword,
          realName: entry.name,
          role: 'STUDENT',
          status: 'PENDING',
          schoolId: school.id,
          classId: cls.id
        }
      });

      result.created++;
      result.users.push({ id: user.id, realName: user.realName, school: entry.school, grade: entry.grade, class: entry.class });
    } catch (err) {
      result.errors.push(`${entry.name}(${entry.school} ${entry.grade}年级${entry.class}班): ${err.message}`);
    }
  }

  return result;
}

/**
 * 查询所有已导入的 PENDING 学生
 */
async function getPendingStudents(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'PENDING', role: 'STUDENT' },
      select: {
        id: true, realName: true, username: true, createdAt: true,
        school: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, grade: true } }
      },
      skip, take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: { status: 'PENDING', role: 'STUDENT' } })
  ]);
  return { students, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { importRoster, getPendingStudents };
