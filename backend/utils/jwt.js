const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const RefreshToken = require('../models/refresh-token.model');

const DAY_MS = 24 * 60 * 60 * 1000;

const accessSecret  = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const accessExp     = process.env.JWT_ACCESS_EXPIRES  || '3h';
const refreshExp    = process.env.JWT_REFRESH_EXPIRES || '7d';

function parseExpMs(exp) {
  if (typeof exp === 'number') return exp * 1000;
  const m = /^(\d+)([dhms])$/.exec(exp || '');
  const unit = { d: DAY_MS, h: 60*60*1000, m: 60*1000, s: 1000 }[m?.[2]];
  return m ? Number(m[1]) * unit : 7 * DAY_MS;
}

function signAccessToken(user) {
  const payload = { sub: String(user._id), roles: user.roles || [], fullName: user.fullName || '' };
  return jwt.sign(payload, accessSecret, { expiresIn: accessExp });
}

function verifyAccessToken(token)  { return jwt.verify(token, accessSecret);  }
function verifyRefreshToken(token) { return jwt.verify(token, refreshSecret); }

async function issueRefreshTokenOnLogin(userId) {
  const ttlMs = parseExpMs(refreshExp);
  const jti = uuidv4();
  const expiresAt = new Date(Date.now() + ttlMs);

  await RefreshToken.updateOne(
    { user: userId },
    { $set: { jti, expiresAt } },
    { upsert: true }
  );

  return jwt.sign({ sub: String(userId), jti }, refreshSecret, { expiresIn: Math.floor(ttlMs/1000) });
}

async function rotateRefreshToken(userId, oldJti) {
  const ttlMs = parseExpMs(refreshExp);
  const newJti = uuidv4();
  const newExp = new Date(Date.now() + ttlMs);

  const updated = await RefreshToken.findOneAndUpdate(
    { user: userId, jti: oldJti },
    { $set: { jti: newJti, expiresAt: newExp } },
    { new: true }
  );
  if (!updated) return null;

  return jwt.sign({ sub: String(userId), jti: newJti }, refreshSecret, { expiresIn: Math.floor(ttlMs/1000) });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueRefreshTokenOnLogin,
  rotateRefreshToken,
  parseExpMs
};
