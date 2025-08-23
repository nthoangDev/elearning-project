const instructorContentRoutes =  require('./instructor.content.route');

module.exports = (app) => {
    app.use('/api/instructor', instructorContentRoutes);
}

