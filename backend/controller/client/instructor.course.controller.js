const Course = require('../../models/course.model');
const Section = require('../../models/section.model');
const Lesson  = require('../../models/lesson.model');
const mongoose = require('mongoose');

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return ['1','true','on','yes','y'].includes(s);
}

// [GET] /api/instructor/my-courses
module.exports.getMyCourses = async (req, res, next) => {
  try {
    const uid = req.user._id; 

    const { q, status, stats } = req.query;
    const cond = {
      deleted: false,
      'instructors.user': uid
    };
    if (status) cond.status = String(status).toUpperCase();
    if (q && q.trim()) cond.title = { $regex: q.trim(), $options: 'i' };

    const docs = await Course.find(cond)
      .select('_id title slug imageUrl status visibility price salePrice ratingAvg ratingCount createdAt updatedAt instructors')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const list = docs.map(c => {
      const mine = (c.instructors || []).find(it => String(it.user) === String(uid));
      const myRole = mine?.role || 'MAIN';
      delete c.instructors;
      return { ...c, myRole };
    });

    if (!parseBool(stats)) {
      return res.json(list);
    }

    const courseIds = list.map(c => new mongoose.Types.ObjectId(c._id));
    const [secAgg, lesAgg] = await Promise.all([
      Section.aggregate([
        { $match: { course: { $in: courseIds } } },
        { $group: { _id: '$course', sections: { $sum: 1 } } }
      ]),
      Lesson.aggregate([
        { $match: { course: { $in: courseIds } } },
        {
          $group: {
            _id: '$course',
            lessons: { $sum: 1 },
            totalDurationSec: { $sum: { $ifNull: ['$durationSec', 0] } }
          }
        }
      ])
    ]);

    const secMap = Object.fromEntries(secAgg.map(x => [String(x._id), x.sections]));
    const lesMap = Object.fromEntries(lesAgg.map(x => [String(x._id), { lessons: x.lessons, totalDurationSec: x.totalDurationSec }]));

    const withStats = list.map(c => ({
      ...c,
      sections: secMap[String(c._id)] || 0,
      lessons:  (lesMap[String(c._id)]?.lessons ?? 0),
      totalDurationSec: (lesMap[String(c._id)]?.totalDurationSec ?? 0)
    }));

    return res.json(withStats);
  } catch (e) { next(e); }
};
