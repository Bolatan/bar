const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    marketingConsentEmail: { type: Boolean, default: true },
    marketingConsentWhatsApp: { type: Boolean, default: true },
    notes: { type: String, trim: true, default: '' },
    orderCount: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastOrderDate: { type: Date, default: null },
  },
  { timestamps: true }
);

customerSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

customerSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Customer', customerSchema);
