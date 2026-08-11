const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/stockController');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

module.exports = router;
