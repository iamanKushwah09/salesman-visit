const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/report', collectionController.getCollectionReport);
router.get('/', collectionController.getAllCollections);
router.post('/', checkPermission('collections'), collectionController.createCollection);

module.exports = router;

