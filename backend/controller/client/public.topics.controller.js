const Topic = require('../../models/topic.model');
const Course = require('../../models/course.model');

// GET /api/public/topics
exports.listPublicTopics = async (req, res, next) => {
    try {
        const { withCounts } = req.query;
        const needCounts = withCounts === '1' || withCounts === 'true';

        if (!needCounts) {
            const topics = await Topic.find({})
                .select('_id name slug')
                .sort({ name: 1 })
                .lean();
            return res.json(topics);
        }

        // Lấy số lượng khóa học công khai theo topic
        const counts = await Course.aggregate([
            {
                $match: {
                    deleted: { $ne: true },
                    visibility: 'PUBLIC',
                    status: 'PUBLISHED',
                    topic: { $ne: null }
                }
            },
            { $group: { _id: '$topic', count: { $sum: 1 } } }
        ]);

        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));

        const topics = await Topic.find({})
            .select('_id name slug')
            .sort({ name: 1 })
            .lean();

        const items = topics.map(t => ({
            _id: t._id,
            name: t.name,
            slug: t.slug,
            coursesCount: countMap[String(t._id)] || 0
        }));

        return res.json(items);
    } catch (e) {
        next(e);
    }
};