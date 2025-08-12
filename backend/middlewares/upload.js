const path = require('path');
const fs = require('fs');
const multer = require('multer');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

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

function makeImageUploader(subdir = 'uploads') {
    const dest = path.join(process.cwd(), 'public', subdir);
    ensureDir(dest);

    const storage = multer.diskStorage({
        destination: dest,
        filename: safeFilename
    });

    return multer({
        storage,
        fileFilter: imageFilter,
        limits: { fileSize: 2 * 1024 * 1024, files: 1 } // 2MB
    });
}

const uploadCourseImage = makeImageUploader('uploads/courses');

module.exports = {
    uploadCourseImage,
    makeImageUploader
};
