const express = require('express');
const router = express.Router();
const controller = require('../../controller/admin/content.controller');

router.get('/courses/:courseId/content', controller.outline);

module.exports = router;
