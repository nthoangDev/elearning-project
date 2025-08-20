const { Types } = require('mongoose');
const Section = require('../../models/section.model');
const Lesson = require('../../models/lesson.model');

// [POST] /admin/courses/:courseId/sections
module.exports.create = async (req, res) => {
  try {
    const { courseId } = req.params;
    const prefix = req.app.locals.prefixAdmin;
    console.log(courseId)
    if (!Types.ObjectId.isValid(courseId)) {
      req.flash?.('error', 'courseId không hợp lệ.');
      return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
    }

    const title = (req.body.title || '').trim();
    const summary = (req.body.summary || '').trim();
    if (!title) {
      req.flash?.('error', 'Vui lòng nhập tiêu đề chương.');
      return res.redirect(`${prefix}/courses/${courseId}/lessons#createSectionForm`);
    }

    // sortOrder kế tiếp
    const last = await Section.findOne({ course: courseId })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const nextSort = last?.sortOrder ? last.sortOrder + 1 : 1;

    const sec = await Section.create({
      course: courseId,
      title,
      summary,
      sortOrder: nextSort
    });

    req.flash?.('success', 'Đã tạo chương mới.');
    return res.redirect(`${prefix}/courses/${courseId}/lessons`);
  } catch (err) {
    console.error('[sections.create] error:', err);
    req.flash?.('error', 'Không thể tạo chương, vui lòng thử lại.');
    const prefix = req.app.locals.prefixAdmin;
    return res.redirect(`${prefix}/courses/${req.params.courseId}/lessons#createSectionForm`);
  }
};


// [PUT] /admin/courses/:courseId/sections/:id
module.exports.update = async (req, res) => {
  const { id } = req.params;
  const sec = await Section.findById(id).select('course');
  if (!sec) {
    req.flash?.('error', 'Không tìm thấy chương');
    return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
  }

  await Section.updateOne(
    { _id: id },
    { $set: { title: (req.body.title || '').trim(), summary: req.body.summary || '' } }
  );

  req.flash?.('success', 'Đã chỉnh sửa chương.');
  return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
};

// [DELETE] /admin/courses/:courseId/sections/:id
module.exports.remove = async (req, res) => {
  const sec = await Section.findById(req.params.id).select('course');
  if (!sec) {
    req.flash?.('error', 'Không tìm thấy chương');
    return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
  }

  await Lesson.deleteMany({ section: sec._id });
  await Section.deleteOne({ _id: sec._id });

  req.flash?.('success', 'Đã xóa chương.');
  return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
};

// [PATCH] /admin/courses/:courseId/sections/:id/move
module.exports.move = async (req, res) => {
  const { id } = req.params;
  const dir = req.body.dir === 'up' ? -1 : 1;

  const cur = await Section.findById(id);
  if (!cur) {
    req.flash?.('error', 'Không tìm thấy chương');
    return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
  }

  const neighbor = await Section.findOne({
    course: cur.course,
    sortOrder: dir === -1 ? { $lt: cur.sortOrder } : { $gt: cur.sortOrder }
  }).sort({ sortOrder: dir }); // up -> -1, down -> +1

  if (neighbor) {
    const t = cur.sortOrder;
    cur.sortOrder = neighbor.sortOrder;
    neighbor.sortOrder = t;
    await cur.save();
    await neighbor.save();
  }
  req.flash?.('success', 'Đã thay đổi vị trí.');
  return res.redirect(req.get('referer') || `${prefix}/courses/${courseId}/lessons`);
};
