const express = require('express');
const router = express.Router();
const { 
createRoute, 
getAllRoutes,
getRouteById,
updateRoute,getCustomerRoutes
} = require('../controllers/routes.controller');
router.get('/customer/:id', getCustomerRoutes);
// Crear ruta (solo admin o logística)
router.post('/', createRoute);
router.get('/',getAllRoutes);
router.get('/:id',getRouteById);
router.put('/:id',updateRoute);
module.exports = router;
