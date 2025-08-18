const systemConfig = require("../../config/system");
const courseRoutes = require('./course.route');
const userRoutes = require("./user.route");

module.exports = (app)=>{
    const PATH_ADMIN = systemConfig.prefixAdmin;
    
    app.use(`${PATH_ADMIN}/courses`, courseRoutes);
    app.use(`${PATH_ADMIN}/users`, userRoutes);

}

