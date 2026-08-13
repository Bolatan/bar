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
    throw new ApiError(403, 'Self-registration is disabled');
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

module.exports = { login, register, me, refresh };
