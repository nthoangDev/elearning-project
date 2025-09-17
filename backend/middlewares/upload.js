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

function imageOnlyFilter(req, file, cb) {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  if (!ok) {
    req.fileValidationError = 'Chỉ cho phép ảnh PNG/JPG/WebP/GIF';
    return cb(null, false);
  }
  cb(null, true);
}

function anyCommonFileFilter(_req, file, cb) {
  const ok = /^(image|video|audio|application|text)\//i.test(file.mimetype);
  cb(null, ok);
}

function makeStorage(subdir) {
  return multer.diskStorage({
    destination(req, _file, cb) {
      const dest = path.resolve(process.cwd(), 'tmp', 'uploads', subdir);
      fs.mkdir(dest, { recursive: true }, (err) => cb(err, dest));
    },
    filename: safeFilename
  });
}

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

  return multiple ? m.array(field, maxCount) : m.single(field);
}

function makeMultiFilesUploader({
  subdir,
  fields = 'files',        // <- mặc định chỉ 'files'
  accept = 'any',
  maxSizeMB = 50,
  maxCount = 10
}) {
  const storage = makeStorage(subdir);
  const fileFilter = accept === 'any' ? anyCommonFileFilter : imageOnlyFilter;

  const m = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 }
  });

  // hỗ trợ cả string lẫn array
  const fieldNames = Array.isArray(fields) ? fields : [fields];
  const spec = fieldNames.map((name) => ({ name, maxCount }));
  return m.fields(spec);
}

/* ========== Uploaders ========== */
/* ẢNH — giữ nguyên dùng makeDiskUploader */
const uploadCourseImage = makeDiskUploader({
  subdir: 'courses',
  field: 'image',
  accept: 'image',
  maxSizeMB: 2,
  multiple: false
});

const uploadAvatarImage = makeDiskUploader({
  subdir: 'users',
  field: 'avatar',
  accept: 'image',
  maxSizeMB: 2,
  multiple: false
});

const uploadLessonImages = makeDiskUploader({
  subdir: 'lessons/images',
  field: 'images',
  accept: 'image',
  maxSizeMB: 10,
  multiple: true,
  maxCount: 10
});

const uploadLessonFiles = makeMultiFilesUploader({
  subdir: 'lessons',
  fields: 'files',         
  accept: 'any',
  maxSizeMB: 50,
  maxCount: 10
});

const uploadAssessmentFiles = makeMultiFilesUploader({
  subdir: 'assessments',
  fields: 'files',         
  accept: 'any',
  maxSizeMB: 50,
  maxCount: 10
});

module.exports = {
  makeDiskUploader,
  makeMultiFilesUploader,
  uploadCourseImage,
  uploadAvatarImage,
  uploadLessonFiles,
  uploadLessonImages,
  uploadAssessmentFiles
};
