const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); 


// controllers/routes.controller.js

const createRoute = async (req, res) => {
  try {
    const {
      order_id,
      carrier_id,
      source_address,
      destination_address,
      departure_date,
      estimated_delivery_date,
      comment,
      cost  // Asegúrate de recibir este campo
    } = req.body;

    // 1. Verificar existencia del pedido
    const orderCheck = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ error: 'El pedido no existe' });
    }

    // 2. Verificar existencia del transportista
    const carrierCheck = await db.query('SELECT * FROM carriers WHERE id = $1', [carrier_id]);
    if (carrierCheck.rowCount === 0) {
      return res.status(404).json({ error: 'El transportista no existe' });
    }

    // 3. Verificar que no haya una ruta para este pedido
    const routeExists = await db.query('SELECT * FROM routes WHERE order_id = $1', [order_id]);
    if (routeExists.rowCount > 0) {
      return res.status(400).json({ error: 'Este pedido ya tiene una ruta asignada' });
    }

    // 4. Crear la ruta con el campo cost
    const newRoute = await db.query(
      `INSERT INTO routes (
        order_id, carrier_id, source_address, destination_address,
        departure_date, estimated_delivery_date, comment, cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        order_id,
        carrier_id,
        source_address,
        destination_address,
        departure_date,
        estimated_delivery_date,
        comment,
        cost || null  // Manejar casos donde cost podría ser undefined
      ]
    );

    // 5. Cambiar estado del transportista a 'on trip'
    await db.query(
      `UPDATE carriers SET state = 'on trip' WHERE id = $1`,
      [carrier_id]
    );

    res.status(201).json({ message: 'Ruta creada correctamente', route: newRoute.rows[0] });
  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({ error: 'Error interno al crear la ruta', details: error.message });
  }
};

const updateRoute = async (req, res) => {
  const routeId = req.params.id;
  const { destination_address, estimated_delivery_date, comment, cost } = req.body;
  const role = req.user.role;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    // Verificar si la ruta existe
    const check = await db.query('SELECT * FROM routes WHERE id = $1', [routeId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    // Actualizar la ruta incluyendo el campo cost
    const result = await db.query(`
      UPDATE routes 
      SET 
        destination_address = COALESCE($1, destination_address),
        estimated_delivery_date = COALESCE($2, estimated_delivery_date),
        comment = COALESCE($3, comment),
        cost = COALESCE($4, cost)
      WHERE id = $5
      RETURNING *
    `, [destination_address, estimated_delivery_date, comment, cost, routeId]);

    res.status(200).json({
      message: 'Ruta actualizada correctamente',
      route: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar ruta:', error);
    res.status(500).json({ message: 'Error interno del servidor', details: error.message });
  }
};
// En tu controlador de rutas
const getAllRoutes = async (req, res) => {
  const userRole = req.user?.role;

  if (!userRole || (userRole !== 'admin' && userRole !== 'logistica')) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  try {
    // Agregado cost a la consulta
  const result = await db.query(`
  SELECT 
    routes.id, 
    routes.order_id,
    routes.source_address, 
    routes.destination_address, 
    routes.comment, 
    routes.cost,
    routes.created_at, 
    carriers.id AS carrier_id,
    carriers.name AS carrier_name,
    carriers.state AS carrier_state
  FROM routes
  JOIN carriers ON routes.carrier_id = carriers.id
  ORDER BY routes.created_at DESC
`);

    res.status(200).json({ routes: result.rows });
  } catch (error) {
    console.error('Error al obtener rutas:', error.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
const getRouteById = async (req, res) => {
  const routeId = req.params.id;
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const result = await db.query(`
      SELECT r.id, 
      r.destination_address, 
      o.state, 
             c.name AS carrier_name, 
             c.contact AS carrier_phone,
             o.tracking_code AS order_tracking
      FROM routes r
      JOIN carriers c ON r.carrier_id = c.id
      JOIN orders o ON r.order_id = o.id
      WHERE r.id = $1
    `, [routeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }

    res.status(200).json({ route: result.rows[0] });

  } catch (error) {
    console.error('Error al obtener ruta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// controllers/route.controller.js - Agregar esta función
const getCustomerRoutes = async (req, res) => {
  const customerId = req.params.id;
  const userRole = req.user.role;
  const userCustomerId = req.user.id;

  if (userRole !== 'admin' && userRole !== 'logistica' && userCustomerId !== customerId) {
    return res.status(403).json({ message: 'No autorizado para ver estas rutas' });
  }

  try {
   // Nota: No se incluye el campo "cost" para clientes
const result = await db.query(`
  SELECT 
    r.id,
    r.order_id,
    r.source_address,
    r.destination_address,
    r.departure_date,
    r.estimated_delivery_date,
    r.comment,
    r.created_at,
    o.tracking_code as order_tracking_code,
    c.name as carrier_name,
    cust.name as customer_name
  FROM routes r
  JOIN orders o ON r.order_id = o.id
  JOIN carriers c ON r.carrier_id = c.id
  JOIN customers cust ON o.customer_id = cust.id
  WHERE o.customer_id = $1
  ORDER BY r.created_at DESC
`, [customerId]);

    res.status(200).json({ routes: result.rows });
  } catch (error) {
    console.error('Error al obtener rutas del cliente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
// Añadir esta exportación
module.exports = {
  createRoute,
  getAllRoutes,
  getRouteById,
  updateRoute,
  getCustomerRoutes // Nueva función exportada
};


