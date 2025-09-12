const { Schema, model, Types } = require('mongoose');

const OrderItemSub = new Schema({
  course:    { type: Types.ObjectId, ref: 'Course', required: true },
  unitPrice: { type: Number, required: true },
  quantity:  { type: Number, default: 1, min: 1 }
}, { _id: false });

const OrderSchema = new Schema({
  user:        { type: Types.ObjectId, ref: 'User', required: true, index: true },
  status:      { type: String, enum: ['PENDING','PAID','FAILED','REFUNDED','CANCELLED'], default: 'PENDING', index: true },
  totalAmount: { type: Number, required: true },
  currency:    { type: String, default: 'VND' },
  provider:    { type: String, enum: ['STRIPE','MOMO','VNPAY'], required: true },
  items:       { type: [OrderItemSub], required: true }
}, { timestamps: true });

module.exports = model('Order', OrderSchema);
