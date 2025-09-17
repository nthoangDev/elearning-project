const User = require('../models/user.model');
const { verifyAccessToken } = require('../utils/jwt');

function pickTokenFromReq(req) {
  // API: Authorization: Bearer <token>
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  // Admin Pug: cookie 'admin_token'
  if (req.cookies?.admin_token) return req.cookies.admin_token;
  return null;
}

function requireAuth(roles = []) {
  return async (req, res, next) => {
    try {
      const token = pickTokenFromReq(req);
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub)
        .select('email roles fullName status avatarUrl');

      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (roles.length && !user.roles?.some(r => roles.includes(r))) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

// Dùng riêng cho trang Admin (Pug): redirect về /admin/login nếu chưa đăng nhập admin
async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.admin_token;
    if (!token) return res.redirect(`${req.app.locals.prefixAdmin}/login`);
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('email roles fullName status');
    if (!user || user.status !== 'ACTIVE' || !user.roles?.includes('ADMIN')) {
      return res.redirect(`${req.app.locals.prefixAdmin}/login`);
    }
    res.locals.admin = user;
    next();
  } catch {
    return res.redirect(`${req.app.locals.prefixAdmin}/login`);
  }
}

module.exports = { requireAuth, requireAdmin };
