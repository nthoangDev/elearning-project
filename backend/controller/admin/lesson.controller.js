const path = require('path');
const fs = require('fs/promises');
const { Types } = require('mongoose');
const Lesson = require('../../models/lesson.model');
const Section = require('../../models/section.model');
const { detectKind } = require('../../helpers/detectKind');
const cloudinary = require('../../config/cloudinary');
const { buildResourcesFromUrls, makeResourceFromFile } = require('../../helpers/resources');

const VALID_TYPES = ['VIDEO', 'DOCUMENT', 'QUIZ'];
const prefixOf = (req) => req.app?.locals?.prefixAdmin || '/admin';

function collectMulterFiles(req) {
  if (Array.isArray(req.files)) return req.files;               // upload.array(...)
  if (req.files && typeof req.files === 'object')               // upload.fields(...)
    return Object.values(req.files).flat();
  if (req.file) return [req.file];                              // upload.single(...)
  return [];
}

// [GET] /admin/courses/:courseId/lessons
module.exports.list = async (req, res) => {
  try {
    const { courseId } = req.params;
    const qSection = req.query.section;

    const sectionFilter = { course: courseId };
    if (qSection && Types.ObjectId.isValid(qSection)) sectionFilter._id = qSection;

    const sections = await Section.find(sectionFilter).sort({ sortOrder: 1 }).lean();

    let lessons = [];
    if (sections.length) {
      const ids = sections.map(s => s._id);
      lessons = await Lesson.find({ section: { $in: ids } })
        .sort({ section: 1, sortOrder: 1, createdAt: 1 })
        .lean();
    }

    // group lessons vào từng section
    const bySection = new Map(sections.map(s => [String(s._id), []]));
    for (const l of lessons) {
      const k = String(l.section);
      if (!bySection.has(k)) bySection.set(k, []);
      bySection.get(k).push(l);
    }

    const data = sections.map(s => ({ ...s, lessons: bySection.get(String(s._id)) || [] }));

    res.render('admin/pages/lessons/index', {
      pageTitle: 'Bài học trong khóa',
      courseId,
      sections: data,
      totalSections: sections.length,
      totalLessons: lessons.length,
      filterSection: (Types.ObjectId.isValid(qSection) ? qSection : '') || ''
    });
  } catch (err) {
    console.error('[lessons.list] error:', err);
    res.status(500).send('Cannot load lessons list');
  }
};

// [GET] /admin/courses/:courseId/lessons/create
module.exports.showCreate = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!Types.ObjectId.isValid(courseId)) {
      req.flash?.('error', 'courseId không hợp lệ');
      return res.redirect(prefixOf(req) + '/courses');
    }
    const sections = await Section.find({ course: courseId }).sort({ sortOrder: 1 }).lean();

    res.render('admin/pages/lessons/form', {
      pageTitle: 'Thêm bài học',
      mode: 'create',
      courseId,
      sections,
      lesson: { resources: [], type: 'VIDEO', isFreePreview: false }
    });
  } catch (err) {
    console.error('[lessons.showCreate] error:', err);
    res.status(500).send('Cannot load create form');
  }
};

// [POST] /admin/courses/:courseId/lessons
module.exports.create = async (req, res) => {
  try {
    const prefix = prefixOf(req);

    // 1) Validate courseId
    const rawCourseId = (req.params.courseId ?? req.body.course ?? '').toString().trim();
    if (!Types.ObjectId.isValid(rawCourseId)) {
      req.flash?.('error', 'courseId không hợp lệ.');
      return res.redirect(prefix + '/courses');
    }
    const courseId = new Types.ObjectId(rawCourseId);

    // 2) Validate input cơ bản
    const b = req.body;
    const title = (b.title || '').trim();
    if (!title) {
      req.flash?.('error', 'Vui lòng nhập tiêu đề.');
      return res.redirect(`${prefix}/courses/${rawCourseId}/lessons/create`);
    }

    // 3) Validate section thuộc course
    const rawSectionId = (b.section || '').toString().trim();
    if (!Types.ObjectId.isValid(rawSectionId)) {
      req.flash?.('error', 'Vui lòng chọn chương hợp lệ.');
      return res.redirect(`${prefix}/courses/${rawCourseId}/lessons/create`);
    }
    const section = await Section.findOne({ _id: rawSectionId, course: courseId })
      .select('_id')
      .lean();
    if (!section) {
      req.flash?.('error', 'Chương không thuộc khóa học này.');
      return res.redirect(`${prefix}/courses/${rawCourseId}/lessons/create`);
    }

    // 4) sortOrder kế tiếp trong section
    const last = await Lesson.findOne({ section: section._id })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const nextSort = last?.sortOrder ? last.sortOrder + 1 : 1;

    // 5) Resources từ textarea (URL ngoài)
    let resources = buildResourcesFromUrls(b.resourceUrls, detectKind);

    // 6) Thêm files upload -> Cloudinary (dùng helper makeResourceFromFile)
    if (req.fileValidationError) {
      req.flash?.('error', req.fileValidationError);
      return res.redirect(`${prefix}/courses/${rawCourseId}/lessons/create`);
    }

    const uploads = collectMulterFiles(req);
    if (uploads.length) {
      const folder = `elearning/lessons/${rawCourseId}`;
      for (const [i, f] of uploads.entries()) {

        try {
          const r = await makeResourceFromFile(f, folder); // trả url Cloudinary
          r.order = resources.length + 1 + i;
          resources.push(r);
        } catch (e) {
          console.error('[cloudinary.upload] fail:', e);
          req.flash?.('warning', `Không thể upload ${f.originalname} lên Cloudinary.`);
        }
      }
    }

    // 7) Đánh dấu phần tử đầu là primary
    resources = resources.map((r, i) => ({ ...r, isPrimary: i === 0 }));

    // 8) Lưu bài học
    await Lesson.create({
      course: courseId,
      section: section._id,
      title,
      type: VALID_TYPES.includes(b.type) ? b.type : 'VIDEO',
      contentText: b.contentText || '',
      durationSec: b.durationSec ? Math.max(0, Number(b.durationSec)) : undefined,
      isFreePreview: ['1', true, 'true'].includes(b.isFreePreview),
      sortOrder: nextSort,
      resources
    });

    req.flash?.('success', 'Đã thêm bài học.');
    return res.redirect(`${prefix}/courses/${rawCourseId}/lessons?section=${section._id}`);
  } catch (err) {
    console.error('[lessons.create] error:', err);
    req.flash?.('error', 'Không thể tạo bài học, vui lòng thử lại.');
    return res.redirect(prefixOf(req) + '/courses');
  }
};


