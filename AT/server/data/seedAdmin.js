import { Admin } from '../models/Admin.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function inferUsernameFromEmail(email) {
  const [left] = String(email || '').split('@');
  return (left || 'admin').trim().toLowerCase();
}

export async function ensureDefaultAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'contact@arghyatrust.org');
  const username = String(process.env.ADMIN_USERNAME || inferUsernameFromEmail(email) || 'arghya_admin')
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || 'ArghyaTrust@2026#Admin');
  const name = String(process.env.ADMIN_NAME || 'Arghya Trust Administrator').trim();

  if (!email || !password) return;

  // Remove legacy demo credentials from database
  await Admin.deleteMany({
    $or: [{ email: 'admin@arghyatrust.org' }, { username: 'admin' }],
  });

  const existingAdmin = await Admin.findOne({
    $or: [{ email }, { username }],
  });

  if (existingAdmin) {
    existingAdmin.email = email;
    existingAdmin.username = username;
    existingAdmin.name = name;
    existingAdmin.password = password; // mongoose pre-save hook will hash it
    await existingAdmin.save();
    console.log(`[Admin] Admin credentials verified & synced for ${email} (${username})`);
    return;
  }

  await Admin.create({
    email,
    username,
    password,
    name,
  });

  console.log(`[Admin] Administrator account initialized for ${email} (${username})`);
}
