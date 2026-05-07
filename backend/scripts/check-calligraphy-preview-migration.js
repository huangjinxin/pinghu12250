const prisma = require('../src/lib/prisma');
const fs = require('fs').promises;
const path = require('path');

async function fileExistsByUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) {
    return false;
  }
  const uploadsRoot = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const relativePath = url.replace(/^\/uploads\//, '');
  const filePath = path.join(uploadsRoot, relativePath);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

function isUploadUrl(value) {
  return typeof value === 'string' && value.startsWith('/uploads/');
}

async function main() {
  const works = await prisma.calligraphyWork.findMany({
    select: {
      id: true,
      title: true,
      charCount: true,
      createdAt: true,
      status: true,
      evaluationScore: true,
      preview: true,
      previewUrl: true,
      content: true
    }
  });

  let previewUrlCount = 0;
  let previewUrlMissingCount = 0;
  let charUrlCount = 0;
  let charDataUrlCount = 0;
  let charMissingCount = 0;
  const brokenPreviewFiles = [];
  const brokenCharFiles = [];

  for (const work of works) {
    if (work.previewUrl) {
      previewUrlCount++;
      if (!(await fileExistsByUrl(work.previewUrl))) {
        previewUrlMissingCount++;
        brokenPreviewFiles.push({ id: work.id, previewUrl: work.previewUrl });
      }
    }

    if (Array.isArray(work.content)) {
      for (const item of work.content) {
        if (isUploadUrl(item?.preview)) {
          charUrlCount++;
          if (!(await fileExistsByUrl(item.preview))) {
            brokenCharFiles.push({ id: work.id, preview: item.preview, character: item.character });
          }
        } else if (isDataUrl(item?.preview)) {
          charDataUrlCount++;
        } else if (item?.preview == null) {
          charMissingCount++;
        }
      }
    }
  }

  const sample = works.slice(0, 5).map(work => ({
    id: work.id,
    title: work.title,
    charCount: work.charCount,
    createdAt: work.createdAt,
    status: work.status,
    evaluationScore: work.evaluationScore,
    contentLength: Array.isArray(work.content) ? work.content.length : 0,
    hasLegacyPreview: !!work.preview,
    hasPreviewUrl: !!work.previewUrl
  }));

  console.log('===== 书法预览迁移校验 =====');
  console.log(`作品总数: ${works.length}`);
  console.log(`已回填 previewUrl 数: ${previewUrlCount}`);
  console.log(`previewUrl 缺失文件数: ${previewUrlMissingCount}`);
  console.log(`单字预览 URL 数: ${charUrlCount}`);
  console.log(`单字预览 dataURL 数: ${charDataUrlCount}`);
  console.log(`单字预览缺失数: ${charMissingCount}`);
  console.log(`损坏整体预览文件数: ${brokenPreviewFiles.length}`);
  console.log(`损坏单字预览文件数: ${brokenCharFiles.length}`);
  console.log('抽样数据快照:');
  console.log(JSON.stringify(sample, null, 2));

  if (brokenPreviewFiles.length || brokenCharFiles.length) {
    console.log('异常文件详情:');
    console.log(JSON.stringify({ brokenPreviewFiles, brokenCharFiles }, null, 2));
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error('校验执行失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
