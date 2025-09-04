const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const createSheet = async (req, res) => {
  const { name, url } = req.body;
  const uploaded_by = req.user.id;
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'No autorizado para subir fichas técnicas' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO technical_sheets (name, url, uploaded_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, url, uploaded_by]);

    res.status(201).json({ message: 'Ficha técnica subida', sheet: result.rows[0] });
  } catch (error) {
    console.error('Error al subir ficha:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todas las fichas técnicas
const getAllSheets = async (req, res) => {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const result = await pool.query(`
      SELECT ts.*, u.name as uploaded_by_name
      FROM technical_sheets ts
      JOIN users u ON ts.uploaded_by = u.id
      ORDER BY ts.created_at DESC
    `);

    res.status(200).json({ sheets: result.rows });
  } catch (error) {
    console.error('Error al obtener fichas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener ficha por ID
const getSheetById = async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;

  if (role !== 'admin' && role !== 'logistica') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const result = await pool.query('SELECT * FROM technical_sheets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ficha no encontrada' });
    }

    res.status(200).json({ sheet: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener ficha:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar ficha técnica 
const updateSheet = async (req, res) => {
  const { id } = req.params;
  const { name, url } = req.body;
  const role = req.user.role;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Solo el admin puede editar fichas técnicas' });
  }

  try {
    const result = await pool.query(`
      UPDATE technical_sheets
      SET name = COALESCE($1, name),
          url = COALESCE($2, url)
      WHERE id = $3
      RETURNING *
    `, [name, url, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ficha no encontrada' });
    }

    res.status(200).json({ message: 'Ficha actualizada', sheet: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar ficha:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar ficha técnica
const deleteSheet = async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Solo el admin puede eliminar fichas técnicas' });
  }

  try {
    await pool.query('DELETE FROM technical_sheets WHERE id = $1', [id]);
    res.status(200).json({ message: 'Ficha técnica eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar ficha:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  createSheet,
  getAllSheets,
  getSheetById,
  updateSheet,
  deleteSheet
};