/**
 * 诗词封面生成服务
 * 从 HTML 代码中提取诗词内容并生成封面图片
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 封面目录
const COVER_DIR = path.join(__dirname, '../../uploads/poetry-covers');

// 确保目录存在
if (!fs.existsSync(COVER_DIR)) {
  fs.mkdirSync(COVER_DIR, { recursive: true });
}

/**
 * 从 HTML 中提取诗词内容
 * @param {string} htmlCode - 诗词 HTML 代码
 * @returns {Object} 提取的内容 { title, author, lines }
 */
function extractPoetryContent(htmlCode) {
  const result = {
    title: '',
    author: '',
    lines: []
  };

  // 移除 HTML 标签，但保留文本
  const stripTags = (html) => html.replace(/<[^>]*>/g, '');

  // 提取标题 - 尝试多种模式
  const titlePatterns = [
    /<div[^>]*class="[^"]*poem-title[^"]*"[^>]*>(.*?)<\/div>/is,
    /<h1[^>]*>(.*?)<\/h1>/is,
    /<h2[^>]*>(.*?)<\/h2>/is,
    /<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/is,
  ];

  for (const pattern of titlePatterns) {
    const titleMatch = htmlCode.match(pattern);
    if (titleMatch) {
      result.title = stripTags(titleMatch[1]).trim();
      break;
    }
  }

  // 提取作者
  const authorPatterns = [
    /<div[^>]*class="[^"]*poem-author[^"]*"[^>]*>(.*?)<\/div>/is,
    /<span[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/span>/is,
    /【(.*?)】/,
    /（(.*?)）/,
  ];

  for (const pattern of authorPatterns) {
    const authorMatch = htmlCode.match(pattern);
    if (authorMatch) {
      result.author = stripTags(authorMatch[1]).trim();
      break;
    }
  }

  // 提取诗句 - 尝试多种模式
  const linePatterns = [
    /<div[^>]*class="[^"]*poem-line[^"]*"[^>]*>(.*?)<\/div>/gis,
    /<p[^>]*class="[^"]*line[^"]*"[^>]*>(.*?)<\/p>/gis,
    /<p[^>]*>(.*?)<\/p>/gis,
  ];

  for (const pattern of linePatterns) {
    const matches = htmlCode.matchAll(pattern);
    for (const match of matches) {
      // 提取纯文本，移除拼音(ruby rt标签内容)
      let text = match[1];
      // 移除 rt 标签（拼音）
      text = text.replace(/<rt[^>]*>.*?<\/rt>/gi, '');
      // 移除其他标签
      text = stripTags(text).trim();
      if (text && text.length > 0 && !text.includes('class=')) {
        result.lines.push(text);
      }
    }
    if (result.lines.length > 0) break;
  }

  // 如果没找到结构化内容，尝试直接提取纯文本
  if (result.lines.length === 0) {
    let text = htmlCode;
    text = text.replace(/<rt[^>]*>.*?<\/rt>/gi, '');
    text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
    text = text.replace(/<script[^>]*>.*?<\/script>/gis, '');
    text = stripTags(text);

    // 按标点分行
    const parts = text.split(/[，。！？、；：\n]/);
    result.lines = parts
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.length < 50);
  }

  return result;
}

/**
 * 生成诗词封面图片
 * @param {string} htmlCode - 诗词 HTML 代码
 * @param {string} title - 作品标题
 * @param {string} workId - 作品 ID
 * @returns {Promise<string>} 封面图片路径
 */
async function generatePoetryCover(htmlCode, title, workId) {
  const content = extractPoetryContent(htmlCode);

  // 如果没提取到标题，使用传入的标题
  if (!content.title && title) {
    content.title = title;
  }

  // 封面尺寸 (3:2 比例，与 iOS 端一致)
  const width = 480;
  const height = 320;

  // 创建 SVG
  const svg = createPoetrySvg(content, width, height);

  // 生成文件名
  const filename = `${workId}-${Date.now()}.png`;
  const filepath = path.join(COVER_DIR, filename);

  // 使用 sharp 渲染 SVG 为 PNG
  await sharp(Buffer.from(svg))
    .png()
    .toFile(filepath);

  return `/uploads/poetry-covers/${filename}`;
}

/**
 * 创建诗词封面 SVG
 */
function createPoetrySvg(content, width, height) {
  const { title, author, lines } = content;

  // 渐变背景色
  const gradientStart = '#667eea';
  const gradientEnd = '#764ba2';

  // 计算文字位置
  const padding = 30;
  const titleFontSize = 28;
  const authorFontSize = 16;
  const lineFontSize = 18;
  const lineHeight = 28;

  // 构建诗句文本
  let linesY = 90;
  const displayLines = lines.slice(0, 6); // 最多显示6行

  const linesSvg = displayLines.map((line, i) => {
    const y = linesY + i * lineHeight;
    // 转义特殊字符
    const escapedLine = escapeXml(line);
    return `<text x="${width/2}" y="${y}" font-size="${lineFontSize}" fill="white" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif">${escapedLine}</text>`;
  }).join('\n');

  // 标题位置
  const titleY = 45;
  const authorY = linesY + displayLines.length * lineHeight + 25;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${width}" height="${height}" fill="url(#bg)" rx="12" ry="12"/>

  <!-- 装饰线 -->
  <line x1="${padding}" y1="60" x2="${width-padding}" y2="60" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <line x1="${padding}" y1="${height-60}" x2="${width-padding}" y2="${height-60}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>

  <!-- 标题 -->
  <text x="${width/2}" y="${titleY}" font-size="${titleFontSize}" fill="white" text-anchor="middle" font-weight="bold" font-family="PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(title || '诗词作品')}</text>

  <!-- 诗句 -->
  ${linesSvg}

  <!-- 作者 -->
  ${author ? `<text x="${width/2}" y="${height - 30}" font-size="${authorFontSize}" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(author)}</text>` : ''}
</svg>`;

  return svg;
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 删除封面图片
 */
async function deletePoetryCover(coverPath) {
  if (!coverPath) return;

  const filename = coverPath.replace('/uploads/poetry-covers/', '');
  const filepath = path.join(COVER_DIR, filename);

  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('删除封面失败:', error);
  }
}

module.exports = {
  generatePoetryCover,
  deletePoetryCover,
  extractPoetryContent
};
