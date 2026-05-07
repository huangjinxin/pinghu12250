/**
 * 日记日期边界服务
 * 处理东八区09:00为分界线的日期逻辑
 */

const TIMEZONE_OFFSET_HOURS = 8  // 东八区
const DAY_START_HOUR = 9         // 每天09:00为分界线

/**
 * 获取逻辑日期（以东八区09:00为分界线）
 * 例如：1月10日 09:00:00 ~ 1月11日 08:59:59 = "2024-01-10"
 * @param {Date|string|number} timestamp - 时间戳
 * @returns {string} 逻辑日期 YYYY-MM-DD
 */
function getLogicalDate(timestamp) {
  const date = new Date(timestamp)

  // 转换为东八区时间
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000
  const chinaTime = new Date(utcTime + TIMEZONE_OFFSET_HOURS * 3600000)

  // 减去9小时，使09:00成为日期分界线
  const adjusted = new Date(chinaTime.getTime() - DAY_START_HOUR * 3600000)

  // 返回 YYYY-MM-DD 格式
  const year = adjusted.getFullYear()
  const month = String(adjusted.getMonth() + 1).padStart(2, '0')
  const day = String(adjusted.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 获取逻辑日期的 Date 对象（用于数据库存储）
 * @param {Date|string|number} timestamp - 时间戳
 * @returns {Date} 逻辑日期的 Date 对象（设为当天00:00:00 UTC）
 */
function getLogicalDateTime(timestamp) {
  const dateStr = getLogicalDate(timestamp)
  return new Date(dateStr + 'T00:00:00.000Z')
}

/**
 * 判断是否为补交日记
 * 补交：用户手动修改了日期，使得日记日期不等于提交时的逻辑日期
 * @param {Date} submittedAt - 提交时间
 * @param {Date} diaryDate - 日记显示日期（createdAt或用户修改的日期）
 * @returns {boolean} 是否补交
 */
function isBackfill(submittedAt, diaryDate) {
  const submittedLogical = getLogicalDate(submittedAt)
  const diaryLogical = getLogicalDate(diaryDate)
  return submittedLogical !== diaryLogical
}

/**
 * 判断两个逻辑日期是否连续
 * @param {string} date1 - 日期1 YYYY-MM-DD
 * @param {string} date2 - 日期2 YYYY-MM-DD
 * @returns {boolean} 是否连续（date2 = date1 + 1天）
 */
function isConsecutive(date1, date2) {
  if (!date1 || !date2) return false

  const d1 = new Date(date1)
  const d2 = new Date(date2)

  // 计算天数差
  const diffTime = d2.getTime() - d1.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  return diffDays === 1
}

/**
 * 判断是否是昨天（用于补签卡逻辑）
 * @param {string} targetDate - 目标日期 YYYY-MM-DD
 * @param {string} currentDate - 当前日期 YYYY-MM-DD（可选，默认今天）
 * @returns {boolean} 是否是昨天
 */
function isYesterday(targetDate, currentDate = null) {
  const today = currentDate || getLogicalDate(new Date())
  const todayDate = new Date(today)
  const targetDateTime = new Date(targetDate)

  const diffTime = todayDate.getTime() - targetDateTime.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  return diffDays === 1
}

/**
 * 获取当前自然周标识
 * 自然周：周一到周日
 * @param {Date|string|number} timestamp - 时间戳（可选，默认当前时间）
 * @returns {string} 周标识 "2024-W02" 格式
 */
function getCurrentWeek(timestamp = null) {
  const date = timestamp ? new Date(timestamp) : new Date()

  // 转换为东八区时间
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000
  const chinaTime = new Date(utcTime + TIMEZONE_OFFSET_HOURS * 3600000)

  // 获取年份
  const year = chinaTime.getFullYear()

  // 计算周数（ISO 8601标准）
  const jan1 = new Date(year, 0, 1)
  const dayOfYear = Math.floor((chinaTime - jan1) / (24 * 60 * 60 * 1000)) + 1
  const jan1DayOfWeek = jan1.getDay() || 7 // 周日为7

  // 计算第几周
  let weekNumber = Math.ceil((dayOfYear + jan1DayOfWeek - 1) / 7)

  // 处理年初可能属于上一年最后一周的情况
  if (weekNumber === 0) {
    weekNumber = 52
  }

  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * 获取本周的开始日期（周一）
 * @param {Date|string|number} timestamp - 时间戳（可选，默认当前时间）
 * @returns {string} 周一日期 YYYY-MM-DD
 */
function getWeekStart(timestamp = null) {
  const date = timestamp ? new Date(timestamp) : new Date()

  // 转换为东八区时间
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000
  const chinaTime = new Date(utcTime + TIMEZONE_OFFSET_HOURS * 3600000)

  // 获取周几（0=周日，1=周一...）
  let dayOfWeek = chinaTime.getDay()
  if (dayOfWeek === 0) dayOfWeek = 7 // 周日作为7

  // 减去到周一的天数
  const monday = new Date(chinaTime)
  monday.setDate(chinaTime.getDate() - (dayOfWeek - 1))

  const year = monday.getFullYear()
  const month = String(monday.getMonth() + 1).padStart(2, '0')
  const day = String(monday.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 判断两个日期是否在同一自然周
 * @param {string} date1 - 日期1 YYYY-MM-DD
 * @param {string} date2 - 日期2 YYYY-MM-DD
 * @returns {boolean} 是否同一周
 */
function isSameWeek(date1, date2) {
  return getCurrentWeek(new Date(date1)) === getCurrentWeek(new Date(date2))
}

/**
 * 获取今天的逻辑日期
 * @returns {string} 今天的逻辑日期 YYYY-MM-DD
 */
function getToday() {
  return getLogicalDate(new Date())
}

/**
 * 计算两个日期之间的天数差
 * @param {string} date1 - 日期1 YYYY-MM-DD
 * @param {string} date2 - 日期2 YYYY-MM-DD
 * @returns {number} 天数差（date2 - date1）
 */
function getDaysDiff(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = d2.getTime() - d1.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

module.exports = {
  TIMEZONE_OFFSET_HOURS,
  DAY_START_HOUR,
  getLogicalDate,
  getLogicalDateTime,
  isBackfill,
  isConsecutive,
  isYesterday,
  getCurrentWeek,
  getWeekStart,
  isSameWeek,
  getToday,
  getDaysDiff,
}
