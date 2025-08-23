const express = require('express');
const router = express.Router();
const ctrl = require('../controller/auth.controller');
const { requireAuth } = require('../middlewares/auth');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.post('/refresh',  ctrl.refresh);
router.post('/logout',   ctrl.logout);
router.get('/me',        requireAuth(), ctrl.me);

module.exports = router;
