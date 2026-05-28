const nodemailer = require('nodemailer');

function emailConfigured() {
  return Boolean(
    process.env.MAIL_HOST &&
    process.env.MAIL_PORT &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASS &&
    process.env.MAIL_FROM
  );
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
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

async function sendTicketEmail(booking) {
  if (!emailConfigured()) {
    return { status: 'not_configured' };
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
    return { status: 'failed' };
  }
}

module.exports = { emailConfigured, sendTicketEmail };
