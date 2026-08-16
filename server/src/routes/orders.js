const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/:id/checkout', ctrl.checkout);
router.post('/:id/void', ctrl.voidOrder);
router.post('/:id/send-receipt', ctrl.sendReceipt);

module.exports = router;
