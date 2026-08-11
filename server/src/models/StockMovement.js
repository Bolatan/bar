const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: ['restock', 'sale', 'spoilage', 'adjustment'], required: true },
    quantity: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

stockMovementSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
