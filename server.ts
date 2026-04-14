import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import sharp from 'sharp';
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to convert DB row (snake_case) to frontend Contact (camelCase)
function toContact(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number || '',
    entryLeads: row.entry_leads || '',
    ctn: row.ctn || '',
    date: row.date || '',
    teleCallingStaff: row.tele_calling_staff || '',
    technicalStaff: row.technical_staff || '',
    customerContactNumber: row.customer_contact_number || '',
    customerName: row.customer_name || '',
    customerRequirement: row.customer_requirement || '',
    currentStatus: row.current_status || '',
    detailsNotes: row.details_notes || '',
    claimApplyDate: row.claim_apply_date || '',
    followUpDate: row.follow_up_date || '',
    serviceCharges: row.service_charges || '',
    paymentStatus: row.payment_status || '',
    pdfFileSend: row.pdf_file_send || '',
    receiveAmount: row.receive_amount || '',
    transactionId: row.transaction_id || '',
    receiveDate: row.receive_date || '',
    remarks: row.remarks || '',
    technicalSharePercent: row.technical_share_percent || '',
    technicalSalaryAmount: row.technical_salary_amount || '',
    technicalPaidDate: row.technical_paid_date || '',
    technicalRemarks: row.technical_remarks || '',
    teleCallingSharePercent: row.tele_calling_share_percent || '',
    teleCallingSalaryAmount: row.tele_calling_salary_amount || '',
    teleCallingPaidDate: row.tele_calling_paid_date || '',
    teleCallingRemarks: row.tele_calling_remarks || '',
    teleTotalAmount: row.tele_total_amount || '',
    technicalTotalAmount: row.technical_total_amount || '',
    isFavorite: row.is_favorite || false,
    screenShotImage: row.screenshot_image || '',
  };
}

// Helper to convert frontend Contact (camelCase) to DB row (snake_case)
function toDB(contact: any) {
  return {
    order_number: contact.orderNumber,
    entry_leads: contact.entryLeads,
    ctn: contact.ctn,
    date: contact.date,
    tele_calling_staff: contact.teleCallingStaff,
    technical_staff: contact.technicalStaff,
    customer_contact_number: contact.customerContactNumber,
    customer_name: contact.customerName,
    customer_requirement: contact.customerRequirement,
    current_status: contact.currentStatus,
    details_notes: contact.detailsNotes,
    claim_apply_date: contact.claimApplyDate,
    follow_up_date: contact.followUpDate,
    service_charges: contact.serviceCharges,
    payment_status: contact.paymentStatus,
    pdf_file_send: contact.pdfFileSend,
    receive_amount: contact.receiveAmount,
    transaction_id: contact.transactionId,
    receive_date: contact.receiveDate,
    remarks: contact.remarks,
    technical_share_percent: contact.technicalSharePercent,
    technical_salary_amount: contact.technicalSalaryAmount,
    technical_paid_date: contact.technicalPaidDate,
    technical_remarks: contact.technicalRemarks,
    tele_calling_share_percent: contact.teleCallingSharePercent,
    tele_calling_salary_amount: contact.teleCallingSalaryAmount,
    tele_calling_paid_date: contact.teleCallingPaidDate,
    tele_calling_remarks: contact.teleCallingRemarks,
    tele_total_amount: contact.teleTotalAmount,
    technical_total_amount: contact.technicalTotalAmount,
    is_favorite: contact.isFavorite,
    screenshot_image: contact.screenShotImage,
  };
}

