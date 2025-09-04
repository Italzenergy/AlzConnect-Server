const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');    
// Asignar una ficha técnica a un cliente (solo admin o logistica)
const assignSheetToCustomer = async (req, res) => {
  // Cambia esto para usar req.params en lugar de req.body
  const { customer_id, sheet_id } = req.params;
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'No autorizado para asignar fichas' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO customer_sheets (customer_id, sheet_id)
      VALUES ($1, $2)
      RETURNING *
    `, [customer_id, sheet_id]);

    res.status(201).json({ message: 'Ficha asignada correctamente', assignment: result.rows[0] });
  } catch (error) {
    console.error('Error al asignar ficha:', error);
    
    // Manejar errores específicos de la base de datos
    if (error.code === '23503') { // Violación de clave foránea
      return res.status(400).json({ message: 'El cliente o la ficha técnica no existen' });
    }
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json({ message: 'Esta ficha ya está asignada a este cliente' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todas las fichas asignadas a un cliente (solo el mismo cliente puede ver las suyas)
const getCustomerSheets = async (req, res) => {
  const role = req.user.role;
  const userCustomerId = req.user.id; // ID del cliente autenticado
  const { customer_id } = req.params;

  if (role !== 'admin' && role !== 'logistica' && userCustomerId !== customer_id) {
    return res.status(403).json({ message: 'No autorizado para ver estas fichas' });
  }

  try {
    const result = await pool.query(`
      SELECT cs.*, ts.name, ts.url
      FROM customer_sheets cs
      JOIN technical_sheets ts ON cs.sheet_id = ts.id
      WHERE cs.customer_id = $1
    `, [customer_id]);

    res.status(200).json({ sheets: result.rows });
  } catch (error) {
    console.error('Error al obtener fichas del cliente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
// Obtener asignaciones por ficha técnica
const getSheetAssignments = async (req, res) => {
  const { sheet_id } = req.params;
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'No autorizado para ver estas asignaciones' });
  }

  try {
    const result = await pool.query(`
      SELECT cs.*, c.name as customer_name, c.email, c.phone
      FROM customer_sheets cs
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.sheet_id = $1
      ORDER BY cs.assigned_at DESC
    `, [sheet_id]);

    res.status(200).json({ assignments: result.rows });
  } catch (error) {
    console.error('Error al obtener asignaciones de la ficha:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
// Eliminar asignación (solo admin)
const deleteCustomerSheet = async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Solo el admin puede eliminar asignaciones' });
  }

  try {
    await pool.query('DELETE FROM customer_sheets WHERE id = $1', [id]);
    res.status(200).json({ message: 'Asignación eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  assignSheetToCustomer,
  getCustomerSheets,
  deleteCustomerSheet,
  getSheetAssignments
};
