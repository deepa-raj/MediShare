// seed.js — populates the database with realistic sample data for demos/screenshots
import bcrypt from 'bcryptjs';
import { rawDb, db } from './db/client.js';
import { users, medicines, claims, notifications } from './db/schema.js';

const hash = (pw) => bcrypt.hashSync(pw, 10);

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Real-world coordinates so the location-based distance sorting and
// nearby-NGO notifications have something meaningful to compute against.
// Small random jitter so seeded accounts in the "same" city aren't all
// sitting on the exact same point.
const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const COIMBATORE = { lat: 11.0168, lng: 76.9558 };
const jitter = () => (Math.random() - 0.5) * 0.1; // ~± 5-6 km

console.log('Seeding database...');

rawDb.exec('DELETE FROM notifications; DELETE FROM claims; DELETE FROM medicines; DELETE FROM users;');

const [donor1, donor2, donor3] = await db
  .insert(users)
  .values([
    { name: 'Anita Raman', email: 'anita@example.com', passwordHash: hash('password123'), role: 'donor', city: 'Chennai', phone: '9000000001', lat: CHENNAI.lat + jitter(), lng: CHENNAI.lng + jitter() },
    { name: 'Karthik Subramanian', email: 'karthik@example.com', passwordHash: hash('password123'), role: 'donor', city: 'Coimbatore', phone: '9000000002', lat: COIMBATORE.lat + jitter(), lng: COIMBATORE.lng + jitter() },
    { name: 'Priya Venkat', email: 'priya@example.com', passwordHash: hash('password123'), role: 'donor', city: 'Chennai', phone: '9000000003', lat: CHENNAI.lat + jitter(), lng: CHENNAI.lng + jitter() },
  ])
  .returning();

const [ngo1, ngo2] = await db
  .insert(users)
  .values([
    { name: 'Hope Free Clinic', email: 'contact@hopeclinic.org', passwordHash: hash('password123'), role: 'ngo', orgName: 'Hope Free Clinic', city: 'Chennai', phone: '9000000010', lat: CHENNAI.lat + jitter(), lng: CHENNAI.lng + jitter() },
    { name: 'Sahaya Trust', email: 'info@sahayatrust.org', passwordHash: hash('password123'), role: 'ngo', orgName: 'Sahaya Trust', city: 'Coimbatore', phone: '9000000011', lat: COIMBATORE.lat + jitter(), lng: COIMBATORE.lng + jitter() },
  ])
  .returning();

// Admin accounts are seeded directly, never created through the public
// registration form — see validation/schemas.js for why.
await db.insert(users).values({
  name: 'Platform Admin',
  email: 'admin@example.com',
  passwordHash: hash('password123'),
  role: 'admin',
  city: 'Chennai',
});

const inserted = await db
  .insert(medicines)
  .values([
    { donorId: donor1.id, name: 'Paracetamol 500mg', category: 'Pain Relief', quantity: 4, unit: 'strips', expiryDate: daysFromNow(120), description: 'Unopened, bought extra after recovery.', city: 'Chennai', status: 'available' },
    { donorId: donor1.id, name: 'Insulin Glargine', category: 'Diabetes', quantity: 2, unit: 'vials', expiryDate: daysFromNow(5), description: 'Refrigerated, prescription changed by doctor.', city: 'Chennai', status: 'available' },
    { donorId: donor2.id, name: 'Amoxicillin 250mg', category: 'Antibiotic', quantity: 3, unit: 'strips', expiryDate: daysFromNow(45), description: 'Course was not fully needed.', city: 'Coimbatore', status: 'available' },
    { donorId: donor2.id, name: 'Cetirizine 10mg', category: 'Allergy', quantity: 5, unit: 'strips', expiryDate: daysFromNow(200), description: 'Seasonal allergy meds, unused.', city: 'Coimbatore', status: 'available' },
    { donorId: donor3.id, name: 'Metformin 500mg', category: 'Diabetes', quantity: 6, unit: 'strips', expiryDate: daysFromNow(3), description: 'Family member switched medication.', city: 'Chennai', status: 'available' },
    { donorId: donor3.id, name: 'Vitamin D3 60000IU', category: 'Supplement', quantity: 4, unit: 'sachets', expiryDate: daysFromNow(15), description: 'Extra stock from last prescription.', city: 'Chennai', status: 'claimed' },
    { donorId: donor1.id, name: 'Azithromycin 500mg', category: 'Antibiotic', quantity: 2, unit: 'strips', expiryDate: daysFromNow(-2), description: 'Past expiry, kept for records.', city: 'Chennai', status: 'available' },
    { donorId: donor2.id, name: 'Cough Syrup (Ambroxol)', category: 'Cold & Cough', quantity: 3, unit: 'bottles', expiryDate: daysFromNow(60), description: 'Unopened bottles.', city: 'Coimbatore', status: 'completed' },
  ])
  .returning();

await db.insert(claims).values([
  { medicineId: inserted[5].id, ngoId: ngo1.id, status: 'pending', note: 'Can collect this week.' },
  { medicineId: inserted[7].id, ngoId: ngo2.id, status: 'completed', note: 'Collected and distributed to 3 patients.' },
]);

await db.insert(notifications).values([
  { userId: donor3.id, type: 'claim_received', message: 'Hope Free Clinic claimed your Vitamin D3 60000IU. Reach out to arrange handover.', link: '/donor', isRead: false },
  { userId: ngo2.id, type: 'handover_confirmed', message: 'Your claim for Cough Syrup (Ambroxol) was marked as handed over.', link: '/ngo', isRead: true },
  { userId: ngo1.id, type: 'nearby_listing', message: 'New medicine available near you: Paracetamol 500mg in Chennai.', link: '/', isRead: false },
]);

console.log('Seed complete.');
console.log('');
console.log('Demo logins (password: password123):');
console.log('  Donor : anita@example.com');
console.log('  NGO   : contact@hopeclinic.org');
console.log('  Admin : admin@example.com');
