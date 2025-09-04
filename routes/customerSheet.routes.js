const express = require('express');
const router = express.Router();
const {
  assignSheetToCustomer,
  getCustomerSheets,
  deleteCustomerSheet,
  getSheetAssignments
} = require('../controllers/customerSheet.controller');
// Obtener fichas técnicas de un cliente
router.get('/:id/sheets',getCustomerSheets);
// Asignar ficha a cliente (POST)
router.post('/:customer_id/sheets/:sheet_id', assignSheetToCustomer);

// Obtener fichas de un cliente
router.get('/:customer_id', getCustomerSheets);

// Eliminar asignación
router.delete('/:id',  deleteCustomerSheet);

// Obtener asignaciones por ficha técnica
router.get('/sheet/:sheet_id', getSheetAssignments);

module.exports = router;
