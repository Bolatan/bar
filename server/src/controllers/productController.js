const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const createProductSchema = require('../validations').createProduct;
const updateProductSchema = require('../validations').updateProduct;

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.lowStock === 'true') filter.lowStock = true;
    const products = await store.findProducts(filter);
    res.json({ products: products.map((p) => p.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await store.createProduct(data);
    res.status(201).json({ product: product.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await store.updateProduct(req.params.id, data);
    if (!product) throw new ApiError(404, 'Product not found');
    res.json({ product: product.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const product = await store.deactivateProduct(req.params.id);
    if (!product) throw new ApiError(404, 'Product not found');
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
