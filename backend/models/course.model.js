const { Schema, model, Types } = require('mongoose');

const CourseInstructorSub = new Schema({
  user:    { type: Types.ObjectId, ref: 'User', required: true },
  role:    { type: String, enum: ['MAIN','CO','TA'], default: 'MAIN' }
}, { _id: false });

const CourseSchema = new Schema({
  title:       { type: String, required: true, index: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String },
  imageUrl:    { type: String },
  topic:       { type: Types.ObjectId, ref: 'Topic' },
  language:    { type: String, default: 'vi' },
  level:       { type: String, enum: ['BEGINNER','INTERMEDIATE','ADVANCED'], default: 'BEGINNER' },
  price:       { type: Number, default: 0 },
  salePrice:   { type: Number },
  currency:    { type: String, default: 'VND' },
  durationLabel:{ type: String },
  status:      { type: String, enum: ['DRAFT','PUBLISHED','UNLISTED','ARCHIVED'], default: 'DRAFT' },
  visibility:  { type: String, enum: ['PUBLIC','PRIVATE'], default: 'PUBLIC' },
  deleted:     { type: Boolean, default: false },
  instructorNote:{ type: String },
  ratingAvg:   { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdBy:   { type: Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
  instructors: [CourseInstructorSub]
}, { timestamps: true });

CourseSchema.index({ title: 'text', description: 'text' });
const Course = model('Course', CourseSchema);

module.exports = Course;
