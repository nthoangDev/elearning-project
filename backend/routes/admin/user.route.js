const express = require("express");
const router = express.Router();
const controller = require('../../controller/admin/user.controller');
const { uploadAvatarImage } = require('../../middlewares/upload');

router.get("/", controller.list);

router.patch('/change-multi', controller.changeMulti);
router.patch('/:id/status', controller.changeStatus);
router.patch('/:id/toggle-lock', controller.toggleLock);
router.patch('/:id/grant-instructor', controller.grantInstructor);
router.patch('/:id/revoke-instructor', controller.revokeInstructor);
router.patch('/:id/grant-admin', controller.grantAdmin);
router.patch('/:id/revoke-admin', controller.revokeAdmin);
router.delete('/:id', controller.deleteItem);

router.get("/:id/edit", controller.showEdit);
router.put('/:id', uploadAvatarImage ,controller.update);

router.get('/create', controller.showCreate);
router.post('/',  uploadAvatarImage, controller.create);

module.exports = router;

