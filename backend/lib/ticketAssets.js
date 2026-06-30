const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function ticketPayload(booking) {
  return JSON.stringify({
    reference: booking.reference,
    movie: booking.movieId?.title || booking.movieTitle || booking.movieId,
    seats: booking.seatLabels || booking.seats || [],
    show: booking.showId?._id || booking.showId,
    issuedAt: booking.createdAt
  });
}

async function qrDataUrl(booking) {
  return QRCode.toDataURL(ticketPayload(booking), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220
  });
}

async function createTicketPdf(booking) {
  const qrImage = await QRCode.toBuffer(ticketPayload(booking), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const movie = booking.movieId || {};
    const show = booking.showId || {};
    const doc = new PDFDocument({ size: 'A4', margin: 54 });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fillColor('#e7335f')
      .fontSize(14)
      .text('SCREENIFY TICKET', { characterSpacing: 1.5 });

    doc.moveDown(1);
    doc.fillColor('#171923').fontSize(30).text(movie.title || 'Movie Ticket', { width: 420 });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .fillColor('#667085')
      .text(`${show.theatre || 'Screenify Cinemas'} | ${show.date || ''} ${show.time || ''} | ${show.format || ''}`);

    doc.moveDown(1.4);
    doc.roundedRect(54, doc.y, 486, 150, 8).strokeColor('#e3e7ef').stroke();
    const boxTop = doc.y + 22;
    doc.fillColor('#667085').fontSize(10).text('BOOKING ID', 78, boxTop);
    doc.fillColor('#171923').fontSize(16).text(booking.reference, 78, boxTop + 16);
    doc.fillColor('#667085').fontSize(10).text('SEATS', 78, boxTop + 54);
    doc.fillColor('#171923').fontSize(16).text((booking.seatLabels || []).join(', '), 78, boxTop + 70);
    doc.fillColor('#667085').fontSize(10).text('AMOUNT', 330, boxTop);
    doc.fillColor('#171923').fontSize(16).text(`INR ${booking.amount || 0}`, 330, boxTop + 16);
    doc.fillColor('#667085').fontSize(10).text('STATUS', 330, boxTop + 54);
    doc.fillColor('#11845b').fontSize(16).text(booking.status || 'confirmed', 330, boxTop + 70);

    doc.y = boxTop + 154;
    doc.moveDown(1.5);
    doc.fillColor('#171923').fontSize(13).text('Show this ticket and QR code at the entrance.');
    doc.fillColor('#667085').fontSize(10).text('Screenify demo booking confirmation. No real payment was charged.');
    doc.image(qrImage, 360, doc.y - 32, { width: 126 });
    doc.end();
  });
}

module.exports = { createTicketPdf, qrDataUrl };
