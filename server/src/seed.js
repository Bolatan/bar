const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Product = require('./models/Product');

const suppliers = [
  { name: 'Premium Drinks Distributors', contactPerson: 'Chinedu Okafor', phone: '0803 555 0142', email: 'orders@premiumdrinks.ng', address: 'Ikeja, Lagos' },
  { name: 'Fresh Bites Wholesale', contactPerson: 'Amaka Bello', phone: '0816 222 9087', email: 'hello@freshbites.ng', address: 'Yaba, Lagos' },
];

const products = [
  { name: 'Star Lager', category: 'Beer', unit: 'bottle', costPrice: 650, sellingPrice: 1500, stockQuantity: 84, reorderThreshold: 24, supplierIndex: 0 },
  { name: 'Gulder Lager', category: 'Beer', unit: 'bottle', costPrice: 700, sellingPrice: 1600, stockQuantity: 42, reorderThreshold: 18, supplierIndex: 0 },
  { name: 'Guinness Foreign Extra', category: 'Beer', unit: 'bottle', costPrice: 900, sellingPrice: 2200, stockQuantity: 29, reorderThreshold: 12, supplierIndex: 0 },
  { name: 'Hennessy VS', category: 'Spirits', unit: 'bottle', costPrice: 32000, sellingPrice: 65000, stockQuantity: 8, reorderThreshold: 3, supplierIndex: 0 },
  { name: 'Chivas Regal 12', category: 'Spirits', unit: 'bottle', costPrice: 42000, sellingPrice: 85000, stockQuantity: 6, reorderThreshold: 2, supplierIndex: 0 },
  { name: 'Smirnoff Ice', category: 'Cocktails', unit: 'bottle', costPrice: 1100, sellingPrice: 2500, stockQuantity: 18, reorderThreshold: 12, supplierIndex: 0 },
  { name: 'Coca-Cola', category: 'Soft Drinks', unit: 'bottle', costPrice: 350, sellingPrice: 1000, stockQuantity: 46, reorderThreshold: 18, supplierIndex: 0 },
  { name: 'Chapman', category: 'Cocktails', unit: 'glass', costPrice: 500, sellingPrice: 3500, stockQuantity: 24, reorderThreshold: 10, supplierIndex: 1 },
  { name: 'Peppered Gizzard', category: 'Food', unit: 'plate', costPrice: 1800, sellingPrice: 5000, stockQuantity: 13, reorderThreshold: 6, supplierIndex: 1 },
  { name: 'Chicken Wings', category: 'Food', unit: 'plate', costPrice: 2200, sellingPrice: 6500, stockQuantity: 9, reorderThreshold: 5, supplierIndex: 1 },
  { name: 'Bottle Water', category: 'Soft Drinks', unit: 'bottle', costPrice: 200, sellingPrice: 700, stockQuantity: 72, reorderThreshold: 24, supplierIndex: 0 },
];

const users = [
  { name: 'Owner', email: 'owner@maltlime.ng', password: 'password123', role: 'owner', pin: '1234' },
  { name: 'Manager', email: 'manager@maltlime.ng', password: 'password123', role: 'manager', pin: '1234' },
  { name: 'Staff', email: 'staff@maltlime.ng', password: 'password123', role: 'staff', pin: '1234' },
];

async function seed() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(config.mongodbUri);
  console.log('Connected. Seeding data…');

  await Promise.all([User.deleteMany({}), Supplier.deleteMany({}), Product.deleteMany({})]);

  const createdSuppliers = await Supplier.insertMany(suppliers);
  console.log(`Created ${createdSuppliers.length} suppliers`);

  const productDocs = products.map((p) => ({
    ...p,
    supplierId: createdSuppliers[p.supplierIndex]._id,
  }));
  productDocs.forEach((p) => delete p.supplierIndex);
  const createdProducts = await Product.insertMany(productDocs);
  console.log(`Created ${createdProducts.length} products`);

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
  }
  console.log(`Created ${users.length} users`);

  console.log('\nSeed complete! Login credentials:');
  users.forEach((u) => console.log(`  ${u.role}: ${u.email} / ${u.password} (PIN: ${u.pin})`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
