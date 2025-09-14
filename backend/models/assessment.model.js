const { Schema, model, Types } = require('mongoose');

const AssessmentSchema = new Schema({
  course: { type: Types.ObjectId, ref: 'Course', required: true, index: true },
  section: { type: Types.ObjectId, ref: 'Section', index: true },
  lesson:  { type: Types.ObjectId, ref: 'Lesson', index: true },
  assessmentType: { type: String, required: true, enum: ['ASSIGNMENT', 'QUIZ'], index: true },
  title: { type: String, required: true },
  description: { type: String },
  points: { type: Number, default: 100 },
  availableAt: { type: Date },
  dueAt: { type: Date },
  createdBy: { type: Types.ObjectId, ref: 'User' }
}, { timestamps: true, discriminatorKey: 'assessmentType' });

const Assessment = model('Assessment', AssessmentSchema);

// Assignment subtype
const AssignmentSchema = new Schema({
    maxScore: { type: Number, default: 100 }
}, { _id: false });

const Assignment = Assessment.discriminator('ASSIGNMENT', AssignmentSchema);

// Quiz subtype (embed questions & options)
const QuizOptionSub = new Schema({
    content: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
}, { _id: false });

const QuizQuestionSub = new Schema({
    question: { type: String, required: true },
    type: { type: String, enum: ['SINGLE', 'MULTI', 'SHORT'], default: 'SINGLE' },
    score: { type: Number, default: 1 },
    sortOrder: { type: Number, default: 1 },
    options: [QuizOptionSub]
}, { _id: false });

const QuizSchema = new Schema({
    durationMinutes: { type: Number },
    passScore: { type: Number, default: 60 },
    shuffleQuestions: { type: Boolean, default: false },
    attemptsAllowed: { type: Number, default: 1 },
    questions: [QuizQuestionSub]
}, { _id: false });

const Quiz = Assessment.discriminator('QUIZ', QuizSchema);

module.exports = { Assessment, Assignment, Quiz };
