const systemConfig = require("../../config/system");
const courseRoutes = require('../admin/course.route');

module.exports = (app)=>{
    const PATH_ADMIN = systemConfig.prefixAdmin;
    
    app.use(`${PATH_ADMIN}/courses`, courseRoutes);
}

