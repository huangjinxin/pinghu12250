/**
 * 笔画指标计算 composable
 * 用于计算练字记录的各项分析指标
 */

/**
 * 计算两点之间的距离
 */
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * 计算笔画总长度
 */
function calculateStrokeLength(points) {
  if (points.length < 2) return 0;

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return Math.round(length * 100) / 100;
}

/**
 * 计算笔画抖动程度（0-100，越低越抖）
 * 通过分析相邻点的方向变化来评估
 */
function calculateJitter(points) {
  if (points.length < 3) return 0;

  let totalAngleChange = 0;
  let segmentCount = 0;

  for (let i = 2; i < points.length; i++) {
    const p1 = points[i - 2];
    const p2 = points[i - 1];
    const p3 = points[i];

    // 计算两个向量
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    // 计算向量长度
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 > 0.1 && len2 > 0.1) {
      // 计算夹角（使用点积）
      const dot = v1.x * v2.x + v1.y * v2.y;
      const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
      const angle = Math.acos(cosAngle) * (180 / Math.PI);

      totalAngleChange += angle;
      segmentCount++;
    }
  }

  if (segmentCount === 0) return 0;

  // 平均角度变化，转换为0-100分数
  const avgAngleChange = totalAngleChange / segmentCount;
  // 角度变化越小，分数越高（越稳定）
  // 假设20度以下为很稳定，60度以上为很抖
  const jitterScore = Math.max(0, Math.min(100, 100 - (avgAngleChange - 5) * 2.5));

  return Math.round(jitterScore);
}

/**
 * 计算笔画之间的停顿
 */
function calculatePauses(strokes) {
  const pauses = [];

  for (let i = 1; i < strokes.length; i++) {
    const prevStroke = strokes[i - 1];
    const currStroke = strokes[i];

    if (prevStroke.points.length > 0 && currStroke.points.length > 0) {
      const prevEnd = prevStroke.points[prevStroke.points.length - 1];
      const currStart = currStroke.points[0];

      const pauseDuration = currStart.t - prevEnd.t;
      if (pauseDuration > 100) {  // 超过100ms算停顿
        pauses.push(pauseDuration);
      }
    }
  }

  return pauses;
}

/**
 * 计算完整的笔画指标
 * @param {Object} strokeData - 笔画数据（version 2格式）
 * @returns {Object} 计算后的指标
 */
export function calculateStrokeMetrics(strokeData) {
  if (!strokeData || !strokeData.strokes) {
    return null;
  }

  const strokes = strokeData.strokes || [];
  const strokeMetrics = [];
  let totalLength = 0;
  let totalDuration = 0;
  let firstPointTime = Infinity;
  let lastPointTime = 0;

  // 计算每笔的指标
  strokes.forEach((stroke, index) => {
    const points = stroke.points || [];
    if (points.length < 2) return;

    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const duration = endPoint.t - startPoint.t;
    const length = calculateStrokeLength(points);
    const jitterScore = calculateJitter(points);

    // 更新全局时间范围
    if (startPoint.t < firstPointTime) firstPointTime = startPoint.t;
    if (endPoint.t > lastPointTime) lastPointTime = endPoint.t;

    totalLength += length;
    totalDuration += duration;

    strokeMetrics.push({
      index: index + 1,
      startPoint: {
        x: Math.round(startPoint.x),
        y: Math.round(startPoint.y)
      },
      endPoint: {
        x: Math.round(endPoint.x),
        y: Math.round(endPoint.y)
      },
      length: Math.round(length),
      duration: Math.round(duration),
      avgSpeed: duration > 0 ? Math.round(length / (duration / 1000)) : 0,
      jitterScore: jitterScore,
      pointCount: points.length
    });
  });

  // 计算停顿
  const pauses = calculatePauses(strokes);
  const pauseCount = pauses.length;
  const maxPauseDuration = pauses.length > 0 ? Math.max(...pauses) : 0;
  const avgPauseDuration = pauses.length > 0
    ? Math.round(pauses.reduce((a, b) => a + b, 0) / pauses.length)
    : 0;

  // 计算整体稳定性分数（所有笔画jitter分数的加权平均）
  const totalJitter = strokeMetrics.reduce((sum, s) => sum + s.jitterScore * s.length, 0);
  const overallStability = totalLength > 0
    ? Math.round(totalJitter / totalLength)
    : 0;

  // 计算整体时长（从第一笔开始到最后一笔结束）
  const overallDuration = lastPointTime - firstPointTime;

  return {
    totalStrokes: strokes.length,
    strokes: strokeMetrics,
    totalLength: Math.round(totalLength),
    totalDuration: Math.round(totalDuration),
    overallDuration: Math.round(overallDuration),
    avgStrokeSpeed: totalDuration > 0
      ? Math.round(totalLength / (totalDuration / 1000))
      : 0,
    pauseCount,
    maxPauseDuration: Math.round(maxPauseDuration),
    avgPauseDuration,
    stabilityScore: overallStability,
    canvasSize: strokeData.canvas || { width: 300, height: 300 }
  };
}

/**
 * Vue Composable 版本
 */
export function useStrokeMetrics() {
  return {
    calculateMetrics: calculateStrokeMetrics,
    calculateStrokeLength,
    calculateJitter,
    calculatePauses
  };
}

export default useStrokeMetrics;
