const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Crear usuario (solo admin)
const createUser = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Solo admin puede crear usuarios
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone, hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error interno' });
  }
};


// Obtener todos
const getUsers = async (req, res) => {
  console.log('Usuario haciendo la petición:', req.user); // Debug
  
  try {
    // Consulta para obtener todos los usuarios
    const result = await pool.query(`
      SELECT id, name, email, phone, role, created_at 
      FROM users
    `);

    // Verifica si hay usuarios
    if (result.rows.length === 0) {
      return res.json([]); // Si no hay usuarios, devuelve un arreglo vacío
    }

    // Devuelve los usuarios como respuesta
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Obtener uno
const getUserById = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error interno' });
  }
};


const updateUser = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const { name, email, phone, role, password } = req.body;

  try {
    // Si se envía una nueva contraseña, la hasheamos
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Construimos dinámicamente los campos a actualizar
    const fields = ['name', 'email', 'phone', 'role'];
    const values = [name, email, phone, role];
    let query = `
      UPDATE users
      SET name = $1, email = $2, phone = $3, role = $4`;

    if (hashedPassword) {
      fields.push('password');
      values.push(hashedPassword);
      query += `, password = $5`;
    }

    values.push(req.params.id); // el último valor siempre es el ID
    query += ` WHERE id = $${values.length} RETURNING id, name, email, phone, role, created_at`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno' });
  }
};


// Eliminar
const deleteUser = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'No autorizado' });
  }

 
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error interno' });
  }
};


module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser };
