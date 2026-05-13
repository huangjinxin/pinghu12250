const rosterService = require('../services/rosterService');

exports.importRoster = async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: '请提供名单数据 (entries 数组)' });
    }

    // 校验每条记录
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.name || !e.school) {
        return res.status(400).json({ success: false, error: `第${i + 1}条数据缺少姓名或学校` });
      }
      if (e.grade === undefined || e.grade === null || e.class === undefined || e.class === null) {
        e.grade = e.grade || 1;
        e.class = e.class || 1;
      }
    }

    const result = await rosterService.importRoster(entries);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getPendingStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await rosterService.getPendingStudents(page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
