const router = require('express').Router();
const ctrl = require('../../controller/client/public.topics.controller');

router.get('/', ctrl.listPublicTopics);

module.exports = router;
