const mongoose = require('mongoose');
const Enrollment = require('../../models/enrollement.model'); // Enrollment
const Lesson = require('../../models/lesson.model');          // Lesson
const Section = require('../../models/section.model');        // Section
const Course = require('../../models/course.model');          // Course
const { Assessment } = require('../../models/assessment.model');  // Assessment
const AssessmentSubmission = require('../../models/assessment-submission.model');

function oid(x) { return new mongoose.Types.ObjectId(x); }

async function requireEnrollment(userId, courseId) {
    const en = await Enrollment.findOne({ user: userId, course: courseId });
    if (!en) throw Object.assign(new Error('Chưa ghi danh khoá học này'), { status: 403 });
    return en;
}

async function recomputeProgress(userId, courseId) {
    const [totalLessons, en] = await Promise.all([
        Lesson.countDocuments({ course: courseId }),
        Enrollment.findOne({ user: userId, course: courseId })
    ]);
    if (!en) return 0;
    const done = (en.progress || []).filter(p => p.completed).length;
    const pct = totalLessons ? Math.round((done / totalLessons) * 100) : 0;
    en.progressPct = pct;
    en.completed = totalLessons > 0 && done === totalLessons;
    await en.save();
    return pct;
}

// [GET] /api/student/courses/:courseId/outline
exports.getCourseOutlineForStudent = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await requireEnrollment(req.user._id, courseId);

        const [sections, en] = await Promise.all([
            Section.find({ course: courseId }).sort({ sortOrder: 1 }).lean(),
            Enrollment.findOne({ user: req.user._id, course: courseId }).lean()
        ]);

        const lessonArr = await Lesson.find({ course: courseId })
            .select('_id section title type sortOrder isFreePreview')
            .sort({ sortOrder: 1 }).lean();

        const doneSet = new Set((en?.progress || []).filter(p => p.completed).map(p => String(p.lesson)));
        const mapBySection = {};
        for (const s of sections) mapBySection[String(s._id)] = { ...s, lessons: [] };
        for (const l of lessonArr) {
            const secId = String(l.section);
            const completed = doneSet.has(String(l._id));
            (mapBySection[secId] ||= { lessons: [] }).lessons.push({ ...l, completed });
        }

        res.json(Object.values(mapBySection));
    } catch (e) { next(e); }
};

// [GET] /api/student/lessons/:lessonId
exports.getLessonForStudent = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const lesson = await Lesson.findById(lessonId)
            .select('_id course section title type contentText durationSec resources assessments')
            .lean();
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        // Cho phép xem nếu: đã ghi danh khoá, hoặc bài free preview
        const enrolled = await Enrollment.exists({ user: req.user._id, course: lesson.course });
        if (!enrolled) {
            const previewOk = !!(lesson.isFreePreview);
            if (!previewOk) return res.status(403).json({ message: 'Bạn chưa ghi danh khoá học' });
        }

        // Lấy assessments của bài học
        const assessments = (lesson.assessments || []).length
            ? await Assessment.find({ _id: { $in: lesson.assessments } })
                .select('_id title assessmentType availableAt dueAt passScore')
                .lean()
            : [];

        res.json({ lesson, assessments });
    } catch (e) { next(e); }
};

// [POST] /api/student/lessons/:lessonId/complete
exports.markLessonComplete = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const lesson = await Lesson.findById(lessonId).lean();
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        const en = await requireEnrollment(req.user._id, lesson.course);
        const arr = en.progress || [];
        const idx = arr.findIndex(p => String(p.lesson) === String(lessonId));
        if (idx >= 0) {
            arr[idx].completed = true;
            arr[idx].completedAt = new Date();
        } else {
            arr.push({ lesson: lesson._id, completed: true, completedAt: new Date() });
        }
        en.progress = arr;
        await en.save();

        const progressPct = await recomputeProgress(req.user._id, lesson.course);
        res.json({ ok: true, progressPct });
    } catch (e) { next(e); }
};

