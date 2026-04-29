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
import compression from 'compression';
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL!;
// Use the Service Role Key on the server so RLS never blocks admin queries.
// Falls back to ANON key if service key is not set.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY!;
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
    createdByUserId: row.created_by_user_id || '',
    createdByUserName: row.created_by_user_name || '',
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
    created_by_user_id: contact.createdByUserId,
    created_by_user_name: contact.createdByUserName,
  };
}

// Check if a string looks like a bcrypt hash
function isBcryptHash(str: string): boolean {
  return typeof str === 'string' && str.startsWith('$2');
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const saltRounds = 10;

  // ── GZIP COMPRESSION ────────────────────────────────────────────────────────
  // Compresses all responses — reduces transfer size by ~70-80%
  // Critical for performance when many users are online
  app.use(compression({
    level: 6,           // balanced speed vs compression ratio
    threshold: 1024,    // only compress responses > 1KB
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Log which Supabase key type is active — helps debug RLS issues
  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role (RLS bypassed ✅)' : 'anon (RLS applies ⚠️ — add SUPABASE_SERVICE_ROLE_KEY to .env.local)';
  console.log(`\n🔑 Supabase key: ${keyType}\n`);



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

    let uploadBuffer = file.buffer;
    let uploadMime = file.mimetype;
    try {
      uploadBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      uploadMime = 'image/jpeg';
    } catch (e) {
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
      passwordIsValid = true;
      const hashed = await bcrypt.hash(password, saltRounds);
      await supabase.from('app_users').update({ password: hashed }).eq('id', data.id);
    } else if (isBcryptHash(data.password)) {
      passwordIsValid = await bcrypt.compare(password, data.password);
    } else {
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

    // ── LOG LOGIN ACTIVITY ────────────────────────────────────────────────────
    const { error: actErr } = await supabase.from('user_activity').insert({
      user_id: data.id,
      user_name: data.name,
      user_email: data.email,
      action: 'login',
      details: 'User logged in',
    });
    if (actErr) console.error('⚠️  user_activity insert error (login):', actErr.code, actErr.message);

    // ── ATTENDANCE: mark one record per calendar day (upsert = safe against races) ──
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { error: attErr } = await supabase.from('attendance').upsert(
      {
        user_id: data.id,
        user_name: data.name,
        user_email: data.email,
        date: todayStr,
        login_time: new Date().toISOString(),
      },
      { onConflict: 'user_id,date', ignoreDuplicates: true }
    );
    if (attErr) console.error('⚠️  attendance upsert error:', attErr.code, attErr.message);

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

    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');

    const { error: updateError } = await supabase
      .from('app_users')
      .update({ reset_token: token })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to save reset token:', updateError.message);
      return res.status(500).json({ message: 'Failed to generate reset link. Contact admin.' });
    }

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

    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, reset_token')
      .eq('email', cleanEmail)
      .single();

    if (error) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    if (!user || (user.reset_token || '').trim() !== (token || '').trim()) {
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

  app.put('/api/auth/profile/:id', async (req, res) => {
    const id = req.params.id || req.body.id;
    const { name, email, phone, location } = req.body;
    if (!id) return res.status(400).json({ message: 'User ID is required.' });
    const { data, error } = await supabase
      .from('app_users')
      .update({ name, email, phone, location })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(400).json({ message: error.message });
    res.json({ id: data.id, name: data.name, email: data.email, role: data.role, phone: data.phone, location: data.location });
  });

  // ── CONTACTS ──────────────────────────────────────────────────────────────

  app.get('/api/contacts/stats', async (req, res) => {
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
    const contacts = req.body as any[];
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ message: 'No contacts provided.' });
    }

    // Collect unique non-empty CTNs from the incoming batch (phone duplicates allowed)
    const incomingCtns = [...new Set(contacts.map(c => (c.ctn || '').trim()).filter(Boolean))];

    // Fetch existing records that match any of the incoming CTNs
    const existingCtns = new Set<string>();

    if (incomingCtns.length > 0) {
      const { data: ctnRows } = await supabase
        .from('contacts')
        .select('ctn')
        .in('ctn', incomingCtns);
      (ctnRows || []).forEach((r: any) => r.ctn && existingCtns.add(r.ctn.trim()));
    }

    // Separate new from duplicate rows (only CTN duplicates are blocked)
    const newContacts: any[] = [];
    let skippedCtn = 0;

    for (const c of contacts) {
      const ctn = (c.ctn || '').trim();

      if (ctn && existingCtns.has(ctn)) {
        skippedCtn++;
        continue;
      }

      newContacts.push(c);
    }

    if (newContacts.length === 0) {
      return res.status(409).json({
        message: `All ${contacts.length} contacts already exist (${skippedCtn} duplicate CTN). Nothing was imported.`,
        duplicate: true,
        inserted: 0,
        skipped: contacts.length,
      });
    }

    const rows = newContacts.map(toDB);
    const { data, error } = await supabase.from('contacts').insert(rows).select();
    if (error) return res.status(500).json({ message: error.message });

    const total = contacts.length;
    const skipped = total - newContacts.length;

    res.json({
      contacts: (data || []).map(toContact),
      inserted: newContacts.length,
      skipped,
      message: skipped > 0
        ? `Imported ${newContacts.length} new contacts. Skipped ${skipped} duplicate(s).`
        : `Imported ${newContacts.length} contacts successfully.`,
    });
  });


  app.delete('/api/contacts/bulk', async (req, res) => {
    const { ids } = req.body;
    const { error } = await supabase.from('contacts').delete().in('id', ids);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ success: true });
  });

  // ── CREATE CONTACT with duplicate CTN check ───────────────────────────────
  app.post('/api/contacts', async (req, res) => {
    const contact = req.body;

    // Duplicate CTN check
    if (contact.ctn && contact.ctn.trim() !== '') {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, ctn, customer_name')
        .eq('ctn', contact.ctn.trim())
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          message: `Duplicate CTN: "${contact.ctn}" already exists for customer "${existing.customer_name}".`,
          duplicate: true,
          existingId: existing.id,
        });
      }
    }

    // Duplicate Transaction ID check (only when a non-empty transaction ID is supplied)
    if (contact.transactionId && contact.transactionId.trim() !== '') {
      const { data: existingByTxn } = await supabase
        .from('contacts')
        .select('id, customer_name, transaction_id')
        .eq('transaction_id', contact.transactionId.trim())
        .maybeSingle();

      if (existingByTxn) {
        return res.status(409).json({
          message: `Duplicate Transaction ID: "${contact.transactionId}" already exists for "${existingByTxn.customer_name}".`,
          duplicate: true,
          existingId: existingByTxn.id,
        });
      }
    }


    const { data, error } = await supabase
      .from('contacts')
      .insert(toDB(contact))
      .select()
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(toContact(data));
  });

  app.put('/api/contacts/:id', async (req, res) => {
    const contact = req.body;
    const contactId = req.params.id;

    // ── Duplicate checks (exclude the contact being edited) ──────────

    // CTN duplicate check
    if (contact.ctn && contact.ctn.trim() !== '') {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, customer_name')
        .eq('ctn', contact.ctn.trim())
        .neq('id', contactId)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({
          message: `Duplicate CTN: "${contact.ctn}" already exists for "${existing.customer_name}".`,
          duplicate: true,
        });
      }
    }

    // Phone duplicate check removed — allow multiple contacts with same mobile number

    // Transaction ID duplicate check
    if (contact.transactionId && contact.transactionId.trim() !== '') {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, customer_name')
        .eq('transaction_id', contact.transactionId.trim())
        .neq('id', contactId)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({
          message: `Duplicate Transaction ID: "${contact.transactionId}" already exists for "${existing.customer_name}".`,
          duplicate: true,
        });
      }
    }

    // ── Perform the update ───────────────────────────────────────────
    const { data, error } = await supabase
      .from('contacts')
      .update(toDB(contact))
      .eq('id', contactId)
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

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────

  // Get all attendance (admin only)
  app.get('/api/attendance', async (req, res) => {
    const { from, to, userId } = req.query as Record<string, string>;
    let query = supabase
      .from('attendance')
      .select('id, user_id, user_name, user_email, date, login_time, created_at')
      .order('date', { ascending: false });

    if (from) query = query.gte('date', from);
    if (to)   query = query.lte('date', to);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Attendance fetch error:', error.message, '| code:', error.code);
      const noTable = error.code === '42P01';
      const isRLS   = error.code === '42501' || (error.message || '').includes('row-level security');
      const msg = noTable
        ? 'The "attendance" table does not exist. Run the setup SQL in Supabase SQL Editor.'
        : isRLS
          ? 'RLS is blocking this query. Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or disable RLS on the attendance table.'
          : error.message;
      return res.status(500).json({ message: msg });
    }

    // Normalize date to YYYY-MM-DD string regardless of Supabase return format
    const normalized = (data || []).map((row: any) => ({
      ...row,
      date: typeof row.date === 'string' ? row.date.slice(0, 10) : row.date,
    }));
    res.json(normalized);
  });



  // Get attendance summary per user (for admin dashboard)
  app.get('/api/attendance/summary', async (req, res) => {
    const { month, year } = req.query as Record<string, string>;
    const now = new Date();
    const targetYear = parseInt(year || String(now.getFullYear()));
    const targetMonth = parseInt(month || String(now.getMonth() + 1));

    const from = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const to = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });

    if (error) return res.status(500).json({ message: error.message });

    // Group by user
    const summary: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      if (!summary[row.user_id]) {
        summary[row.user_id] = {
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          presentDays: 0,
          dates: [],
        };
      }
      summary[row.user_id].presentDays++;
      summary[row.user_id].dates.push(row.date);
    });

    res.json(Object.values(summary));
  });

  // ── ACTIVITY TRACKING ────────────────────────────────────────────────────

  // Log activity
  app.post('/api/activity', async (req, res) => {
    const { userId, userName, userEmail, action, details } = req.body;
    if (!userId || !action) return res.status(400).json({ message: 'Missing fields' });
    const { error } = await supabase.from('user_activity').insert({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action,
      details: details || '',
    });
    if (error) {
      console.error('⚠️  POST /api/activity error:', error.code, error.message);
      if (error.message.includes('row-level security')) {
        console.error('🚨 RLS is blocking inserts on user_activity table! Disable RLS or add a policy.');
      }
      if (error.code === '23503') {
        console.error('🚨 FK violation: user_id', userId, 'not found in app_users. Check the user exists.');
      }
      return res.status(500).json({ message: error.message });
    }
    res.json({ success: true });
  });

  // Get all activity (admin only)
  app.get('/api/activity', async (req, res) => {
    const { data, error } = await supabase
      .from('user_activity')
      .select('id, user_id, user_name, user_email, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('Activity fetch error:', error.message);
      return res.status(500).json({ message: error.message });
    }
    res.json(data || []);
  });

  // Get online users (logged in last 5 minutes)
  app.get('/api/activity/online', async (req, res) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('user_activity')
      .select('user_id, user_name, user_email, created_at')
      .eq('action', 'heartbeat')
      .gte('created_at', fiveMinAgo);
    if (error) return res.status(500).json({ message: error.message });
    const seen = new Set();
    const online = (data || []).filter((r: any) => {
      if (seen.has(r.user_id)) return false;
      seen.add(r.user_id);
      return true;
    });
    res.json(online);
  });

  // Get session summary per user today
  app.get('/api/activity/summary', async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('user_activity')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ message: error.message });

    const users: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      if (!users[row.user_id]) {
        users[row.user_id] = {
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          loginTime: null,
          lastSeen: null,
          actions: [],
          contactsCreated: 0,
          contactsEdited: 0,
          contactsDeleted: 0,
        };
      }
      const u = users[row.user_id];
      if (row.action === 'login' && !u.loginTime) u.loginTime = row.created_at;
      if (row.action !== 'heartbeat') u.actions.push({ action: row.action, details: row.details, time: row.created_at });
      if (row.action === 'contact_created') u.contactsCreated++;
      if (row.action === 'contact_updated') u.contactsEdited++;
      if (row.action === 'contact_deleted') u.contactsDeleted++;
      u.lastSeen = row.created_at;
    });

    res.json(Object.values(users));
  });

  // ── HEALTH CHECK ──────────────────────────────────────────────────────────
  // Must return HTTP 200 — Railway uses this to confirm the server is up.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
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
    // Serve static assets with long cache (JS/CSS have hashed filenames so safe to cache 1 year)
    app.use(express.static(distPath, {
      maxAge: '1y',           // cache JS/CSS/images for 1 year
      etag: true,             // allow conditional requests
      lastModified: true,
      setHeaders(res, filePath) {
        // HTML must never be cached (it's the entry point, always fresh)
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to 0.0.0.0 so Railway (and other cloud hosts) can route traffic to the container.
  // Binding only to 'localhost' makes the server unreachable from outside the container.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ ASTER app running at: http://0.0.0.0:${PORT}\n`);
  });
}

startServer();