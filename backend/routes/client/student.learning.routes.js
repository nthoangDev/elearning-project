const router = require('express').Router();
const ctrl = require('../../controller/client/student.learning.controller');

// Khoá & Outline
router.get('/courses/:courseId/outline', ctrl.getCourseOutlineForStudent);
router.get('/lessons/:lessonId', ctrl.getLessonForStudent);

// Đánh dấu hoàn thành
router.post('/lessons/:lessonId/complete', ctrl.markLessonComplete);
router.post('/lessons/:lessonId/uncomplete', ctrl.markLessonUncomplete);

// Tiến độ
router.get('/courses/:courseId/progress', ctrl.getCourseProgress);

// Deadline
router.get('/deadlines', ctrl.listUpcomingDeadlines);

// (tuỳ chọn) danh sách khoá đã ghi danh
router.get('/my-courses', ctrl.listMyCourses);

module.exports = router;
