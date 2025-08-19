const systemConfig = require("../../config/system");
const dashboardRotes = require('./dashboard.route');
const courseRoutes = require('./course.route');
const userRoutes = require("./user.route");
const sectionRoute = require('./section.route');
const lessonRoute = require('./lesson.route');

module.exports = (app) => {
    const PATH_ADMIN = systemConfig.prefixAdmin;

    app.use(`${PATH_ADMIN}/dashboard`, dashboardRotes);
    app.use(`${PATH_ADMIN}/courses`, courseRoutes);
    app.use(`${PATH_ADMIN}/users`, userRoutes);
    app.use(`${PATH_ADMIN}/courses/:courseId/sections`, sectionRoute);
    app.use(`${PATH_ADMIN}/courses/:courseId/lessons`, lessonRoute);

}

