const { Schema, model, Types } = require('mongoose');

const NotificationSchema = new Schema({
  user:   { type: Types.ObjectId, ref: 'User', index: true, required: true },
  kind:   { type: String, enum: ['DEADLINE'], default: 'DEADLINE' },
  title:  { type: String, required: true },
  body:   { type: String },
  data:   { type: Schema.Types.Mixed }, // { assessmentId, dueAt, courseId, lessonId ... }
  read:   { type: Boolean, default: false },
  readAt: { type: Date }
}, { timestamps: true });

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = model('Notification', NotificationSchema);
