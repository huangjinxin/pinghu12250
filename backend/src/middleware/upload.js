/**
 * 文件上传中间件
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const avatarDir = path.join(uploadDir, 'avatars');
const imageDir = path.join(uploadDir, 'images');
const audioDir = path.join(uploadDir, 'audios');
const fontDir = path.join(uploadDir, 'fonts');
const calligraphyDir = path.join(uploadDir, 'calligraphy');
const calligraphyPreviewDir = path.join(calligraphyDir, 'previews');
const calligraphyCharDir = path.join(calligraphyDir, 'chars');
// PDF大文件存储位置（外部磁盘）
const pdfDir = process.env.PDF_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/books-ai';
// 照片分享存储位置（外部磁盘）
const photoDir = process.env.PHOTO_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/photos';

[uploadDir, avatarDir, imageDir, audioDir, fontDir, calligraphyDir, calligraphyPreviewDir, calligraphyCharDir, pdfDir, photoDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = uploadDir;
    if (file.fieldname === 'avatar') {
      dest = avatarDir;
    } else if (file.mimetype === 'application/pdf' || file.fieldname === 'pdf') {
      dest = pdfDir;
    } else if (file.mimetype.startsWith('audio/')) {
      dest = audioDir;
    } else if (file.fieldname === 'image' || file.fieldname === 'file') {
      dest = imageDir;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  // 允许的图片类型
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  // 允许的音频类型
  const allowedAudioTypes = /mp3|wav|ogg|m4a|aac|flac/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = file.mimetype;

  // 检查是否为图片
  if (allowedImageTypes.test(ext) && mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // 检查是否为音频
  else if (allowedAudioTypes.test(ext) || mimetype.startsWith('audio/')) {
    cb(null, true);
  }
  // 检查是否为PDF
  else if (ext === 'pdf' || mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片、音频或PDF文件'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 200 * 1024 * 1024, // 默认200MB（支持大PDF文件）
  },
});

// PDF专用上传（更大的文件限制）
const pdfUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传PDF文件'));
    }
  },
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

// EPUB专用上传
const epubUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, pdfDir); // EPUB和PDF共用存储目录
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/epub+zip' ||
        file.originalname.toLowerCase().endsWith('.epub')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传EPUB文件'));
    }
  },
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

// 照片分享专用上传（存储到外部磁盘）
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // 按年月分目录存储
      const now = new Date();
      const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const destDir = path.join(photoDir, yearMonth);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedTypes.test(ext) && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per photo
  },
});

// 字体文件上传
const fontUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, fontDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /ttf|otf|woff|woff2/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传字体文件（ttf/otf/woff/woff2）'));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB（中文字体通常较大）
  },
});

module.exports = upload;
module.exports.pdfUpload = pdfUpload;
module.exports.epubUpload = epubUpload;
module.exports.photoUpload = photoUpload;
module.exports.fontUpload = fontUpload;
module.exports.photoDir = photoDir;
module.exports.fontDir = fontDir;
module.exports.calligraphyPreviewDir = calligraphyPreviewDir;
module.exports.calligraphyCharDir = calligraphyCharDir;
