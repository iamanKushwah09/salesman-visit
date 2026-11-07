const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

// All role routes require authentication
router.use(protect);

// Available permissions list (Needed for creating/editing roles)
router.get('/available-permissions', roleController.getAvailablePermissions);

// CRUD
router.get('/', checkPermission('roles'), roleController.getAllRoles);
router.get('/:id', checkPermission('roles'), roleController.getRoleById);
router.post('/', checkPermission('roles'), roleController.createRole);
router.put('/:id', checkPermission('roles'), roleController.updateRole);
router.delete('/:id', checkPermission('roles'), roleController.deleteRole);

module.exports = router;

