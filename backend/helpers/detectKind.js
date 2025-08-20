exports.detectKind = (url = '') => {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com') || u.endsWith('.mp4') || u.endsWith('.webm')) return 'VIDEO';
  if (u.endsWith('.pdf')) return 'PDF';
  if (u.endsWith('.doc') || u.endsWith('.docx')) return 'DOC';
  if (u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.webp') || u.endsWith('.gif')) return 'IMAGE';
  if (u.endsWith('.mp3') || u.endsWith('.wav') || u.endsWith('.m4a')) return 'AUDIO';
  return 'OTHER';
};
