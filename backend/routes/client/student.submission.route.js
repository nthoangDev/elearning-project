const express = require('express');
const router = express.Router();
const submissionCtl = require('../../controller/client/student.submission.controller');
const { uploadAssessmentFiles } = require('../../middlewares/upload');

router.post('/assessments/:assessmentId/submit-assignment', uploadAssessmentFiles, submissionCtl.submitAssignment);

router.post('/assessments/:assessmentId/submit-quiz', submissionCtl.submitQuiz);

module.exports = router;