const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sheetRoutes = require('./routes/sheet.routes');

const app = express();

// Configurar CORS para permitir cookies y solicitudes específicas
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3001','http://localhost:3000', 'http://127.0.0.1:3001', 'https://alzconnect-server.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['set-cookie']
};
app.use(cors(corsOptions));
app.use(express.json());

// Middleware
const verifyToken = require('./middlewares/verifyToken');
const cookieParser = require('cookie-parser');

// Rutas
app.use(cookieParser());
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const orderRoutes = require('./routes/order.routes');
const customerSheetRoutes = require('./routes/customerSheet.routes');
const carrierRoutes = require('./routes/carrier.routes');
const routerRouter = require('./routes/routes.routes');
const customerProfileRoutes = require('./routes/customerProfile.routes');
const { swaggerUi, specs } = require('./swagger');
const userRoutes = require('./routes/user.routes');

// Rutas públicas
app.use('/api', authRoutes);
app.use('/api/customers', customerRoutes);

// Rutas protegidas (requieren token)
app.use('/api/orders', verifyToken, orderRoutes);
app.use('/api/sheets', verifyToken, sheetRoutes);
app.use('/api/customersheets', verifyToken, customerSheetRoutes);
app.use('/api/carriers', verifyToken, carrierRoutes);
app.use('/api/router', verifyToken, routerRouter);

// Rutas con autenticación (requieren token)
app.use('/api/customers/profile', verifyToken, customerProfileRoutes);

// Documentación (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Usuarios protegidos
app.use('/api/users', verifyToken, userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
