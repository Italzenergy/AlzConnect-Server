const express = require('express');
const router = express.Router();
const { createCarrier,
    getAllCarriers,
    getCarrierById,
    updateCarrier,
    deleteCarrier
 } = require('../controllers/carriers.controller');
router.post('/', createCarrier);
router.get('/',getAllCarriers);
router.get('/:id',getCarrierById);
router.put('/:id',updateCarrier);
router.delete('/:id', deleteCarrier);
module.exports = router;
