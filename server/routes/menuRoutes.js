const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', menuController.getMenu);
router.post('/', auth, adminOnly, menuController.addMenuItem);
router.patch('/:id', auth, adminOnly, menuController.updateMenuItem);
router.delete('/:id', auth, adminOnly, menuController.deleteMenuItem);

module.exports = router;
