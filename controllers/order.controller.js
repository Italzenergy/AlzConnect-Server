const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
 const createOrder = async (req, res) => {
  const { customer_id, tracking_code, description } = req.body;
       //Evitar que un ataque manipule el user id desde el front 
        const user_id = req.user.id; 
        const user_role = req.user.role;
  try {
    // Verificar si el usuario existe y tiene rol válido
    if (user_role !== 'admin' && user_role !== 'logistica') {
  return res.status(403).json({ message: 'No autorizado para crear pedidos' });
}

    // Verificar si el cliente existe y está activo
    const customerCheck = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [customer_id]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    if (customerCheck.rows[0].status !== 'active') {
      return res.status(403).json({ message: 'El cliente está inactivo' });
    }

    // Insertar pedido
    const result = await pool.query(
      `INSERT INTO orders (customer_id, user_id, tracking_code, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [customer_id, user_id, tracking_code, description]
    );

    res.status(201).json({
      message: 'Pedido creado correctamente',
      order: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear pedido:', error);

    if (error.code === '23505') {
      return res.status(400).json({ message: 'Código de seguimiento ya existe' });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
const getAllOrders = async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase().trim(); 
    console.log("Rol recibido en getAllOrders:", role);

    if (role !== 'admin' && role !== 'logistica') {
      return res.status(403).json({ message: 'Acceso no autorizado para ver pedidos' });
    }

    const result = await pool.query(`
      SELECT
        o.id,
        o.tracking_code,
        o.description,
        o.state,
        o.created_at,
        u.name as user_name,
        c.name as customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
    `);

    res.status(200).json({ orders: result.rows });
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getOrderById = async(req,res)=>{
const { id } = req.params;
  const userRole = req.user.role;

  // Solo admin o logistica pueden ver pedidos por ID
  if (userRole !== 'admin' && userRole !== 'logistica') {
    return res.status(403).json({ message: 'No autorizado para ver este pedido' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        o.id, 
        o.tracking_code, 
        o.description, 
        o.state, 
        o.created_at, 
        u.name AS user_name, 
        c.name AS customer_name 
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.status(200).json({ order: result.rows[0] });

  } catch (error) {
    console.error('Error al obtener pedido por ID:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
const addOrderEvent = async (req, res) => {
  const { id: order_id } = req.params;
  const { event_type, note } = req.body;  // Cambiado de state a event_type
  const user_id = req.user.id;
  const role = req.user.role;

  try {
    if (role !== 'admin' && role !== 'logistica') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const orderCheck = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Cambiado state por event_type
    const result = await pool.query(`
      INSERT INTO order_events (order_id, user_id, event_type, note)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [order_id, user_id, event_type, note]);  // note ahora puede ser null

    res.status(201).json({
      message: 'Evento registrado correctamente',
      event: result.rows[0]
    });

  } catch (error) {
    console.error('Error al agregar evento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
const updateOrder= async(req,res)=>{
const { id } = req.params;
  const { state, description } = req.body;
  const user_role = req.user.role;

  if (user_role !== 'admin' && user_role !== 'logistica') {
    return res.status(403).json({ message: 'No autorizado para actualizar pedidos' });
  }

  try {
    // Verificar si el pedido existe
    const existing = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Actualizar estado y descripción si vienen en el body
    const result = await pool.query(
      `UPDATE orders 
       SET 
         state = COALESCE($1, state), 
         description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [state, description, id]
    );

    res.status(200).json({
      message: 'Pedido actualizado correctamente',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
const deleOrder = async (req, res) => {
  const orderId = req.params.id;
  const userRole = req.user.role;

  console.log('Intentando eliminar pedido con ID:', orderId); // 👈 esto

  if (userRole !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo el administrador puede eliminar pedidos' });
  }

  try {
    const checkOrder = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (checkOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    await pool.query('DELETE FROM order_events WHERE order_id = $1', [orderId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);

    res.status(200).json({ message: 'Pedido eliminado correctamente' });

  } catch (error) {
    console.error('Error al eliminar pedido:', error); // 👈 importante
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
const getOrderEvents = async (req, res) => {
  const orderId = req.params.id;
  const userRole = req.user.role;

  if (userRole !== 'admin' && userRole !== 'logistica') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const orderResult = await pool.query(
      `SELECT o.id, o.tracking_code, o.description, o.state, o.created_at,
              u.name AS user_name, c.name AS customer_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const order = orderResult.rows[0];

    // Cambiado state por event_type
    const eventsResult = await pool.query(
      `SELECT id, order_id, event_type, note, date, user_id
       FROM order_events
       WHERE order_id = $1
       ORDER BY date ASC`,
      [orderId]
    );

    res.status(200).json({
      order,
      events: eventsResult.rows
    });
  } catch (error) {
    console.error('Error al obtener historial de pedido:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// controllers/customers.js
const getCustomerOrders = async (req, res) => {
  const customerId = req.params.id;
  try {
    const query = `
      SELECT 
        o.id AS order_id,
        o.tracking_code,
        o.description,
        o.state AS order_state,
        o.created_at AS order_created,
        json_agg(
          json_build_object(
            'id', e.id,
            'event_type', e.event_type,
            'note', e.note,
            'date', e.date
          ) ORDER BY e.date ASC
        ) AS events
      FROM orders o
      LEFT JOIN order_events e ON e.order_id = o.id
      WHERE o.customer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [customerId]);
    res.json({ ok: true, orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Error al traer pedidos" });
  }
};

 module.exports={createOrder,getAllOrders,getOrderById,updateOrder,deleOrder,addOrderEvent,getOrderEvents,getCustomerOrders};