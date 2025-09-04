const express = require('express');
const router = express.Router();
const { 
  createSheet,
  getAllSheets,
  getSheetById,
  updateSheet,
  deleteSheet } = require('../controllers/sheet.controller');

router.post('/', createSheet);
router.get('/',getAllSheets);
router.get('/:id', getSheetById);
// Actualizar ficha
router.put('/:id', updateSheet);
// Eliminar ficha
router.delete('/:id', deleteSheet);
module.exports = router;
