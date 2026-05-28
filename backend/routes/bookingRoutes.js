const crypto = require('crypto');
const express = require('express');
const { db, documentData } = require('../lib/firebase');
const { RequestError } = require('../lib/validators');
const { sendTicketEmail } = require('../lib/mailer');

const router = express.Router();
const ROWS = ['A', 'B', 'C', 'D', 'E'];

function labelForSeat(index) {
  return `${ROWS[Math.floor(index / 8)]}${(index % 8) + 1}`;
}

function bookingReference() {
  return `SCN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

router.post('/book', async (req, res, next) => {
  try {
    const body = req.body || {};
    const showId = String(body.showId || '').trim();
    const seats = Array.isArray(body.seats) ? [...new Set(body.seats.map(Number))] : [];
    const paymentMethod = String(body.paymentMethod || '');
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();

    if (!showId) {
      throw new RequestError('Choose a valid show.');
    }
    if (!seats.length || seats.some(seat => !Number.isInteger(seat) || seat < 0 || seat >= 40)) {
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
      if (seats.some(seat => show.seats[seat] === 1)) {
        throw new RequestError('One or more seats were just booked. Please choose again.', 409);
      }

      const updatedSeats = [...show.seats];
      seats.forEach(seat => {
        updatedSeats[seat] = 1;
      });
      const bookingData = {
        reference: bookingReference(),
        movieId: show.movieId,
        showId,
        seats,
        seatLabels: seats.map(labelForSeat),
        amount: seats.length * show.price,
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
      updatedAt: new Date().toISOString()
    };
    await bookingDocument.update({ emailDelivery });
    return res.status(201).json({
      message: 'Booking confirmed.',
      booking: { ...booking, emailDelivery },
      email
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/bookings/:reference', async (req, res, next) => {
  try {
    const snapshot = await db.collection('bookings')
      .where('reference', '==', req.params.reference)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    const booking = documentData(snapshot.docs[0]);
    const [movieSnapshot, showSnapshot] = await Promise.all([
      db.collection('movies').doc(booking.movieId).get(),
      db.collection('shows').doc(booking.showId).get()
    ]);
    if (!movieSnapshot.exists || !showSnapshot.exists) {
      return res.status(404).json({ message: 'Booking details are unavailable.' });
    }
    return res.json({
      ...booking,
      movieId: documentData(movieSnapshot),
      showId: documentData(showSnapshot)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
