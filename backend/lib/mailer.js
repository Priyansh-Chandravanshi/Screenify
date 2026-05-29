const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

const previewDir = path.join(__dirname, '..', 'mail-previews');

function emailConfigured() {
  return Boolean(
    process.env.MAIL_HOST &&
    process.env.MAIL_PORT &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASS &&
    process.env.MAIL_FROM
  );
}

function mailAuth() {
  return {
    user: process.env.MAIL_USER,
    pass: String(process.env.MAIL_PASS || '').replace(/\s/g, '')
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatShowDate(dateValue) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateValue));
}

function ticketHtml(booking) {
  const movie = booking.movieId;
  const show = booking.showId;
  const reference = escapeHtml(booking.reference);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(booking.reference)}`;

  return `<!doctype html>
<html>
<body style="margin:0;background:#f5f6fa;font-family:Arial,sans-serif;color:#121727;">
  <div style="max-width:560px;margin:24px auto;padding:32px;background:#ffffff;border-radius:18px;">
    <p style="margin:0 0 18px;display:inline-block;padding:8px 14px;background:#edf9f3;color:#117b50;border-radius:20px;font-weight:700;">Booking confirmed</p>
    <h1 style="margin:0 0 8px;font-size:28px;">${escapeHtml(movie.title)}</h1>
    <p style="margin:0 0 28px;color:#687083;">${escapeHtml(show.theatre)} | ${escapeHtml(formatShowDate(show.date))} ${escapeHtml(show.time)} | ${escapeHtml(show.format)}</p>
    <table style="width:100%;padding:18px 0;border-top:1px dashed #d6dae4;border-bottom:1px dashed #d6dae4;">
      <tr>
        <td style="color:#687083;">Seats</td>
        <td style="text-align:right;font-weight:700;">${escapeHtml(booking.seatLabels.join(', '))}</td>
      </tr>
      <tr>
        <td style="padding-top:14px;color:#687083;">Amount</td>
        <td style="padding-top:14px;text-align:right;font-weight:700;">${escapeHtml(formatAmount(booking.amount))}</td>
      </tr>
      <tr>
        <td style="padding-top:14px;color:#687083;">Booking ID</td>
        <td style="padding-top:14px;text-align:right;font-weight:700;">${reference}</td>
      </tr>
    </table>
    <div style="padding-top:25px;text-align:center;">
      <img src="${qrUrl}" width="180" height="180" alt="Ticket QR code" style="display:block;margin:0 auto 12px;">
      <p style="margin:0;color:#687083;font-size:13px;">Show this QR code at the entrance</p>
    </div>
    <p style="margin:28px 0 0;color:#687083;font-size:12px;">Screenify demo booking confirmation. No real payment was charged.</p>
  </div>
</body>
</html>`;
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: String(process.env.MAIL_SECURE).toLowerCase() === 'true',
    auth: mailAuth(),
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
}

function safeFileName(value) {
  return String(value || 'ticket')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function saveTicketPreview(booking, reason = '') {
  await fs.mkdir(previewDir, { recursive: true });
  const fileName = `${safeFileName(booking.reference)}.html`;
  const filePath = path.join(previewDir, fileName);
  await fs.writeFile(filePath, ticketHtml(booking), 'utf8');
  return {
    previewFile: fileName,
    previewPath: filePath,
    previewUrl: `/mail-previews/${fileName}`,
    reason
  };
}

async function verifyEmailSetup() {
  if (!emailConfigured()) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'Mail settings are missing in backend/.env.'
    };
  }

  try {
    await createTransport().verify();
    return { ok: true, status: 'ready', message: 'SMTP connection verified.' };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error.message,
      code: error.code || '',
      command: error.command || ''
    };
  }
}

async function sendTicketEmail(booking) {
  if (!emailConfigured()) {
    const preview = await saveTicketPreview(booking, 'Mail settings are missing in backend/.env.');
    return { status: 'preview_saved', ...preview };
  }

  try {
    await createTransport().sendMail({
      from: process.env.MAIL_FROM,
      to: booking.customerEmail,
      subject: `Your Screenify ticket: ${booking.movieId.title} | ${booking.reference}`,
      text: [
        'Booking confirmed',
        booking.movieId.title,
        `${booking.showId.theatre} | ${formatShowDate(booking.showId.date)} ${booking.showId.time}`,
        `Seats: ${booking.seatLabels.join(', ')}`,
        `Amount: ${formatAmount(booking.amount)}`,
        `Booking ID: ${booking.reference}`
      ].join('\n'),
      html: ticketHtml(booking)
    });
    return { status: 'sent', to: booking.customerEmail };
  } catch (error) {
    console.error('Ticket email failed:', error.message);
    const preview = await saveTicketPreview(booking, error.message);
    return {
      status: 'preview_saved',
      reason: error.message,
      code: error.code || '',
      command: error.command || '',
      ...preview
    };
  }
}

module.exports = { emailConfigured, sendTicketEmail, verifyEmailSetup };
