/**
 * EPUB 电子书解析服务
 *
 * 功能：
 * - 解压 EPUB 文件
 * - 解析 OPF/NCX 获取目录结构
 * - 提取封面图
 * - 获取章节 HTML 内容
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { DOMParser } = require('@xmldom/xmldom');

// EPUB 存储目录（与 PDF 共用）
const epubDir = process.env.PDF_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/books-ai';
// EPUB 解压缓存目录
const extractDir = path.join(epubDir, '.epub-cache');

// 确保缓存目录存在
if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir, { recursive: true });
}

/**
 * 解析 EPUB 文件，提取元数据和目录
 * @param {string} epubPath - EPUB 文件路径
 * @returns {Promise<{metadata, chapters, coverPath}>}
 */
async function parseEpub(epubPath) {
  const zip = new AdmZip(epubPath);
  const epubId = path.basename(epubPath, '.epub');
  const cacheDir = path.join(extractDir, epubId);

  // 解压到缓存目录
  if (!fs.existsSync(cacheDir)) {
    zip.extractAllTo(cacheDir, true);
  }

  // 1. 读取 container.xml 获取 OPF 路径
  const containerXml = zip.readAsText('META-INF/container.xml');
  const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
  const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0];
  const opfPath = rootfileEl.getAttribute('full-path');
  const opfDir = path.dirname(opfPath);

  // 2. 读取 OPF 文件
  const opfXml = zip.readAsText(opfPath);
  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');

  // 3. 提取元数据
  const metadata = extractMetadata(opfDoc);

  // 4. 构建章节列表（从 spine 获取阅读顺序）
  const chapters = extractChapters(opfDoc, zip, opfDir, cacheDir);

  // 5. 尝试从 NCX 或 NAV 获取目录标题
  enrichChaptersWithToc(opfDoc, zip, opfDir, chapters);

  // 6. 提取封面（优先从元数据，其次从第一章提取图片）
  let coverPath = extractCover(opfDoc, zip, opfDir, cacheDir);
  if (!coverPath && chapters.length > 0) {
    // 尝试从第一章提取封面图
    coverPath = extractCoverFromFirstChapter(zip, opfDir, chapters[0], cacheDir);
  }

  return {
    metadata,
    chapters,
    coverPath,
    cacheDir
  };
}

/**
 * 提取元数据
 */
function extractMetadata(opfDoc) {
  const getTextContent = (tagName) => {
    const el = opfDoc.getElementsByTagName(tagName)[0] ||
               opfDoc.getElementsByTagName(`dc:${tagName}`)[0];
    return el ? el.textContent : null;
  };

  return {
    title: getTextContent('title'),
    creator: getTextContent('creator'),
    language: getTextContent('language'),
    publisher: getTextContent('publisher'),
    identifier: getTextContent('identifier'),
    description: getTextContent('description')
  };
}

/**
 * 提取封面图片
 */
function extractCover(opfDoc, zip, opfDir, cacheDir) {
  // 方法1: 查找 meta name="cover"
  const metaTags = opfDoc.getElementsByTagName('meta');
  let coverId = null;
  for (let i = 0; i < metaTags.length; i++) {
    if (metaTags[i].getAttribute('name') === 'cover') {
      coverId = metaTags[i].getAttribute('content');
      break;
    }
  }

  // 方法2: 查找 properties="cover-image"
  if (!coverId) {
    const items = opfDoc.getElementsByTagName('item');
    for (let i = 0; i < items.length; i++) {
      if (items[i].getAttribute('properties') === 'cover-image') {
        coverId = items[i].getAttribute('id');
        break;
      }
    }
  }

  if (!coverId) return null;

  // 根据 ID 查找实际文件
  const items = opfDoc.getElementsByTagName('item');
  for (let i = 0; i < items.length; i++) {
    if (items[i].getAttribute('id') === coverId) {
      const href = items[i].getAttribute('href');
      const coverSrc = path.join(opfDir, href);
      const coverDest = path.join(cacheDir, 'cover' + path.extname(href));

      try {
        const coverData = zip.readFile(coverSrc);
        if (coverData) {
          fs.writeFileSync(coverDest, coverData);
          return coverDest;
        }
      } catch (e) {
        console.warn('提取封面失败:', e.message);
      }
      break;
    }
  }

  return null;
}

/**
 * 从第一章 HTML 中提取封面图片
 */
