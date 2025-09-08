const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET
require('dotenv').config();

const loginCustomer = async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    if (r.rows.length === 0) return res.status(404).json({ ok:false, msg:'Usuario no encontrado' });

    const user = r.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ ok:false, msg:'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '2h' });

    return res.json({
      ok: true,
      msg: 'Login exitoso',
      token,
      id: user.id,                      // <- para primer login
      firstLogin: !!user.first_login,   // <- bandera para el front
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'customer',
      },
    });
  } catch (e) {
    console.error('Error en loginCustomer:', e);
    return res.status(500).json({ ok:false, msg:'Error en el servidor' });
  }
};

// ---------- CHANGE PASSWORD ----------
const changePassword = async (req, res) => {
  const { id, newPassword } = req.body;

  try {
    if (!id) {
      return res.status(400).json({ message: "Falta el ID del usuario" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      "UPDATE customers SET password = $1, first_login = false WHERE id = $2 RETURNING *",
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error en changePassword:", error);
    res.status(500).json({ message: "Error interno" });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        json_agg(DISTINCT o.*) FILTER (WHERE o.id IS NOT NULL) AS orders,
        json_agg(DISTINCT ts.*) FILTER (WHERE ts.id IS NOT NULL) AS technical_sheets
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      LEFT JOIN customer_sheets cs ON cs.customer_id = c.id
      LEFT JOIN technical_sheets ts ON ts.id = cs.sheet_id
      GROUP BY c.id
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
};

// Crear un nuevo cliente
const createCustomer = async (req, res) => {
  const { name, email, password, phone, status } = req.body;
  
  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO customers (name, email, password, phone, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, hashedPassword, phone, status]
    );

    try {
      // Configurar el transporter de nodemailer
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'mail.alzenergy.com.co',
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Agregar opciones adicionales para mejorar la confiabilidad
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000, // 10 segundos
        greetingTimeout: 10000, // 10 segundos
        socketTimeout: 10000, // 10 segundos
      });

      // Verificar la conexión primero
      await transporter.verify();
      console.log('Conexión SMTP verificada');

      // Configurar el contenido del correo
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@alzenergy.com.co',
        to: email,
        subject: 'Credenciales de acceso - ALZ CONNECT',
        html: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credenciales ALZ CONNECT</title>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #f7f7f7; 
            color: #333;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            background-color:#27fb20; 
            padding: 30px; 
            text-align: center; 
            position: relative;
        }
        .logo-text { 
            font-size: 36px; 
            font-weight: 800; 
            color: white; 
            letter-spacing: 2px; 
            text-transform: uppercase; 
            margin: 0; 
        }
        .logo-subtext { 
            font-size: 25px; 
            font-weight: 300; 
            color: rgba(255, 255, 255, 0.9); 
            margin-top: 5px; 
            letter-spacing: 3px; 
        }
        .content { 
            padding: 35px; 
        }
        .welcome { 
            color: #00b502; 
            font-size: 22px; 
            margin-bottom: 25px; 
            text-align: center; 
            font-weight: 600; 
        }
        .credentials {
            background-color:#04fa00; 
            padding: 25px; 
            border-radius: 12px; 
            margin-bottom: 25px; 
            color: #0c5b0f; 
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); 
        }
        .credentials h3 {
            margin-top: 0; 
            font-size: 20px; 
            font-weight: 600; 
            text-align: center; 
            margin-bottom: 20px; 
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .credential-item { 
            display: flex; 
            margin-bottom: 18px; 
            align-items: center; 
        }
        .credential-label { 
            font-weight: 600; 
            min-width: 100px; 
            color: #0c5b0f; 
            font-size: 16px; 
            display: flex;
            align-items: center;
        }
        .credential-value { 
            font-weight: 500; 
            background-color: #5eff53; 
            padding: 10px 15px; 
            border-radius: 8px; 
            flex-grow: 1; 
            font-size: 16px; 
            letter-spacing: 1px; 
        }
        .button-container { 
            text-align: center; 
            margin: 30px 0; 
        }
        .login-button { 
            display: inline-block; 
            background-color:#00b502; 
            color: white; 
            text-decoration: none; 
            padding: 15px 40px; 
            border-radius: 30px; 
            font-weight: 600; 
            font-size: 16px; 
            transition: all 0.3s; 
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); 
            border: none;
            cursor: pointer;
        }
        .footer { 
            background-color: #e8f5e9; 
            padding: 25px; 
            text-align: center; 
            font-size: 14px; 
            color: #2e7d32; 
            border-top: 1px solid #c8e6c9; 
        }
        .security-note { 
            font-size: 14px; 
            color: #0c5b0f; 
            text-align: center; 
            font-style: italic; 
            margin-top: 25px; 
            padding: 15px; 
            background-color: #e8f5e9; 
            border-radius: 8px; 
        }
        .contact-info { 
            margin-top: 15px; 
            font-size: 13px; 
            color: #388e3c; 
        }
        .highlight { 
            color: #00b502; 
            font-weight: 600; 
        }
        .icon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            vertical-align: middle;
            fill: currentColor;
        }
        .header-icon {
            width: 24px;
            height: 24px;
            margin-right: 10px;
            vertical-align: middle;
            fill: #0c5b0f;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo-text">ALZ</h1>
            <p class="logo-subtext">CONNECT</p>
        </div>
        
        <div class="content">
            <div class="welcome">
                ¡Bienvenido a nuestra plataforma, <span class="highlight">${name}</span>!
            </div>
            
            <div class="credentials">
                <h3>
                    <svg class="header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10C4,8.89 4.89,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                    </svg>
                    Tus credenciales de acceso
                </h3>
                <div class="credential-item">
                    <div class="credential-label">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                        </svg>
                        Email:
                    </div>
                    <div class="credential-value">${email}</div>
                </div>
                <div class="credential-item">
                    <div class="credential-label">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                        </svg>
                        Contraseña:
                    </div>
                    <div class="credential-value">${password}</div>
                </div>
            </div>
            
            <div class="button-container">
                <a href="${process.env.FRONTEND_URL || 'https://alz-connect-customer.vercel.app'}" class="login-button">
                    <svg style="width:18px;height:18px;fill:white;vertical-align:middle;margin-right:8px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z"/>
                    </svg>
                    Iniciar Sesión
                </a>
            </div>
            
            <p class="security-note">
                <svg style="width:18px;height:18px;fill:#0c5b0f;vertical-align:middle;margin-right:8px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                </svg>
                Por seguridad, te recomendamos cambiar tu contraseña después del primer acceso.
            </p>
        </div>
        
        <div class="footer">
            <p>¿Necesitas ayuda? Estamos aquí para apoyarte</p>
            <div class="contact-info">
                © ${new Date().getFullYear()} ALZ CONNECT. Todos los derechos reservados.
            </div>
        </div>
    </div>
</body>
</html>`,
      };

      // Enviar el correo
      await transporter.sendMail(mailOptions);
      console.log('Correo de credenciales enviado a:', email);

      res.status(201).json({
        ...result.rows[0],
        message: 'Usuario creado y credenciales enviadas por correo'
      });

    } catch (emailError) {
      console.error('Error al enviar correo:', emailError);
      // Aún respondemos con éxito pero indicamos que no se pudo enviar el correo
      res.status(201).json({
        ...result.rows[0],
        message: 'Usuario creado pero error al enviar credenciales por correo'
      });
    }

  } catch (err) {
    console.error('Error al crear cliente:', err);
    
    // Determinar el mensaje de error apropiado
    let errorMessage = 'Error al crear cliente';
    if (err.code === '23505') { // Violación de unique constraint
      errorMessage = 'El correo electrónico ya está registrado';
    }
    
    res.status(500).json({ message: errorMessage });
  }
};
// Obtener un cliente por ID
const getCustomerById = async (req, res) => {
  const customerId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ message: 'Error al obtener cliente' });
  }
};  

// Actualizar un cliente
const updateCustomer = async (req, res) => {
  const customerId = req.params.id;
  const { name, email, phone, status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE customers SET name = $1, email = $2, phone = $3, status = $4 WHERE id = $5 RETURNING *',
      [name, email, phone, status, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ message: 'Error al actualizar cliente' });
  }
};

// Eliminar un cliente
const deleteCustomer = async (req, res) => {
  const customerId = req.params.id;

  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    res.status(500).json({ message: 'Error al eliminar cliente' });
  }
};

// controllers/customer.controller.js 
const getCustomerWithDetails = async (req, res) => {
  const customerId = req.params.id;
  const userRole = req.user.role;
  const userCustomerId = req.user.id;

  // Verificar permisos
  if (userRole !== 'admin' && userRole !== 'logistica' && userCustomerId !== customerId) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  try {
    // Obtener información del cliente
    const customerResult = await pool.query(
      'SELECT id, name, email, phone, status, created_at FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const customer = customerResult.rows[0];

    // Obtener pedidos del cliente
    const ordersResult = await pool.query(`
      SELECT 
        o.id AS order_id,
        o.tracking_code,
        o.description,
        o.state AS order_state,
        o.created_at AS order_created,
        json_agg(
          json_build_object(
            'id', e.id,
            'state', e.state,
            'note', e.note,
            'date', e.date
          ) ORDER BY e.date ASC
        ) AS events
      FROM orders o
      LEFT JOIN order_events e ON e.order_id = o.id
      WHERE o.customer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [customerId]);

    // Obtener fichas técnicas del cliente
    const sheetsResult = await pool.query(`
      SELECT 
        ts.*,
        cs.assigned_at
      FROM technical_sheets ts
      JOIN customer_sheets cs ON ts.id = cs.sheet_id
      WHERE cs.customer_id = $1
      ORDER BY cs.assigned_at DESC
    `, [customerId]);

    // Obtener rutas del cliente
    const routesResult = await pool.query(`
      SELECT 
        r.*,
        o.tracking_code as order_tracking_code,
        c.name as carrier_name
      FROM routes r
      JOIN orders o ON r.order_id = o.id
      JOIN carriers c ON r.carrier_id = c.id
      WHERE o.customer_id = $1
      ORDER BY r.created_at DESC
    `, [customerId]);

    res.status(200).json({
      customer,
      orders: ordersResult.rows,
      sheets: sheetsResult.rows,
      routes: routesResult.rows
    });

  } catch (error) {
    console.error('Error al obtener detalles del cliente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Añadir a las exportaciones
module.exports = { 
  loginCustomer, 
  changePassword,
  getAllCustomers, 
  createCustomer, 
  getCustomerById, 
  updateCustomer, 
  deleteCustomer,
  getCustomerWithDetails // Nueva función
};

