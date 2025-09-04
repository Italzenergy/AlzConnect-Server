const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const createCarrier = async (req, res) => {
  const { name, contact } = req.body;
  const role = req.user.role;

  // Solo admin puede crear transportistas
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO carriers (name, contact)
       VALUES ($1, $2)
       RETURNING *`,
      [name, contact]
    );

    res.status(201).json({
      message: 'Transportista creado correctamente',
      carrier: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear transportista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
const getAllCarriers = async (req, res) => {
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const result = await pool.query(`
      SELECT id, name, contact, state, created_at
      FROM carriers
      ORDER BY created_at DESC
    `);

    res.status(200).json({ carriers: result.rows });
  } catch (error) {
    console.error('Error al obtener transportistas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getCarrierById = async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, contact, state, created_at FROM carriers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transportista no encontrado' });
    }

    res.status(200).json({ carrier: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener transportista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const updateCarrier = async (req, res) => {
  const { id } = req.params;
  const { name, contact, state } = req.body;
  const role = req.user.role;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });
  }

  try {
    const carrierExists = await pool.query('SELECT * FROM carriers WHERE id = $1', [id]);

    if (carrierExists.rows.length === 0) {
      return res.status(404).json({ message: 'Transportista no encontrado' });
    }

    const result = await pool.query(
      `UPDATE carriers 
       SET name = COALESCE($1, name),
           contact = COALESCE($2, contact),
           state = COALESCE($3, state)
       WHERE id = $4
       RETURNING *`,
      [name, contact, state, id]
    );

    res.status(200).json({ message: 'Transportista actualizado', carrier: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar transportista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
const deleteCarrier = async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });
  }

  try {
    const carrierExists = await pool.query('SELECT * FROM carriers WHERE id = $1', [id]);

    if (carrierExists.rows.length === 0) {
      return res.status(404).json({ message: 'Transportista no encontrado' });
    }

    await pool.query('DELETE FROM carriers WHERE id = $1', [id]);

    res.status(200).json({ message: 'Transportista eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar transportista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { createCarrier, getAllCarriers, getCarrierById, updateCarrier, deleteCarrier };
