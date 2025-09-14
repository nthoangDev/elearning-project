const { Schema, model, Types } = require('mongoose');

const FcmTokenSchema = new Schema({
  user:  { type: Types.ObjectId, ref: 'User', index: true, required: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String }, // web/ios/android
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = model('FcmToken', FcmTokenSchema);
