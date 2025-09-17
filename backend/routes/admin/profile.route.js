const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/admin/profile.controller');

router.get('/profile', ctrl.mePage);

module.exports = router;
