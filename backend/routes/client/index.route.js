const instructorContentRoutes = require('./instructor.content.route');
const instructorCourseRoutes = require('./instructor.course.route');
const instructorAssessmentRoutes = require('./instructor.assessment.route');
const studentSubmissionRoutes = require('./student.submission.route');
const instructorStudentRoutes = require('./instructor.students.route');
const { requireInstructor } = require('../../middlewares/require-instructor');
const { requireStudent } = require('../../middlewares/require-student');

module.exports = (app) => {
    app.use('/api/instructor', requireInstructor, instructorContentRoutes);
    app.use('/api/instructor', instructorCourseRoutes);
    app.use('/api/instructor', requireInstructor, instructorAssessmentRoutes);
    app.use('/api/student', requireStudent, studentSubmissionRoutes);
    app.use('/api/instructor', requireInstructor, instructorStudentRoutes);
}

