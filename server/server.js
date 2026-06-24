// server.js — starts the HTTP server. The Express app itself lives in
// app.js; this file's only job is to bind it to a port.
import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`MediShare API running on http://localhost:${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api/docs`);
});
