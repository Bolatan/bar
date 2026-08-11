const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    tabName: { type: String, default: 'Counter', trim: true },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    vat: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'split'], default: null },
    paymentRef: { type: String, trim: true, default: null },
    status: { type: String, enum: ['open', 'paid', 'void'], default: 'open', index: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    voidReason: { type: String, trim: true, default: null },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

orderSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Order', orderSchema);
