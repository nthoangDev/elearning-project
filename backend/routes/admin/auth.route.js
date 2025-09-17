const express = require('express');
const router = express.Router();
const authCtrl = require('../../controller/auth.controller');

router.get('/login', (req, res) => {
  res.render('admin/pages/auth/login', { pageTitle: 'Admin Login' });
});

router.post('/login', async (req, res) => {
  req.body.admin = '1';
  try {
    const { login } = authCtrl;
    const jsonRes = {};
    const fakeRes = {
      json: (d) => Object.assign(jsonRes, d),
      status: (s) => ({ json: (d) => Object.assign(jsonRes, d, { __status: s }) }),
      cookie: res.cookie.bind(res),
    };
    await login(req, fakeRes);
    if (jsonRes.__status >= 400) return res.render('admin/pages/auth/login', { pageTitle: 'Admin Login', error: jsonRes.message });
    return res.redirect(`${req.app.locals.prefixAdmin}/dashboard`);
  } catch (e) {
    return res.render('admin/pages/auth/login', { pageTitle: 'Admin Login', error: 'Đăng nhập thất bại' });
  }
});

router.get('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      const payload = verifyRefreshToken(token);
      await RefreshToken.updateOne({ jti: payload.jti }, { $set: { revoked: true } });
    }
  } catch (_) {}
  // Xoá cookie
  res.clearCookie('refresh_token', { path: '/auth/refresh' });
  res.clearCookie('admin_token',   { path: '/' });
  return res.redirect(`${req.app.locals.prefixAdmin}/login`);
});

module.exports = router;
