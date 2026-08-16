const bcrypt = require('bcryptjs');
const config = require('../config');

// Register all Mongoose models before any populate() operation
require('../models/User');
require('../models/Supplier');
require('../models/Product');
require('../models/StockMovement');
require('../models/Order');
require('../models/Shift');
require('../models/AuditLog');
require('../models/Customer');

let mongoConnected = false;
function setMongoConnected(v) { mongoConnected = v; }
function isMongo() { return mongoConnected; }

const memory = {
  users: [],
  suppliers: [],
  products: [],
  stockMovements: [],
  orders: [],
  shifts: [],
  auditLogs: [],
  customers: [],
};

function genId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function now() { return new Date(); }

async function seedMemory() {
  if (memory.users.length) return;

  const passwordHash = await bcrypt.hash('password123', 10);
  memory.users = [
    { _id: genId(), name: 'Owner', email: 'owner@maltlime.ng', passwordHash, role: 'owner', isActive: true, phone: '', pin: '1234', createdAt: now(), updatedAt: now(), toJSON() { return strip(this); } },
    { _id: genId(), name: 'Manager', email: 'manager@maltlime.ng', passwordHash, role: 'manager', isActive: true, phone: '', pin: '1234', createdAt: now(), updatedAt: now(), toJSON() { return strip(this); } },
    { _id: genId(), name: 'Staff', email: 'staff@maltlime.ng', passwordHash, role: 'staff', isActive: true, phone: '', pin: '1234', createdAt: now(), updatedAt: now(), toJSON() { return strip(this); } },
  ];

  const sup1 = genId();
  const sup2 = genId();
  memory.suppliers = [
    { _id: sup1, name: 'Premium Drinks Distributors', contactPerson: 'Chinedu Okafor', phone: '0803 555 0142', email: 'orders@premiumdrinks.ng', address: 'Ikeja, Lagos', createdAt: now(), updatedAt: now(), toJSON() { return strip(this); } },
    { _id: sup2, name: 'Fresh Bites Wholesale', contactPerson: 'Amaka Bello', phone: '0816 222 9087', email: 'hello@freshbites.ng', address: 'Wuse II, Abuja', createdAt: now(), updatedAt: now(), toJSON() { return strip(this); } },
  ];

  const productSeed = [
    { name: 'Star Lager', category: 'Beer', unit: 'bottle', costPrice: 650, sellingPrice: 1500, stockQuantity: 84, reorderThreshold: 24, supplierId: sup1 },
    { name: 'Gulder Lager', category: 'Beer', unit: 'bottle', costPrice: 700, sellingPrice: 1600, stockQuantity: 42, reorderThreshold: 18, supplierId: sup1 },
    { name: 'Guinness Foreign Extra', category: 'Beer', unit: 'bottle', costPrice: 900, sellingPrice: 2200, stockQuantity: 29, reorderThreshold: 12, supplierId: sup1 },
    { name: 'Hennessy VS', category: 'Spirits', unit: 'bottle', costPrice: 32000, sellingPrice: 65000, stockQuantity: 8, reorderThreshold: 3, supplierId: sup1 },
    { name: 'Chivas Regal 12', category: 'Spirits', unit: 'bottle', costPrice: 42000, sellingPrice: 85000, stockQuantity: 6, reorderThreshold: 2, supplierId: sup1 },
    { name: 'Smirnoff Ice', category: 'Cocktails', unit: 'bottle', costPrice: 1100, sellingPrice: 2500, stockQuantity: 18, reorderThreshold: 12, supplierId: sup1 },
    { name: 'Coca-Cola', category: 'Soft Drinks', unit: 'bottle', costPrice: 350, sellingPrice: 1000, stockQuantity: 46, reorderThreshold: 18, supplierId: sup1 },
    { name: 'Chapman', category: 'Cocktails', unit: 'glass', costPrice: 500, sellingPrice: 3500, stockQuantity: 24, reorderThreshold: 10, supplierId: sup2 },
    { name: 'Peppered Gizzard', category: 'Food', unit: 'plate', costPrice: 1800, sellingPrice: 5000, stockQuantity: 13, reorderThreshold: 6, supplierId: sup2 },
    { name: 'Chicken Wings', category: 'Food', unit: 'plate', costPrice: 2200, sellingPrice: 6500, stockQuantity: 9, reorderThreshold: 5, supplierId: sup2 },
    { name: 'Bottle Water', category: 'Soft Drinks', unit: 'bottle', costPrice: 200, sellingPrice: 700, stockQuantity: 72, reorderThreshold: 24, supplierId: sup1 },
  ];
  memory.products = productSeed.map((p) => ({
    ...p,
    _id: genId(),
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    toJSON() { return strip(this); },
  }));

  memory.customers = [
    {
      _id: genId(),
      name: 'John Okafor',
      email: 'john@maltlime.ng',
      phone: '08012345678',
      marketingConsentEmail: true,
      marketingConsentWhatsApp: true,
      notes: 'Lekki Regular Customer',
      orderCount: 3,
      totalSpent: 18500,
      lastOrderDate: new Date(Date.now() - 3600000 * 4),
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); }
    },
    {
      _id: genId(),
      name: 'Chinwe Adebayo',
      email: 'chinwe@lounge.ng',
      phone: '08169998888',
      marketingConsentEmail: true,
      marketingConsentWhatsApp: false,
      notes: 'Prefers Champagne & VIP Lounge',
      orderCount: 1,
      totalSpent: 65000,
      lastOrderDate: new Date(Date.now() - 3600000 * 24),
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); }
    },
    {
      _id: genId(),
      name: 'Femi Balogun',
      email: '',
      phone: '09077776666',
      marketingConsentEmail: false,
      marketingConsentWhatsApp: true,
      notes: 'Weekend Bar Patron',
      orderCount: 5,
      totalSpent: 42000,
      lastOrderDate: new Date(Date.now() - 3600000 * 48),
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); }
    }
  ];
}

