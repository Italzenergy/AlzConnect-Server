const express = require('express');
const router = express.Router();
const { 
  getAllCustomers, 
  createCustomer, 
  getCustomerById, 
  updateCustomer, 
  deleteCustomer,
  getCustomerWithDetails 
} = require('../controllers/customer.controller');  // Verifica que la importación sea correcta
const verifyToken = require('../middlewares/verifyToken');
// Ruta para obtener todos los clientes (requiere token)
router.get('/', verifyToken, getAllCustomers);

// Ruta para crear un cliente (requiere token)
router.post('/', verifyToken, createCustomer);

// Ruta para obtener un cliente por ID (requiere token)
router.get('/:id', verifyToken, getCustomerById);

// Ruta para actualizar un cliente (requiere token)
router.put('/:id', verifyToken, updateCustomer);

// Ruta para eliminar un cliente (requiere token)
router.delete('/:id', verifyToken, deleteCustomer);
router.get('/:id/details', verifyToken, getCustomerWithDetails);
module.exports = router;
