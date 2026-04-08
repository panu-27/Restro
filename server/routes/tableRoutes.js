const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { auth } = require('../middleware/auth');

router.get('/', auth, tableController.getTables);
router.patch('/:tableId/section', auth, tableController.updateTableSection);

module.exports = router;
