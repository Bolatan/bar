const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'manager'));

router.get('/sales', ctrl.sales);
router.get('/inventory-valuation', ctrl.inventoryValuation);
router.get('/low-stock', ctrl.lowStock);

module.exports = router;
