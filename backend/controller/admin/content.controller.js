// controller/admin/content.controller.js
const Course  = require('../../models/course.model');   
const Section = require('../../models/section.model');
const Lesson  = require('../../models/lesson.model');

// [GET] /admin/courses/:courseId/content
module.exports.outline = async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId).select('title slug');
  if (!course) return res.status(404).send('Course not found');

  const sections = await Section.find({ course: courseId }).sort({ sortOrder: 1 }).lean();

  const lessonsBySection = {};
  const secIds = sections.map(s => s._id);
  const lessons = await Lesson.find({ section: { $in: secIds } }).sort({ sortOrder: 1 }).lean();
  lessons.forEach(ls => {
    const key = String(ls.section);
    if (!lessonsBySection[key]) lessonsBySection[key] = [];
    lessonsBySection[key].push(ls);
  });

  res.render('admin/pages/content/outline', {
    pageTitle: `Nội dung: ${course.title}`,
    activeMenu: 'courses',
    course,
    sections,
    lessonsBySection
  });
};
