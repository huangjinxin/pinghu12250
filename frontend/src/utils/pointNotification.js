/**
 * 积分通知工具 - 显示积分获得提醒
 */

import { createDiscreteApi } from 'naive-ui';

const { notification } = createDiscreteApi(['notification']);

/**
 * 显示积分获得通知
 * @param {number} earnedPoints - 获得的积分
 * @param {number} newTotalPoints - 新的总积分
 * @param {string} description - 描述信息
 */
export function showPointNotification(earnedPoints, newTotalPoints, description = '') {
  const pointsText = earnedPoints > 0 ? `+${earnedPoints}` : earnedPoints;
  const title = earnedPoints > 0 ? '🎉 恭喜你获得积分！' : '积分变动';

  notification.success({
    title,
    content: description || '继续加油！',
    meta: `${pointsText} 积分 · 当前总积分: ${newTotalPoints}`,
    duration: 3000,
  });
}

/**
 * 从API响应中检测并显示积分通知
 * @param {Object} data - API响应数据
 */
export function detectAndShowPointNotification(data) {
  if (!data) return;

  // 检查响应是否包含积分信息
  if (data.earnedPoints !== undefined && data.newTotalPoints !== undefined) {
    showPointNotification(data.earnedPoints, data.newTotalPoints, data.message || data.description);
  }

  // 检查嵌套对象 (例如 post.earnedPoints)
  if (data.post?.earnedPoints !== undefined && data.post?.newTotalPoints !== undefined) {
    showPointNotification(data.post.earnedPoints, data.post.newTotalPoints, data.message);
  }

  // 检查评论对象
  if (data.comment?.earnedPoints !== undefined && data.comment?.newTotalPoints !== undefined) {
    showPointNotification(data.comment.earnedPoints, data.comment.newTotalPoints, data.message);
  }

  // 检查日记对象
  if (data.diary?.earnedPoints !== undefined && data.diary?.newTotalPoints !== undefined) {
    showPointNotification(data.diary.earnedPoints, data.diary.newTotalPoints, data.message);
  }

  // 检查作业对象
  if (data.homework?.earnedPoints !== undefined && data.homework?.newTotalPoints !== undefined) {
    showPointNotification(data.homework.earnedPoints, data.homework.newTotalPoints, data.message);
  }

  // 检查笔记对象
  if (data.note?.earnedPoints !== undefined && data.note?.newTotalPoints !== undefined) {
    showPointNotification(data.note.earnedPoints, data.note.newTotalPoints, data.message);
  }

  // 检查读书笔记对象
  if (data.readingNote?.earnedPoints !== undefined && data.readingNote?.newTotalPoints !== undefined) {
    showPointNotification(data.readingNote.earnedPoints, data.readingNote.newTotalPoints, data.message);
  }

  // 检查HTML作品对象
  if (data.work?.earnedPoints !== undefined && data.work?.newTotalPoints !== undefined) {
    showPointNotification(data.work.earnedPoints, data.work.newTotalPoints, data.message);
  }

  // 检查任务对象
  if (data.task?.earnedPoints !== undefined && data.task?.newTotalPoints !== undefined) {
    showPointNotification(data.task.earnedPoints, data.task.newTotalPoints, data.message);
  }
}