// Check if a string looks like a bcrypt hash
function isBcryptHash(str: string): boolean {
  return typeof str === 'string' && str.startsWith('$2');
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const saltRounds = 10;
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ── UPLOADS ─────────────────────────────────────────────────────────────────
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

 app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  const file = req.file;

  // ✅ Compress image before uploading
  let uploadBuffer = file.buffer;
  let uploadMime = file.mimetype;
  try {
    uploadBuffer = await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    uploadMime = 'image/jpeg';
  } catch (e) {
    // If compression fails use original
    uploadBuffer = file.buffer;
    uploadMime = file.mimetype;
  }

  const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}.jpg`;

  const { error } = await supabase.storage
    .from('screenshots')
    .upload(fileName, uploadBuffer, { contentType: uploadMime });

  if (error) {
    console.warn(`Storage error: ${error.message}. Falling back to base64.`);
    const base64 = uploadBuffer.toString('base64');
    return res.json({ url: `data:${uploadMime};base64,${base64}` });
  }

  const { data } = supabase.storage.from('screenshots').getPublicUrl(fileName);
  res.json({ url: data.publicUrl });
});

  // ── AUTH ──────────────────────────────────────────────────────────────────

  app.post('/api/auth/login', async (req, res) => {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password;

    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      if (error) console.error('\n🚨 Supabase Login Error:', error.message, '\n👉 NOTE: If it says "Row not found" or "violates row-level security", you need to disable RLS on the app_users table in Supabase!\n');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let passwordIsValid = false;

    if (!data.password) {
      // No password stored at all — allow login and hash it now
      passwordIsValid = true;
      const hashed = await bcrypt.hash(password, saltRounds);
      await supabase.from('app_users').update({ password: hashed }).eq('id', data.id);

    } else if (isBcryptHash(data.password)) {
      // Password is already hashed — compare normally
      passwordIsValid = await bcrypt.compare(password, data.password);

    } else {
      // Password is stored as plain text (old accounts) — compare directly
      // then upgrade it to a hash automatically
      passwordIsValid = (password === data.password);
      if (passwordIsValid) {
        const hashed = await bcrypt.hash(password, saltRounds);
        await supabase.from('app_users').update({ password: hashed }).eq('id', data.id);
        console.log(`✅ Auto-upgraded plain text password to bcrypt hash for: ${email}`);
      }
    }

    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ id: data.id, name: data.name, email: data.email, role: data.role });
  });

  app.post('/api/auth/signup', async (req, res) => {
    const name = req.body.name;
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from('app_users')
      .insert({ name, email, password: hashedPassword, role: 'User' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
      return res.status(400).json({ message: error.message });
    }
    res.json({ id: data.id, name: data.name, email: data.email, role: data.role });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const cleanEmail = (email || '').toLowerCase().trim();

  const { data: user } = await supabase
    .from('app_users')
    .select('id, name, email')
    .eq('email', cleanEmail)
    .single();

  if (!user) {
    return res.json({ message: `If ${email} is registered, a reset link has been sent.` });
  }

  // ✅ FIX Bug 2: Use crypto for a URL-safe token (no special chars that break URLs)
  const { randomBytes } = await import('crypto');
  const token = randomBytes(32).toString('hex'); // purely hex — safe in URLs

  // ✅ FIX Bug 1: Check that the token actually saved to DB before sending email
  const { error: updateError } = await supabase
    .from('app_users')
    .update({ reset_token: token })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to save reset token:', updateError.message);
    console.error('👉 Make sure the "reset_token" column exists in your app_users table!');
    console.error('Run this SQL in Supabase: ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reset_token TEXT;');
    return res.status(500).json({ message: 'Failed to generate reset link. Contact admin.' });
  }

  // ✅ FIX Bug 2: encodeURIComponent ensures token survives the URL safely
  const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}`;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"ASTER Online Service" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: 'Reset Your ASTER Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 16px;">
          <h2 style="color: #051733;">Reset Your Password</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset for your ASTER account.</p>
          <p>Click the button below to reset your password.</p>
          <a href="${resetLink}" style="display:inline-block; margin: 16px 0; padding: 12px 28px; background: #051733; color: white; border-radius: 10px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
          <p style="color: #6b7280; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: `A password reset link has been sent to ${email}` });
  } catch (err: any) {
    console.error('Email send error:', err.message);
    res.status(500).json({ message: 'Failed to send email. Check GMAIL settings in .env.local' });
  }
});
  app.post('/api/auth/reset-password', async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    return res.status(400).json({ message: 'Invalid request.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const cleanEmail = (email || '').toLowerCase().trim();

  // ✅ FIX: Also select name so we can log it; error check is explicit
  const { data: user, error } = await supabase
    .from('app_users')
    .select('id, reset_token')
    .eq('email', cleanEmail)
    .single();

  if (error) {
    console.error('DB error during reset:', error.message);
    return res.status(400).json({ message: 'Invalid or expired reset link.' });
  }

  // ✅ FIX: Trim both sides in case whitespace crept in
  if (!user || (user.reset_token || '').trim() !== (token || '').trim()) {
    console.error(`Token mismatch for ${cleanEmail}. DB: "${user?.reset_token}" | Received: "${token}"`);
    return res.status(400).json({ message: 'Invalid or expired reset link.' });
  }

  const hashed = await bcrypt.hash(password, saltRounds);
  await supabase
    .from('app_users')
    .update({ password: hashed, reset_token: null })
    .eq('id', user.id);

  res.json({ message: 'Password reset successfully.' });
});
  app.get('/api/auth/me', (req, res) => {
    res.status(401).json({ message: 'Unauthorized' });
  });

  app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

  app.put('/api/auth/profile', async (req, res) => {
    const { name, email } = req.body;
    const { data, error } = await supabase
      .from('app_users')
      .update({ name, email })
      .eq('email', email)
      .select()
      .single();
    if (error) return res.status(400).json({ message: error.message });
    res.json({ id: data.id, name: data.name, email: data.email, role: data.role });
  });

  // ── CONTACTS ──────────────────────────────────────────────────────────────

  app.get('/api/contacts/stats', async (req, res) => {
  // ✅ Only fetch what we need — not all columns
  const { data, error } = await supabase
    .from('contacts')
    .select('is_favorite, date, current_status');
  if (error) return res.status(500).json({ message: error.message });

  const total = data.length;
  const favorites = data.filter((c: any) => c.is_favorite).length;
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '-');
  const activeToday = data.filter((c: any) => c.date === todayStr).length;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartCounts: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    chartCounts[months[d.getMonth()]] = 0;
  }
  data.forEach((c: any) => {
    if (!c.date) return;
    const [, monthStr] = c.date.split('-');
    if (chartCounts[monthStr] !== undefined) chartCounts[monthStr]++;
  });

  res.json({
    summary: [
      { label: 'Total Contacts', value: total.toLocaleString(), icon: 'Users', color: 'bg-blue-500', trend: '+12%' },
      { label: 'Favorites', value: favorites.toLocaleString(), icon: 'Star', color: 'bg-amber-500', trend: '+2%' },
      { label: 'Active Today', value: activeToday.toLocaleString(), icon: 'TrendingUp', color: 'bg-violet-500', trend: '+18%' },
    ],
    chartData: Object.entries(chartCounts).map(([name, contacts]) => ({ name, contacts })),
  });
});
  app.get('/api/contacts/recent', async (req, res) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) return res.status(500).json({ message: error.message });
    res.json((data || []).map(toContact));
  });

  app.get('/api/contacts', async (req, res) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json((data || []).map(toContact));
  });

  app.post('/api/contacts/bulk', async (req, res) => {
    const contacts = req.body;
    const rows = contacts.map(toDB);
    const { data, error } = await supabase.from('contacts').insert(rows).select();
    if (error) return res.status(500).json({ message: error.message });
    res.json((data || []).map(toContact));
  });

  app.delete('/api/contacts/bulk', async (req, res) => {
    const { ids } = req.body;
    const { error } = await supabase.from('contacts').delete().in('id', ids);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ success: true });
  });

  app.post('/api/contacts', async (req, res) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(toDB(req.body))
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(toContact(data));
  });

  app.put('/api/contacts/:id', async (req, res) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(toDB(req.body))
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(toContact(data));
  });

  app.patch('/api/contacts/:id/favorite', async (req, res) => {
    const { data, error } = await supabase
      .from('contacts')
      .update({ is_favorite: req.body.isFavorite })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(toContact(data));
  });

  app.delete('/api/contacts/:id', async (req, res) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ success: true });
  });

  // ── ADMIN ─────────────────────────────────────────────────────────────────

 app.get('/api/admin/users', async (req, res) => {
    const { data, error } = await supabase.from('app_users').select('id, name, email, role, status, created_at');
    if (error) return res.status(500).json({ message: error.message });
    const users = (data || []).map((u: any) => ({ ...u, status: u.status || 'Active' }));
    res.json(users);
  });

  app.post('/api/admin/users', async (req, res) => {
    const { name, email, password, role, status } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const { data, error } = await supabase
      .from('app_users')
      .insert({ name, email: (email || '').toLowerCase().trim(), password: hashedPassword, role: role || 'User', status: status || 'Active' })
      .select('id, name, email, role, status')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'Email already exists.' });
      return res.status(500).json({ message: error.message });
    }
    res.json(data);
  });

  app.put('/api/admin/users/:id', async (req, res) => {
    const { name, email, password, role, status } = req.body;
    const updates: any = { name, email: (email || '').toLowerCase().trim(), role, status };
    if (password && password.length >= 6) {
      updates.password = await bcrypt.hash(password, saltRounds);
    }
    const { data, error } = await supabase
      .from('app_users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, email, role, status')
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ success: true });
  });
  // ── VITE DEV SERVER ───────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`\n✅ ASTER app running at: http://localhost:${PORT}\n`);
  });
}

startServer();