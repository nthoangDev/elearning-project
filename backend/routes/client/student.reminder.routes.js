const router = require('express').Router();
const ctrl = require('../../controller/client/student.reminder.controller');

router.post('/notifications/fcm/register', ctrl.registerFcmToken);
router.delete('/notifications/fcm/register', ctrl.unregisterFcmToken);

module.exports = router;
