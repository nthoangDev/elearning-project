const bcrypt = require('bcryptjs');
const User = require('../../models/user.model');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
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
    req.flash('info', 'Vui lòng chọn bản ghi và hành động.');
    return res.redirect(req.get('referer') || 'admin/users');
  }

  // Hàm chặn mất Admin ACTIVE cuối cùng
  const stillHaveAdmin = async () => {
    const total = await User.countDocuments({ roles: 'ADMIN', status: 'ACTIVE' });
    const selected = await User.countDocuments({ _id: { $in: ids }, roles: 'ADMIN', status: 'ACTIVE' });
    return !(total <= 1 && selected >= 1); // true nếu còn admin khác
  };

  if (type.startsWith('status:')) {
    const next = type.split(':')[1];
    if (!allowedStatuses.includes(next)) {
      req.flash('error', 'Trạng thái không hợp lệ.');
    } else if (next !== 'ACTIVE' && !(await stillHaveAdmin())) {
      req.flash('info', 'Không thể đổi trạng thái Admin ACTIVE cuối cùng.');
    } else {
      await User.updateMany({ _id: { $in: ids } }, { $set: { status: next } });
      req.flash('success', 'Đã cập nhật trạng thái.');
    }
  }

  else if (type === 'grant:INSTRUCTOR') {
    await User.updateMany({ _id: { $in: ids } }, { $addToSet: { roles: 'INSTRUCTOR' } });
    req.flash('success', 'Đã cấp quyền INSTRUCTOR.');
  }

  else if (type === 'revoke:INSTRUCTOR') {
    await User.updateMany({ _id: { $in: ids } }, { $pull: { roles: 'INSTRUCTOR' } });
    req.flash('success', 'Đã thu quyền INSTRUCTOR.');
  }

  else if (type === 'grant:ADMIN') {
    await User.updateMany({ _id: { $in: ids } }, { $addToSet: { roles: 'ADMIN' } });
    req.flash('success', 'Đã cấp quyền ADMIN.');
  }

  else if (type === 'revoke:ADMIN') {
    const total = await User.countDocuments({ roles: 'ADMIN' });
    const revoke = await User.countDocuments({ _id: { $in: ids }, roles: 'ADMIN' });
    if (total - revoke <= 0) {
      req.flash('info', 'Không thể vô hiệu hóa tài khoản admin cuối cùng.');
    } else {
      await User.updateMany({ _id: { $in: ids } }, { $pull: { roles: 'ADMIN' } });
      req.flash('success', 'Đã thu quyền ADMIN.');
    }
  }

  else if (type === 'delete') {
    if (!(await stillHaveAdmin())) {
      req.flash('info', 'Không thể khóa Admin ACTIVE cuối cùng.');
    } else {
      await User.updateMany({ _id: { $in: ids } }, { $set: { status: 'INACTIVE' } });
      req.flash('success', 'Đã chuyển sang INACTIVE.');
    }
  }

  res.redirect(req.get('referer') || 'admin/users');
};



// [PATCH] /admin/users/:id/toggle-lock
module.exports.toggleLock = async (req, res) => {
  const id = req.params.id;

  const user = await User.findById(id).select('status roles').lean();
  if (!user) res.redirect(req.get('referer') || "admin/users");

  if (user.status === "INACTIVE") {
    req.flash("error", "Tài khoản đang bị vô hiệu hóa, không khóa được!");
    return res.redirect(req.get("referer") || "admin/users");
  }

  const next = user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';

  // Không khoá Admin ACTIVE cuối cùng
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('ADMIN');
  if (isAdmin && user.status === 'ACTIVE' && next !== 'ACTIVE') {
    const activeAdmins = await User.countDocuments({ roles: 'ADMIN', status: 'ACTIVE' });
    if (activeAdmins <= 1) {
      req.flash('info', 'Đây là Admin ACTIVE cuối cùng, không thể đổi trạng thái.');
      return res.redirect(req.get('referer') || "admin/users");
    }
  }

  await User.updateOne({ _id: id }, { $set: { status: next } });
  return res.redirect(req.get('referer') || "admin/users");
};

