// models/Lesson.js
const { Schema, model, Types } = require('mongoose');

const ResourceSub = new Schema({
  kind: { type: String, enum: ['VIDEO','PDF','DOC','IMAGE','AUDIO','OTHER'], default: 'OTHER' },
  url:  { type: String, required: true }, 
  title:{ type: String, trim: true },
  mime: { type: String },            
  size: { type: Number },         
  durationSec: { type: Number },      
  order: { type: Number, default: 1 },
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const LessonSchema = new Schema({
  course:       { type: Types.ObjectId, ref: 'Course', required: true, index: true },
  section:      { type: Types.ObjectId, ref: 'Section', required: true, index: true },
  title:        { type: String, required: true, trim: true },
  type:         { type: String, enum: ['VIDEO','DOCUMENT','QUIZ'], default: 'VIDEO' },

  contentText:  { type: String },          
  durationSec:  { type: Number },        
  sortOrder:    { type: Number, default: 1 },
  isFreePreview:{ type: Boolean, default: false },

  resources: { type: [ResourceSub], default: [] },   
  assessments:  [{ type: Types.ObjectId, ref: 'Assessment' }] 
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// Helper virtual: URL tài nguyên chính (cho UI)
LessonSchema.virtual('primaryResourceUrl').get(function () {
  if (!this.resources || !this.resources.length) return undefined;
  const r = this.resources.find(x => x.isPrimary) || this.resources[0];
  return r?.url;
});

LessonSchema.index({ section: 1, sortOrder: 1 });
const Lesson = model('Lesson', LessonSchema);
module.exports = Lesson;