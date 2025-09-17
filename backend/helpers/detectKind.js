const { URL } = require('url');

function detectKind(url = '') {
  const u = String(url || '').toLowerCase();
  let pathname = u;
  try { pathname = new URL(u).pathname.toLowerCase(); } catch {}

  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com') || pathname.endsWith('.mp4') || pathname.endsWith('.webm')) return 'VIDEO';
  if (pathname.endsWith('.pdf')) return 'PDF';
  if (pathname.endsWith('.doc') || pathname.endsWith('.docx')) return 'DOC';
  if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.webp') || pathname.endsWith('.gif')) return 'IMAGE';
  if (pathname.endsWith('.mp3') || pathname.endsWith('.wav') || pathname.endsWith('.m4a')) return 'AUDIO';
  return 'OTHER';
}

// Dùng cho file upload: ưu tiên MIME
function kindFromMime(mime = '') {
  const m = String(mime || '').toLowerCase();
  if (!m) return 'OTHER';
  if (m.startsWith('video/')) return 'VIDEO';
  if (m.startsWith('image/')) return 'IMAGE';
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('msword') || m.includes('officedocument')) return 'DOC';
  if (m.startsWith('audio/')) return 'AUDIO';
  if (m.startsWith('text/')) return 'TEXT';
  return 'OTHER';
}

function resolveKind({ preferKind, lessonType, mime, url } = {}) {
  if (preferKind) return preferKind;
  const km = kindFromMime(mime);
  if (km !== 'OTHER') return km;
  return detectKind(url);
}

module.exports = { detectKind, kindFromMime, resolveKind };