// [PATCH] /admin/users/:id/grant-instructor
module.exports.grantInstructor = async (req, res) => {
  const id = req.params.id;

  await User.updateOne({ _id: id }, { $addToSet: { roles: 'INSTRUCTOR' } });
  req.flash('success', 'Đã cấp quyền Instructor thành công!');
  return res.redirect(req.get('referer') || "admin/users");
};

// [PATCH] /admin/users/:id/revoke-instructor
module.exports.revokeInstructor = async (req, res) => {
  const id = req.params.id;

  await User.updateOne({ _id: id }, { $pull: { roles: 'INSTRUCTOR' } });
  req.flash('success', 'Đã thu quyền Instructor thành công!');
  return res.redirect(req.get('referer') || "admin/users");
};

// [PATCH] /admin/users/:id/grant-admin
module.exports.grantAdmin = async (req, res) => {
  const id = req.params.id;

  await User.updateOne({ _id: id }, { $addToSet: { roles: 'ADMIN' } });
  req.flash('success', 'Đã cấp quyền Admin  thành công!');

  return res.redirect(req.get('referer') || "admin/users");
};

// [PATCH] /admin/users/:id/revoke-admin 
module.exports.revokeAdmin = async (req, res) => {
  const id = req.params.id;

  // Không tự thu quyền
  const requesterId = String(req.user?._id || '');
  if (requesterId && String(id) === requesterId) return res.redirect(req.get('referer') || "admin/users");

  const user = await User.findById(id).select('roles status').lean();
  if (!user) return res.redirect(req.get('referer') || "admin/users");
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('ADMIN');
  if (isAdmin) {
    const activeAdmins = await User.countDocuments({ roles: 'ADMIN', status: "ACTIVE" })
    if (activeAdmins <= 1 && user.status === 'ACTIVE') {
      req.flash('info', 'Đây là Admin ACTIVE cuối cùng, không thể thu quyền được.');
      return res.redirect(req.get('referer') || "admin/users");
    }
  }

  await User.updateOne({ _id: id }, { $pull: { roles: 'ADMIN' } });
  return res.redirect(req.get('referer') || "admin/users");
};

// [DELETE] /admin/users/:id 
module.exports.deleteItem = async (req, res) => {
  const id = req.params.id;

  const user = await User.findById(id).select('roles status').lean();
  if (!user) return res.redirect(req.get('referer') || "admin/users");

  if (user.status === "INACTIVE") {
    req.flash("error", "Tài khoản đã bị vô hiệu hóa trước đó!");
    return res.redirect(req.get("referer") || "admin/users");
  }

  const isAdmin = Array.isArray(user.roles) && user.roles.includes('ADMIN');
  if (isAdmin && user.status === 'ACTIVE') {
    const activeAdmins = await User.countDocuments({ roles: "ADMIN", status: "ACTIVE" });
    if (activeAdmins <= 1) {
      req.flash("info", "Đây là ADMIN cuối cùng, không thể xóa");
      return res.redirect(req.get('referer') || "admin/users");
    }
  }

  await User.updateOne(
    { _id: id },
    { $set: { status: 'INACTIVE', deleted: true } }
  );
  req.flash("success", "Vô hiệu hóa tài khoản thành công!");
  return res.redirect(req.get('referer') || "admin/users");
};


// [GET] /admin/users/create
module.exports.showCreate = (_req, res) => {
  res.render('admin/pages/users/form', {
    pageTitle: 'Tạo người dùng',
    activeMenu: 'users',
    mode: 'create',
    userDoc: {},
    error: null
  });
};

