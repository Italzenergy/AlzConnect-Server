const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { JWT_SECRET } = process.env;
const pool = require('../db'); // Usamos el pool de conexiones

// Función de login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar al usuario en la base de datos
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0]; // Asignamos el primer usuario encontrado

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Crear un token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Enviar el token y los datos del usuario en la respuesta
    res.json({
      message: 'Login exitoso',
      token, // Envía el token aquí
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { loginUser };
