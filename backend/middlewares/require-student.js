const mongoose = require('mongoose');
const { requireAuth } = require('./auth');
const Course = require('../models/course.model');
const Lesson = require('../models/lesson.model');
const { Assessment } = require('../models/assessment.model');
// const Enrollment = require('../models/enrollment.model');

const requireStudent = (req, res, next) =>
  requireAuth(['STUDENT', 'ADMIN'])(req, res, next);

async function hasEnrollment(userId, courseId) {
  if (!userId || !courseId) return false;
  const found = await Enrollment.exists({ user: userId, course: courseId });
  return !!found;
}

async function canAccessCourse(req, res, next) {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const course = await Course.findById(courseId)
      .select('_id title status createdBy')
      .lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user?.roles?.includes('ADMIN')) {
      req.course = course;
      req.enrollment = true;
      return next();
    }

    const ok = await hasEnrollment(req.user._id, course._id);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    req.course = course;
    req.enrollment = true;
    return next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function canAccessLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'Invalid lessonId' });
    }

    const lesson = await Lesson.findById(lessonId)
      .select('_id course isFreePreview')
      .lean();
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const course = await Course.findById(lesson.course)
      .select('_id title status createdBy')
      .lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user?.roles?.includes('ADMIN')) {
      req.lesson = lesson;
      req.course = course;
      req.enrollment = true;
      return next();
    }

    if (lesson.isFreePreview) {
      req.lesson = lesson;
      req.course = course;
      req.enrollment = false;
      return next();
    }

    const ok = await hasEnrollment(req.user._id, course._id);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    req.lesson = lesson;
    req.course = course;
    req.enrollment = true;
    return next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

async function canAccessAssessment(req, res, next) {
  try {
    const { assessmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ message: 'Invalid assessmentId' });
    }

    const asmt = await Assessment.findById(assessmentId)
      .select('_id course assessmentType title')
      .lean();
    if (!asmt) return res.status(404).json({ message: 'Assessment not found' });

    const course = await Course.findById(asmt.course)
      .select('_id title status createdBy')
      .lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user?.roles?.includes('ADMIN')) {
      req.assessment = asmt;
      req.course = course;
      req.enrollment = true;
      return next();
    }

    const ok = await hasEnrollment(req.user._id, course._id);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    req.assessment = asmt;
    req.course = course;
    req.enrollment = true;
    return next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  requireStudent,
  canAccessCourse,
  canAccessLesson,
  canAccessAssessment,
};
