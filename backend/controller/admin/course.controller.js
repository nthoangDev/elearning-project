const Course = require('../../models/course.model');
const Topic = require('../../models/topic.model');
const User = require('../../models/user.model');
const fs = require('fs');
const cloudinary = require('../../config/cloudinary');

const searchHelper = require("../../helpers/search");
const filterStatus = require("../../helpers/filterStatus");
const pagination = require("../../helpers/pagination");

const STATUSES = [
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'UNLISTED', label: 'Không liệt kê' },
    { value: 'ARCHIVED', label: 'Đã lưu trữ' }
];

// GET /admin/courses
module.exports.list = async (req, res) => {

    const filters = { deleted: false };
    // Tìm kiếm 
    const objSearch = searchHelper(req.query);
    if (objSearch.regex) {
        filters.title = objSearch.regex;
    }

    // Lọc 
    if (req.query.status) filters.status = req.query.status;

    //Phân trang
    const count = await Course.countDocuments(filters);
    const pagi = pagination(req.query, count, 12)

    const items = await Course.find(filters)
        .populate('topic', 'name')
        .populate('instructors.user', 'fullName email')
        .sort({ publishedAt: -1 })
        .skip(pagi.skip)
        .limit(pagi.limitItem);

    res.render('admin/pages/courses/index', {
        pageTitle: "Quản lý khóa học",
        activeMenu: 'course',
        courses: items,
        filterStatus: filterStatus(req.query, STATUSES),
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
    const type = req.body.type; // trong html
    const ids = (req.body.inputIds || '') // gửi thông qua scripts.js
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
    }

    res.redirect(req.get('referer') || '/admin/courses');
};

// [DELETE] /admin/courses/:id  (xoá mềm)
module.exports.deleteItem = async (req, res) => {
    const id = req.params.id;
    await Course.updateOne({ _id: id }, { $set: { deleted: true } });
    res.redirect(req.get('referer') || '/admin/courses');
};


// GET /admin/courses/create
module.exports.showCreate = async (req, res) => {
    const [topics, instructors] = await Promise.all([
        Topic.find({}).select('name').sort('name'),
        User.find({ roles: 'INSTRUCTOR', status: 'ACTIVE' })
            .select('fullName email')
            .sort('fullName')
    ]);

    res.render('admin/pages/courses/form', {
        pageTitle: "Tạo khóa học",
        activeMenu: 'courses',
        mode: 'create',
        topics, instructors,
        course: {}
    });

}

// POST /admin/courses/create
module.exports.create = async (req, res) => {
    try {
        // Nếu file sai định dạng từ multer -> render lại form
        if (req.fileValidationError) {
            const [topics, instructors] = await Promise.all([
                Topic.find({}).select('name'),
                User.find({ roles: 'INSTRUCTOR', status: 'ACTIVE' }).select('fullName email')
            ]);
            return res.status(400).render('admin/pages/courses/form', {
                pageTitle: 'Tạo khóa học',
                mode: 'create',
                topics, instructors,
                course: req.body,
                error: req.fileValidationError
            });
        }

        const instructorIds = []
            .concat(req.body.instructors || [])
            .filter(Boolean);

        const payload = {
            title: req.body.title?.trim(),
            slug: req.body.slug?.trim(),
            description: req.body.description,
            topic: req.body.topic || null,
            level: req.body.level || 'BEGINNER',
            price: Number(req.body.price || 0),
            salePrice: req.body.salePrice ? Number(req.body.salePrice) : undefined,
            status: req.body.status || 'DRAFT',
            visibility: req.body.visibility || 'PUBLIC',
            instructors: instructorIds.map(id => ({ user: id, role: 'MAIN' }))
        };

        if (req.file) {
            const folder = process.env.CLOUDINARY_FOLDER_COURSES || 'elearning/courses';
            const result = await cloudinary.uploader.upload(req.file.path, { folder, resource_type: 'image' });
            payload.imageUrl = result.secure_url;
            fs.unlink(req.file.path, () => { });
        }

        await Course.create(payload);
        res.redirect(`${req.app.locals.prefixAdmin}/courses`);
    } catch (err) {
        if (req.file?.path) fs.unlink(req.file.path, () => { });
        if (err.code === 11000 && err.keyPattern?.slug) return res.redirect('back');
        throw err;
    }
};

// GET /admin/courses/:id/edit
module.exports.showEdit = async (req, res) => {
    const id = req.params.id;

    const [course, topics, instructors] = await Promise.all([
        Course.findById(id),
        Topic.find({}).select('name').sort('name'),
        User.find({ roles: 'INSTRUCTOR', status: 'ACTIVE' })
            .select('fullName email')
            .sort('fullName')
    ]);

    if (!course) return res.status(404).send('Course not found');

    res.render('admin/pages/courses/form', {
        pageTitle: 'Sửa khóa học',
        activeMenu: 'courses',
        mode: 'edit',
        topics,
        instructors,
        course
    });
};


// PUT /admin/courses/:id/edit
module.exports.update = async (req, res) => {
    const id = req.params.id;

    try {
        if (req.fileValidationError) {
            const [course, topics, instructors] = await Promise.all([
                Course.findById(id),
                Topic.find({}).select('name').sort('name'),
                User.find({ roles: 'INSTRUCTOR', status: 'ACTIVE' })
                    .select('fullName email')
                    .sort('fullName')
            ]);

            return res.status(400).render('admin/pages/courses/form', {
                pageTitle: 'Sửa khóa học',
                activeMenu: 'courses',
                mode: 'edit',
                topics,
                instructors,
                course: { ...(course?.toObject() || {}), ...req.body },
                error: req.fileValidationError
            });
        }

        const old = await Course.findById(id);
        if (!old) return res.status(404).send('Course not found');

        const instructorIds = []
            .concat(req.body.instructors || [])
            .filter(Boolean);

        // dữ liệu cập nhật
        const update = {
            title: (req.body.title || '').trim(),
            slug: (req.body.slug || '').trim(),
            description: req.body.description,
            topic: req.body.topic || null,
            level: req.body.level || 'BEGINNER',
            price: Number(req.body.price || 0),
            salePrice: req.body.salePrice ? Number(req.body.salePrice) : undefined,
            status: req.body.status || 'DRAFT',
            visibility: req.body.visibility || 'PUBLIC',
            instructors: instructorIds.map(id => ({ user: id, role: 'MAIN' }))
        };

        // ảnh mới -> upload Cloudinary rồi xóa file tạm
        if (req.file) {
            const folder = process.env.CLOUDINARY_FOLDER_COURSES || 'elearning/courses';
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder,
                resource_type: 'image'
            });
            update.imageUrl = result.secure_url;
            fs.unlink(req.file.path, () => { });
        }

        await Course.findByIdAndUpdate(id, update);
        res.redirect(`${req.app.locals.prefixAdmin}/courses`);
    } catch (err) {
        if (req.file?.path) fs.unlink(req.file.path, () => { });
        // slug trùng → render lại form với lỗi dễ hiểu
        if (err.code === 11000 && err.keyPattern?.slug) {
            const [course, topics, instructors] = await Promise.all([
                Course.findById(id),
                Topic.find({}).select('name').sort('name'),
                User.find({ roles: 'INSTRUCTOR', status: 'ACTIVE' })
                    .select('fullName email')
                    .sort('fullName')
            ]);
            return res.status(400).render('admin/pages/courses/form', {
                pageTitle: 'Sửa khóa học',
                activeMenu: 'courses',
                mode: 'edit',
                topics,
                instructors,
                course: { ...(course?.toObject() || {}), ...req.body },
                error: 'Slug đã tồn tại, vui lòng chọn slug khác.'
            });
        }
        throw err;
    }
};
