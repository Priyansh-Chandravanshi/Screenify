const crypto = require('crypto');
const express = require('express');
const { db, documentData } = require('../lib/firebase');
const { RequestError } = require('../lib/validators');
const { sendTicketEmail } = require('../lib/mailer');
const { createTicketPdf, qrDataUrl } = require('../lib/ticketAssets');

const router = express.Router();
const DEFAULT_SEAT_COLUMNS = 10;
const COUPONS = {
  WELCOME100: { type: 'flat', value: 100 },
  STUDENT20: { type: 'percent', value: 20 },
  SCREENIFY50: { type: 'flat', value: 50 }
};

function seatColumns(seatCount = 0) {
  return seatCount >= 100 ? DEFAULT_SEAT_COLUMNS : 8;
}

function labelForSeat(index, columns = DEFAULT_SEAT_COLUMNS) {
  return `${String.fromCharCode(65 + Math.floor(index / columns))}${(index % columns) + 1}`;
}

function bookingReference() {
  return `SCN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function couponDiscount(code, subtotal) {
  const coupon = COUPONS[String(code || '').trim().toUpperCase()];
  if (!coupon) return { code: '', discount: 0 };
  const discount = coupon.type === 'percent'
    ? Math.round(subtotal * (coupon.value / 100))
    : coupon.value;
  return { code: String(code).trim().toUpperCase(), discount: Math.min(discount, Math.max(0, subtotal - 1)) };
}

router.post('/book', async (req, res, next) => {
  try {
    const body = req.body || {};
    const showId = String(body.showId || '').trim();
    const seats = Array.isArray(body.seats) ? [...new Set(body.seats.map(Number))] : [];
    const paymentMethod = String(body.paymentMethod || '');
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
    const couponCode = String(body.couponCode || '').trim().toUpperCase();

    if (!showId) {
      throw new RequestError('Choose a valid show.');
    }
    if (!seats.length || seats.some(seat => !Number.isInteger(seat) || seat < 0)) {
      throw new RequestError('Choose valid seats before payment.');
    }
    if (!['upi', 'card', 'netbanking'].includes(paymentMethod)) {
      throw new RequestError('Choose a valid payment method.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new RequestError('Enter a valid email address to receive your ticket.');
    }

    const showReference = db.collection('shows').doc(showId);
    const bookingDocument = db.collection('bookings').doc();
    const booking = await db.runTransaction(async transaction => {
      const showSnapshot = await transaction.get(showReference);
      if (!showSnapshot.exists) {
        throw new RequestError('Show not found.', 404);
      }
      const show = documentData(showSnapshot);
      const movieReference = db.collection('movies').doc(show.movieId);
      const movieSnapshot = await transaction.get(movieReference);
      if (!movieSnapshot.exists) {
        throw new RequestError('Movie for this show was not found.', 404);
      }
      if (seats.some(seat => seat >= show.seats.length)) {
        throw new RequestError('Choose valid seats before payment.');
      }
      if (seats.some(seat => show.seats[seat] === 1)) {
        throw new RequestError('One or more seats were just booked. Please choose again.', 409);
      }

      const updatedSeats = [...show.seats];
      seats.forEach(seat => {
        updatedSeats[seat] = 1;
      });
      const columns = seatColumns(show.seats.length);
      const subtotal = seats.length * show.price;
      const coupon = couponDiscount(couponCode, subtotal);
      const bookingData = {
        reference: bookingReference(),
        movieId: show.movieId,
        showId,
        seats,
        seatLabels: seats.map(seat => labelForSeat(seat, columns)),
        subtotal,
        discount: coupon.discount,
        couponCode: coupon.code,
        amount: subtotal - coupon.discount,
        customerEmail,
        paymentMethod,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      transaction.update(showReference, { seats: updatedSeats, updatedAt: new Date().toISOString() });
      transaction.create(bookingDocument, bookingData);

      return {
        _id: bookingDocument.id,
        ...bookingData,
        movieId: documentData(movieSnapshot),
        showId: { ...show, seats: updatedSeats }
      };
    });

    const email = await sendTicketEmail(booking);
    const emailDelivery = {
      status: email.status,
      reason: email.reason || '',
      code: email.code || '',
      previewUrl: email.previewUrl || '',
      updatedAt: new Date().toISOString()
    };
    await bookingDocument.update({ emailDelivery });
    return res.status(201).json({
      message: 'Booking confirmed.',
      booking: { ...booking, emailDelivery, qrDataUrl: await qrDataUrl(booking) },
      email
    });
  } catch (error) {
    return next(error);
  }
});

async function bookingByReference(reference) {
  const snapshot = await db.collection('bookings')
    .where('reference', '==', reference)
    .limit(1)
    .get();
  if (snapshot.empty) {
    throw new RequestError('Booking not found.', 404);
  }
  const booking = documentData(snapshot.docs[0]);
  const [movieSnapshot, showSnapshot] = await Promise.all([
    db.collection('movies').doc(booking.movieId).get(),
    db.collection('shows').doc(booking.showId).get()
  ]);
  if (!movieSnapshot.exists || !showSnapshot.exists) {
    throw new RequestError('Booking details are unavailable.', 404);
  }
  return {
    ...booking,
    movieId: documentData(movieSnapshot),
    showId: documentData(showSnapshot)
  };
}

router.get('/bookings/:reference', async (req, res, next) => {
  try {
    const booking = await bookingByReference(req.params.reference);
    return res.json({ ...booking, qrDataUrl: await qrDataUrl(booking) });
  } catch (error) {
    return next(error);
  }
});

router.get('/bookings/:reference/ticket.pdf', async (req, res, next) => {
  try {
    const booking = await bookingByReference(req.params.reference);
    const pdf = await createTicketPdf(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${booking.reference}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