// [POST] /admin/users
module.exports.create = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).render('admin/pages/users/form', {
        pageTitle: 'Tạo người dùng',
        activeMenu: 'users',
        mode: 'create',
        userDoc: { ...req.body, password: undefined },
        error: req.fileValidationError
      });
    }

    const b = req.body;
    let roles = [].concat(b.roles || []).filter(r => allowedRoles.includes(r));
    if (!roles.length) roles = ['INSTRUCTOR'];

    const payload = {
      fullName: (b.fullName || '').trim(),
      email: (b.email || '').trim().toLowerCase(),
      username: (b.username || '').trim() || undefined,
      status: allowedStatuses.includes(b.status) ? b.status : 'ACTIVE',
      roles,
      password: await bcrypt.hash((b.password?.trim() || 'Password@123'), 10)
    };

    if (req.file) {
      const folder = process.env.CLOUDINARY_FOLDER_AVATARS || 'elearning/avatars';
      const up = await cloudinary.uploader.upload(req.file.path, { folder, resource_type: 'image' });
      payload.avatarUrl = up.secure_url;
      fs.unlink(req.file.path, () => {});
    }

    await User.create(payload);

    req.flash('success', 'Tạo người dùng thành công.');
    return res.redirect(`${req.app.locals.prefixAdmin}/users`);
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    const msg = (err?.code === 11000) ? 'Email hoặc Username đã tồn tại.' : 'Không thể tạo người dùng, vui lòng thử lại.';
    return res.status(400).render('admin/pages/users/form', {
      pageTitle: 'Tạo người dùng',
      activeMenu: 'users',
      mode: 'create',
      userDoc: { ...req.body, password: undefined },
      error: msg
    });
  }
};


// [GET] /admin/users/:id/edit
module.exports.showEdit = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('-password').lean();

  if (!user) {
    req.flash('error', 'Người dùng không tồn tại.');
    return res.redirect(req.get('referer') || `"admin"/users`);
  }

  res.render('admin/pages/users/form', {
    pageTitle: 'Sửa người dùng',
    activeMenu: 'users',
    mode: 'edit',
    userDoc: user,
    error: null
  });
};

// [PUT] /admin/users/:id
module.exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    if (req.fileValidationError) {
      const cur = await User.findById(id).lean();
      return res.status(400).render('admin/pages/users/form', {
        pageTitle: 'Sửa người dùng',
        activeMenu: 'users',
        mode: 'edit',
        userDoc: { ...(cur || {}), ...req.body, password: undefined },
        error: req.fileValidationError
      });
    }

    const old = await User.findById(id);
    if (!old) return res.status(404).send('User not found');

    const $set = {
      fullName: (req.body.fullName || '').trim(),
      email: (req.body.email || '').trim().toLowerCase(),
      status: allowedStatuses.includes(req.body.status) ? req.body.status : 'ACTIVE'
    };
    const $unset = {};

    const username = (req.body.username || '').trim();
    if (username) $set.username = username; else $unset.username = 1;

    let roles = req.body.roles;
    if (typeof roles === 'string') roles = [roles];
    if (Array.isArray(roles)) {
      roles = roles.filter(r => allowedRoles.includes(r));
      $set.roles = roles.length ? roles : ['STUDENT'];
    }

    if (req.body.password && req.body.password.trim()) {
      $set.password = await bcrypt.hash(req.body.password.trim(), 10);
    }

    if (req.body.removeAvatar === '1') $unset.avatarUrl = 1;

    if (req.file) {
      const folder = process.env.CLOUDINARY_FOLDER_AVATARS || 'elearning/avatars';
      const result = await cloudinary.uploader.upload(req.file.path, { folder, resource_type: 'image' });
      $set.avatarUrl = result.secure_url;
      delete $unset.avatarUrl;
      fs.unlink(req.file.path, () => {});
    }

    const updateDoc = {};
    if (Object.keys($set).length) updateDoc.$set = $set;
    if (Object.keys($unset).length) updateDoc.$unset = $unset;

    await User.updateOne({ _id: id }, updateDoc);

    req.flash('success', 'Cập nhật người dùng thành công.');
    return res.redirect(`${req.app.locals.prefixAdmin}/users`);

  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});

    if (err?.code === 11000 && (err.keyPattern?.email || err.keyPattern?.username)) {
      const cur = await User.findById(id).lean();
      return res.status(400).render('admin/pages/users/form', {
        pageTitle: 'Sửa người dùng',
        activeMenu: 'users',
        mode: 'edit',
        userDoc: { ...(cur || {}), ...req.body, password: undefined },
        error: 'Email hoặc Username đã tồn tại.'
      });
    }

    console.error('Update user error:', err);
    const cur = await User.findById(id).lean();
    return res.status(400).render('admin/pages/users/form', {
      pageTitle: 'Sửa người dùng',
      activeMenu: 'users',
      mode: 'edit',
      userDoc: { ...(cur || {}), ...req.body, password: undefined },
      error: 'Lỗi cập nhật người dùng.'
    });
  }
};