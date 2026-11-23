const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/summary/today', visitController.getTodaySummary);
router.get('/', visitController.getAllVisits);
router.get('/:id', visitController.getVisitById);
router.post('/', checkPermission('visits'), visitController.createVisit);
router.put('/:id/check-in', checkPermission('visits'), visitController.checkIn);
router.put('/:id/check-out', checkPermission('visits'), visitController.checkOut);
router.put('/:id/cancel', checkPermission('visits'), visitController.cancelVisit);
router.delete('/:id', checkPermission('visits'), visitController.deleteVisit);

module.exports = router;
