const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ALZ Connect API',
      version: '1.0.0',
      description: 'Documentación de la API para el sistema de seguimiento de pedidos',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./routes/*.js'], // Aquí Swagger buscará anotaciones
  components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
}
};

const specs = swaggerJsDoc(options);

module.exports = {
  swaggerUi,
  specs,
};
