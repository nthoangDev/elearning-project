const { Schema, model, Types } = require('mongoose');

const PaymentSchema = new Schema({
  order:         { type: Types.ObjectId, ref: 'Order', required: true, index: true },
  user:          { type: Types.ObjectId, ref: 'User', required: true, index: true },
  amount:        { type: Number, required: true },
  currency:      { type: String, default: 'VND' },
  method:        { type: String, enum: ['STRIPE','MOMO','VNPAY'], required: true },
  transactionId: { type: String },
  status:        { type: String, enum: ['PENDING','COMPLETED','FAILED','REFUNDED'], default: 'PENDING', index: true },
  rawPayload:    { type: Schema.Types.Mixed }
}, { timestamps: true });

module.exports = model('Payment', PaymentSchema);
