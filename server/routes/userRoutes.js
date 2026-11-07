const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/', checkPermission('users'), userController.getAllUsers);
router.post('/', checkPermission('users'), userController.createUser);
router.put('/:id', checkPermission('users'), userController.updateUser);
router.delete('/:id', checkPermission('users'), userController.deleteUser);

module.exports = router;

