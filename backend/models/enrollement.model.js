const { Schema, model, Types } = require('mongoose');

const LessonProgressSub = new Schema({
  lesson:      { type: Types.ObjectId, ref: 'Lesson', required: true },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date }
}, { _id: false });

const EnrollmentSchema = new Schema({
  course:     { type: Types.ObjectId, ref: 'Course', required: true, index: true },
  user:       { type: Types.ObjectId, ref: 'User', required: true, index: true },
  order:      { type: Types.ObjectId, ref: 'Order' },
  payment:    { type: Types.ObjectId, ref: 'Payment' },
  progressPct:{ type: Number, default: 0 },
  completed:  { type: Boolean, default: false },
  enrolledAt: { type: Date, default: Date.now },
  progress:   [LessonProgressSub]
}, { timestamps: true });

EnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = model('Enrollment', EnrollmentSchema);