// [GET] /admin/courses/:courseId/lessons/:id/edit
module.exports.showEdit = async (req, res) => {
  try {
    const l = await Lesson.findById(req.params.id).lean();
    if (!l) {
      req.flash?.('error', 'Bài học không hợp lệ.');
      return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);
    }

    const sections = await Section.find({ course: l.course }).sort({ sortOrder: 1 }).lean();

    res.render('admin/pages/lessons/form', {
      pageTitle: 'Sửa bài học',
      mode: 'edit',
      courseId: String(l.course),
      sections,
      lesson: { ...l, resources: Array.isArray(l.resources) ? l.resources : [] }
    });
  } catch (err) {
    console.error('[lessons.showEdit] error:', err);
    res.status(500).send('Cannot load edit form');
  }
};

// [PUT] /admin/courses/:courseId/lessons/:id
module.exports.update = async (req, res) => {
  try {
    const l = await Lesson.findById(req.params.id);
    if (!l) {
      req.flash?.('error', 'Bài học không hợp lệ.');
      return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);
    }

    const b = req.body;

    // Nếu đổi section -> push xuống cuối section mới
    let sectionId = l.section;
    if (b.section && Types.ObjectId.isValid(b.section) && String(b.section) !== String(l.section)) {
      const sec = await Section.findOne({ _id: b.section, course: l.course }).select('_id').lean();
      if (sec) {
        sectionId = sec._id;
        const last = await Lesson.findOne({ section: sectionId }).sort({ sortOrder: -1 }).select('sortOrder').lean();
        l.sortOrder = last?.sortOrder ? last.sortOrder + 1 : 1;
      }
    }

    // 1) URLs ngoài
    let resources = buildResourcesFromUrls(b.resourceUrls, detectKind);

    // 2) Files -> Cloudinary (kèm flash lỗi chi tiết)
    if (req.fileValidationError) {
      req.flash?.('error', req.fileValidationError);
      return res.redirect(`${prefixOf(req)}/lessons/${l._id}/edit`);
    }

    const uploads = collectMulterFiles(req);
    if (uploads.length) {
      const folder = `elearning/lessons/${String(l.course)}`;
      for (const [i, f] of uploads.entries()) {
        try {
          const r = await makeResourceFromFile(f, folder);
          r.order = resources.length + 1 + i;
          resources.push(r);
        } catch (e) {
          console.error('[cloudinary.upload] fail:', e);
          req.flash?.('warning', `Không thể upload ${f.originalname} lên Cloudinary (${e?.message || 'lỗi không rõ'}).`);
        }
      }
    }

    // đánh dấu primary cho phần tử đầu
    resources = resources.map((r, i) => ({ ...r, isPrimary: i === 0 }));

    await Lesson.updateOne(
      { _id: l._id },
      {
        $set: {
          section: sectionId,
          title: (b.title || '').trim(),
          type: VALID_TYPES.includes(b.type) ? b.type : l.type,
          contentText: b.contentText || '',
          durationSec: b.durationSec ? Math.max(0, Number(b.durationSec)) : undefined,
          isFreePreview: ['1', true, 'true'].includes(b.isFreePreview),
          resources,
          sortOrder: l.sortOrder
        }
      }
    );

    return res.redirect(`${prefixOf(req)}/courses/${String(l.course)}/lessons?section=${String(sectionId)}`);
  } catch (err) {
    console.error('[lessons.update] error:', err);
    req.flash?.('error', 'Không thể cập nhật bài học.');
    return res.redirect(prefixOf(req) + '/courses');
  }
};

// [DELETE] /admin/courses/:courseId/lessons/:id/delete
module.exports.remove = async (req, res) => {
  try {
    const l = await Lesson.findById(req.params.id).select('course section');
    if (l) await Lesson.deleteOne({ _id: l._id });
    req.flash("success", "Đã xóa bài học!");
    return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);
  } catch (err) {
    console.error('[lessons.remove] error:', err);
    return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);
  }
};

// [PATCH] /admin/courses/:courseId/lessons/:id/move
module.exports.move = async (req, res) => {
  try {
    const cur = await Lesson.findById(req.params.id);
    if (!cur) return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);

    const dir = req.body.dir === 'up' ? -1 : 1;
    const neighbor = await Lesson.findOne({
      section: cur.section,
      sortOrder: dir === -1 ? { $lt: cur.sortOrder } : { $gt: cur.sortOrder }
    }).sort({ sortOrder: dir });

    if (neighbor) {
      const t = cur.sortOrder;
      cur.sortOrder = neighbor.sortOrder;
      neighbor.sortOrder = t;
      await cur.save();
      await neighbor.save();
    }
    req.flash("success", "Đã thay đổi thứ tự bài học!");
    return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);
  } catch (err) {
    console.error('[lessons.move] error:', err);
    return res.redirect(req.get('referer') || `${prefixOf(req)}/courses`);
  }
};
