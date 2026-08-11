const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
});

router.post('/login', loginLimiter, ctrl.login);
router.post('/register', loginLimiter, ctrl.register);
router.post('/refresh', ctrl.refresh);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
