const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/shiftController');

const router = express.Router();

router.use(requireAuth);

router.get('/current', ctrl.current);
router.get('/history', ctrl.history);
router.post('/open', ctrl.openShift);
router.post('/:id/close', ctrl.closeShift);

module.exports = router;
