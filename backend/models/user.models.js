const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  username: { type: String, trim: true, unique: true, sparse: true },
  email:    { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  fullName: { type: String, trim: true },
  avatarUrl:{ type: String },
  status:   { type: String, enum: ['ACTIVE','INACTIVE','LOCKED'], default: 'ACTIVE' },
  isEmailVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  roles:    [{ type: String, enum: ['ADMIN','INSTRUCTOR','STUDENT'], index: true }]
}, { timestamps: true });

const User = model('User', UserSchema);

module.exports = User;