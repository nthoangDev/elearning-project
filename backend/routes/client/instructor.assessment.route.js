const router = require('express').Router();
const {canManageCourse } = require('..//../middlewares/require-instructor');
const ctl = require('../../controller/client/instructor.assessment.controller');
const gd  = require('../../controller/client/instructor.grading.controller');

router.use('/courses/:courseId', canManageCourse);

router.post('/lessons/:lessonId/assessments/assignment', ctl.createAssignment);
router.post('/lessons/:lessonId/assessments/quiz', ctl.createQuiz);
router.put('/assessments/:assessmentId', ctl.updateAssessment);
router.delete('/assessments/:assessmentId', ctl.deleteAssessment);
router.post('/lessons/:lessonId/assessments/:assessmentId/attach', ctl.attachToLesson);

// grading
router.get('/assessments/:assessmentId/submissions', gd.listSubmissions);
router.get('/submissions/:submissionId', gd.getSubmission);
router.post('/submissions/:submissionId/grade', gd.gradeSubmission);
router.post('/submissions/:submissionId/comments', gd.commentSubmission);

module.exports = router;
