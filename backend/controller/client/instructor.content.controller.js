const fs = require('fs');
const path = require('path');
const Section = require('../../models/section.model');
const Lesson = require('../../models/lesson.model');
const { Assessment } = require('../../models/assessment.model');
const { buildResourcesFromUrls, makeResourceFromFile } = require('../../helpers/resources');
const { resolveKind } = require('../../helpers/detectKind');
const { default: mongoose } = require('mongoose');


function parseBool(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return ['1', 'true', 'on', 'yes', 'y'].includes(s);
}

// [GET] /api/instrucor/courses/:courseId/content
module.exports.getStructure = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const sections = await Section.find({ course: courseId })
      .sort({ sortOrder: 1, createdAt: 1 }).lean();
    const lessons = await Lesson.find({ course: courseId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('-__v -updatedAt').lean();

    const map = {};
    sections.forEach(s => { map[s._id] = { ...s, lessons: [] }; });
    lessons.forEach(l => {
      const sid = l.section?.toString();
      if (sid && map[sid]) map[sid].lessons.push(l);
    });

    res.json(Object.values(map));
  } catch (e) { next(e); }
};

// [GET] /api/instructor/courses/:courseId/sections
module.exports.listSections = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'courseId không hợp lệ.' });
    }

    const sections = await Section.find({ course: courseId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('-__v')
      .lean();

    return res.json(sections);
  } catch (e) { next(e); }
};

// [POST] /api/instructor/courses/:courseId/sections
module.exports.createSection = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { title, summary } = req.body;
    const count = await Section.countDocuments({ course: courseId });
    const doc = await Section.create({
      course: courseId,
      title: title?.trim(),
      summary: summary?.trim(),
      sortOrder: count + 1
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

// [PUT] /api/instructor/courses/:courseId/sections/:sectionId
module.exports.updateSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { title, summary } = req.body;
    const doc = await Section.findByIdAndUpdate(
      sectionId,
      { $set: { title: title?.trim(), summary: summary?.trim() } },
      { new: true }
    );
    if (!doc) return res.status(404).send('Section not found');
    res.json(doc);
  } catch (e) { next(e); }
};

// [DELETE]  /api/instructor/courses/:courseId/sections/:sectionId
module.exports.deleteSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    await Lesson.deleteMany({ section: sectionId });
    const del = await Section.findByIdAndDelete(sectionId);
    if (!del) return res.status(404).send('Section not found');
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// [POST] /api/instructor/courses/:courseId/sections/:sectionId/lessons
module.exports.createLesson = async (req, res, next) => {
  try {
    const { courseId: rawCourseId, sectionId: rawSectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(rawCourseId)) {
      return res.status(400).json({ message: 'courseId không hợp lệ.' });
    }
    if (!mongoose.Types.ObjectId.isValid(rawSectionId)) {
      return res.status(400).json({ message: 'sectionId không hợp lệ.' });
    }
    const courseId = new mongoose.Types.ObjectId(rawCourseId);
    const sectionId = new mongoose.Types.ObjectId(rawSectionId);

    const section = await Section.findOne({ _id: sectionId, course: courseId }).select('_id').lean();
    if (!section) {
      return res.status(404).json({ message: 'Chương không thuộc khóa học này.' });
    }

    let { title, type, contentText, isFreePreview, durationSec, resourceUrls } = req.body;
    title = (title || '').trim();
    if (!title) return res.status(400).json({ message: 'Vui lòng nhập tiêu đề.' });

    const VALID_TYPES = ['VIDEO', 'DOCUMENT', 'QUIZ'];
    type = (type || '').toUpperCase().trim();
    if (!VALID_TYPES.includes(type)) type = 'VIDEO';

    const last = await Lesson.findOne({ section: sectionId })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const nextSort = last?.sortOrder ? last.sortOrder + 1 : 1;

    let resources = [];

    if (resourceUrls) {
      const detectFromUrl = (url) => resolveKind({ lessonType: type, mime: undefined, url });
      const urlRes = buildResourcesFromUrls(resourceUrls, detectFromUrl)
        .map((r, i) => ({ ...r, order: i + 1, isPrimary: i === 0 }));
      resources.push(...urlRes);
    }

    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length && type !== 'QUIZ') {
      const folder = `lessons/${courseId}`;
      for (const [i, f] of files.entries()) {
        try {
          const r = await makeResourceFromFile(f, folder); // { url, title, kind, mime, size, durationSec }
          if ((r.kind === 'OTHER' || !r.kind) && (type === 'VIDEO' || type === 'DOCUMENT')) {
            r.kind = type;
          }
          r.order = resources.length + i + 1;
          r.isPrimary = (resources.length + i) === 0;
          resources.push(r);
        } catch (e) {
          console.error('[createLesson] upload fail:', f?.originalname, e);
        }
      }
    }
    if (resources.length && type !== 'QUIZ') {
      resources = resources.map((r, idx) => ({ ...r, order: idx + 1, isPrimary: idx === 0 }));
    }

    const payload = {
      course: courseId,
      section: sectionId,
      title,
      type,
      sortOrder: nextSort,
      contentText: (contentText || '').trim() || undefined,
      isFreePreview: ['1', 'true', 'on', 'yes', 'y', true].includes(
        String(isFreePreview ?? '').toLowerCase()
      ),
      ...(durationSec != null
        ? { durationSec: Math.max(0, Number(durationSec) || 0) }
        : {})
    };
    if (resources.length && type !== 'QUIZ') {
      payload.resources = resources;
    }

    if (type === 'QUIZ') {
      const quiz = await Assessment.create({
        course: courseId,
        section: sectionId,
        assessmentType: 'QUIZ',
        title: `Quiz - ${title}`,
        passScore: 60,
        attemptsAllowed: 1,
        questions: []
      });
      payload.assessments = [quiz._id];
    }

    const created = await Lesson.create(payload);
    return res.status(201).json(created);
  } catch (e) { next(e); }
};

