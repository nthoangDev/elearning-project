const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const RefreshToken = require('../models/refresh-token.model');

const {
  signAccessToken,
  verifyRefreshToken,
  issueRefreshTokenOnLogin,
  rotateRefreshToken,
  parseExpMs
} = require('../utils/jwt');

const isProd = process.env.NODE_ENV === 'production';
const refreshExpStr = process.env.JWT_REFRESH_EXPIRES || '7d';
const refreshMaxAgeMs = parseExpMs(refreshExpStr);

// Helper set cookie refresh (HTTP-Only) — đồng bộ với JWT_REFRESH_EXPIRES
function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/auth/refresh',
    maxAge: refreshMaxAgeMs
  });
}

// (tuỳ chọn) set cookie access cho Admin (Pug)
function setAdminCookie(res, accessToken) {
  res.cookie('admin_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    maxAge: 60 * 15 * 1000 // 15 phút
  });
}

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm || !password) return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });

    const exists = await User.findOne({ email: emailNorm }).select('_id');
    if (exists) return res.status(409).json({ message: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: emailNorm,
      password: hash,
      fullName: fullName?.trim(),
      roles: ['STUDENT'],
      status: 'ACTIVE'
    });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshTokenOnLogin(user._id); // upsert 1 doc/user
    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: { id: user._id, email: user.email, fullName: user.fullName, roles: user.roles }
    });
  } catch (e) {
    console.error('REGISTER_ERROR', e);
    return res.status(500).json({ message: 'Internal error' });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, admin } = req.body; // admin=true nếu login cho trang admin
    const emailNorm = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).select('+password roles fullName status');
    if (!user) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
    if (user.status !== 'ACTIVE') return res.status(403).json({ message: 'Tài khoản không hoạt động' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshTokenOnLogin(user._id);
    setRefreshCookie(res, refreshToken);

    // nếu login cho Admin Pug và có role ADMIN → set cookie admin_token
    if (admin === '1' || admin === true) {
      if (!user.roles?.includes('ADMIN')) return res.status(403).json({ message: 'Không có quyền Admin' });
      setAdminCookie(res, accessToken);
    }

    res.json({
      accessToken,
      user: { id: user._id, email: user.email, fullName: user.fullName, roles: user.roles }
    });
  } catch (e) {
    console.error('LOGIN_ERROR', e);
    return res.status(500).json({ message: 'Internal error' });
  }
};

// POST /auth/refresh
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: 'Missing refresh token' });

    const payload = verifyRefreshToken(token); // { sub, jti, iat, exp }

    const doc = await RefreshToken.findOne({ user: payload.sub }).select('jti expiresAt');
    if (!doc || doc.jti !== payload.jti) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (doc.expiresAt && doc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh expired' });
    }

    const user = await User.findById(payload.sub).select('roles fullName status');
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: 'User invalid' });

    const accessToken = signAccessToken(user);

    const newRefresh = await rotateRefreshToken(user._id, payload.jti);
    if (!newRefresh) return res.status(401).json({ message: 'Invalid refresh token' });

    setRefreshCookie(res, newRefresh);
    res.json({ accessToken });
  } catch (e) {
    console.error('REFRESH_ERROR', e);
    return res.status(401).json({ message: 'Refresh failed' });
  }
};

// POST /auth/logout
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token || req.body.refreshToken;
    if (token) {
      const payload = verifyRefreshToken(token);
      await RefreshToken.deleteOne({ user: payload.sub });
    }
  } catch (e) {
    console.warn('LOGOUT_WARN', e?.message);
  }
  res.clearCookie('refresh_token', { path: '/auth/refresh' });
  res.clearCookie('admin_token', { path: '/' });
  res.json({ message: 'Logged out' });
};

// GET /auth/me
exports.me = async (req, res) => {
  const u = req.user;
  res.json({ id: u._id, email: u.email, fullName: u.fullName, roles: u.roles, status: u.status });
};