function strip(obj) {
  const { passwordHash, pin, toJSON, ...rest } = obj;
  return { ...rest, id: rest._id };
}

function findDoc(collection, id) {
  return memory[collection].find((d) => d._id === id);
}

const store = {
  isMongo,

  // ---- Users ----
  async findUserByEmail(email) {
    if (isMongo()) {
      const User = require('../models/User');
      return User.findOne({ email }).select('+passwordHash');
    }
    return findDoc('users', memory.users.find((u) => u.email === email)?._id) || null;
  },
  async findUserById(id) {
    if (isMongo()) {
      const User = require('../models/User');
      return User.findById(id);
    }
    return findDoc('users', id) || null;
  },
  async findUserByIdWithPin(id) {
    if (isMongo()) {
      const User = require('../models/User');
      return User.findById(id).select('+pin');
    }
    return findDoc('users', id) || null;
  },
  async createUser(data) {
    if (isMongo()) {
      const User = require('../models/User');
      return User.create(data);
    }
    const user = {
      _id: genId(),
      ...data,
      role: data.role || 'staff',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); },
    };
    memory.users.push(user);
    return user;
  },
  async findUsers() {
    if (isMongo()) {
      const User = require('../models/User');
      return User.find().sort({ createdAt: -1 });
    }
    return [...memory.users].sort((a, b) => b.createdAt - a.createdAt);
  },
  async updateUser(id, data) {
    if (isMongo()) {
      const User = require('../models/User');
      return User.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const user = findDoc('users', id);
    if (!user) return null;
    Object.assign(user, data, { updatedAt: now() });
    return user;
  },
  async deleteUser(id) {
    if (isMongo()) {
      const User = require('../models/User');
      return User.findByIdAndDelete(id);
    }
    const idx = memory.users.findIndex((u) => u._id === id);
    if (idx === -1) return null;
    return memory.users.splice(idx, 1)[0];
  },

  // ---- Products ----
  async findProducts(filter) {
    if (isMongo()) {
      const Product = require('../models/Product');
      const q = { isActive: true };
      if (filter.category) q.category = filter.category;
      if (filter.lowStock) q.$expr = { $lte: ['$stockQuantity', '$reorderThreshold'] };
      return Product.find(q).populate('supplierId', 'name').sort({ name: 1 });
    }
    let result = memory.products.filter((p) => p.isActive);
    if (filter.category) result = result.filter((p) => p.category === filter.category);
    if (filter.lowStock) result = result.filter((p) => p.stockQuantity <= p.reorderThreshold);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  },
  async createProduct(data) {
    if (isMongo()) {
      const Product = require('../models/Product');
      return Product.create(data);
    }
    const product = {
      _id: genId(),
      ...data,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); },
    };
    memory.products.push(product);
    return product;
  },
  async updateProduct(id, data) {
    if (isMongo()) {
      const Product = require('../models/Product');
      return Product.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const product = findDoc('products', id);
    if (!product) return null;
    Object.assign(product, data, { updatedAt: now() });
    return product;
  },
  async deactivateProduct(id) {
    if (isMongo()) {
      const Product = require('../models/Product');
      return Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    }
    const product = findDoc('products', id);
    if (!product) return null;
    product.isActive = false;
    return product;
  },
  async findProductById(id) {
    if (isMongo()) {
      const Product = require('../models/Product');
      return Product.findById(id);
    }
    return findDoc('products', id) || null;
  },

  // ---- Suppliers ----
  async findSuppliers() {
    if (isMongo()) {
      const Supplier = require('../models/Supplier');
      return Supplier.find().sort({ name: 1 });
    }
    return [...memory.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  },
  async createSupplier(data) {
    if (isMongo()) {
      const Supplier = require('../models/Supplier');
      return Supplier.create(data);
    }
    const supplier = { _id: genId(), ...data, createdAt: now(), updatedAt: now(), toJSON() { return strip(this); } };
    memory.suppliers.push(supplier);
    return supplier;
  },
  async updateSupplier(id, data) {
    if (isMongo()) {
      const Supplier = require('../models/Supplier');
      return Supplier.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const supplier = findDoc('suppliers', id);
    if (!supplier) return null;
    Object.assign(supplier, data, { updatedAt: now() });
    return supplier;
  },
  async deleteSupplier(id) {
    if (isMongo()) {
      const Supplier = require('../models/Supplier');
      return Supplier.findByIdAndDelete(id);
    }
    const idx = memory.suppliers.findIndex((s) => s._id === id);
    if (idx === -1) return null;
    return memory.suppliers.splice(idx, 1)[0];
  },

  // ---- Stock Movements ----
  async findStockMovements(filter) {
    if (isMongo()) {
      const StockMovement = require('../models/StockMovement');
      const q = {};
      if (filter.productId) q.productId = filter.productId;
      if (filter.type) q.type = filter.type;
      return StockMovement.find(q).populate('productId', 'name unit').populate('userId', 'name').sort({ createdAt: -1 }).limit(filter.limit || 50);
    }
    let result = [...memory.stockMovements];
    if (filter.productId) result = result.filter((m) => m.productId === filter.productId);
    if (filter.type) result = result.filter((m) => m.type === filter.type);
    return result.sort((a, b) => b.createdAt - a.createdAt).slice(0, filter.limit || 50);
  },
  async createStockMovement(data) {
    if (isMongo()) {
      const StockMovement = require('../models/StockMovement');
      return StockMovement.create(data);
    }
    const movement = { _id: genId(), ...data, createdAt: now(), toJSON() { return strip(this); } };
    memory.stockMovements.push(movement);
    return movement;
  },

  // ---- Orders ----
  async findOrders(filter) {
    if (isMongo()) {
      const Order = require('../models/Order');
      const q = {};
      if (filter.status) q.status = filter.status;
      if (filter.staffId) q.staffId = filter.staffId;
      return Order.find(q).populate('staffId', 'name').sort({ createdAt: -1 }).limit(filter.limit || 50);
    }
    let result = [...memory.orders];
    if (filter.status) result = result.filter((o) => o.status === filter.status);
    if (filter.staffId) result = result.filter((o) => o.staffId === filter.staffId);
    return result.sort((a, b) => b.createdAt - a.createdAt).slice(0, filter.limit || 50);
  },
  async findOrdersForShift(staffId, from, to) {
    if (isMongo()) {
      const Order = require('../models/Order');
      return Order.find({ staffId, status: 'paid', paidAt: { $gte: from, $lte: to } });
    }
    return memory.orders.filter(
      (o) => o.staffId === staffId && o.status === 'paid' && o.paidAt >= from && o.paidAt <= to
    );
  },
  async createOrder(data) {
    if (isMongo()) {
      const Order = require('../models/Order');
      return Order.create(data);
    }
    const order = {
      _id: genId(),
      ...data,
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); },
    };
    memory.orders.push(order);
    return order;
  },
  async findOrderById(id) {
    if (isMongo()) {
      const Order = require('../models/Order');
      return Order.findById(id);
    }
    return findDoc('orders', id) || null;
  },
  async saveOrder(order) {
    if (isMongo()) {
      return order.save();
    }
    return order;
  },
  async findCollectedContacts() {
    if (isMongo()) {
      const Order = require('../models/Order');
      return Order.find({
        $or: [
          { customerEmail: { $ne: null, $ne: "" } },
          { customerPhone: { $ne: null, $ne: "" } }
        ]
      }).sort({ createdAt: -1 });
    }
    return memory.orders.filter(o => o.customerEmail || o.customerPhone);
  },

  // ---- Customers ----
  async findCustomers() {
    if (isMongo()) {
      const Customer = require('../models/Customer');
      return Customer.find().sort({ updatedAt: -1, createdAt: -1 });
    }
    return [...memory.customers].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  },
  async findCustomerById(id) {
    if (isMongo()) {
      const Customer = require('../models/Customer');
      return Customer.findById(id);
    }
    return findDoc('customers', id) || null;
  },
  async createCustomer(data) {
    if (isMongo()) {
      const Customer = require('../models/Customer');
      return Customer.create(data);
    }
    const customer = {
      _id: genId(),
      name: data.name || '',
      email: (data.email || '').trim().toLowerCase(),
      phone: (data.phone || '').trim(),
      marketingConsentEmail: data.marketingConsentEmail ?? true,
      marketingConsentWhatsApp: data.marketingConsentWhatsApp ?? true,
      notes: data.notes || '',
      orderCount: data.orderCount || 0,
      totalSpent: data.totalSpent || 0,
      lastOrderDate: data.lastOrderDate || now(),
      createdAt: now(),
      updatedAt: now(),
      toJSON() { return strip(this); }
    };
    memory.customers.push(customer);
    return customer;
  },
  async updateCustomer(id, data) {
    if (isMongo()) {
      const Customer = require('../models/Customer');
      return Customer.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }
    const customer = findDoc('customers', id);
    if (!customer) return null;
    Object.assign(customer, data, { updatedAt: now() });
    return customer;
  },
  async deleteCustomer(id) {
    if (isMongo()) {
      const Customer = require('../models/Customer');
      return Customer.findByIdAndDelete(id);
    }
    const idx = memory.customers.findIndex((c) => c._id === id);
    if (idx === -1) return null;
    return memory.customers.splice(idx, 1)[0];
  },
  async upsertCustomerFromOrder({ email, phone, marketingConsentEmail, marketingConsentWhatsApp, total, paidAt }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    if (!cleanEmail && !cleanPhone) return null;

    const orderSpent = total || 0;
    const orderDate = paidAt || now();

    if (isMongo()) {
      const Customer = require('../models/Customer');
      let query = [];
      if (cleanEmail) query.push({ email: cleanEmail });
      if (cleanPhone) query.push({ phone: cleanPhone });

      let existing = await Customer.findOne({ $or: query });
      if (existing) {
        existing.orderCount = (existing.orderCount || 0) + 1;
        existing.totalSpent = (existing.totalSpent || 0) + orderSpent;
        existing.lastOrderDate = orderDate;
        if (cleanEmail && !existing.email) existing.email = cleanEmail;
        if (cleanPhone && !existing.phone) existing.phone = cleanPhone;
        if (marketingConsentEmail !== undefined) existing.marketingConsentEmail = marketingConsentEmail;
        if (marketingConsentWhatsApp !== undefined) existing.marketingConsentWhatsApp = marketingConsentWhatsApp;
        return existing.save();
      } else {
        const defaultName = cleanEmail ? cleanEmail.split('@')[0] : 'Guest';
        return Customer.create({
          name: defaultName,
          email: cleanEmail,
          phone: cleanPhone,
          marketingConsentEmail: marketingConsentEmail ?? true,
          marketingConsentWhatsApp: marketingConsentWhatsApp ?? true,
          orderCount: 1,
          totalSpent: orderSpent,
          lastOrderDate: orderDate
        });
      }
    } else {
      let existing = memory.customers.find(c =>
        (cleanEmail && c.email === cleanEmail) || (cleanPhone && c.phone === cleanPhone)
      );
      if (existing) {
        existing.orderCount = (existing.orderCount || 0) + 1;
        existing.totalSpent = (existing.totalSpent || 0) + orderSpent;
        existing.lastOrderDate = orderDate;
        if (cleanEmail && !existing.email) existing.email = cleanEmail;
        if (cleanPhone && !existing.phone) existing.phone = cleanPhone;
        if (marketingConsentEmail !== undefined) existing.marketingConsentEmail = marketingConsentEmail;
        if (marketingConsentWhatsApp !== undefined) existing.marketingConsentWhatsApp = marketingConsentWhatsApp;
        existing.updatedAt = now();
        return existing;
      } else {
        const defaultName = cleanEmail ? cleanEmail.split('@')[0] : 'Guest';
        const customer = {
          _id: genId(),
          name: defaultName,
          email: cleanEmail,
          phone: cleanPhone,
          marketingConsentEmail: marketingConsentEmail ?? true,
          marketingConsentWhatsApp: marketingConsentWhatsApp ?? true,
          notes: '',
          orderCount: 1,
          totalSpent: orderSpent,
          lastOrderDate: orderDate,
          createdAt: now(),
          updatedAt: now(),
          toJSON() { return strip(this); }
        };
        memory.customers.push(customer);
        return customer;
      }
    }
  },

  // ---- Shifts ----
  async findCurrentShift(staffId) {
    if (isMongo()) {
      const Shift = require('../models/Shift');
      return Shift.findOne({ staffId, closedAt: null }).sort({ openedAt: -1 });
    }
    return memory.shifts.find((s) => s.staffId === staffId && !s.closedAt) || null;
  },
  async findShifts(filter) {
    if (isMongo()) {
      const Shift = require('../models/Shift');
      const q = {};
      if (filter.staffId) q.staffId = filter.staffId;
      return Shift.find(q).populate('staffId', 'name role').sort({ openedAt: -1 }).limit(100);
    }
    let result = [...memory.shifts];
    if (filter.staffId) result = result.filter((s) => s.staffId === filter.staffId);
    return result.sort((a, b) => b.openedAt - a.openedAt).slice(0, 100);
  },
  async createShift(data) {
    if (isMongo()) {
      const Shift = require('../models/Shift');
      return Shift.create(data);
    }
    const shift = { _id: genId(), ...data, openedAt: now(), closedAt: null, toJSON() { return strip(this); } };
    memory.shifts.push(shift);
    return shift;
  },
  async saveShift(shift) {
    if (isMongo()) {
      return shift.save();
    }
    return shift;
  },

  // ---- Audit Logs ----
  async createAuditLog(data) {
    if (isMongo()) {
      const AuditLog = require('../models/AuditLog');
      return AuditLog.create(data);
    }
    const log = { _id: genId(), ...data, createdAt: now(), toJSON() { return strip(this); } };
    memory.auditLogs.push(log);
    return log;
  },
  async findAuditLogs() {
    if (isMongo()) {
      const AuditLog = require('../models/AuditLog');
      return AuditLog.find()
        .populate('userId', 'name role')
        .sort({ createdAt: -1 });
    }
    return [...memory.auditLogs].map(log => {
      const populatedLog = { ...log };
      if (log.userId) {
        const user = memory.users.find(u => u._id === log.userId);
        if (user) {
          populatedLog.userId = { id: user._id, name: user.name, role: user.role };
        }
      }
      return {
        ...populatedLog,
        id: log._id,
        toJSON() { return this; }
      };
    }).sort((a, b) => b.createdAt - a.createdAt);
  },
};

module.exports = { store, setMongoConnected, isMongo, seedMemory };
