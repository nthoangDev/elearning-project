// middlewares/upload.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Tạo tên file an toàn
function safeFilename(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const base = path.basename(file.originalname, ext)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '_')
    .slice(0, 80);
  cb(null, `${Date.now()}-${base}${ext}`);
}

// Filter chỉ ảnh
function imageOnlyFilter(req, file, cb) {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  if (!ok) {
    req.fileValidationError = 'Chỉ cho phép ảnh PNG/JPG/WebP/GIF';
    return cb(null, false);
  }
  cb(null, true);
}

// Filter nhận đa số định dạng phổ biến (pdf/doc/mp4/mp3/ảnh…)
function anyCommonFileFilter(_req, file, cb) {
  const ok = /^(image|video|audio|application|text)\//i.test(file.mimetype);
  cb(null, ok);
}

// Tạo storage theo thư mục con trong /tmp/uploads
function makeStorage(subdir) {
  return multer.diskStorage({
    destination(req, _file, cb) {
      const dest = path.resolve(process.cwd(), 'tmp', 'uploads', subdir);
      fs.mkdir(dest, { recursive: true }, (err) => cb(err, dest));
    },
    filename: safeFilename
  });
}


<<<<<<< HEAD
function makeDiskUploader({
  subdir,
  field = 'file',
  maxSizeMB = 10,
  accept = 'image',
  multiple = false,
  maxCount = 10
}) {
  const storage = makeStorage(subdir);
  const fileFilter = accept === 'any' ? anyCommonFileFilter : imageOnlyFilter;

  const m = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 }
  });

  // Trả về middleware phù hợp
  return multiple ? m.array(field, maxCount) : m.single(field);
}

/* ================== Uploader tiện dụng (dễ gọi lại) ================== */

// 1) Ảnh khoá học: field = 'image', single, chỉ ảnh, 2MB
const uploadCourseImage = makeDiskUploader({
  subdir: 'courses',
  field: 'image',
  accept: 'image',
  maxSizeMB: 2,
  multiple: false
});

// 2) Ảnh avatar: field = 'avatar', single, chỉ ảnh, 2MB
const uploadAvatarImage = makeDiskUploader({
  subdir: 'users',
  field: 'avatar',
  accept: 'image',
  maxSizeMB: 2,
  multiple: false
});

// 3) Tài nguyên bài học (nhiều loại file): field = 'files', multiple, 50MB/file
const uploadLessonFiles = makeDiskUploader({
  subdir: 'lessons',
  field: 'files',
  accept: 'any',
  maxSizeMB: 50,
  multiple: true,
  maxCount: 10
});

// 4) Nếu cần ảnh bài học (gallery) – multiple ảnh
const uploadLessonImages = makeDiskUploader({
  subdir: 'lessons/images',
  field: 'images',
  accept: 'image',
  maxSizeMB: 10,
  multiple: true,
  maxCount: 10
});

module.exports = {
  makeDiskUploader,
  uploadCourseImage,
  uploadAvatarImage,
  uploadLessonFiles,
  uploadLessonImages
};
=======
module.exports = { makeDiskUploader, uploadCourseImage, uploadAvatarImage };
>>>>>>> 1c7bf79ae1f9284f34628fc0e34358ffaaa7256d
