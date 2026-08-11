const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    productsSupplied: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

supplierSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

supplierSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Supplier', supplierSchema);
