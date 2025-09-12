const router = require('express').Router();
const ctrl = require('../../controller/client/public.courses.controller');

router.get('/', ctrl.listPublicCourses);
router.get('/:idOrSlug', ctrl.getPublicCourseDetail);

module.exports = router;
