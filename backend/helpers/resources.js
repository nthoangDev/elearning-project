const path = require('path');
const fs = require('fs/promises');
const cloudinary = require('../config/cloudinary');

function buildResourcesFromUrls(raw, detectKind) {
  const text = Array.isArray(raw) ? raw.join('\n') : (raw || '');
  return text.split('\n').map(s => s.trim()).filter(Boolean).map((url, i) => ({
    url, kind: typeof detectKind === 'function' ? detectKind(url) : 'OTHER',
    order: i + 1, isPrimary: i === 0
  }));
}

function kindFromMime(mime = '') {
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'application/msword'
   || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOC';
  return 'OTHER';
}

async function uploadToCloudinary(file, folder) {
  const localPath = file.path || path.resolve(file.destination, file.filename);

  const result = await cloudinary.uploader.upload(localPath, {
    resource_type: 'auto',      // auto: ảnh / pdf / video / audio đều ok
    folder,
    use_filename: true,
    unique_filename: true
  });

  await fs.unlink(localPath).catch(() => {});
  return { url: result.secure_url, durationSec: result.duration ? Math.round(result.duration) : undefined };
}

async function makeResourceFromFile(file, folder) {
  const up = await uploadToCloudinary(file, folder);
  return {
    url: up.url,
    title: file.originalname,
    kind: kindFromMime(file.mimetype),
    mime: file.mimetype,
    size: file.size,
    durationSec: up.durationSec
  };
}

module.exports = { buildResourcesFromUrls, kindFromMime, uploadToCloudinary, makeResourceFromFile };
