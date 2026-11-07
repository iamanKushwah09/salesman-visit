const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesmanController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/', salesmanController.getAllSalesmen);
router.get('/:id', salesmanController.getSalesmanById);
router.post('/', checkPermission('salesmen'), salesmanController.createSalesman);
router.put('/:id', checkPermission('salesmen'), salesmanController.updateSalesman);
router.delete('/:id', checkPermission('salesmen'), salesmanController.deleteSalesman);

module.exports = router;

