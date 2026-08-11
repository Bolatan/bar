const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const createSupplierSchema = require('../validations').createSupplier;
const updateSupplierSchema = require('../validations').updateSupplier;

async function list(_req, res, next) {
  try {
    const suppliers = await store.findSuppliers();
    res.json({ suppliers: suppliers.map((s) => s.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createSupplierSchema.parse(req.body);
    const supplier = await store.createSupplier(data);
    res.status(201).json({ supplier: supplier.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateSupplierSchema.parse(req.body);
    const supplier = await store.updateSupplier(req.params.id, data);
    if (!supplier) throw new ApiError(404, 'Supplier not found');
    res.json({ supplier: supplier.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const supplier = await store.deleteSupplier(req.params.id);
    if (!supplier) throw new ApiError(404, 'Supplier not found');
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