function extractCoverFromFirstChapter(zip, opfDir, chapter, cacheDir) {
  try {
    const chapterPath = path.join(opfDir, chapter.href);
    const chapterHtml = zip.readAsText(chapterPath);
    if (!chapterHtml) return null;

    // 查找第一个 img 标签
    const imgMatch = chapterHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (!imgMatch) return null;

    const imgSrc = imgMatch[1];
    const chapterDir = path.dirname(chapterPath);
    const imagePath = imgSrc.startsWith('/')
      ? imgSrc.substring(1)
      : path.join(chapterDir, imgSrc).replace(/\\/g, '/');

    const imageData = zip.readFile(imagePath);
    if (!imageData) return null;

    const coverDest = path.join(cacheDir, 'cover' + path.extname(imgSrc));
    fs.writeFileSync(coverDest, imageData);
    return coverDest;
  } catch (e) {
    console.warn('从第一章提取封面失败:', e.message);
    return null;
  }
}

/**
 * 从 spine 提取章节列表
 */
function extractChapters(opfDoc, zip, opfDir, cacheDir) {
  const chapters = [];

  // 构建 manifest id -> href 映射
  const manifest = {};
  const items = opfDoc.getElementsByTagName('item');
  for (let i = 0; i < items.length; i++) {
    const id = items[i].getAttribute('id');
    const href = items[i].getAttribute('href');
    const mediaType = items[i].getAttribute('media-type');
    manifest[id] = { href, mediaType };
  }

  // 按 spine 顺序获取章节
  const spineItems = opfDoc.getElementsByTagName('itemref');
  for (let i = 0; i < spineItems.length; i++) {
    const idref = spineItems[i].getAttribute('idref');
    const item = manifest[idref];

    if (item && (item.mediaType === 'application/xhtml+xml' ||
                 item.mediaType === 'text/html')) {
      const chapterId = idref;
      const href = item.href;

      chapters.push({
        id: chapterId,
        href: href,
        title: `Chapter ${i + 1}`, // 默认标题，后续从 TOC 获取
        order: i
      });
    }
  }

  return chapters;
}

/**
 * 从 NCX 或 NAV 获取章节标题
 */
function enrichChaptersWithToc(opfDoc, zip, opfDir, chapters) {
  // 查找 NCX 或 NAV 文件
  const items = opfDoc.getElementsByTagName('item');
  let tocHref = null;
  let tocType = null;

  for (let i = 0; i < items.length; i++) {
    const mediaType = items[i].getAttribute('media-type');
    const properties = items[i].getAttribute('properties') || '';

    if (mediaType === 'application/x-dtbncx+xml') {
      tocHref = items[i].getAttribute('href');
      tocType = 'ncx';
      break;
    }
    if (properties.includes('nav')) {
      tocHref = items[i].getAttribute('href');
      tocType = 'nav';
      break;
    }
  }

  if (!tocHref) return;

  try {
    const tocPath = path.join(opfDir, tocHref);
    const tocXml = zip.readAsText(tocPath);
    const tocDoc = new DOMParser().parseFromString(tocXml, 'text/xml');

    // 构建 href -> title 映射
    const hrefToTitle = {};

    if (tocType === 'ncx') {
      // 解析 NCX 格式
      const navPoints = tocDoc.getElementsByTagName('navPoint');
      for (let i = 0; i < navPoints.length; i++) {
        const label = navPoints[i].getElementsByTagName('navLabel')[0];
        const content = navPoints[i].getElementsByTagName('content')[0];
        if (label && content) {
          const title = label.getElementsByTagName('text')[0]?.textContent;
          let src = content.getAttribute('src');
          // 移除锚点
          src = src.split('#')[0];
          if (title && src) {
            hrefToTitle[src] = title;
          }
        }
      }
    } else if (tocType === 'nav') {
      // 解析 EPUB3 NAV 格式
      const navEls = tocDoc.getElementsByTagName('nav');
      for (let n = 0; n < navEls.length; n++) {
        const navEl = navEls[n];
        if (navEl.getAttribute('epub:type') === 'toc' ||
            navEl.getAttribute('role') === 'doc-toc') {
          const links = navEl.getElementsByTagName('a');
          for (let i = 0; i < links.length; i++) {
            let href = links[i].getAttribute('href');
            const title = links[i].textContent?.trim();
            href = href.split('#')[0];
            if (title && href) {
              hrefToTitle[href] = title;
            }
          }
        }
      }
    }

    // 更新章节标题
    for (const chapter of chapters) {
      if (hrefToTitle[chapter.href]) {
        chapter.title = hrefToTitle[chapter.href];
      }
    }
  } catch (e) {
    console.warn('解析目录失败:', e.message);
  }
}

