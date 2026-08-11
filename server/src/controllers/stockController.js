const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const stockMovementSchema = require('../validations').stockMovement;

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.productId) filter.productId = req.query.productId;
    if (req.query.type) filter.type = req.query.type;
    filter.limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const movements = await store.findStockMovements(filter);
    res.json({ movements: movements.map((m) => m.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = stockMovementSchema.parse(req.body);
    const product = await store.findProductById(data.productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const delta = data.quantity;
    if (data.type === 'restock') {
      product.stockQuantity += Math.abs(delta);
    } else if (data.type === 'spoilage' || data.type === 'adjustment') {
      product.stockQuantity = Math.max(0, product.stockQuantity + delta);
    } else {
      product.stockQuantity = Math.max(0, product.stockQuantity - Math.abs(delta));
    }
    await store.updateProduct(data.productId, { stockQuantity: product.stockQuantity });

    const movement = await store.createStockMovement({ ...data, userId: req.user._id });
    await store.createAuditLog({
      userId: req.user._id,
      action: 'stock_movement',
      entityType: 'Product',
      entityId: product._id,
      details: { type: data.type, quantity: data.quantity, note: data.note },
    });

    res.status(201).json({ movement: movement.toJSON(), product: product.toJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };
