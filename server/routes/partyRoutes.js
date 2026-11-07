const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/', partyController.getAllParties);
router.get('/:id', partyController.getPartyById);
router.post('/', checkPermission('parties'), partyController.createParty);
router.put('/:id', checkPermission('parties'), partyController.updateParty);
router.delete('/:id', checkPermission('parties'), partyController.deleteParty);

module.exports = router;

