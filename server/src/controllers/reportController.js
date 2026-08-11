const { store } = require('../store');

async function sales(req, res, next) {
  try {
    const period = req.query.period || 'daily';
    const now = new Date();
    const from = new Date();
    if (period === 'weekly') from.setDate(now.getDate() - 7);
    else if (period === 'monthly') from.setMonth(now.getMonth() - 1);
    else from.setHours(0, 0, 0, 0);

    const orders = await store.findOrders({ status: 'paid', limit: 1000 });
    const inRange = orders.filter((o) => o.paidAt && o.paidAt >= from && o.paidAt <= now);

    const revenue = inRange.reduce((sum, o) => sum + o.total, 0);
    const vat = inRange.reduce((sum, o) => sum + o.vat, 0);

    const byCategory = {};
    const byProduct = {};
    const byStaff = {};

    for (const order of inRange) {
      const staffId = order.staffId;
      byStaff[staffId] = (byStaff[staffId] || 0) + order.total;
      for (const item of order.items) {
        const product = await store.findProductById(item.productId);
        const category = product?.category || 'Other';
        byCategory[category] = (byCategory[category] || 0) + item.unitPrice * item.quantity;
        byProduct[item.name] = (byProduct[item.name] || 0) + item.quantity;
      }
    }

    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, qty]) => ({ name, quantity: qty }));

    res.json({
      period,
      orderCount: inRange.length,
      revenue,
      vat,
      byCategory: Object.entries(byCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
      topProducts,
      byStaff: Object.entries(byStaff).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    next(err);
  }
}

async function inventoryValuation(_req, res, next) {
  try {
    const products = await store.findProducts({});
    const items = products.map((p) => ({
      name: p.name,
      category: p.category,
      stockQuantity: p.stockQuantity,
      costPrice: p.costPrice,
      value: p.stockQuantity * p.costPrice,
    }));
    const totalValue = items.reduce((sum, v) => sum + v.value, 0);
    res.json({ totalValue, items });
  } catch (err) {
    next(err);
  }
}

async function lowStock(_req, res, next) {
  try {
    const products = await store.findProducts({ lowStock: true });
    res.json({ products: products.map((p) => p.toJSON()) });
  } catch (err) {
    next(err);
  }
}

module.exports = { sales, inventoryValuation, lowStock };
