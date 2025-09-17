// controllers/instructor/assessments.controller.js
const mongoose = require('mongoose');
const { Assessment } = require('../../models/assessment.model');
const Lesson = require('../../models/lesson.model');

// [POST] /api/instructor/lessons/:lessonId/assessments/assignment
exports.createAssignment = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId))
      return res.status(400).json({ message: 'Invalid lessonId' });

    const lesson = await Lesson.findById(lessonId).select('_id course');
    if (!lesson) return res.status(404).send('Lesson not found');

    const {
      title, description, points = 100, availableAt, dueAt, maxScore = 100
    } = req.body;

    const doc = await Assessment.create({
      course: lesson.course,
      lesson: lesson._id,
      assessmentType: 'ASSIGNMENT',
      title, description, points, availableAt, dueAt, maxScore,
      createdBy: req.user._id
    });

    await Lesson.updateOne({ _id: lesson._id }, { $addToSet: { assessments: doc._id } });

    res.status(201).json(doc);
  } catch (e) { next(e); }
};

// [POST] /api/instructor/lessons/:lessonId/assessments/quiz
exports.createQuiz = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId))
      return res.status(400).json({ message: 'Invalid lessonId' });

    const lesson = await Lesson.findById(lessonId).select('_id course');
    if (!lesson) return res.status(404).send('Lesson not found');

    const {
      title, description, points = 100, availableAt, dueAt,
      durationMinutes = 0, passScore = 60, shuffleQuestions = false,
      attemptsAllowed = 1, questions = []
    } = req.body;

    const doc = await Assessment.create({
      course: lesson.course,
      lesson: lesson._id,
      assessmentType: 'QUIZ',
      title, description, points, availableAt, dueAt,
      durationMinutes, passScore, shuffleQuestions, attemptsAllowed, questions,
      createdBy: req.user._id
    });

    await Lesson.updateOne({ _id: lesson._id }, { $addToSet: { assessments: doc._id } });

    res.status(201).json(doc);
  } catch (e) { next(e); }
};

// (tuỳ chọn) vẫn giữ API attach — giờ sẽ set luôn field lesson trên assessment
// [POST] /api/instructor/lessons/:lessonId/assessments/:assessmentId/attach
exports.attachToLesson = async (req, res, next) => {
  try {
    const { lessonId, assessmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId) || !mongoose.Types.ObjectId.isValid(assessmentId))
      return res.status(400).json({ message: 'Invalid id' });

    const lesson = await Lesson.findById(lessonId).select('_id course');
    if (!lesson) return res.status(404).send('Lesson not found');

    const upA = await Assessment.findByIdAndUpdate(
      assessmentId,
      { $set: { lesson: lesson._id, course: lesson.course } }, 
      { new: true }
    );
    if (!upA) return res.status(404).send('Assessment not found');

    await Lesson.updateOne({ _id: lesson._id }, { $addToSet: { assessments: upA._id } });

    res.json(upA);
  } catch (e) { next(e); }
};

// [PUT] /api/instructor/assessments/:assessmentId
exports.updateAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    // KHÔNG cho đổi lesson ở đây (nếu cần, dùng attachToLesson)
    const { lesson, course, ...patch } = req.body || {};

    const doc = await Assessment.findByIdAndUpdate(
      assessmentId,
      { $set: patch },
      { new: true }
    );
    if (!doc) return res.status(404).send('Assessment not found');
    res.json(doc);
  } catch (e) { next(e); }
};

// [DELETE] /api/instructor/assessments/:assessmentId
exports.deleteAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const del = await Assessment.findByIdAndDelete(assessmentId);
    if (!del) return res.status(404).send('Not found');
    await Lesson.updateMany({ assessments: assessmentId }, { $pull: { assessments: assessmentId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
};
