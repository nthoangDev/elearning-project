const Lesson = require('../../models/lesson.model');
const Section = require('../../models/section.model');
const { detectKind } = require('../../helpers/detectKind');

// Chuyển textarea (mỗi dòng 1 URL) thành mảng resources
function buildResourcesFromUrls(raw) {
  const urls = []
    .concat(raw || [])
    .join('\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  return urls.map((url, idx) => ({
    url,
    kind: detectKind(url),
    order: idx + 1,
    isPrimary: idx === 0
  }));
}

// [GET] /admin/courses/:courseId/lessons
module.exports.list = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { section: qSection } = req.query;


    const sectionFilter = qSection ? { _id: qSection, course: courseId } : { course: courseId };
    const sections = await Section.find(sectionFilter).sort({ sortOrder: 1 }).lean();

    let lessons = [];
    if (sections.length) {
      if (qSection) {
        lessons = await Lesson.find({ section: qSection })
          .sort({ section: 1, sortOrder: 1, createdAt: 1 })
          .lean();
      } else {
        const sectionIds = sections.map(s => s._id);
        lessons = await Lesson.find({ section: { $in: sectionIds } })
          .sort({ section: 1, sortOrder: 1, createdAt: 1 })
          .lean();
      }
    }

    // Nhóm lesson theo sectionId
    const bySection = new Map();
    for (const s of sections) bySection.set(String(s._id), []);
    for (const l of lessons) {
      const key = String(l.section);
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(l);
    }

    const data = sections.map(s => ({
      ...s,
      lessons: bySection.get(String(s._id)) || []
    }));

    res.render('admin/pages/lessons/index', {
      pageTitle: 'Bài học trong khóa',
      courseId: courseId,
      sections: data,         // [{ _id, name..., lessons: [...] }]
      totalSections: sections.length,
      totalLessons: lessons.length,
      filterSection: qSection || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Cannot load lessons list');
  }
};

// [GET] /admin/courses/:courseId/lessons/create?section=<id>
module.exports.showCreate = async (req, res) => {
  const { courseId } = req.params;
  const sections = await Section.find({ course: courseId }).sort({ sortOrder: 1 }).lean();

  res.render('admin/pages/lessons/form', {
    pageTitle: 'Thêm bài học',
    mode: 'create',
    courseId,
    sections,
    lesson: {}
  });
};

// [POST] /admin/courses/:courseId/lessons
// Nếu muốn upload file thật: gắn middleware uploadLessonFiles ở route (xem phần router)
module.exports.create = async (req, res) => {
  const { courseId } = req.params;
  const b = req.body;

  const last = await Lesson.find({ section: b.section }).sort({ sortOrder: -1 }).limit(1);
  const nextSort = last[0]?.sortOrder ? last[0].sortOrder + 1 : 1;

  // Tài nguyên từ textarea URLs
  let resources = buildResourcesFromUrls(b.resourceUrls);

  //   (Tuỳ chọn) Nếu bạn bật upload nhiều file:
  if (req.files?.length) {
    for (const [idx, f] of req.files.entries()) {
      resources.push({
        url: `/uploads/lessons/${f.filename}`, // chú ý: chỉ truy cập được nếu bạn lưu dưới /public/uploads
        kind: f.mimetype.startsWith('video/') ? 'VIDEO'
          : f.mimetype === 'application/pdf' ? 'PDF'
            : f.mimetype.startsWith('image/') ? 'IMAGE'
              : f.mimetype.startsWith('audio/') ? 'AUDIO'
                : 'OTHER',
        mime: f.mimetype,
        size: f.size,
        order: resources.length + 1 + idx
      });
    }
  }

  await Lesson.create({
    course: courseId,
    section: b.section,
    title: (b.title || '').trim(),
    type: b.type || 'VIDEO',
    contentText: b.contentText,
    durationSec: b.durationSec ? Number(b.durationSec) : undefined,
    isFreePreview: b.isFreePreview === '1',
    sortOrder: nextSort,
    resources
  });

  res.redirect(`${req.app.locals.prefixAdmin}/courses/${courseId}/content`);
};

// [GET] /admin/lessons/:id/edit
module.exports.showEdit = async (req, res) => {
  const l = await Lesson.findById(req.params.id);
  if (!l) return res.status(404).send('Lesson not found');

  const sections = await Section.find({ course: l.course }).sort({ sortOrder: 1 }).lean();

  res.render('admin/pages/lessons/form', {
    pageTitle: 'Sửa bài học',
    mode: 'edit',
    courseId: l.course,
    sections,
    lesson: l
  });
};

// [POST] /admin/lessons/:id?_method=PUT
module.exports.update = async (req, res) => {
  const { id } = req.params;
  const l = await Lesson.findById(id);
  if (!l) return res.status(404).send('Lesson not found');

  const b = req.body;
  let resources = buildResourcesFromUrls(b.resourceUrls);

  // (Tuỳ chọn) gộp thêm file upload nếu bật middleware
  if (req.files?.length) {
    for (const [idx, f] of req.files.entries()) {
      resources.push({
        url: `/uploads/lessons/${f.filename}`,
        kind: f.mimetype.startsWith('video/') ? 'VIDEO'
          : f.mimetype === 'application/pdf' ? 'PDF'
            : f.mimetype.startsWith('image/') ? 'IMAGE'
              : f.mimetype.startsWith('audio/') ? 'AUDIO'
                : 'OTHER',
        mime: f.mimetype,
        size: f.size,
        order: resources.length + 1 + idx
      });
    }
  }

  await Lesson.updateOne(
    { _id: id },
    {
      $set: {
        section: b.section || l.section,
        title: (b.title || '').trim(),
        type: b.type || l.type,
        contentText: b.contentText,
        durationSec: b.durationSec ? Number(b.durationSec) : undefined,
        isFreePreview: b.isFreePreview === '1',
        resources
      }
    }
  );

  res.redirect(`${req.app.locals.prefixAdmin}/courses/${l.course}/content`);
};

// [POST] /admin/lessons/:id?_method=DELETE
module.exports.remove = async (req, res) => {
  const l = await Lesson.findById(req.params.id).select('course');
  if (!l) return res.redirect('back');
  await Lesson.deleteOne({ _id: l._id });
  res.redirect(`${req.app.locals.prefixAdmin}/courses/${l.course}/content`);
};

// [POST] /admin/lessons/:id/move?_method=PATCH (body.dir = up|down)
module.exports.move = async (req, res) => {
  const { id } = req.params;
  const dir = req.body.dir === 'up' ? -1 : 1;

  const cur = await Lesson.findById(id);
  if (!cur) return res.redirect('back');

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
  res.redirect(`${req.app.locals.prefixAdmin}/courses/${cur.course}/content`);
};
