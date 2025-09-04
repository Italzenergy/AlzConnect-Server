const express = require('express');
const router = express.Router();
const {
  loginCustomer,
  changePassword,
  // ...otros handlers
} = require('../controllers/customer.controller');

router.post('/login', loginCustomer);
router.post('/change-password', changePassword); // <-- ESTA ES LA NUEVA RUTA

module.exports = router;
