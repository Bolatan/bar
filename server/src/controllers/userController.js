const bcrypt = require('bcryptjs');
const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const createUserSchema = require('../validations').createUser;
const updateUserSchema = require('../validations').updateUser;

async function list(_req, res, next) {
  try {
    const users = await store.findUsers();
    res.json({ users: users.map((u) => u.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);
    const existing = await store.findUserByEmail(data.email);
    if (existing) throw new ApiError(409, 'Email already registered');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await store.createUser({
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone,
      role: data.role || 'staff',
      pin: data.pin,
    });
    await store.createAuditLog({
      userId: req.user._id,
      action: 'user_create',
      entityType: 'User',
      entityId: user._id,
      details: { email: user.email, role: user.role },
    });
    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await store.updateUser(req.params.id, data);
    if (!user) throw new ApiError(404, 'User not found');
    await store.createAuditLog({
      userId: req.user._id,
      action: 'user_update',
      entityType: 'User',
      entityId: user._id,
      details: data,
    });
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const user = await store.findUserById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'owner') throw new ApiError(403, 'Cannot delete an owner account');
    await store.deleteUser(req.params.id);
    await store.createAuditLog({
      userId: req.user._id,
      action: 'user_delete',
      entityType: 'User',
      entityId: user._id,
      details: { email: user.email },
    });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
