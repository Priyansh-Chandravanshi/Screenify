const express = require('express');
const { db, documentData } = require('../lib/firebase');
const { RequestError, numberInRange, optionalString, requiredString } = require('../lib/validators');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('x-admin-key') !== key) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

function showPayload(body = {}) {
  const date = new Date(body.date || Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new RequestError('Enter a valid show date.');
  }
  const seats = body.seats === undefined ? Array(40).fill(0) : body.seats;
  if (!Array.isArray(seats) || seats.length !== 40 || seats.some(seat => seat !== 0 && seat !== 1)) {
    throw new RequestError('A show must contain exactly 40 valid seats.');
  }
  return {
    movieId: requiredString(body.movieId, 'Movie'),
    theatre: optionalString(body.theatre, 'Screenify Cinemas', 120),
    auditorium: optionalString(body.auditorium, 'Audi 1', 50),
    format: optionalString(body.format, '2D', 30),
    date: date.toISOString(),
    time: requiredString(body.time, 'Time', 30),
    price: numberInRange(body.price, 'Price', 1, 10000, 220),
    seats
  };
}

router.post('/shows', requireAdmin, async (req, res, next) => {
  try {
    const payload = showPayload(req.body);
    const movie = await db.collection('movies').doc(payload.movieId).get();
    if (!movie.exists) {
      return res.status(404).json({ message: 'Movie not found.' });
    }
    const now = new Date().toISOString();
    const show = { ...payload, createdAt: now, updatedAt: now };
    const reference = db.collection('shows').doc();
    await reference.set(show);
    return res.status(201).json({ _id: reference.id, ...show });
  } catch (error) {
    return next(error);
  }
});

router.get('/shows/show/:showId', async (req, res, next) => {
  try {
    const snapshot = await db.collection('shows').doc(req.params.showId).get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Show not found.' });
    }
    const show = documentData(snapshot);
    const movieSnapshot = await db.collection('movies').doc(show.movieId).get();
    if (!movieSnapshot.exists) {
      return res.status(404).json({ message: 'Movie for this show was not found.' });
    }
    return res.json({ ...show, movieId: documentData(movieSnapshot) });
  } catch (error) {
    return next(error);
  }
});

router.get('/shows/:movieId', async (req, res, next) => {
  try {
    const snapshot = await db.collection('shows').where('movieId', '==', req.params.movieId).get();
    const shows = snapshot.docs
      .map(documentData)
      .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
    return res.json(shows);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
