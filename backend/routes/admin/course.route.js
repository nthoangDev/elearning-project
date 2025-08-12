const express = require('express');
const router = express.Router();
const controller = require('../../controller/admin/course.controller');
const { uploadCourseImage } = require('../../middlewares/upload');

router.get('/', controller.list);
router.patch('/:id/status', controller.changeStatus);
router.patch('/change-multi', controller.changeMulti);
router.delete('/:id', controller.deleteItem);

module.exports = router;
