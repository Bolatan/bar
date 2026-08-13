const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const config = require('../config');
const createOrderSchema = require('../validations').createOrder;
const checkoutSchema = require('../validations').checkout;
const voidSchema = require('../validations').voidOrder;

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.staffId) filter.staffId = req.query.staffId;
    filter.limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const orders = await store.findOrders(filter);
    res.json({ orders: orders.map((o) => o.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createOrderSchema.parse(req.body);
    const subtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const order = await store.createOrder({
      tabName: data.tabName || 'Counter',
      items: data.items,
      subtotal,
      vat: 0,
      discount: 0,
      total: subtotal,
      status: 'open',
      staffId: req.user._id,
    });
    res.status(201).json({ order: order.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function checkout(req, res, next) {
  try {
    const data = checkoutSchema.parse(req.body);
    const order = await store.findOrderById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'open') throw new ApiError(400, `Order is already ${order.status}`);

    const discount = data.discount || 0;
    const taxable = Math.max(0, order.subtotal - discount);
    const vat = +(taxable * (config.vatRate / 100)).toFixed(2);
    const total = taxable + vat;

    order.discount = discount;
    order.vat = vat;
    order.total = total;
    order.paymentMethod = data.paymentMethod;
    order.paymentRef = data.paymentRef || null;
    order.status = 'paid';
    order.paidAt = new Date();
    order.customerEmail = data.customerEmail || null;
    order.customerPhone = data.customerPhone || null;
    order.marketingConsentEmail = !!data.marketingConsentEmail;
    order.marketingConsentWhatsApp = !!data.marketingConsentWhatsApp;
    await store.saveOrder(order);

    for (const item of order.items) {
      const product = await store.findProductById(item.productId);
      if (product) {
        product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
        await store.updateProduct(item.productId, { stockQuantity: product.stockQuantity });
        await store.createStockMovement({
          productId: item.productId,
          type: 'sale',
          quantity: -item.quantity,
          userId: req.user._id,
          note: `Order ${order.tabName}`,
        });
      }
    }

    await store.createAuditLog({
      userId: req.user._id,
      action: 'order_checkout',
      entityType: 'Order',
      entityId: order._id,
      details: { total, paymentMethod: data.paymentMethod },
    });

    res.json({ order: order.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function voidOrder(req, res, next) {
  try {
    const data = voidSchema.parse(req.body);
    const order = await store.findOrderById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === 'void') throw new ApiError(400, 'Order already voided');

    const approver = await store.findUserByIdWithPin(req.user._id);
    if (!approver || !approver.pin || approver.pin !== data.pin) {
      throw new ApiError(403, 'Invalid manager PIN');
    }

    if (order.status === 'paid') {
      for (const item of order.items) {
        const product = await store.findProductById(item.productId);
        if (product) {
          product.stockQuantity += item.quantity;
          await store.updateProduct(item.productId, { stockQuantity: product.stockQuantity });
          await store.createStockMovement({
            productId: item.productId,
            type: 'adjustment',
            quantity: item.quantity,
            userId: req.user._id,
            note: `Void: ${data.reason}`,
          });
        }
      }
    }

    order.status = 'void';
    order.voidReason = data.reason;
    order.voidedBy = req.user._id;
    await store.saveOrder(order);

    await store.createAuditLog({
      userId: req.user._id,
      action: 'order_void',
      entityType: 'Order',
      entityId: order._id,
      details: { reason: data.reason },
    });

    res.json({ order: order.toJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, checkout, voidOrder };
