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

[uploadDir, avatarDir, imageDir].forEach(dir => {
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
    } else if (file.fieldname === 'image') {
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
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 默认5MB
  },
});

module.exports = upload;
