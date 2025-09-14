const { Schema, model, Types } = require('mongoose');

const ReminderSchema = new Schema({
  user:       { type: Types.ObjectId, ref: 'User', required: true, index: true },
  assessment: { type: Types.ObjectId, ref: 'Assessment', required: true, index: true },
  dueAt:      { type: Date },         // snapshot hạn nộp tại thời điểm tạo
  offsetsMin: { type: [Number], default: [1440, 120] }, // nhắc trc 24h & 2h
  enabled:    { type: Boolean, default: true },
  lastSentAt: { type: Date }          // lần gửi gần nhất (để chống spam)
}, { timestamps: true });

ReminderSchema.index({ user: 1, assessment: 1 }, { unique: true });

module.exports = model('Reminder', ReminderSchema);
