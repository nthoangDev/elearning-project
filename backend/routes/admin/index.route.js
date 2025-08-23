const systemConfig = require("../../config/system");
const dashboardRotes = require('./dashboard.route');
const courseRoutes = require('./course.route');
const userRoutes = require("./user.route");
const sectionRoutes = require('./section.route');
const lessonRoutes = require('./lesson.route');
const authRoutes = require('../auth.route');
const adminAuthRoutes = require('./auth.route');
const profileRoutes = require('./profile.route');
const { requireAdmin } = require('../../middlewares/auth');

module.exports = (app) => {
    const PATH_ADMIN = systemConfig.prefixAdmin;
    app.use(`${PATH_ADMIN}`, adminAuthRoutes);
    app.use(`${PATH_ADMIN}/dashboard`, requireAdmin, dashboardRotes);
    app.use(`${PATH_ADMIN}/courses`, requireAdmin, courseRoutes);
    app.use(`${PATH_ADMIN}/users`, requireAdmin, userRoutes);
    app.use(`${PATH_ADMIN}/courses/:courseId/sections`, requireAdmin, sectionRoutes);
    app.use(`${PATH_ADMIN}/courses/:courseId/lessons`, requireAdmin, lessonRoutes);
    app.use('/auth', authRoutes);
    app.use(`${PATH_ADMIN}`, requireAdmin, profileRoutes);
}

