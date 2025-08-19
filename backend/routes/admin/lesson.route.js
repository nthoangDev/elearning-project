const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../../controller/admin/lesson.controller');

const { uploadLessonFiles } = require('../../middlewares/upload');

router.get('/', controller.list);

router.get('/create', controller.showCreate);
router.post('/', uploadLessonFiles,  controller.create);

router.get('/:id/edit', controller.showEdit);
router.put('/:id',  uploadLessonFiles,  controller.update);

router.delete('/:id', controller.remove);
router.patch('/:id/move', controller.move);

module.exports = router;
