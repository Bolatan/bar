const { z } = require('zod');

const login = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const register = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const createUser = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(['owner', 'manager', 'staff']).optional(),
  pin: z.string().length(4).optional(),
});

const updateUser = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(['owner', 'manager', 'staff']).optional(),
  isActive: z.boolean().optional(),
  pin: z.string().length(4).optional(),
});

const createSupplier = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  productsSupplied: z.array(z.string()).optional(),
});

const updateSupplier = createSupplier.partial();

const createProduct = z.object({
  name: z.string().min(1),
  category: z.enum(['Beer', 'Spirits', 'Wine', 'Cocktails', 'Soft Drinks', 'Food', 'Other']),
  unit: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0),
  stockQuantity: z.number().min(0).optional(),
  reorderThreshold: z.number().min(0).optional(),
  supplierId: z.string().optional(),
});

const updateProduct = createProduct.partial();

const stockMovement = z.object({
  productId: z.string(),
  type: z.enum(['restock', 'sale', 'spoilage', 'adjustment']),
  quantity: z.number(),
  note: z.string().optional(),
});

const createOrder = z.object({
  tabName: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
    })
  ),
});

const checkout = z.object({
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'split']),
  paymentRef: z.string().optional(),
  discount: z.number().min(0).optional(),
});

const voidOrder = z.object({
  reason: z.string().min(1),
  pin: z.string().length(4),
});

const openShift = z.object({
  openingFloat: z.number().min(0),
});

const closeShift = z.object({
  closingCount: z.number().min(0),
});

module.exports = {
  login,
  register,
  createUser,
  updateUser,
  createSupplier,
  updateSupplier,
  createProduct,
  updateProduct,
  stockMovement,
  createOrder,
  checkout,
  voidOrder,
  openShift,
  closeShift,
};
