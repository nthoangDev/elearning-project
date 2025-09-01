const express = require('express');
const router = express.Router();
const { requireInstructor, canManageCourse, canManageLesson } =
    require('../../middlewares/require-instructor');
const ctl = require('../../controller/client/instructor.content.controller');
const { uploadLessonFiles } = require('../../middlewares/upload');


// xác thực quyền quản lý khóa học
router.use('/courses/:courseId', canManageCourse);

// Courses
router.get('/courses/:courseId/content', ctl.getStructure);
router.get('/courses/:courseId/sections', ctl.listSections);
router.post('/courses/:courseId/sections', ctl.createSection);
router.put('/courses/:courseId/sections/:sectionId', ctl.updateSection);
router.delete('/courses/:courseId/sections/:sectionId', ctl.deleteSection);
router.patch('/courses/:courseId/sections/:sectionId/move', ctl.moveSection);

// Lesson
router.get('/lessons/:lessonId', requireInstructor , canManageLesson, ctl.getLessonDetail);
router.post('/courses/:courseId/sections/:sectionId/lessons', uploadLessonFiles, ctl.createLesson);
router.put('/lessons/:lessonId', canManageLesson, uploadLessonFiles, ctl.updateLesson);
router.delete('/lessons/:lessonId', canManageLesson, ctl.deleteLesson);

module.exports = router;