// [POST] /api/student/lessons/:lessonId/uncomplete
exports.markLessonUncomplete = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const lesson = await Lesson.findById(lessonId).lean();
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        const en = await requireEnrollment(req.user._id, lesson.course);
        const arr = en.progress || [];
        const idx = arr.findIndex(p => String(p.lesson) === String(lessonId));
        if (idx >= 0) {
            arr[idx].completed = false;
            arr[idx].completedAt = undefined;
        }
        en.progress = arr;
        await en.save();

        const progressPct = await recomputeProgress(req.user._id, lesson.course);
        res.json({ ok: true, progressPct });
    } catch (e) { next(e); }
};

// [GET] /api/student/courses/:courseId/progress
exports.getCourseProgress = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const en = await requireEnrollment(req.user._id, courseId);
        res.json({ progressPct: en.progressPct || 0, completed: !!en.completed });
    } catch (e) { next(e); }
};

// [GET] /api / student / deadlines ? withinDays = 7
exports.listUpcomingDeadlines = async (req, res, next) => {
    try {
        const within = Math.max(1, Number(req.query.withinDays) || 7);
        const now = new Date();
        const to = new Date(now.getTime() + within * 24 * 60 * 60 * 1000);

        // chỉ lấy các course mà user đã ghi danh
        const enrollments = await Enrollment.find({ user: req.user._id })
            .select('course').lean();
        const courseIds = enrollments.map(e => e.course);
        if (!courseIds.length) return res.json([]);

        // lấy cả ASSIGNMENT + QUIZ có dueAt trong khoảng
        const assessments = await Assessment.find({
            course: { $in: courseIds },
            assessmentType: { $in: ['ASSIGNMENT', 'QUIZ'] },
            dueAt: { $ne: null, $gte: now, $lte: to }
        })
            .select('_id title assessmentType availableAt dueAt attemptsAllowed')
            .lean();

        if (!assessments.length) return res.json([]);

        const asIds = assessments.map(a => a._id);

        // lấy submission gần nhất + đếm số attempt mỗi assessment
        const subs = await AssessmentSubmission.aggregate([
            { $match: { user: req.user._id, assessment: { $in: asIds } } },
            { $sort: { attemptNo: -1, submittedAt: -1 } },
            { $group: { _id: '$assessment', last: { $first: '$$ROOT' }, count: { $sum: 1 } } }
        ]);

        const subMap = Object.create(null);
        subs.forEach(s => { subMap[String(s._id)] = s; });

        const items = assessments
            .map(a => {
                const key = String(a._id);
                const info = subMap[key];
                const last = info?.last;

                const submitted = !!last;
                const graded = last?.status === 'GRADED';
                const dueAt = a.dueAt ? new Date(a.dueAt) : null;
                const submittedAt = last?.submittedAt ? new Date(last.submittedAt) : null;
                const onTime = dueAt ? (!submittedAt || submittedAt <= dueAt) : true;

                return {
                    _id: a._id,
                    title: a.title,
                    type: a.assessmentType,           // 'ASSIGNMENT' | 'QUIZ'
                    availableAt: a.availableAt || null,
                    dueAt: a.dueAt || null,
                    submitted,
                    graded,
                    onTime,
                    attemptsUsed: info?.count || 0,
                    attemptsAllowed: a.attemptsAllowed ?? null,
                    // nếu quiz đã chấm, trả luôn score/pass để hiển thị
                    score: graded ? (last?.score ?? null) : null,
                    pass: graded ? (last?.pass ?? null) : null
                };
            })
            .sort((x, y) => new Date(x.dueAt || 0) - new Date(y.dueAt || 0));

        return res.json(items);
    } catch (e) { next(e); }
};

// (tuỳ chọn) [GET] /api/student/my-courses
exports.listMyCourses = async (req, res, next) => {
    try {
        const ens = await Enrollment.find({ user: req.user._id })
            .populate('course', 'title imageUrl price salePrice ratingAvg ratingCount')
            .sort({ createdAt: -1 })
            .lean();
        res.json(ens);
    } catch (e) { next(e); }
};
