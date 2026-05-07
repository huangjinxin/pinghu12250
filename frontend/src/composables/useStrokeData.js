/**
 * 手写草稿笔画数据处理
 *
 * 数据结构 v2:
 * {
 *   version: 2,
 *   canvas: { width, height, dpr },
 *   strokes: [{ id, color, lineWidth, points: [{ x, y, t, p? }] }],
 *   preview?: string  // WebP 预览图 base64（缓存）
 * }
 */

import { ref } from 'vue';

// 当前数据版本
const STROKE_DATA_VERSION = 2;

/**
 * 创建笔画数据管理 composable
 */
export function useStrokeData() {
  // 当前笔画列表
  const strokes = ref([]);
  // 当前正在绘制的笔画
  const currentStroke = ref(null);
  // 画布尺寸
  const canvasSize = ref({ width: 0, height: 0, dpr: 1 });

  /**
   * 初始化画布尺寸
   */
  const initCanvas = (width, height, dpr = 1) => {
    canvasSize.value = { width, height, dpr };
  };

  /**
   * 开始新笔画
   */
  const startStroke = (x, y, options = {}) => {
    const { color = '#000000', lineWidth = 2 } = options;
    currentStroke.value = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      color,
      lineWidth,
      points: [{ x, y, t: Date.now(), p: options.pressure }]
    };
  };

  /**
   * 添加笔画点
   */
  const addPoint = (x, y, pressure) => {
    if (!currentStroke.value) return;
    currentStroke.value.points.push({
      x,
      y,
      t: Date.now(),
      p: pressure
    });
  };

  /**
   * 结束当前笔画
   */
  const endStroke = () => {
    if (currentStroke.value && currentStroke.value.points.length > 1) {
      strokes.value.push({ ...currentStroke.value });
    }
    currentStroke.value = null;
  };

  /**
   * 清除所有笔画
   */
  const clearStrokes = () => {
    strokes.value = [];
    currentStroke.value = null;
  };

  /**
   * 撤销最后一笔
   */
  const undoLastStroke = () => {
    if (strokes.value.length > 0) {
      strokes.value.pop();
    }
  };

  /**
   * 导出笔画数据（用于保存）
   */
  const exportStrokeData = () => {
    return {
      version: STROKE_DATA_VERSION,
      canvas: { ...canvasSize.value },
      strokes: strokes.value.map(s => ({
        id: s.id,
        color: s.color,
        lineWidth: s.lineWidth,
        points: s.points.map(p => ({
          x: Math.round(p.x * 100) / 100,  // 保留2位小数减少体积
          y: Math.round(p.y * 100) / 100,
          t: p.t,
          ...(p.p !== undefined && { p: p.p })
        }))
      }))
    };
  };

  /**
   * 导入笔画数据（用于加载）
   */
  const importStrokeData = (data) => {
    if (!data) return false;

    // 版本兼容处理
    if (data.version === 2) {
      canvasSize.value = data.canvas || { width: 0, height: 0, dpr: 1 };
      strokes.value = data.strokes || [];
      return true;
    }

    // v1 或无版本（旧数据）- 图片格式，无法导入笔画
    return false;
  };

  /**
   * 检查是否有笔画内容
   */
  const hasContent = () => {
    return strokes.value.length > 0;
  };

  return {
    strokes,
    currentStroke,
    canvasSize,
    initCanvas,
    startStroke,
    addPoint,
    endStroke,
    clearStrokes,
    undoLastStroke,
    exportStrokeData,
    importStrokeData,
    hasContent
  };
}

/**
 * 在 Canvas 上渲染笔画数据
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Object} strokeData - 笔画数据
 * @param {Object} options - 渲染选项
 */
export function renderStrokesToCanvas(ctx, strokeData, options = {}) {
  if (!ctx || !strokeData) return;

  const { scale = 1, offsetX = 0, offsetY = 0 } = options;

  // 清除画布（如果需要）
  if (options.clear) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  const strokesToRender = strokeData.strokes || [];

  for (const stroke of strokesToRender) {
    if (!stroke.points || stroke.points.length < 2) continue;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color || '#000000';
    ctx.lineWidth = (stroke.lineWidth || 2) * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = stroke.points;
    ctx.moveTo(points[0].x * scale + offsetX, points[0].y * scale + offsetY);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale + offsetX, points[i].y * scale + offsetY);
    }

    ctx.stroke();
  }
}

/**
 * 从笔画数据生成预览图
 * @param {Object} strokeData - 笔画数据
 * @param {Object} options - 选项
 * @returns {Promise<string>} PNG base64 字符串（透明背景）
 */
export async function generatePreviewImage(strokeData, options = {}) {
  if (!strokeData || !strokeData.strokes || strokeData.strokes.length === 0) {
    return null;
  }

  const {
    width,
    height,
    maxWidth = 400,
    maxHeight = 300,
    quality = 0.9,
    transparent = true  // 默认透明背景
  } = options;

  // 计算缩放比例
  const canvasWidth = width || strokeData.canvas?.width || 800;
  const canvasHeight = height || strokeData.canvas?.height || 600;
  const targetWidth = Math.min(canvasWidth, maxWidth);
  const targetHeight = Math.min(canvasHeight, maxHeight);
  const scaleX = targetWidth / canvasWidth;
  const scaleY = targetHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  const finalWidth = Math.round(canvasWidth * scale);
  const finalHeight = Math.round(canvasHeight * scale);

  // 创建离屏 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');

  // 填充背景（透明或白色）
  if (!transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
  }

  // 渲染笔画
  renderStrokesToCanvas(ctx, strokeData, { scale });

  // 转换为 PNG（支持透明）
  return canvas.toDataURL('image/png', quality);
}

/**
 * 检查笔记内容是否为新版笔画数据格式
 * @param {Object} content - 笔记的 content 字段
 * @returns {boolean}
 */
export function isStrokeData(content) {
  return content && content.version === STROKE_DATA_VERSION && Array.isArray(content.strokes);
}

/**
 * 检查笔记内容是否为旧版图片格式
 * @param {Object} content - 笔记的 content 字段
 * @returns {boolean}
 */
export function isLegacyImageData(content) {
  return content && typeof content.image === 'string' && content.image.startsWith('data:image');
}

/**
 * 获取草稿的预览图 URL
 * 优先使用缓存的预览图，否则返回旧版图片
 * @param {Object} content - 笔记的 content 字段
 * @returns {string|null}
 */
export function getDrawingPreviewUrl(content) {
  if (!content) return null;

  // 新版数据：使用缓存的预览图
  if (isStrokeData(content)) {
    return content.preview || null;
  }

  // 旧版数据：直接使用图片
  if (isLegacyImageData(content)) {
    return content.image;
  }

  return null;
}
