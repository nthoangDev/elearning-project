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
  if (Array.isArray(req)) return req;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  if (req.file) return [req.file];
  return [];
}

// [POST] /api/student/assessments/:assessmentId/submit-assignment
module.exports.submitAssignment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const asmt = await Assessment.findById(assessmentId).lean();
    console.log(req.body)
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