/**
 * 获取章节 HTML 内容
 * @param {string} epubPath - EPUB 文件路径
 * @param {string} chapterId - 章节 ID
 * @returns {Promise<string>} - 净化后的 HTML
 */
async function getChapterContent(epubPath, chapterId) {
  const zip = new AdmZip(epubPath);
  const epubId = path.basename(epubPath, '.epub');
  const cacheDir = path.join(extractDir, epubId);

  // 读取 OPF 获取章节路径
  const containerXml = zip.readAsText('META-INF/container.xml');
  const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
  const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0];
  const opfPath = rootfileEl.getAttribute('full-path');
  const opfDir = path.dirname(opfPath);

  const opfXml = zip.readAsText(opfPath);
  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');

  // 查找章节
  const items = opfDoc.getElementsByTagName('item');
  let chapterHref = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].getAttribute('id') === chapterId) {
      chapterHref = items[i].getAttribute('href');
      break;
    }
  }

  if (!chapterHref) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }

  const chapterPath = path.join(opfDir, chapterHref);
  const chapterDir = path.dirname(chapterPath);
  const chapterHtml = zip.readAsText(chapterPath);

  // 净化 HTML 并内联图片
  return sanitizeHtml(chapterHtml, zip, opfDir, chapterDir);
}

/**
 * 净化章节 HTML 并将图片转为 base64 内联
 */
function sanitizeHtml(html, zip, opfDir, chapterDir) {
  // 移除 script 标签
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 移除 on* 事件属性
  html = html.replace(/\s+on\w+="[^"]*"/gi, '');
  html = html.replace(/\s+on\w+='[^']*'/gi, '');

  // 提取 body 内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }

  // 处理 <img> 标签中的图片
  html = html.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    const base64 = getImageBase64(zip, opfDir, chapterDir, src);
    if (base64) {
      return `<img${before} src="${base64}"${after}>`;
    }
    return match;
  });

  // 处理 SVG 中的 xlink:href 图片引用
  html = html.replace(/xlink:href=["']([^"']+)["']/gi, (match, src) => {
    const base64 = getImageBase64(zip, opfDir, chapterDir, src);
    if (base64) {
      return `xlink:href="${base64}"`;
    }
    return match;
  });

  // 处理 CSS background-image: url()
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, src) => {
    // 跳过 data: 开头的已经是 base64 的
    if (src.startsWith('data:')) return match;
    const base64 = getImageBase64(zip, opfDir, chapterDir, src);
    if (base64) {
      return `url("${base64}")`;
    }
    return match;
  });

  return html;
}

/**
 * 从 EPUB 中读取图片并转为 base64
 */
function getImageBase64(zip, opfDir, chapterDir, src) {
  // 跳过外部链接和 data URL
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return null;
  }

  try {
    // 计算图片在 EPUB 中的路径
    let imagePath;
    if (src.startsWith('/')) {
      // 绝对路径
      imagePath = src.substring(1);
    } else if (src.startsWith('../')) {
      // 相对于章节目录的上级目录
      imagePath = path.join(chapterDir, src);
    } else {
      // 相对于章节目录
      imagePath = path.join(chapterDir, src);
    }

    // 规范化路径
    imagePath = imagePath.replace(/\\/g, '/');

    // 尝试读取图片
    const imageData = zip.readFile(imagePath);
    if (!imageData) {
      // 尝试从 OPF 目录读取
      const altPath = path.join(opfDir, src).replace(/\\/g, '/');
      const altData = zip.readFile(altPath);
      if (!altData) {
        console.warn('Image not found:', imagePath, 'or', altPath);
        return null;
      }
      return bufferToDataUrl(altData, src);
    }

    return bufferToDataUrl(imageData, src);
  } catch (e) {
    console.warn('Failed to read image:', src, e.message);
    return null;
  }
}

/**
 * 将图片 Buffer 转为 data URL
 */
function bufferToDataUrl(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * 清理 EPUB 缓存
 * @param {string} epubPath - EPUB 文件路径
 */
async function clearCache(epubPath) {
  const epubId = path.basename(epubPath, '.epub');
  const cacheDir = path.join(extractDir, epubId);

  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
}

/**
 * 删除 EPUB 文件及其缓存
 * @param {string} epubPath - EPUB 文件路径
 */
async function deleteEpub(epubPath) {
  // 删除缓存
  await clearCache(epubPath);

  // 删除文件
  if (fs.existsSync(epubPath)) {
    fs.unlinkSync(epubPath);
  }
}

module.exports = {
  parseEpub,
  getChapterContent,
  clearCache,
  deleteEpub
};
