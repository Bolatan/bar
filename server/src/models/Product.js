const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['Beer', 'Spirits', 'Wine', 'Cocktails', 'Soft Drinks', 'Food', 'Other'],
      index: true,
    },
    unit: { type: String, default: 'bottle' },
    costPrice: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    reorderThreshold: { type: Number, default: 0, min: 0 },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

productSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Product', productSchema);
