const { Schema, model, Types } = require('mongoose');

const CartItemSub = new Schema({
  course:   { type: Types.ObjectId, ref: 'Course', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  addedAt:  { type: Date, default: Date.now }
}, { _id: false });

const CartSchema = new Schema({
  user:  { type: Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
  items: { type: [CartItemSub], default: [] }
}, { timestamps: true });

CartSchema.index({ user: 1 });

module.exports = model('Cart', CartSchema);
