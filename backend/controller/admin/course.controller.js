const Course = require('../../models/course.model');
const Topic = require('../../models/topic.model');
const User = require('../../models/user.models');

const searchHelper = require("../../helpers/search");
const filterStatus = require("../../helpers/filterStatus");
const pagination = require("../../helpers/pagination");

// GET /admin/courses
module.exports.list = async (req, res) => {

    const filters = { deleted: false };
    // Tìm kiếm 
    const objSearch = searchHelper(req.query);
    if (objSearch.regex) {
        filters.title = objSearch.keyword;
    }


    // Lọc 
    if (req.query.status) filters.status = req.query.status;
    // if (req.query.topic) filters.topic = req.query.topic;
    // if (req.query.instructor) filters['instructors.user'] = req.query.instructor;

    const count = await Course.countDocuments(filters);
    const pagi = pagination(req.query, count, 12)

    const items = await Course.find(filters)
        .populate('topic', 'name')
        .populate('instructors.user', 'fullName email')
        .sort({ publishedAt: -1 })
        .skip(pagi.skip)
        .limit(pagi.limitItem);
    // console.info(items)

    res.render('admin/pages/courses/index', {
        pageTitle: "Quản lý khóa học",
        activeMenu: 'course',
        courses: items,
        filterStatus: filterStatus(req.query, count),
        pagination: pagi,
        keyword: req.query.keyword || ''
    });
}


// [PATCH] /admin/courses/:id/status
module.exports.changeStatus = async (req, res) => {
    const id = req.params.id;
    const status = req.body.status;
    const allowed = ['DRAFT', 'PUBLISHED', 'UNLISTED', 'ARCHIVED'];

    if (!allowed.includes(status)) {
        return res.redirect(req.get('referer') || '/admin/courses');
    }

    await Course.updateOne({ _id: id }, { $set: { status } });
    res.redirect(req.get('referer') || '/admin/courses');
};

// [POST] /admin/courses/change-multi
module.exports.changeMulti = async (req, res) => {
    const type = req.body.type;  
    const ids = (req.body.ids || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    if (!ids.length || !type) {
        return res.redirect(req.get('referer') || '/admin/courses');
    }

    const allowed = ['DRAFT', 'PUBLISHED', 'UNLISTED', 'ARCHIVED'];

    if (type.startsWith('status:')) {
        const next = type.split(':')[1];
        if (!allowed.includes(next)) {
            return res.redirect(req.get('referer') || '/admin/courses');
        }
        await Course.updateMany({ _id: { $in: ids } }, { $set: { status: next } });
    } else if (type === 'delete') {
        await Course.updateMany({ _id: { $in: ids } }, { $set: { deleted: true } });
    } else if (type === 'restore') {
        await Course.updateMany({ _id: { $in: ids } }, { $set: { deleted: false } });
    }

    res.redirect(req.get('referer') || '/admin/courses');
};

// [DELETE] /admin/courses/:id  (xoá mềm)
module.exports.deleteItem = async (req, res) => {
    const id = req.params.id;
    await Course.updateOne({ _id: id }, { $set: { deleted: true } });
    res.redirect(req.get('referer') || '/admin/courses');
};


