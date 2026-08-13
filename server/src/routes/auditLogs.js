const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { store } = require('../store');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));

router.get('/', async (req, res, next) => {
  try {
    const logs = await store.findAuditLogs();
    res.json({ logs: logs.map(l => l.toJSON ? l.toJSON() : l) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
