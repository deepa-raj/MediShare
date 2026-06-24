// docs/openapi.js — generates the OpenAPI spec from JSDoc comments on the
// route files (see the @openapi blocks in routes/*.js) plus the shared
// request-body schemas defined here once for reuse across endpoints.
import swaggerJsdoc from 'swagger-jsdoc';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'MediShare API',
    version: '1.0.0',
    description:
      'API for MediShare — a platform connecting donors of unused, unexpired medicine ' +
      'with NGOs and clinics that can put it to use before it expires.',
  },
  servers: [{ url: '/api', description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'role', 'city'],
        properties: {
          name: { type: 'string', example: 'Anita Raman' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['donor', 'ngo'] },
          org_name: { type: 'string', description: 'Required when role is "ngo"' },
          city: { type: 'string', example: 'Chennai' },
          phone: { type: 'string' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      CreateMedicineInput: {
        type: 'object',
        required: ['name', 'category', 'quantity', 'expiry_date', 'city'],
        properties: {
          name: { type: 'string', example: 'Paracetamol 500mg' },
          category: { type: 'string', example: 'Pain Relief' },
          quantity: { type: 'integer', minimum: 1 },
          unit: { type: 'string', example: 'strips' },
          expiry_date: { type: 'string', format: 'date' },
          description: { type: 'string' },
          city: { type: 'string' },
        },
      },
    },
  },
};

export const openapiSpec = swaggerJsdoc({
  definition,
  apis: ['./routes/*.js'],
});
