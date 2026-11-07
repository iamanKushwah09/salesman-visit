const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

router.use(protect);

router.get('/', routeController.getAllRoutes);
router.get('/:id', routeController.getRouteById);
router.post('/', checkPermission('routes'), routeController.createRoute);
router.put('/:id', checkPermission('routes'), routeController.updateRoute);
router.delete('/:id', checkPermission('routes'), routeController.deleteRoute);

module.exports = router;

