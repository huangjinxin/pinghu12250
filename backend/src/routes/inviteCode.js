const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');

/**
 * 获取邀请积分消耗设置
 */
router.get('/cost-settings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [parentSetting, classmateSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'parent_invite_cost' } }),
      prisma.systemSetting.findUnique({ where: { key: 'classmate_invite_cost' } }),
    ]);

    res.json({
      success: true,
      data: {
        parentInviteCost: parentSetting ? parseInt(parentSetting.value) : 10,
        classmateInviteCost: classmateSetting ? parseInt(classmateSetting.value) : 5,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 保存邀请积分消耗设置
 */
router.put('/cost-settings', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { parentInviteCost, classmateInviteCost } = req.body;

    await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: 'parent_invite_cost' },
        update: { value: String(parentInviteCost), type: 'number', description: '邀请家长消耗积分' },
        create: { key: 'parent_invite_cost', value: String(parentInviteCost), type: 'number', description: '邀请家长消耗积分' },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'classmate_invite_cost' },
        update: { value: String(classmateInviteCost), type: 'number', description: '邀请同学消耗积分' },
        create: { key: 'classmate_invite_cost', value: String(classmateInviteCost), type: 'number', description: '邀请同学消耗积分' },
      }),
    ]);

    res.json({ success: true, message: '设置已保存' });
  } catch (error) {
    next(error);
  }
});

/**
 * 生成邀请码（管理员/老师）
 */
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), async (req, res, next) => {
  try {
    const { count = 1, maxUses = 1, expiresInHours = 24, role, classId } = req.body;

    const codes = [];
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    for (let i = 0; i < count; i++) {
      const code = await prisma.inviteCode.create({
        data: {
          createdBy: req.user.id,
          maxUses,
          expiresAt,
          role,
          classId,
          inviteType: 'ADMIN',
        },
      });
      codes.push(code);
    }

    res.json({ success: true, data: codes });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取邀请码列表
 */
router.get('/', authenticate, authorize('ADMIN', 'TEACHER'), async (req, res, next) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { createdBy: req.user.id };

    const codes = await prisma.inviteCode.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            profile: { select: { nickname: true } },
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            profile: { select: { nickname: true } },
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: codes });
  } catch (error) {
    next(error);
  }
});

/**
 * 删除邀请码
 */
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), async (req, res, next) => {
  try {
    await prisma.inviteCode.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ success: true, message: '邀请码已删除' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
