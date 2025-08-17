const bcrypt = require('bcryptjs');
const User = require('../../models/user.models');

try { Enrollment = require('../../models/enrollment.model'); } catch { }
try { Order = require('../../models/order.model'); } catch { }

const searchHelper = require('../../helpers/search');
const pagination = require('../../helpers/pagination');
const filterStatus = require("../../helpers/filterStatus");

const allowedStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
const allowedRoles = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];



const STATUSES = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Không hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' }
];

// GET /admin/users
module.exports.list = async (req, res) => {
  const { regex } = searchHelper(req.query);
  const filter = {};

  if (regex) filter.$or = [{ fullName: regex }, { email: regex }];

  if (req.query.role && allowedRoles.includes(req.query.role)) {
    filter.roles = req.query.role;
  }
  if (req.query.status && allowedStatuses.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const count = await User.countDocuments(filter);
  const pagi = pagination(req.query, count, 12);

  const users = await User.find(filter)
    .select('fullName email username status roles createdAt')
    .sort({ createdAt: -1 })
    .skip(pagi.skip)
    .limit(pagi.limitItem);

  res.render('admin/pages/users/index', {
    pageTitle: 'Quản lý người dùng',
    activeMenu: 'users',
    users,
    filterStatus: filterStatus(req.query, STATUSES),
    pagination: pagi,
    keyword: req.query.keyword || '',
    role: req.query.role || '',
    status: req.query.status || ''
  });
};

//[PATCH] /admin/users/:id/status
module.exports.changeStatus = async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;

  let statusValues = STATUSES.map(s => s.value);
  if (!statusValues.includes(status)) {
    return res.redirect(req.get('referer') || "admin/users");
  }
  const user = await User.findById(id).select('roles status').lean();
  if (!user) return res.redirect(req.get('referer') || "admin/users");

  const isAdmin = Array.isArray(user.roles) && user.roles.includes('ADMIN');
  if (isAdmin && user.status === 'ACTIVE' && status !== 'ACTIVE') {
    const activeAdmins = await User.countDocuments({ roles: 'ADMIN', status: 'ACTIVE' });
    if (activeAdmins <= 1) {
      req.flash('info', 'Đây là Admin ACTIVE cuối cùng, không thể đổi trạng thái.');
      return res.redirect(req.get('referer') || "admin/users");
    }
  }

  await User.updateOne({ _id: id }, { $set: { status } });
  req.flash('success', 'Cập nhật trạng thái thành công.');
  return res.redirect(req.get('referer') || "admin/users");
};


// [POST] /admin/users/change-multi
module.exports.changeMulti = async (req, res) => {
  const type = req.body.type; 
  const ids = (req.body.ids || req.body.inputIds || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  if (!ids.length || !type) {
    return res.redirect(req.get('referer') || "admin/users");
  }

  if (type.startsWith('status:')) {
    const next = type.split(':')[1];
    if (!allowedStatuses.includes(next)) {
      return res.redirect(req.get('referer') || "admin/users");
    }
    await User.updateMany({ _id: { $in: ids } }, { $set: { status: next } });
  }
  else if (type === 'grant:INSTRUCTOR') {
    await User.updateMany({ _id: { $in: ids } }, { $addToSet: { roles: 'INSTRUCTOR' } });
  }
  else if (type === 'revoke:INSTRUCTOR') {
    await User.updateMany({ _id: { $in: ids } }, { $pull: { roles: 'INSTRUCTOR' } });
  }
  else if (type === 'grant:ADMIN') {
    await User.updateMany({ _id: { $in: ids } }, { $addToSet: { roles: 'ADMIN' } });
  }
  else if (type === 'revoke:ADMIN') {
    // Không cho còn 0 admin
    const totalAdmins = await User.countDocuments({ roles: 'ADMIN' });
    const revokeAdmins = await User.countDocuments({ _id: { $in: ids }, roles: 'ADMIN' });
    if (totalAdmins - revokeAdmins <= 0) {
      // giữ lại ít nhất 1
      const keepOne = await User.findOne({ _id: { $in: ids }, roles: 'ADMIN' }).select('_id');
      const filtered = ids.filter(x => String(x) !== String(keepOne?._id));
      if (filtered.length) {
        await User.updateMany({ _id: { $in: filtered } }, { $pull: { roles: 'ADMIN' } });
      }
    } else {
      await User.updateMany({ _id: { $in: ids } }, { $pull: { roles: 'ADMIN' } });
    }
  }
  else if (type === 'delete') {
    await User.updateMany({ _id: { $in: ids } }, { $set: { status: 'INACTIVE' } });
  }

  res.redirect(req.get('referer') || "admin/users");
};
