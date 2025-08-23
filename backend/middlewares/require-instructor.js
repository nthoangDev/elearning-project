const mongoose = require('mongoose');
const { requireAuth } = require('./auth');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');

const requireInstructor = (req, res, next) =>
  requireAuth(['INSTRUCTOR', 'ADMIN'])(req, res, next);

// Helper: kiểm tra user có quyền quản lý course
function isCourseManager(user, course, { allowTAs = false } = {}) {
  const uid = String(user._id);

  if (user.roles?.includes('ADMIN')) return true;
  if (course.createdBy && String(course.createdBy) === uid) return true;

  const allowedRoles = allowTAs ? ['MAIN', 'CO', 'TA'] : ['MAIN', 'CO'];
  return (course.instructors || []).some(
    (i) => String(i.user) === uid && allowedRoles.includes(i.role)
  );
}

async function canManageCourse(req, res, next) {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const course = await Course.findById(courseId)
      .select('_id createdBy instructors.user instructors.role')
      .lean();

    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (!isCourseManager(req.user, course)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.course = course;
    return next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function canManageLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'Invalid lessonId' });
    }

    const lesson = await Lesson.findById(lessonId).select('_id course').lean();
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const course = await Course.findById(lesson.course)
      .select('_id createdBy instructors.user instructors.role')
      .lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (!isCourseManager(req.user, course)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.course = course;
    req.lesson = lesson;
    return next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  requireInstructor,
  canManageCourse,
  canManageLesson,
};
