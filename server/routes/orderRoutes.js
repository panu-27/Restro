const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

router.get('/active', auth, orderController.getActiveOrders);
router.post('/', auth, orderController.createOrder);
router.patch('/:id/status', auth, orderController.updateOrderStatus);
router.patch('/:id/transfer', auth, orderController.transferOrder);
router.get('/', auth, orderController.getAllOrders);
router.delete('/:id', auth, orderController.deleteOrder);

module.exports = router;
