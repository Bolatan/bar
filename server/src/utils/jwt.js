const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(user) {
  return jwt.sign({ sub: user._id.toHexString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toHexString() }, config.jwtRefreshSecret, {
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
