const mongoose = require('mongoose');
const Course = require('../../models/course.model');
const Section = require('../../models/section.model');
const Lesson = require('../../models/lesson.model');
const Topic = require('../../models/topic.model');

// Helper
const toObjectId = (v) =>
    mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null;

// [GET] /api/public/courses
exports.listPublicCourses = async (req, res, next) => {
    try {
        let {
            q = '',
            topic,
            instructor,
            minPrice,
            maxPrice,
            sort = 'popular',
            page = 1,
            pageSize = 20,
        } = req.query;

        page = Math.max(1, Number(page) || 1);
        pageSize = Math.min(50, Math.max(1, Number(pageSize) || 20));
        const skip = (page - 1) * pageSize;

        // Chỉ hiển thị khóa công khai
        const cond = {
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            deleted: { $ne: true },
        };

        // Lọc theo topic (id hoặc slug)
        if (topic) {
            const topicId = toObjectId(topic);
            if (topicId) {
                cond.topic = topicId;
            } else {
                const t = await Topic.findOne({ slug: topic }).select('_id').lean();
                if (t?._id) cond.topic = t._id;
            }
        }

        // Lọc theo instructor (userId) – vì instructors là mảng subdoc
        if (instructor) {
            const uid = toObjectId(instructor);
            if (uid) cond['instructors.user'] = uid;
        }

        // Lọc theo khoảng giá
        if (minPrice || maxPrice) {
            cond.price = {};
            if (minPrice) cond.price.$gte = Number(minPrice);
            if (maxPrice) cond.price.$lte = Number(maxPrice);
        }

        // Tìm kiếm
        let findQuery;
        if (q && Course.schema.indexes().some(([spec]) => Object.keys(spec).includes('_fts'))) {
            findQuery = Course.find(
                { ...cond, $text: { $search: q } },
                { score: { $meta: 'textScore' } }
            ).sort({ score: { $meta: 'textScore' }, ratingCount: -1, ratingAvg: -1 });
        } else if (q) {
            findQuery = Course.find({
                ...cond,
                title: { $regex: q, $options: 'i' },
            });
        } else {
            findQuery = Course.find(cond);
        }

        // Sắp xếp
        const sortMap = {
            popular: { ratingCount: -1, ratingAvg: -1, createdAt: -1 },
            newest: { createdAt: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
        };
        if (!q) findQuery = findQuery.sort(sortMap[sort] || sortMap.popular);

        const select =
            'title slug description imageUrl price salePrice currency ratingAvg ratingCount level language durationLabel topic instructors createdAt';
        const [items, total] = await Promise.all([
            findQuery
                .select(select)
                .populate('topic', 'name slug')
                .populate('instructors.user', 'fullName avatarUrl') // ✅ đúng path
                .skip(skip)
                .limit(pageSize)
                .lean(),
            Course.countDocuments(findQuery.getFilter()),
        ]);

        const normalized = items.map((c) => ({
            ...c,
            instructors:
                (c.instructors || []).map((it) => ({
                    _id: it?.user?._id,
                    fullName: it?.user?.fullName,
                    avatarUrl: it?.user?.avatarUrl,
                    role: it?.role,
                })) || [],
        }));

        res.json({ items: normalized, total, page, pageSize });
    } catch (e) {
        next(e);
    }
};

// GET /api/public/courses/:idOrSlug
// Trả course + sections + lessons (chỉ metadata, không trả nội dung chi tiết)
exports.getPublicCourseDetail = async (req, res, next) => {
    try {
        const { idOrSlug } = req.params;

        const baseCond = {
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            deleted: { $ne: true },
        };
        const isId = toObjectId(idOrSlug);
        const cond = isId ? { ...baseCond, _id: isId } : { ...baseCond, slug: idOrSlug };

        const course = await Course.findOne(cond)
            .select(
                'title slug description imageUrl price salePrice currency ratingAvg ratingCount level language durationLabel topic instructors createdAt'
            )
            .populate('topic', 'name slug')
            .populate('instructors.user', 'fullName avatarUrl')
            .lean();

        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Chuẩn hoá instructors
        course.instructors = (course.instructors || []).map((it) => ({
            _id: it?.user?._id,
            fullName: it?.user?.fullName,
            avatarUrl: it?.user?.avatarUrl,
            role: it?.role,
        }));

        // Sections
        const sections = await Section.find({ course: course._id })
            .select('_id title sortOrder')
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();

        // Lessons (metadata, không trả contentText / resources chi tiết ở API public)
        const lessons = await Lesson.find({ course: course._id })
            .select('_id section title type durationSec sortOrder isFreePreview')
            .sort({ section: 1, sortOrder: 1, createdAt: 1 })
            .lean();

        // Gộp lessons theo section
        const grouped = sections.map((s) => ({
            _id: s._id,
            title: s.title,
            sortOrder: s.sortOrder,
            lessons: lessons
                .filter((l) => String(l.section) === String(s._id))
                .map((l) => ({
                    _id: l._id,
                    title: l.title,
                    type: l.type,
                    durationSec: l.durationSec,
                    isFreePreview: !!l.isFreePreview,
                    sortOrder: l.sortOrder,
                })),
        }));

        res.json({ course, sections: grouped });
    } catch (e) {
        next(e);
    }
};

