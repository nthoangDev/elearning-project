const instructorContentRoutes = require('./instructor.content.route');
const instructorCourseRoutes = require('./instructor.course.route');
const instructorAssessmentRoutes = require('./instructor.assessment.route');
const studentSubmissionRoutes = require('./student.submission.route');
const instructorStudentRoutes = require('./instructor.students.route');
const publicCourseRoutes = require('./public.courses.route');
const publicTopicRoutes = require('./public.topic.route');
const studentCartRoutes = require('./student.cart.routes');
const studentCheckoutRoutes = require('./student.checkout.routes');
const studentWebhookRoutes = require('./webhooks.routes');
const studentLearningRoutes = require('./student.learning.routes');
const studentReminderRoutes = require('./student.reminder.routes');
const studentQnaRoutes = require('./student.qna.route');
const { requireInstructor } = require('../../middlewares/require-instructor');
const { requireStudent } = require('../../middlewares/require-student');

module.exports = (app) => {
    app.use('/api/instructor', requireInstructor, instructorContentRoutes);
    app.use('/api/instructor', requireInstructor, instructorCourseRoutes);
    app.use('/api/instructor', requireInstructor, instructorAssessmentRoutes);
    app.use('/api/instructor', requireInstructor, instructorStudentRoutes);
    app.use('/api/public/courses', publicCourseRoutes);
    app.use('/api/public/topics', publicTopicRoutes);
    app.use('/api/student', requireStudent, studentSubmissionRoutes);
    app.use('/api/student', requireStudent, studentCartRoutes);
    app.use('/api/student', requireStudent, studentCheckoutRoutes);
    app.use('/api/student', requireStudent, studentLearningRoutes);
    app.use('/api/student', requireStudent, studentReminderRoutes);
    app.use('/api/student', requireStudent, studentQnaRoutes);
    app.use('/api', studentWebhookRoutes);

}