// [GET] /api/instructor/lessons/:lessonId
module.exports.getLessonDetail = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'lessonId không hợp lệ.' });
    }

    const doc = await Lesson.findById(lessonId)
      .select('-__v')
      .populate({ path: 'course', select: 'title status' })
      .populate({ path: 'section', select: 'title sortOrder' })
      .populate({ path: 'assessments', select: 'assessmentType title passScore durationMinutes attemptsAllowed shuffleQuestions questions' })
      .lean();

    if (!doc) return res.status(404).send('Lesson not found');

    return res.json(doc);
  } catch (e) { next(e); }
};

// helper: chuẩn hoá order & primary
const normalizeResources = (arr = []) =>
  arr.map((r, i) => ({ ...r, order: i + 1, isPrimary: i === 0 }));

// [PUT] /api/instructor/lessons/:lessonId
module.exports.updateLesson = async (req, res, next) => {
  try {
    const { lessonId: rawLessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
      return res.status(400).json({ message: 'lessonId không hợp lệ.' });
    }
    const lesson = await Lesson.findById(rawLessonId);
    if (!lesson) return res.status(404).send('Lesson not found');

    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }

    let { title, contentText, isFreePreview, replacePrimary, durationSec, resourceUrls } = req.body;

    if (typeof title === 'string') lesson.title = title.trim();
    if (typeof contentText === 'string') lesson.contentText = contentText.trim();
    if (typeof isFreePreview !== 'undefined') lesson.isFreePreview = parseBool(isFreePreview);
    if (typeof durationSec !== 'undefined' && durationSec !== null && lesson.type !== 'QUIZ') {
      lesson.durationSec = Math.max(0, Number(durationSec) || 0);
    }

    if (lesson.type !== 'QUIZ') {
      const hasResourceUrlsField = Object.prototype.hasOwnProperty.call(req.body, 'resourceUrls');
      const files = Array.isArray(req.files) ? req.files : [];

      if (hasResourceUrlsField) {
        // ✅ CHẾ ĐỘ REPLACE-ALL khi có field resourceUrls (kể cả rỗng)
        let resources = [];

        const urls = (resourceUrls || '').trim();
        if (urls) {
          const detectFromUrl = (url) => resolveKind({ lessonType: lesson.type, mime: undefined, url });
          resources.push(...buildResourcesFromUrls(urls, detectFromUrl));
        }

        if (files.length) {
          const folder = `lessons/${lesson.course.toString()}`;
          for (const f of files) {
            try {
              const r = await makeResourceFromFile(f, folder);
              if ((r.kind === 'OTHER' || !r.kind) && (lesson.type === 'VIDEO' || lesson.type === 'DOCUMENT')) {
                r.kind = lesson.type;
              }
              resources.push(r);
            } catch (e) {
              console.error('[updateLesson] upload fail:', f?.originalname, e);
            }
          }
        }

        lesson.resources = normalizeResources(resources); // ↩️ thay toàn bộ
      } else {
        // (tuỳ chọn) GIỮ HÀNH VI CŨ nếu không gửi field resourceUrls:
        // append thêm từ resourceUrls/files + replacePrimary
        let added = [];

        if (req.body.resourceUrls) {
          const detectFromUrl = (url) => resolveKind({ lessonType: lesson.type, mime: undefined, url });
          const urlRes = buildResourcesFromUrls(req.body.resourceUrls, detectFromUrl)
            .map(r => ({ ...r, order: 0, isPrimary: false }));
          added.push(...urlRes);
        }

        if (files.length) {
          const folder = `lessons/${lesson.course.toString()}`;
          for (const f of files) {
            try {
              const r = await makeResourceFromFile(f, folder);
              if ((r.kind === 'OTHER' || !r.kind) && (lesson.type === 'VIDEO' || lesson.type === 'DOCUMENT')) {
                r.kind = lesson.type;
              }
              r.order = 0; r.isPrimary = false;
              added.push(r);
            } catch (e) {
              console.error('[updateLesson] upload fail:', f?.originalname, e);
            }
          }
        }

        if (added.length) {
          const replace = parseBool(replacePrimary);
          const current = (lesson.resources || []).map(r => r.toObject?.() ?? r);

          if (replace) {
            current.forEach(r => (r.isPrimary = false));
            added[0].isPrimary = true;
            lesson.resources = normalizeResources([...added, ...current]);
          } else {
            if (!current.length) added[0].isPrimary = true;
            lesson.resources = normalizeResources([...current, ...added]);
          }
        }
      }
    }

    const saved = await lesson.save();
    return res.json(saved);
  } catch (e) { next(e); }
};

