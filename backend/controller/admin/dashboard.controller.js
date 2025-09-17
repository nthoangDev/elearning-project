// controllers/admin/dashboard.controller.js
const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const Enrollment = require('../../models/enrollement.model');
const Order = require('../../models/order.model');
const Payment = require('../../models/payment.model');

const asDate = (d) => {
  if (!d) return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
};

// tạo mảng ngày liên tục và map dữ liệu aggregate vào (đủ 30 ngày)
function buildDailySeries(from, to, dict) {
  const days = [];
  const cur = new Date(from);
  while (cur <= to) {
    const key = cur.toISOString().slice(0, 10);
    days.push({ d: key, v: dict[key] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return {
    labels: days.map(x => x.d),
    data: days.map(x => x.v)
  };
}

module.exports.index = async (req, res) => {
  const tz = 'Asia/Ho_Chi_Minh';
  const today = new Date();
  const to = asDate(req.query.to) || new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const from = asDate(req.query.from) || new Date(to); from.setDate(to.getDate() - 29);

  try {
    // KPIs tổng quan
    const [
      usersTotal,
      coursesTotal,
      enrollmentsTotal,
      ordersPaidAgg,
      revenueTotalAgg
    ] = await Promise.all([
      User.countDocuments({}),
      Course.countDocuments({ deleted: { $ne: true } }),
      Enrollment.countDocuments({}),
      Order.countDocuments({ status: 'PAID' }), // đơn đã thanh toán
      Payment.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, sum: { $sum: '$amount' } } }
      ])
    ]);

    const revenueAll = revenueTotalAgg?.[0]?.sum || 0;

    // Doanh thu theo ngày (30 ngày)
    const revenueDaily = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const revenueDict = Object.fromEntries(revenueDaily.map(r => [r._id, r.total]));
    const revenueSeries = buildDailySeries(from, to, revenueDict);

    // Học viên mới theo ngày (30 ngày)
    const enrollDaily = await Enrollment.aggregate([
      { $match: { enrolledAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt', timezone: tz } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const enrollDict = Object.fromEntries(enrollDaily.map(r => [r._id, r.count]));
    const enrollSeries = buildDailySeries(from, to, enrollDict);

    // Phân bổ khóa học theo chủ đề (Topic)
    const byTopic = await Course.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      // lấy tên topic
      {
        $lookup: {
          from: 'topics',
          localField: '_id',
          foreignField: '_id',
          as: 'topic'
        }
      },
      { $unwind: { path: '$topic', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ['$topic.name', 'Chưa gán chủ đề'] },
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top 5 khóa học theo doanh thu (tính từ Payment COMPLETED -> Order -> items)
    const topCourses = await Payment.aggregate([
      { $match: { status: 'COMPLETED' } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $unwind: '$order.items' },
      {
        $group: {
          _id: '$order.items.course',
          revenue: {
            $sum: { $multiply: ['$order.items.unitPrice', '$order.items.quantity'] }
          }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          courseId: '$_id',
          title: { $ifNull: ['$course.title', 'N/A'] },
          revenue: 1
        }
      }
    ]);

    res.render('admin/pages/dashboard/index', {
      pageTitle: 'Tổng quan',
      filters: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10)
      },
      kpis: {
        usersTotal,
        coursesTotal,
        enrollmentsTotal,
        ordersPaidTotal: ordersPaidAgg,
        revenueAll
      },
      charts: {
        revenueDaily: revenueSeries, // {labels:[], data:[]}
        enrollDaily: enrollSeries,
        byTopic,                    // [{name, count}]
        topCourses                  // [{title, revenue}]
      }
    });
  } catch (err) {
    console.error('[Dashboard] error:', err);
    res.status(500).render('admin/pages/dashboard/index', {
      pageTitle: 'Tổng quan',
      error: 'Không tải được dữ liệu, vui lòng thử lại sau.'
    });
  }
};
