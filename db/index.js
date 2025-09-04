// src/db/index.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false, // necesario para Supabase, pero inseguro para producción real
  },
  idleTimeoutMillis: 30000,        // Tiempo de espera para cerrar conexiones inactivas (30s)
  connectionTimeoutMillis: 5000,   // Tiempo máximo para esperar la conexión (5s)
  max: 20                          // Número máximo de conexiones simultáneas
});

// Verifica si la conexión es exitosa
pool.connect()
  .then((client) => {
    console.log(' Conexión a la base de datos establecida con éxito.');
    client.release(); // Muy importante: libera el cliente
  })
  .catch((error) => {
    console.error(' No se pudo conectar a la base de datos:', error.message || error);
  });

// Captura errores inesperados del pool
pool.on('error', (err) => {
  console.error(' Error inesperado en el pool de conexiones:', err.message || err);
  // Aquí podrías notificar a un sistema de monitoreo o reiniciar el pool
});

module.exports = pool;
