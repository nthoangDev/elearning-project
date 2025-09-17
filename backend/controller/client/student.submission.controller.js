const { Assessment } = require('../../models/assessment.model');
const AssessmentSubmission = require('../../models/assessment-submission.model');
const { makeResourceFromFile } = require('../../helpers/resources');

// Helpers
function withinWindow(as) {
  const t = Date.now();
  if (as.availableAt && t < new Date(as.availableAt).getTime()) return false;
  if (as.dueAt && t > new Date(as.dueAt).getTime()) return true;
  return true;
}
function safeParseJSON(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function collectFiles(req) {
  if (Array.isArray(req.files)) return req.files;          // upload.array('files')
  if (req.files && typeof req.files === 'object')          // upload.fields(...)
    return Object.values(req.files).flat();
  if (req.file) return [req.file];                         // upload.single(...)
  return [];
}

// [POST] /api/student/assessments/:assessmentId/submit-assignment
module.exports.submitAssignment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const asmt = await Assessment.findById(assessmentId).lean();
    // console.log(req.body)
    if (!asmt || asmt.assessmentType !== 'ASSIGNMENT')
      return res.status(404).send('Assignment not found');
    if (!withinWindow(asmt)) return res.status(403).send('Chưa mở hoặc đã đóng');

    const uploads = collectFiles(req);
    const folder = `assessments/${assessmentId}`;
    const attachments = [];
    for (const f of uploads) {
      try {
        const r = await makeResourceFromFile(f, folder);
        attachments.push({
          url:   r.url,
          title: r.title || f.originalname,
          mime:  r.mime  || f.mimetype,
          size:  r.size  || f.size
        });
      } catch (err) {
        console.error('[submitAssignment] upload fail:', f?.originalname, err);
      }
    }

    const last = await AssessmentSubmission.find({ assessment: assessmentId, user: req.user._id })
      .sort({ attemptNo: -1 }).limit(1);
    const nextAttempt = (last[0]?.attemptNo || 0) + 1;

    const sub = await AssessmentSubmission.create({
      assessment: assessmentId,
      user: req.user._id,
      attemptNo: nextAttempt,
      startedAt: new Date(req.body.startedAt || Date.now()),
      submittedAt: new Date(),
      status: 'SUBMITTED',
      textAnswer: req.body.textAnswer || '',
      attachments
    });

    return res.status(201).json(sub);
  } catch (e) { next(e); }
};

function gradeQuiz(quizDoc, answersJson) {
  const qs = quizDoc.questions || [];
  let scorePts = 0, totalPts = 0;
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const w = q.score ?? 1;
    totalPts += w;
    if (q.type === 'SHORT') continue;
    const chosen = new Set(answersJson?.[i] || []);
    const correct = new Set((q.options || []).map((o, idx) => (o.isCorrect ? idx : -1)).filter(x => x >= 0));
    const equal = chosen.size === correct.size && [...chosen].every(x => correct.has(x));
    if (equal) scorePts += w;
  }
  const pct = totalPts ? Math.round((scorePts / totalPts) * 100) : 0;
  return { pct, scorePts, totalPts };
}

// [POST] /api/student/assessments/:assessmentId/submit-quiz
exports.submitQuiz = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const asmt = await Assessment.findById(assessmentId).lean();
    if (!asmt || asmt.assessmentType !== 'QUIZ')
      return res.status(404).send('Quiz not found');
    if (!withinWindow(asmt)) return res.status(403).send('Chưa mở hoặc đã đóng');

    const attempts = await AssessmentSubmission.countDocuments({ assessment: assessmentId, user: req.user._id });
    if (asmt.attemptsAllowed && attempts >= asmt.attemptsAllowed)
      return res.status(409).send('Hết lượt làm bài');

    const answersJson = safeParseJSON(req.body.answersJson, {});
    const { pct } = gradeQuiz(asmt, answersJson);
    const pass = pct >= (asmt.passScore ?? 60);

    const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : new Date();

    const sub = await AssessmentSubmission.create({
      assessment: assessmentId,
      user: req.user._id,
      attemptNo: attempts + 1,
      startedAt,
      submittedAt: new Date(),
      status: 'GRADED',
      answersJson,
      score: pct,
      pass,
      gradedAt: new Date()
    });

    return res.status(201).json(sub);
  } catch (e) { next(e); }
};

