// controllers/student.qna.controller.js
const mongoose = require('mongoose');
const { Assessment } = require('../../models/assessment.model');
const AssessmentSubmission = require('../../models/assessment-submission.model');
const Enrollment = require('../../models/enrollement.model'); // nếu bạn dùng tên khác => sửa lại

// ---- Helpers ----
function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Chỉ cho:
 * - Chủ sở hữu bài nộp (student)
 * - Admin
 * - Giảng viên (nếu muốn chặt chẽ: kiểm tra có dạy khoá học của assessment)
 */
async function canAccessSubmission(user, submission) {
  if (!user || !submission) return false;
  const roles = user.roles || [];
  if (String(submission.user) === String(user._id)) return true;
  if (roles.includes('ADMIN')) return true;

  // OPTIONAL: kiểm tra giảng viên dạy khoá học
  try {
    const asm = await Assessment.findById(submission.assessment).select('course createdBy').lean();
    if (!asm) return false;
    // Giản lược: nếu là INSTRUCTOR thì cho phép (nếu cần: xác thực teacher thuộc course này)
    if (roles.includes('INSTRUCTOR')) return true;
  } catch {}
  return false;
}

/**
 * Lấy bài nộp mới nhất (của chính student) + feedback + comments
 * GET /api/student/assessments/:assessmentId/thread
 */
exports.getMySubmissionThread = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    if (!isObjectId(assessmentId)) return res.status(400).json({ message: 'assessmentId không hợp lệ' });

    // đảm bảo đã ghi danh
    const asmt = await Assessment.findById(assessmentId).select('course assessmentType title').lean();
    if (!asmt) return res.status(404).json({ message: 'Assessment not found' });
    const enrolled = await Enrollment.findOne({ user: req.user._id, course: asmt.course }).lean();
    if (!enrolled) return res.status(403).json({ message: 'Bạn chưa ghi danh khoá học' });

    // bài nộp mới nhất
    const sub = await AssessmentSubmission.findOne({ assessment: assessmentId, user: req.user._id })
      .sort({ attemptNo: -1 })
      .populate('graderUser', 'fullName avatar email')
      .populate('comments.user', 'fullName avatar email')
      .lean();

    if (!sub) {
      // Chưa nộp: vẫn trả về khung rỗng (để FE render form chat disabled)
      return res.json({
        assessment: {
          _id: String(asmt._id),
          title: asmt.title,
          assessmentType: asmt.assessmentType
        },
        submission: null,
        comments: []
      });
    }

    return res.json({
      assessment: {
        _id: String(asmt._id),
        title: asmt.title,
        assessmentType: asmt.assessmentType
      },
      submission: {
        _id: String(sub._id),
        attemptNo: sub.attemptNo,
        status: sub.status,
        score: sub.score,
        pass: sub.pass,
        feedback: sub.feedback,
        gradedAt: sub.gradedAt,
        returnedAt: sub.returnedAt,
        graderUser: sub.graderUser ? {
          _id: String(sub.graderUser._id),
          fullName: sub.graderUser.fullName,
          avatar: sub.graderUser.avatar,
          email: sub.graderUser.email
        } : null,
        submittedAt: sub.submittedAt,
      },
      comments: (sub.comments || []).map(c => ({
        user: c.user && c.user._id ? {
          _id: String(c.user._id),
          fullName: c.user.fullName,
          avatar: c.user.avatar,
          email: c.user.email
        } : { _id: String(c.user || ''), fullName: 'Người dùng' },
        message: c.message,
        createdAt: c.createdAt
      }))
    });
  } catch (e) { next(e); }
};

/**
 * Thêm bình luận vào 1 submission (student hoặc teacher đều dùng endpoint này)
 * POST /api/student/submissions/:submissionId/comments
 * body: { message: string }
 */
exports.addSubmissionComment = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    if (!isObjectId(submissionId)) return res.status(400).json({ message: 'submissionId không hợp lệ' });

    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Nội dung bình luận không được trống' });
    }

    const sub = await AssessmentSubmission.findById(submissionId).lean();
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    const ok = await canAccessSubmission(req.user, sub);
    if (!ok) return res.status(403).json({ message: 'Không có quyền bình luận bài nộp này' });

    await AssessmentSubmission.updateOne(
      { _id: submissionId },
      { $push: { comments: { user: req.user._id, message: String(message).slice(0, 2000), createdAt: new Date() } } }
    );

    // trả về comment mới kèm thông tin user
    return res.status(201).json({
      user: {
        _id: String(req.user._id),
        fullName: req.user.fullName,
        avatar: req.user.avatar,
        email: req.user.email
      },
      message: String(message).slice(0, 2000),
      createdAt: new Date()
    });
  } catch (e) { next(e); }
};

/**
 * Lấy submission theo id (để xem chi tiết cùng bình luận) — dùng cho student (chính mình) và giáo viên
 * GET /api/student/submissions/:submissionId
 */
exports.getSubmissionById = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    if (!isObjectId(submissionId)) return res.status(400).json({ message: 'submissionId không hợp lệ' });

    const sub = await AssessmentSubmission.findById(submissionId)
      .populate('graderUser', 'fullName avatar email')
      .populate('comments.user', 'fullName avatar email')
      .lean();
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    const ok = await canAccessSubmission(req.user, sub);
    if (!ok) return res.status(403).json({ message: 'Không có quyền truy cập' });

    const asmt = await Assessment.findById(sub.assessment).select('title assessmentType course').lean();

    return res.json({
      assessment: {
        _id: String(asmt?._id || ''),
        title: asmt?.title,
        assessmentType: asmt?.assessmentType
      },
      submission: {
        _id: String(sub._id),
        attemptNo: sub.attemptNo,
        status: sub.status,
        score: sub.score,
        pass: sub.pass,
        feedback: sub.feedback,
        graderUser: sub.graderUser ? {
          _id: String(sub.graderUser._id),
          fullName: sub.graderUser.fullName,
          avatar: sub.graderUser.avatar,
          email: sub.graderUser.email
        } : null,
        gradedAt: sub.gradedAt,
        returnedAt: sub.returnedAt,
        submittedAt: sub.submittedAt
      },
      comments: (sub.comments || []).map(c => ({
        user: c.user && c.user._id ? {
          _id: String(c.user._id),
          fullName: c.user.fullName,
          avatar: c.user.avatar,
          email: c.user.email
        } : { _id: String(c.user || ''), fullName: 'Người dùng' },
        message: c.message,
        createdAt: c.createdAt
      }))
    });
  } catch (e) { next(e); }
};
