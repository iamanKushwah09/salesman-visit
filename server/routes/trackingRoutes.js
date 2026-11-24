const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const directionsController = require('../controllers/directionsController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/live-locations', trackingController.getLiveLocations);
router.get('/history/:salesmanId', trackingController.getLocationHistory);
router.get('/directions', directionsController.getDirections);
router.get('/geocode-address', trackingController.geocodeAddress);
router.post('/update-location', trackingController.updateLocationRest);

module.exports = router;

