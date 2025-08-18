const path = require('path');
const fs = require('fs');
const multer = require('multer');

function safeFilename(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const base = path.basename(file.originalname, ext)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '_')
    .slice(0, 80);
  cb(null, `${Date.now()}-${base}${ext}`);
}

function imageFilter(req, file, cb) {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  if (!ok) {
    req.fileValidationError = 'Chỉ cho phép ảnh PNG/JPG/WebP/GIF';
    return cb(null, false);
  }
  cb(null, true);
}

function makeDiskUploader({ subdir, field = 'image', maxSizeMB = 2 }) {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const dest = path.resolve(process.cwd(), 'tmp', 'uploads', subdir);
      fs.mkdir(dest, { recursive: true }, (err) => cb(err, dest));
    },
    filename: safeFilename
  });

  return multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 }
  }).single(field);
}

const uploadCourseImage = makeDiskUploader({ subdir: 'courses' });
const uploadAvatarImage = makeDiskUploader({ subdir: 'users', field: 'avatar'});

module.exports = { makeDiskUploader, uploadCourseImage, uploadAvatarImage };
