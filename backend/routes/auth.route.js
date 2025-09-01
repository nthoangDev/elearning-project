const express = require('express');
const router = express.Router();
const ctrl = require('../controller/auth.controller');
const { requireAuth } = require('../middlewares/auth');
const { uploadAvatarImage } = require('../middlewares/upload')

router.post('/register', uploadAvatarImage, ctrl.register);
router.post('/login',    ctrl.login);
router.post('/refresh',  ctrl.refresh);
router.post('/logout',   ctrl.logout);
router.get('/me',        requireAuth(), ctrl.me);

module.exports = router;
