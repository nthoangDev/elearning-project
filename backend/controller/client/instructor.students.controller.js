const mongoose = require('mongoose');
const Enrollment = require('../../models/enrollement.model');

// GET /api/instructor/courses/:courseId/students
module.exports.listCourseStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const q  = (req.query.q || '').trim();
    const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const docs = await Enrollment.find({ course: courseId })
      .populate({ path: 'user', select: 'fullName email avatarUrl status' })
      .select('enrolledAt progressPct completed user')
      .lean();

    let items = (docs || [])
      .filter(d => d.user)
      .filter(d => !d.user.status || d.user.status === 'ACTIVE')
      .map(d => ({
        _id: d.user._id,
        fullName: d.user.fullName,
        email: d.user.email,
        avatarUrl: d.user.avatarUrl,
        enrolledAt: d.enrolledAt,
        progressPct: d.progressPct ?? 0,
        completed: !!d.completed
      }));

    if (rx) {
      items = items.filter(u => rx.test(u.fullName || '') || rx.test(u.email || ''));
    }

    items.sort((a, b) => {
      const fa = (a.fullName || '').toLowerCase();
      const fb = (b.fullName || '').toLowerCase();
      if (fa && fb && fa !== fb) return fa < fb ? -1 : 1;
      const ea = (a.email || '').toLowerCase();
      const eb = (b.email || '').toLowerCase();
      if (ea !== eb) return ea < eb ? -1 : 1;
      return 0;
    });

    return res.json({ items, total: items.length });
  } catch (e) { next(e); }
};
