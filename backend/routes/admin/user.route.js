const express = require("express");
const router = express.Router();
const controller = require('../../controller/admin/user.controller');

router.get("/", controller.list);

// Tác vụ hàng loạt
router.patch('/change-multi', controller.changeMulti);

// Change Status
router.patch('/:id/status', controller.changeStatus);

module.exports = router;

