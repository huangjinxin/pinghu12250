const prisma = require('../src/lib/prisma');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { calligraphyPreviewDir, calligraphyCharDir } = require('../src/middleware/upload');

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

function getImageExtension(mimeType = '') {
  const map = {
    'image/png': '.png',
    'image/webp': '.webp',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif'
  };
  return map[mimeType.toLowerCase()] || '.png';
}

async function ensureDataUrlFile(dataUrl, dir, prefix) {
  if (typeof dataUrl !== 'string') return dataUrl || null;
  if (dataUrl.startsWith('/uploads/')) return dataUrl;

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;

  const hash = crypto.createHash('sha1').update(parsed.buffer).digest('hex');
  const ext = getImageExtension(parsed.mimeType);
  const fileName = `${prefix}-${hash}${ext}`;
  const filePath = path.join(dir, fileName);

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, parsed.buffer);
  }

  const uploadsRoot = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const relativeDir = path.relative(uploadsRoot, dir).replace(/\\/g, '/');
  return `/uploads/${relativeDir}/${fileName}`;
}

async function main() {
  const works = await prisma.calligraphyWork.findMany({
    select: { id: true, preview: true, previewUrl: true, content: true }
  });

  let updatedWorks = 0;
  let migratedPreviews = 0;
  let migratedChars = 0;
  let skippedWorks = 0;
  let failedWorks = 0;

  for (const work of works) {
    try {
      let changed = false;
      let nextPreviewUrl = work.previewUrl || null;
      let nextContent = work.content;

      if (!nextPreviewUrl && typeof work.preview === 'string' && work.preview.startsWith('data:')) {
        nextPreviewUrl = await ensureDataUrlFile(work.preview, calligraphyPreviewDir, work.id);
        if (nextPreviewUrl && nextPreviewUrl !== work.previewUrl) {
          migratedPreviews++;
          changed = true;
        }
      }

      if (Array.isArray(work.content)) {
        let contentChanged = false;
        nextContent = await Promise.all(work.content.map(async (item, index) => {
          const nextPreview = await ensureDataUrlFile(item?.preview, calligraphyCharDir, `${work.id}-${index}`);
          if (nextPreview !== item?.preview) {
            migratedChars++;
            contentChanged = true;
            return { ...item, preview: nextPreview };
          }
          return item;
        }));

        if (contentChanged) {
          changed = true;
        }
      }

      if (!changed) {
        skippedWorks++;
        continue;
      }

      await prisma.calligraphyWork.update({
        where: { id: work.id },
        data: {
          previewUrl: nextPreviewUrl,
          content: nextContent
        }
      });

      updatedWorks++;
      console.log(`已迁移作品 ${work.id}`);
    } catch (error) {
      failedWorks++;
      console.error(`迁移作品失败 ${work.id}:`, error.message);
    }
  }

  console.log('\n===== 书法预览迁移完成 =====');
  console.log(`总作品数: ${works.length}`);
  console.log(`更新作品数: ${updatedWorks}`);
  console.log(`迁移整体预览数: ${migratedPreviews}`);
  console.log(`迁移单字预览数: ${migratedChars}`);
  console.log(`跳过作品数: ${skippedWorks}`);
  console.log(`失败作品数: ${failedWorks}`);
}

main()
  .catch(error => {
    console.error('迁移执行失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
