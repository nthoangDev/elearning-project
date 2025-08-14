const express = require('express');
const router = express.Router();
const controller = require('../../controller/admin/course.controller');
const { uploadCourseImage } = require('../../middlewares/upload');

// list
router.get('/', controller.list);
router.patch('/:id/status', controller.changeStatus);
router.patch('/change-multi', controller.changeMulti);
router.delete('/:id', controller.deleteItem);

// create
router.get('/create', controller.showCreate);
router.post('/create', uploadCourseImage , controller.create);

module.exports = router;
