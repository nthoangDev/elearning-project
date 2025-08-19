const express = require('express');
const router =  express.Router({ mergeParams: true });
const controller = require('../../controller/admin/section.controller');

router.post('/', controller.create);

router.put('/:id', controller.update);

router.delete('/:id', controller.remove);
router.patch('/:id/move', controller.move);

module.exports = router;
