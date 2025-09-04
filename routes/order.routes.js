const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  addOrderEvent,
  updateOrder,
  getOrderEvents,
  deleOrder,getCustomerOrders
} = require('../controllers/order.controller');

// POST /api/orders
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Crear nuevo pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id:
 *                 type: string
 *               tracking_code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pedido creado correctamente
 *       400:
 *         description: Error de validación
 *       403:
 *         description: No autorizado
 */
router.post('/', createOrder);

router.post('/', createOrder);

// GET /api/orders
router.get('/', getAllOrders);

// GET /api/orders/:id
router.get('/:id', getOrderById);
// POST :id/event
router.post('/:id/event', addOrderEvent);
// PUT :id
router.put('/:id', updateOrder);
//GET orderevents
router.get('/:id/events', getOrderEvents)
router.delete('/:id',deleOrder)
router.get("/:id/orders", getCustomerOrders);

module.exports = router;
