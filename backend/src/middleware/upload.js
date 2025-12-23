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
// PDF大文件存储位置（外部磁盘）
const pdfDir = process.env.PDF_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/books-ai';

[uploadDir, avatarDir, imageDir, audioDir, pdfDir].forEach(dir => {
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

module.exports = upload;
module.exports.pdfUpload = pdfUpload;
