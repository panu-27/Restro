const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { auth } = require('../middleware/auth');

router.get('/', auth, tableController.getTables);
router.post('/', auth, tableController.createTable);
router.patch('/:tableId/section', auth, tableController.updateTableSection);
router.patch('/:tableId', auth, tableController.updateTableSeats);
router.delete('/:tableId', auth, tableController.deleteTable);

module.exports = router;
