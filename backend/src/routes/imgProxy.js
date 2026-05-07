const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../../public/img-cache');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const PHOTO_STORAGE_DIR = process.env.PHOTO_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/photos';
const ALLOWED_LOCAL_PREFIXES = ['/uploads/', '/photos-static/'];
const LOCAL_ROOTS = {
  '/uploads/': UPLOADS_DIR,
  '/photos-static/': PHOTO_STORAGE_DIR,
};

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function normalizeUrl(url) {
  if (!url) return '';
  const value = Array.isArray(url) ? url[0] : url;
  const decoded = decodeURIComponent(value);
  return decoded.split('?')[0].replace(/\\/g, '/');
}

function getAllowedPrefix(url) {
  return ALLOWED_LOCAL_PREFIXES.find(prefix => url.startsWith(prefix));
}

function getCacheKey(url, w, q) {
  const hash = crypto.createHash('md5').update(`${url}|${w}|${q}`).digest('hex');
  return `${hash}.webp`;
}

function fetchLocalImage(imagePath) {
  const normalizedPath = normalizeUrl(imagePath);
  const prefix = getAllowedPrefix(normalizedPath);

  if (!prefix) {
    throw new Error('URL not allowed');
  }

  const relativePath = normalizedPath.slice(prefix.length);
  const rootDir = LOCAL_ROOTS[prefix];
  const fullPath = path.resolve(rootDir, relativePath);

  if (!fullPath.startsWith(path.resolve(rootDir) + path.sep) && fullPath !== path.resolve(rootDir)) {
    throw new Error('Invalid image path');
  }

  if (!fs.existsSync(fullPath)) {
    console.error('[img-proxy] File not found:', fullPath);
    throw new Error('File not found');
  }

  return { fullPath, normalizedPath };
}

router.get('/', async (req, res) => {
  try {
    const normalizedUrl = normalizeUrl(req.query.url);
    const { w = 400, q = 80 } = req.query;

    if (!normalizedUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    if (!getAllowedPrefix(normalizedUrl)) {
      return res.status(403).json({ error: 'URL not allowed' });
    }

    const width = parseInt(w, 10) || 400;
    const quality = parseInt(q, 10) || 80;
    const cacheKey = getCacheKey(normalizedUrl, width, quality);
    const cachePath = path.join(CACHE_DIR, cacheKey);

    if (fs.existsSync(cachePath)) {
      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable'
      });
      return fs.createReadStream(cachePath).pipe(res);
    }

    const { fullPath } = fetchLocalImage(normalizedUrl);
    const imageBuffer = await sharp(fullPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    fs.writeFileSync(cachePath, imageBuffer);

    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
    res.send(imageBuffer);
  } catch (error) {
    console.error('[img-proxy] Error:', error.message);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

module.exports = router;
