const AssessmentSubmission = require('../../models/assessment-submission.model');
const mongoose = require('mongoose');
// const Notification = require('../../models/notification.model'); 

// [GET] api/instructor/assessments/:assessmentId/submissions?user=<userId>
exports.listSubmissions = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const { user } = req.query;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ message: 'Invalid assessmentId' });
    }

    const cond = { assessment: new mongoose.Types.ObjectId(assessmentId) };


    const uid = user;
    if (uid) {
      if (!mongoose.Types.ObjectId.isValid(uid)) {
        return res.status(400).json({ message: 'Invalid user id' });
      }
      cond.user = new mongoose.Types.ObjectId(uid);
    }

    let q = AssessmentSubmission.find(cond)
      .populate('user', 'fullName email')
      .sort({ submittedAt: -1 });

    const items = await q.lean();
    // Không phân trang: trả về mảng thuần
    return res.json(items);
  } catch (e) { next(e); }
};

// [GET] /api/instructor/submissions/:submissionId
exports.getSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const sub = await AssessmentSubmission.findById(submissionId)
      .populate('user', 'fullName email')
      .populate('graderUser', 'fullName email');
    if (!sub) return res.status(404).send('Not found');
    res.json(sub);
  } catch (e) { next(e); }
};

// [POST] /api/instructor/submissions/:submissionId/grade
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    let { score, pass, feedback } = req.body;

    if (typeof score === 'string' && score.trim() !== '') score = Number(score);
    if (Number.isNaN(score)) score = 0;
    score = Math.max(0, Math.min(100, score)); // 0..100

    pass = !!pass;
    feedback = typeof feedback === 'string' ? feedback.trim() : '';

    const update = {
      $set: {
        score,
        pass,
        status: 'RETURNED',
        gradedAt: new Date(),
        returnedAt: new Date(),
        graderUser: req.user._id,
        feedback
      }
    };

    const sub = await AssessmentSubmission.findByIdAndUpdate(
      submissionId,
      update,
      { new: true }
    )
      .populate('user', 'fullName email')
      .populate('graderUser', 'fullName email');

    if (!sub) return res.status(404).json({ message: 'Not found' });

    // (tuỳ chọn) gửi Notification nếu có model
    // if (Notification?.create) {
    //   await Notification.create({
    //     user: sub.user._id,
    //     type: 'SYSTEM',
    //     message: `Bài của bạn đã được chấm: ${sub.score ?? '—'} điểm`
    //   });
    // }

    return res.json(sub);
  } catch (e) {
    next(e);
  }
};


// [POST] /api/instructor/submissions/:submissionId/comments 
exports.commentSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { message } = req.body;
    const sub = await AssessmentSubmission.findByIdAndUpdate(
      submissionId, { $push: { comments: { user: req.user._id, message } } }, { new: true }
    ).populate('comments.user', 'fullName');
    if (!sub) return res.status(404).send('Not found');
    res.json(sub);
  } catch (e) { next(e); }
};
