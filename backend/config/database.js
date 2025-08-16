const mongoose = require('mongoose');
const Course = require('../models/course.model');

module.exports.connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connnect Success!");
    } catch (error) {
        console.log("Connect Fail!")
    }
}
