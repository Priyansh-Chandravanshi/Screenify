const express = require('express');
const { db, documentData } = require('../lib/firebase');
const { numberInRange, optionalString, requiredString } = require('../lib/validators');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('x-admin-key') !== key) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

function moviePayload(body = {}) {
  return {
    title: requiredString(body.title, 'Title'),
    poster: optionalString(body.poster),
    duration: numberInRange(body.duration, 'Duration', 1, 500),
    rating: numberInRange(body.rating, 'Rating', 0, 10, 8),
    genre: optionalString(body.genre, 'Drama', 80),
    language: optionalString(body.language, 'Hindi', 50),
    certificate: optionalString(body.certificate, 'UA', 20),
    synopsis: optionalString(body.synopsis)
  };
}

router.get('/movies', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().toLowerCase();
    const snapshot = await db.collection('movies').get();
    const movies = snapshot.docs
      .map(documentData)
      .filter(movie => !query || movie.title.toLowerCase().includes(query))
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    return res.json(movies);
  } catch (error) {
    return next(error);
  }
});

router.get('/movies/:id', async (req, res, next) => {
  try {
    const snapshot = await db.collection('movies').doc(req.params.id).get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Movie not found.' });
    }
    return res.json(documentData(snapshot));
  } catch (error) {
    return next(error);
  }
});

router.post('/movies', requireAdmin, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const movie = { ...moviePayload(req.body), createdAt: now, updatedAt: now };
    const reference = db.collection('movies').doc();
    await reference.set(movie);
    return res.status(201).json({ _id: reference.id, ...movie });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
