// app.js — the Express app itself. Kept separate from server.js so test
// files can `import { app } from './app.js'` and drive it with supertest
// without actually opening a network port for every test run.
import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.js';
import medicineRoutes from './routes/medicines.js';
import statsRoutes from './routes/stats.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import { openapiSpec } from './docs/openapi.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/openapi.json', (req, res) => res.json(openapiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Centralized error handler — catches anything that slips past route-level
// validation (e.g. an unexpected DB error), so a route never has to
// remember to wrap itself in try/catch just to avoid leaking a stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});
