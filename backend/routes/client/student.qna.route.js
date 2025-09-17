// routes/student.qna.route.js
const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/client/student.qna.controller');

// Lấy thread (bài nộp mới nhất + feedback + comments) theo assessmentId
router.get('/assessments/:assessmentId/thread', ctrl.getMySubmissionThread);

// Thêm comment vào submission
router.post('/submissions/:submissionId/comments', ctrl.addSubmissionComment);

// Xem submission theo id (optional)
router.get('/submissions/:submissionId', ctrl.getSubmissionById);

module.exports = router;