// [DELETE] /api/instructor/lessons/:lessonId
module.exports.deleteLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const doc = await Lesson.findByIdAndDelete(lessonId);
    if (!doc) return res.status(404).send('Lesson not found');

    if (doc.type === 'QUIZ' && Array.isArray(doc.assessments) && doc.assessments.length) {
      await Assessment.deleteMany({ _id: { $in: doc.assessments } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
};


// [PATCH] /api/instructor/courses/:courseId/sections/:sectionId/move
module.exports.moveSection = async (req, res, next) => {
  try {
    const { courseId: rawCourseId, sectionId: rawSectionId } = req.params;
    const dir = String(req.body?.dir ?? '').toLowerCase(); // 'up' | 'down' (tuỳ chọn)
    const toRaw = req.body?.to;                             // (tuỳ chọn) vị trí đích 1..N

    if (!mongoose.Types.ObjectId.isValid(rawCourseId) || !mongoose.Types.ObjectId.isValid(rawSectionId)) {
      return res.status(400).json({ message: 'courseId/sectionId không hợp lệ.' });
    }
    const courseId = new mongoose.Types.ObjectId(rawCourseId);
    const sectionId = new mongoose.Types.ObjectId(rawSectionId);

    // Lấy & chuẩn hoá thứ tự 1..N
    const all = await Section.find({ course: courseId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('_id sortOrder')
      .lean();

    if (!all.length) return res.status(404).json({ message: 'Khoá học chưa có chương.' });

    const normalizeWrites = [];
    for (let i = 0; i < all.length; i++) {
      const desired = i + 1;
      if (all[i].sortOrder !== desired) {
        normalizeWrites.push({
          updateOne: { filter: { _id: all[i]._id }, update: { $set: { sortOrder: desired } } }
        });
        all[i].sortOrder = desired;
      }
    }
    if (normalizeWrites.length) await Section.bulkWrite(normalizeWrites);

    const count = all.length;
    const curIndex = all.findIndex(s => String(s._id) === String(sectionId));
    if (curIndex === -1) return res.status(404).json({ message: 'Section không thuộc khoá học này.' });

    const curPos = curIndex + 1;

    // Tính vị trí đích
    let newPos;
    if (toRaw != null && toRaw !== '') {
      newPos = Math.max(1, Math.min(count, Number(toRaw) || curPos));
    } else if (dir === 'up') {
      newPos = Math.max(1, curPos - 1);
    } else if (dir === 'down') {
      newPos = Math.min(count, curPos + 1);
    } else {
      return res.status(400).json({ message: 'Thiếu tham số dir (up|down) hoặc to (vị trí 1..N).' });
    }

    // Nếu có thay đổi vị trí thì dịch block và cập nhật mục tiêu
    if (newPos !== curPos) {
      if (newPos < curPos) {
        await Section.updateMany(
          { course: courseId, sortOrder: { $gte: newPos, $lt: curPos } },
          { $inc: { sortOrder: 1 } }
        );
        await Section.updateOne({ _id: sectionId }, { $set: { sortOrder: newPos } });
      } else {
        await Section.updateMany(
          { course: courseId, sortOrder: { $gt: curPos, $lte: newPos } },
          { $inc: { sortOrder: -1 } }
        );
        await Section.updateOne({ _id: sectionId }, { $set: { sortOrder: newPos } });
      }
    }

    // Không trả dữ liệu
    return res.status(201).json({"mesage": "Cập nhật vị trí thành công!"});
  } catch (e) { next(e); }
};