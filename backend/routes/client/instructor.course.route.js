const express = require('express');
const router = express.Router();
const { requireInstructor, canManageCourse, canManageLesson } =
    require('../../middlewares/require-instructor');
const ctl = require('../../controller/client/instructor.course.controller');

// Courses
router.get('/my-courses', ctl.getMyCourses);


module.exports = router;
