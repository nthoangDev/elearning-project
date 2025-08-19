const { Schema, model, Types } = require('mongoose');

const SectionSchema = new Schema({
  course:    { type: Types.ObjectId, ref: 'Course', required: true, index: true },
  title:     { type: String, required: true, trim: true },
  summary:   { type: String, trim: true },
  sortOrder: { type: Number, default: 1, index: true }
}, { timestamps: true });

SectionSchema.index({ course: 1, sortOrder: 1 });
const Section =  model('Section', SectionSchema);
module.exports = Section;