function withinWindow(as) {
  const t = Date.now();
  if (as?.availableAt && t < new Date(as.availableAt).getTime()) return false;
  if (as?.dueAt && t > new Date(as.dueAt).getTime()) return false; // <- đóng sau hạn
  return true;
}

// [GET] /api/student/assessments/:assessmentId
exports.getAssessmentDetail = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;

    // Lấy đủ trường chung + trường đặc thù (nhánh QUIZ/ASSIGNMENT) từ discriminator
    const asmt = await Assessment.findById(assessmentId)
      .select(
        // Chung
        'title description assessmentType course section lesson points availableAt dueAt ' +
        // ASSIGNMENT
        'maxScore ' +
        // QUIZ
        'durationMinutes passScore shuffleQuestions attemptsAllowed questions'
      )
      .lean();

    if (!asmt) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Helper lấy text an toàn
    const pickText = (obj, fallback = '') => {
      if (obj == null) return fallback;
      if (typeof obj === 'string') return obj;
      return (
        obj.text ??
        obj.label ??
        obj.title ??
        obj.content ?? // dùng cho QuizOptionSub.content
        obj.value ??
        fallback
      );
    };

    const basePayload = {
      _id: String(asmt._id),
      assessmentType: asmt.assessmentType,           // 'ASSIGNMENT' | 'QUIZ'
      title: asmt.title || (asmt.assessmentType === 'QUIZ' ? 'Quiz' : 'Assignment'),
      description: asmt.description || '',
      course: asmt.course || null,
      section: asmt.section || null,
      lesson: asmt.lesson || null,
      lessonId: asmt.lesson ? String(asmt.lesson) : null, // tiện cho FE
      points: typeof asmt.points === 'number' ? asmt.points : 100,
      availableAt: asmt.availableAt || null,
      dueAt: asmt.dueAt || null,
    };

    // Nếu là ASSIGNMENT
    if (asmt.assessmentType === 'ASSIGNMENT') {
      return res.json({
        ...basePayload,
        assignment: {
          maxScore: typeof asmt.maxScore === 'number' ? asmt.maxScore : 100
        }
      });
    }

    // Nếu là QUIZ -> làm sạch câu hỏi, KHÔNG trả isCorrect
    if (asmt.assessmentType === 'QUIZ') {
      const rawQuestions = Array.isArray(asmt.questions) ? asmt.questions : [];

      const safeQuestions = rawQuestions.map((q, idx) => {
        const qText =
          pickText(q.question, null) || // theo schema: question là string
          pickText(q, `Câu hỏi ${idx + 1}`);
        const qType = q.type || q.questionType || 'SINGLE';
        const qScore =
          (typeof q.score === 'number' && Number.isFinite(q.score)) ? q.score : 1;

        const optsSrc = Array.isArray(q.options) ? q.options : [];
        const options = optsSrc.map((o, oi) => ({
          // KHÔNG trả isCorrect
          text: pickText(o.content, null) || pickText(o, `Lựa chọn ${oi + 1}`)
        }));

        return { type: qType, text: qText, score: qScore, options };
      });

      return res.json({
        ...basePayload,
        quiz: {
          durationMinutes: asmt.durationMinutes ?? null,
          passScore: (typeof asmt.passScore === 'number' ? asmt.passScore : 60),
          shuffleQuestions: !!asmt.shuffleQuestions,
          attemptsAllowed: (typeof asmt.attemptsAllowed === 'number' ? asmt.attemptsAllowed : 1),
          questions: safeQuestions
        }
      });
    }

    // Phòng trường hợp enum khác/không khớp
    return res.status(400).json({ message: 'Unsupported assessment type' });
  } catch (e) {
    next(e);
  }
};
