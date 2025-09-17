const { Schema, model, Types } = require('mongoose');

const RefreshTokenSchema = new Schema({
  user:     { type: Types.ObjectId, ref: 'User', required: true, index: true },
  jti:      { type: String, required: true, unique: true }, // UUID
  revoked:  { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

RefreshTokenSchema.index(
  { user: 1, revoked: 1 },
  { unique: true, partialFilterExpression: { revoked: false } }
);

const RefreshToken = model('RefreshToken', RefreshTokenSchema);
module.exports = RefreshToken;
