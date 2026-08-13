const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(user) {
  const userId = typeof user._id.toHexString === 'function' ? user._id.toHexString() : user._id.toString();
  return jwt.sign({ sub: userId, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function signRefreshToken(user) {
  const userId = typeof user._id.toHexString === 'function' ? user._id.toHexString() : user._id.toString();
  return jwt.sign({ sub: userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwtRefreshSecret);
  } catch {
    return null;
  }
}

module.exports = { signToken, signRefreshToken, verifyToken, verifyRefreshToken };
