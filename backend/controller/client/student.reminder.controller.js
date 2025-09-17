const FcmToken = require('../../models/fcmToken.model');
const Notification = require('../../models/notification.model');
const { fcm } = require('../../utils/firebaseAdmin');
const Enrollment = require('../../models/enrollement.model');
const { Assessment } = require('../../models/assessment.model');

// Đăng ký token
// POST /api/student/notifications/fcm/register { token, platform? }
exports.registerFcmToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body || {};
    if (!token) return res.status(400).json({ message: 'token required' });

    await FcmToken.updateOne(
      { token },
      { $set: { user: req.user._id, platform: platform || 'web', lastSeenAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// DELETE /api/student/notifications/fcm/register?token=...
exports.unregisterFcmToken = async (req, res, next) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ message: 'token required' });
    await FcmToken.deleteOne({ token, user: req.user._id });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// Gửi thông báo: tạo Notification + đẩy FCM
async function sendDeadlineNotifIfEnrolled({ user, assessmentId, title, body, data }) {
  // Lấy course/dueAt của assessment
  const as = await Assessment.findById(assessmentId)
    .select('_id title course dueAt')
    .lean();
  if (!as) return null;

  // Kiểm tra ghi danh
  const enrolled = await Enrollment.exists({ user, course: as.course });
  if (!enrolled) return null; 
  
  // Gửi như cũ nhưng bổ sung courseId/dueAt “chuẩn”
  return exports._sendDeadlineNotif({
    user,
    title: title || `Sắp đến hạn: ${as.title}`,
    body: body || 'Bạn có deadline sắp đến.',
    data: {
      ...(data || {}),
      assessmentId: String(as._id),
      courseId: String(as.course),
      dueAt: as.dueAt || null
    }
  });
}
exports.sendDeadlineNotifIfEnrolled = sendDeadlineNotifIfEnrolled;
