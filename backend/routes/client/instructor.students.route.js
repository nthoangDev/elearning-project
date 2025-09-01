const express = require('express');
const router = express.Router();

const { canManageCourse } = require('../../middlewares/require-instructor');

const ctl = require('../../controller/client/instructor.students.controller');

router.get('/courses/:courseId/students', canManageCourse, ctl.listCourseStudents);

module.exports = router;
