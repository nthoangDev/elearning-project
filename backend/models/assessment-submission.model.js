const { Schema, model, Types } = require('mongoose');

const SubmissionCommentSub = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const AttachmentSub = new Schema({
  url: { type: String, required: true },
  title: { type: String },
  mime: { type: String },
  size: { type: Number }
}, { _id: false });


const AssessmentSubmissionSchema = new Schema({
  assessment: { type: Types.ObjectId, ref: 'Assessment', required: true, index: true },
  user: { type: Types.ObjectId, ref: 'User', required: true, index: true },

  attemptNo: { type: Number, default: 1 },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },

  // Kết quả & trạng thái
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED'], default: 'SUBMITTED', index: true },
  score: { type: Number },
  pass: { type: Boolean },
  graderUser: { type: Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },
  returnedAt: { type: Date },
  feedback: { type: String, default: '', maxlength: 2000 },

  // Dữ liệu bài làm
  textAnswer: { type: String },            // Assignment (tự luận)
  attachments: [AttachmentSub],             // Assignment file
  answersJson: { type: Schema.Types.Mixed }, // Quiz (chọn đáp án) / log

  comments: [SubmissionCommentSub]
}, { timestamps: true });

AssessmentSubmissionSchema.index({ assessment: 1, user: 1, attemptNo: 1 }, { unique: true });

module.exports = model('AssessmentSubmission', AssessmentSubmissionSchema);
