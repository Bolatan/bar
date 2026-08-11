const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    openingFloat: { type: Number, default: 0, min: 0 },
    closingCount: { type: Number, default: null },
    expectedCash: { type: Number, default: null },
    variance: { type: Number, default: null },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: { updatedAt: true, createdAt: false } }
);

shiftSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

shiftSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Shift', shiftSchema);
