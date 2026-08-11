const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const openShiftSchema = require('../validations').openShift;
const closeShiftSchema = require('../validations').closeShift;

async function current(req, res, next) {
  try {
    const shift = await store.findCurrentShift(req.user._id);
    res.json({ shift: shift ? shift.toJSON() : null });
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const filter = {};
    if (req.query.staffId) filter.staffId = req.query.staffId;
    const shifts = await store.findShifts(filter);
    res.json({ shifts: shifts.map((s) => s.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function openShift(req, res, next) {
  try {
    const data = openShiftSchema.parse(req.body);
    const existing = await store.findCurrentShift(req.user._id);
    if (existing) throw new ApiError(400, 'You already have an open shift');
    const shift = await store.createShift({
      staffId: req.user._id,
      openingFloat: data.openingFloat,
    });
    res.status(201).json({ shift: shift.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function closeShift(req, res, next) {
  try {
    const data = closeShiftSchema.parse(req.body);
    const shift = await store.findCurrentShift(req.user._id);
    if (!shift) throw new ApiError(404, 'No open shift found');

    const paidOrders = await store.findOrdersForShift(req.user._id, shift.openedAt, new Date());
    const cashSales = paidOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + o.total, 0);
    const expectedCash = shift.openingFloat + cashSales;
    const variance = +(data.closingCount - expectedCash).toFixed(2);

    shift.closingCount = data.closingCount;
    shift.expectedCash = expectedCash;
    shift.variance = variance;
    shift.closedAt = new Date();
    await store.saveShift(shift);

    res.json({ shift: shift.toJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { current, history, openShift, closeShift };
