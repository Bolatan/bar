const bcrypt = require('bcryptjs');
const { store } = require('../store');
const { signToken, signRefreshToken } = require('../utils/jwt');
const { ApiError } = require('../middleware/error');
const loginSchema = require('../validations').login;
const registerSchema = require('../validations').register;

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await store.findUserByEmail(email);
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid email or password');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Invalid email or password');
    res.json({ token: signToken(user), refreshToken: signRefreshToken(user), user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const existing = await store.findUserByEmail(email);
    if (existing) throw new ApiError(409, 'Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await store.createUser({ name, email, passwordHash, role: 'staff' });
    res.status(201).json({ token: signToken(user), refreshToken: signRefreshToken(user), user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) throw new ApiError(401, 'Not authenticated');
    res.json({ user: req.user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { verifyRefreshToken } = require('../utils/jwt');
    const token = req.body.refreshToken;
    if (!token) throw new ApiError(400, 'Refresh token required');
    const payload = verifyRefreshToken(token);
    if (!payload) throw new ApiError(401, 'Invalid refresh token');
    const user = await store.findUserById(payload.sub);
    if (!user || !user.isActive) throw new ApiError(401, 'User not found');
    res.json({ token: signToken(user), refreshToken: signRefreshToken(user) });
  } catch (err) {
    next(err);
  }
}

async function seed(req, res, next) {
  try {
    const User = require('../models/User');
    const Supplier = require('../models/Supplier');
    const Product = require('../models/Product');

    const passwordHash = await bcrypt.hash('password123', 10);

    if (store.isMongo()) {
      const existingOwner = await User.findOne({ email: 'owner@maltlime.ng' });
      if (!existingOwner) {
        await User.create({ name: 'Owner', email: 'owner@maltlime.ng', passwordHash, role: 'owner', pin: '1234' });
        await User.create({ name: 'Manager', email: 'manager@maltlime.ng', passwordHash, role: 'manager', pin: '1234' });
        await User.create({ name: 'Staff', email: 'staff@maltlime.ng', passwordHash, role: 'staff', pin: '1234' });
      }

      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        const createdSuppliers = await Supplier.insertMany([
          { name: 'Premium Drinks Distributors', contactPerson: 'Chinedu Okafor', phone: '0803 555 0142', email: 'orders@premiumdrinks.ng', address: 'Ikeja, Lagos' },
          { name: 'Fresh Bites Wholesale', contactPerson: 'Amaka Bello', phone: '0816 222 9087', email: 'hello@freshbites.ng', address: 'Yaba, Lagos' },
        ]);
        const productsToSeed = [
          { name: 'Star Lager', category: 'Beer', unit: 'bottle', costPrice: 650, sellingPrice: 1500, stockQuantity: 84, reorderThreshold: 24, supplierId: createdSuppliers[0]._id },
          { name: 'Gulder Lager', category: 'Beer', unit: 'bottle', costPrice: 700, sellingPrice: 1600, stockQuantity: 42, reorderThreshold: 18, supplierId: createdSuppliers[0]._id },
          { name: 'Guinness Foreign Extra', category: 'Beer', unit: 'bottle', costPrice: 900, sellingPrice: 2200, stockQuantity: 29, reorderThreshold: 12, supplierId: createdSuppliers[0]._id },
          { name: 'Hennessy VS', category: 'Spirits', unit: 'bottle', costPrice: 32000, sellingPrice: 65000, stockQuantity: 8, reorderThreshold: 3, supplierId: createdSuppliers[0]._id },
          { name: 'Chivas Regal 12', category: 'Spirits', unit: 'bottle', costPrice: 42000, sellingPrice: 85000, stockQuantity: 6, reorderThreshold: 2, supplierId: createdSuppliers[0]._id },
          { name: 'Smirnoff Ice', category: 'Cocktails', unit: 'bottle', costPrice: 1100, sellingPrice: 2500, stockQuantity: 18, reorderThreshold: 12, supplierId: createdSuppliers[0]._id },
          { name: 'Coca-Cola', category: 'Soft Drinks', unit: 'bottle', costPrice: 350, sellingPrice: 1000, stockQuantity: 46, reorderThreshold: 18, supplierId: createdSuppliers[0]._id },
          { name: 'Chapman', category: 'Cocktails', unit: 'glass', costPrice: 500, sellingPrice: 3500, stockQuantity: 24, reorderThreshold: 10, supplierId: createdSuppliers[1]._id },
          { name: 'Peppered Gizzard', category: 'Food', unit: 'plate', costPrice: 1800, sellingPrice: 5000, stockQuantity: 13, reorderThreshold: 6, supplierId: createdSuppliers[1]._id },
          { name: 'Chicken Wings', category: 'Food', unit: 'plate', costPrice: 2200, sellingPrice: 6500, stockQuantity: 9, reorderThreshold: 5, supplierId: createdSuppliers[1]._id },
          { name: 'Bottle Water', category: 'Soft Drinks', unit: 'bottle', costPrice: 200, sellingPrice: 700, stockQuantity: 72, reorderThreshold: 24, supplierId: createdSuppliers[0]._id },
        ];
        await Product.insertMany(productsToSeed);
      }
    } else {
      const { seedMemory } = require('../store');
      await seedMemory();
    }

    res.json({
      message: 'Database seeded successfully',
      credentials: [
        { role: 'owner', email: 'owner@maltlime.ng', password: 'password123', pin: '1234' },
        { role: 'manager', email: 'manager@maltlime.ng', password: 'password123', pin: '1234' },
        { role: 'staff', email: 'staff@maltlime.ng', password: 'password123', pin: '1234' }
      ]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, me, refresh, seed };
