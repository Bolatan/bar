const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/productController');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
