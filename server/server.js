// // server.js — starts the HTTP server. The Express app itself lives in
// // app.js; this file's only job is to bind it to a port.
// import dotenv from 'dotenv';
// import { app } from './app.js';

// dotenv.config();

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`MediShare API running on http://localhost:${PORT}`);
//   console.log(`API docs available at http://localhost:${PORT}/api/docs`);
// });

// server.js — starts the HTTP server. The Express app itself lives in
// app.js; this file's only job is to bind it to a port.
//
// Auto-seed: on Render's free tier, the Shell tab isn't available, so
// we can't run `node seed.js` manually. Instead, we check if the
// database is empty on every startup and seed it automatically if so.
// This is safe to run repeatedly — it only inserts data if the users
// table is empty, so it won't duplicate data on a normal restart.
import dotenv from 'dotenv';
import { app } from './app.js';
import { db } from './db/client.js';
import { users } from './db/schema.js';
import { count } from 'drizzle-orm';
 
dotenv.config();
 
const PORT = process.env.PORT || 4000;
 
async function autoSeed() {
  try {
    const [{ n }] = await db.select({ n: count() }).from(users);
    if (n === 0) {
      console.log('Database is empty — running auto-seed...');
      const { default: seed } = await import('./seed.js');
      console.log('Auto-seed complete.');
    } else {
      console.log(`Database already has ${n} users — skipping seed.`);
    }
  } catch (err) {
    console.error('Auto-seed failed:', err);
  }
}
 
app.listen(PORT, async () => {
  console.log(`MediShare API running on http://localhost:${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api/docs`);
  await autoSeed();
});
